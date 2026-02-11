"""
Base model architecture for Lumina PoC specialists.

Uses MLX for efficient Apple Silicon training.
Falls back to PyTorch if MLX not available.
"""

from dataclasses import dataclass
from typing import Optional, Tuple, Dict, Any
import math
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import mlx.core as mx
    import mlx.nn as nn
    HAS_MLX = True
except ImportError:
    HAS_MLX = False
    import torch
    import torch.nn as nn_torch
    import torch.nn.functional as F

# Try v2 config first, fall back to v1
try:
    from config_v2 import ModelConfig
except ImportError:
    from config import ModelConfig


# ============================================================================
# Confidence Output
# ============================================================================

@dataclass
class ConfidenceOutput:
    """Decomposed confidence from a specialist."""
    overall: float           # Final calibrated score 0-1
    epistemic: float         # Model uncertainty
    aleatoric: float         # Task ambiguity
    distribution_shift: float  # OOD score

    @property
    def primary_type(self) -> str:
        """Determine primary uncertainty type."""
        if self.distribution_shift > 0.5:
            return "out_of_distribution"
        elif self.epistemic > self.aleatoric and self.epistemic > 0.3:
            return "epistemic"
        elif self.aleatoric > 0.3:
            return "aleatoric"
        else:
            return "high_confidence"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall": self.overall,
            "epistemic": self.epistemic,
            "aleatoric": self.aleatoric,
            "distribution_shift": self.distribution_shift,
            "primary_type": self.primary_type,
        }


# ============================================================================
# MLX Implementation
# ============================================================================

if HAS_MLX:

    class RotaryEmbedding(nn.Module):
        """Rotary position embedding."""

        def __init__(self, dim: int, max_seq_len: int = 2048):
            super().__init__()
            inv_freq = 1.0 / (10000 ** (mx.arange(0, dim, 2) / dim))
            self.inv_freq = inv_freq

        def __call__(self, x: mx.array, offset: int = 0) -> Tuple[mx.array, mx.array]:
            seq_len = x.shape[1]
            t = mx.arange(offset, offset + seq_len)
            freqs = mx.outer(t, self.inv_freq)
            emb = mx.concatenate([freqs, freqs], axis=-1)
            return mx.cos(emb), mx.sin(emb)


    def rotate_half(x: mx.array) -> mx.array:
        x1, x2 = mx.split(x, 2, axis=-1)
        return mx.concatenate([-x2, x1], axis=-1)


    def apply_rotary(q: mx.array, k: mx.array, cos: mx.array, sin: mx.array):
        q_rot = q * cos + rotate_half(q) * sin
        k_rot = k * cos + rotate_half(k) * sin
        return q_rot, k_rot


    class Attention(nn.Module):
        """Multi-head attention with RoPE."""

        def __init__(self, config: ModelConfig):
            super().__init__()
            self.num_heads = config.num_heads
            self.head_dim = config.hidden_size // config.num_heads
            self.scale = self.head_dim ** -0.5

            self.q_proj = nn.Linear(config.hidden_size, config.hidden_size, bias=False)
            self.k_proj = nn.Linear(config.hidden_size, config.hidden_size, bias=False)
            self.v_proj = nn.Linear(config.hidden_size, config.hidden_size, bias=False)
            self.o_proj = nn.Linear(config.hidden_size, config.hidden_size, bias=False)

            self.rotary = RotaryEmbedding(self.head_dim, config.max_position_embeddings)

        def __call__(self, x: mx.array, mask: Optional[mx.array] = None) -> mx.array:
            B, T, C = x.shape

            q = self.q_proj(x).reshape(B, T, self.num_heads, self.head_dim).transpose(0, 2, 1, 3)
            k = self.k_proj(x).reshape(B, T, self.num_heads, self.head_dim).transpose(0, 2, 1, 3)
            v = self.v_proj(x).reshape(B, T, self.num_heads, self.head_dim).transpose(0, 2, 1, 3)

            cos, sin = self.rotary(x)
            cos = cos[None, None, :, :]
            sin = sin[None, None, :, :]
            q, k = apply_rotary(q, k, cos, sin)

            attn = (q @ k.transpose(0, 1, 3, 2)) * self.scale

            # Causal mask
            causal_mask = mx.triu(mx.ones((T, T)), k=1) * -1e9
            attn = attn + causal_mask

            if mask is not None:
                attn = attn + mask

            attn = mx.softmax(attn, axis=-1)
            out = (attn @ v).transpose(0, 2, 1, 3).reshape(B, T, C)

            return self.o_proj(out)


    class MLP(nn.Module):
        """Feed-forward with SwiGLU."""

        def __init__(self, config: ModelConfig):
            super().__init__()
            self.gate_proj = nn.Linear(config.hidden_size, config.intermediate_size, bias=False)
            self.up_proj = nn.Linear(config.hidden_size, config.intermediate_size, bias=False)
            self.down_proj = nn.Linear(config.intermediate_size, config.hidden_size, bias=False)

        def __call__(self, x: mx.array) -> mx.array:
            return self.down_proj(nn.silu(self.gate_proj(x)) * self.up_proj(x))


    class TransformerBlock(nn.Module):
        """Single transformer block."""

        def __init__(self, config: ModelConfig):
            super().__init__()
            self.attention = Attention(config)
            self.mlp = MLP(config)
            self.ln1 = nn.LayerNorm(config.hidden_size)
            self.ln2 = nn.LayerNorm(config.hidden_size)

        def __call__(self, x: mx.array, mask: Optional[mx.array] = None) -> mx.array:
            x = x + self.attention(self.ln1(x), mask)
            x = x + self.mlp(self.ln2(x))
            return x


    class ConfidenceHead(nn.Module):
        """Multi-component confidence prediction."""

        def __init__(self, config: ModelConfig):
            super().__init__()
            self.ln = nn.LayerNorm(config.hidden_size)
            self.fc1 = nn.Linear(config.hidden_size, config.confidence_hidden_size)

            # Separate heads for each uncertainty type
            self.overall_head = nn.Linear(config.confidence_hidden_size, 1)
            self.epistemic_head = nn.Linear(config.confidence_hidden_size, 1)
            self.aleatoric_head = nn.Linear(config.confidence_hidden_size, 1)
            self.ood_head = nn.Linear(config.confidence_hidden_size, 1)

        def __call__(self, x: mx.array) -> Dict[str, mx.array]:
            # Use mean pooling over sequence
            x = mx.mean(x, axis=1)
            x = self.ln(x)
            x = nn.gelu(self.fc1(x))

            return {
                "overall": mx.sigmoid(self.overall_head(x)).squeeze(-1),
                "epistemic": mx.sigmoid(self.epistemic_head(x)).squeeze(-1),
                "aleatoric": mx.sigmoid(self.aleatoric_head(x)).squeeze(-1),
                "distribution_shift": mx.sigmoid(self.ood_head(x)).squeeze(-1),
            }


    class TinySpecialist(nn.Module):
        """Tiny specialist model with confidence head."""

        def __init__(self, config: ModelConfig):
            super().__init__()
            self.config = config

            self.embed_tokens = nn.Embedding(config.vocab_size, config.hidden_size)
            self.layers = [TransformerBlock(config) for _ in range(config.num_layers)]
            self.ln_f = nn.LayerNorm(config.hidden_size)
            self.lm_head = nn.Linear(config.hidden_size, config.vocab_size, bias=False)

            self.confidence_head = ConfidenceHead(config)

        def __call__(
            self,
            input_ids: mx.array,
            mask: Optional[mx.array] = None
        ) -> Tuple[mx.array, Dict[str, mx.array]]:
            x = self.embed_tokens(input_ids)

            for layer in self.layers:
                x = layer(x, mask)

            x = self.ln_f(x)

            logits = self.lm_head(x)
            confidence = self.confidence_head(x)

            return logits, confidence

        def generate(
            self,
            input_ids: mx.array,
            max_new_tokens: int = 50,
            temperature: float = 0.7,
        ) -> Tuple[mx.array, ConfidenceOutput]:
            """Generate with confidence output."""

            for _ in range(max_new_tokens):
                logits, confidence = self(input_ids)
                next_token_logits = logits[:, -1, :] / temperature
                probs = mx.softmax(next_token_logits, axis=-1)
                next_token = mx.argmax(probs, axis=-1, keepdims=True)
                input_ids = mx.concatenate([input_ids, next_token], axis=1)

                # Stop at EOS (assuming token 2)
                if next_token[0, 0].item() == 2:
                    break

            # Final confidence
            _, final_confidence = self(input_ids)

            conf_output = ConfidenceOutput(
                overall=float(final_confidence["overall"][0]),
                epistemic=float(final_confidence["epistemic"][0]),
                aleatoric=float(final_confidence["aleatoric"][0]),
                distribution_shift=float(final_confidence["distribution_shift"][0]),
            )

            return input_ids, conf_output


    class TinyRouter(nn.Module):
        """Tiny router for domain classification."""

        def __init__(self, config: ModelConfig, num_domains: int = 3):
            super().__init__()
            self.config = config
            self.num_domains = num_domains

            self.embed_tokens = nn.Embedding(config.vocab_size, config.hidden_size)
            self.layers = [TransformerBlock(config) for _ in range(config.num_layers)]
            self.ln_f = nn.LayerNorm(config.hidden_size)

            # Classification head instead of LM head
            self.classifier = nn.Linear(config.hidden_size, num_domains)

            # Confidence in routing decision
            self.confidence_head = nn.Linear(config.hidden_size, 1)

        def __call__(self, input_ids: mx.array) -> Tuple[mx.array, mx.array]:
            x = self.embed_tokens(input_ids)

            for layer in self.layers:
                x = layer(x)

            x = self.ln_f(x)

            # Mean pooling
            x = mx.mean(x, axis=1)

            logits = self.classifier(x)
            confidence = mx.sigmoid(self.confidence_head(x)).squeeze(-1)

            return logits, confidence

        def route(self, input_ids: mx.array) -> Tuple[int, float, Dict[str, float]]:
            """Route query to domain with confidence."""
            logits, confidence = self(input_ids)
            probs = mx.softmax(logits, axis=-1)

            domain_idx = int(mx.argmax(probs, axis=-1)[0])
            domain_prob = float(probs[0, domain_idx])

            # Return all domain probabilities
            all_probs = {
                f"domain_{i}": float(probs[0, i])
                for i in range(self.num_domains)
            }

            return domain_idx, float(confidence[0]) * domain_prob, all_probs


# ============================================================================
# PyTorch Fallback (if MLX not available)
# ============================================================================

else:
    # Simplified PyTorch implementation for non-Mac systems
    # (Would need full implementation for production)

    class TinySpecialist(nn_torch.Module):
        def __init__(self, config: ModelConfig):
            super().__init__()
            raise NotImplementedError(
                "PyTorch fallback not fully implemented. "
                "Please install MLX for Apple Silicon: pip install mlx"
            )

    class TinyRouter(nn_torch.Module):
        def __init__(self, config: ModelConfig, num_domains: int = 3):
            super().__init__()
            raise NotImplementedError(
                "PyTorch fallback not fully implemented. "
                "Please install MLX for Apple Silicon: pip install mlx"
            )
