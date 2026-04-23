"""
Lumina Transformer Model with Confidence Head

A transformer architecture that outputs both content predictions and
calibrated confidence estimates.

Key innovation: The confidence head is trained alongside the main model
to produce well-calibrated uncertainty estimates.
"""

import math
from typing import Optional, Tuple, NamedTuple

import mlx.core as mx
import mlx.nn as nn

from .config import LuminaConfig


class ConfidenceOutput(NamedTuple):
    """Output from the confidence head."""

    overall: mx.array  # [batch, seq] - main confidence score
    epistemic: mx.array  # [batch, seq] - lack of knowledge
    aleatoric: mx.array  # [batch, seq] - inherent ambiguity
    distribution_shift: mx.array  # [batch, seq] - OOD detection


class LuminaOutput(NamedTuple):
    """Full output from the Lumina model."""

    logits: mx.array  # [batch, seq, vocab] - next token predictions
    confidence: ConfidenceOutput  # Confidence estimates
    hidden_states: mx.array  # [batch, seq, hidden] - final hidden states
    entropy: mx.array  # [batch, seq] - entropy of predictions


class RotaryEmbedding(nn.Module):
    """Rotary Position Embedding (RoPE) for better position encoding."""

    def __init__(self, dim: int, max_seq_length: int = 2048, base: float = 10000.0):
        super().__init__()
        self.dim = dim
        self.max_seq_length = max_seq_length
        self.base = base

    def __call__(self, x: mx.array, offset: int = 0) -> mx.array:
        seq_len = x.shape[1]
        positions = mx.arange(offset, offset + seq_len, dtype=mx.float32)

        # Compute frequencies
        dim_range = mx.arange(0, self.dim, 2, dtype=mx.float32)
        freqs = 1.0 / (self.base ** (dim_range / self.dim))

        # Compute angles
        angles = positions[:, None] * freqs[None, :]  # [seq, dim/2]

        # Apply rotation
        cos = mx.cos(angles)
        sin = mx.sin(angles)

        # Reshape x for rotation: [batch, seq, heads, head_dim]
        x_reshaped = x.reshape(x.shape[0], x.shape[1], -1, self.dim)

        # Split into even/odd
        x_even = x_reshaped[..., 0::2]
        x_odd = x_reshaped[..., 1::2]

        # Apply rotation
        cos = cos[None, :, None, :]  # [1, seq, 1, dim/2]
        sin = sin[None, :, None, :]

        x_rotated_even = x_even * cos - x_odd * sin
        x_rotated_odd = x_even * sin + x_odd * cos

        # Interleave back
        x_rotated = mx.stack([x_rotated_even, x_rotated_odd], axis=-1)
        x_rotated = x_rotated.reshape(x.shape)

        return x_rotated


class MultiHeadAttention(nn.Module):
    """Multi-head attention with RoPE."""

    def __init__(self, config: LuminaConfig):
        super().__init__()
        self.config = config
        self.num_heads = config.num_heads
        self.head_dim = config.head_dim
        self.hidden_dim = config.hidden_dim

        self.q_proj = nn.Linear(config.hidden_dim, config.hidden_dim, bias=False)
        self.k_proj = nn.Linear(config.hidden_dim, config.hidden_dim, bias=False)
        self.v_proj = nn.Linear(config.hidden_dim, config.hidden_dim, bias=False)
        self.o_proj = nn.Linear(config.hidden_dim, config.hidden_dim, bias=False)

        self.rope = RotaryEmbedding(config.head_dim, config.max_seq_length)
        self.dropout = nn.Dropout(config.attention_dropout)

    def __call__(
        self,
        x: mx.array,
        mask: Optional[mx.array] = None,
        cache: Optional[Tuple[mx.array, mx.array]] = None,
    ) -> Tuple[mx.array, Tuple[mx.array, mx.array]]:
        batch_size, seq_len, _ = x.shape

        # Project Q, K, V
        q = self.q_proj(x)
        k = self.k_proj(x)
        v = self.v_proj(x)

        # Reshape for multi-head attention
        q = q.reshape(batch_size, seq_len, self.num_heads, self.head_dim).transpose(0, 2, 1, 3)
        k = k.reshape(batch_size, seq_len, self.num_heads, self.head_dim).transpose(0, 2, 1, 3)
        v = v.reshape(batch_size, seq_len, self.num_heads, self.head_dim).transpose(0, 2, 1, 3)

        # Apply RoPE
        offset = 0 if cache is None else cache[0].shape[2]
        q = self.rope(q.transpose(0, 2, 1, 3), offset).transpose(0, 2, 1, 3)
        k = self.rope(k.transpose(0, 2, 1, 3), offset).transpose(0, 2, 1, 3)

        # Handle KV cache
        if cache is not None:
            k = mx.concatenate([cache[0], k], axis=2)
            v = mx.concatenate([cache[1], v], axis=2)

        new_cache = (k, v)

        # Compute attention scores
        scale = 1.0 / math.sqrt(self.head_dim)
        scores = (q @ k.transpose(0, 1, 3, 2)) * scale

        # Apply mask
        if mask is not None:
            scores = scores + mask

        # Softmax and dropout
        attn_weights = mx.softmax(scores, axis=-1)
        attn_weights = self.dropout(attn_weights)

        # Compute output
        out = attn_weights @ v
        out = out.transpose(0, 2, 1, 3).reshape(batch_size, seq_len, self.hidden_dim)
        out = self.o_proj(out)

        return out, new_cache


class FeedForward(nn.Module):
    """Feed-forward network with SwiGLU activation."""

    def __init__(self, config: LuminaConfig):
        super().__init__()
        self.gate_proj = nn.Linear(config.hidden_dim, config.intermediate_dim, bias=False)
        self.up_proj = nn.Linear(config.hidden_dim, config.intermediate_dim, bias=False)
        self.down_proj = nn.Linear(config.intermediate_dim, config.hidden_dim, bias=False)
        self.dropout = nn.Dropout(config.dropout)

    def __call__(self, x: mx.array) -> mx.array:
        # SwiGLU activation
        gate = nn.silu(self.gate_proj(x))
        up = self.up_proj(x)
        x = gate * up
        x = self.down_proj(x)
        x = self.dropout(x)
        return x


class TransformerBlock(nn.Module):
    """Single transformer block with pre-norm."""

    def __init__(self, config: LuminaConfig):
        super().__init__()
        self.attention = MultiHeadAttention(config)
        self.feed_forward = FeedForward(config)
        self.attention_norm = nn.RMSNorm(config.hidden_dim, eps=config.layer_norm_eps)
        self.ffn_norm = nn.RMSNorm(config.hidden_dim, eps=config.layer_norm_eps)

    def __call__(
        self,
        x: mx.array,
        mask: Optional[mx.array] = None,
        cache: Optional[Tuple[mx.array, mx.array]] = None,
    ) -> Tuple[mx.array, Tuple[mx.array, mx.array]]:
        # Pre-norm attention
        residual = x
        x = self.attention_norm(x)
        x, new_cache = self.attention(x, mask, cache)
        x = residual + x

        # Pre-norm FFN
        residual = x
        x = self.ffn_norm(x)
        x = self.feed_forward(x)
        x = residual + x

        return x, new_cache


class ConfidenceHead(nn.Module):
    """
    Confidence estimation head.

    Takes hidden states and produces calibrated confidence scores.
    Trained with proper scoring rules (Brier score) for calibration.
    """

    def __init__(self, config: LuminaConfig):
        super().__init__()
        self.config = config

        # Project hidden states to confidence representation
        self.proj = nn.Linear(config.hidden_dim, config.confidence_head_dim, bias=False)
        self.norm = nn.RMSNorm(config.confidence_head_dim, eps=config.layer_norm_eps)

        # Separate heads for different uncertainty types
        self.overall_head = nn.Linear(config.confidence_head_dim, 1, bias=True)
        self.epistemic_head = nn.Linear(config.confidence_head_dim, 1, bias=True)
        self.aleatoric_head = nn.Linear(config.confidence_head_dim, 1, bias=True)
        self.ood_head = nn.Linear(config.confidence_head_dim, 1, bias=True)

    def __call__(self, hidden_states: mx.array) -> ConfidenceOutput:
        """
        Compute confidence estimates from hidden states.

        Args:
            hidden_states: [batch, seq, hidden_dim]

        Returns:
            ConfidenceOutput with calibrated confidence scores
        """
        # Project to confidence space
        x = self.proj(hidden_states)
        x = nn.gelu(x)
        x = self.norm(x)

        # Compute each confidence type (sigmoid for 0-1 range)
        overall = mx.sigmoid(self.overall_head(x).squeeze(-1))
        epistemic = mx.sigmoid(self.epistemic_head(x).squeeze(-1))
        aleatoric = mx.sigmoid(self.aleatoric_head(x).squeeze(-1))
        distribution_shift = mx.sigmoid(self.ood_head(x).squeeze(-1))

        return ConfidenceOutput(
            overall=overall,
            epistemic=epistemic,
            aleatoric=aleatoric,
            distribution_shift=distribution_shift,
        )


class LuminaModel(nn.Module):
    """
    Lumina: Transformer with Confidence Head

    A language model that outputs both next-token predictions and
    calibrated confidence estimates for each prediction.
    """

    def __init__(self, config: LuminaConfig):
        super().__init__()
        self.config = config

        # Token embeddings
        self.token_embedding = nn.Embedding(config.vocab_size, config.hidden_dim)

        # Transformer blocks
        self.layers = [TransformerBlock(config) for _ in range(config.num_layers)]

        # Output normalization
        self.norm = nn.RMSNorm(config.hidden_dim, eps=config.layer_norm_eps)

        # Language modeling head (tied with embeddings)
        self.lm_head = nn.Linear(config.hidden_dim, config.vocab_size, bias=False)

        # Confidence head - the key innovation
        self.confidence_head = ConfidenceHead(config)

        # Dropout
        self.dropout = nn.Dropout(config.dropout)

    def __call__(
        self,
        input_ids: mx.array,
        cache: Optional[list] = None,
    ) -> Tuple[LuminaOutput, Optional[list]]:
        """
        Forward pass through Lumina.

        Args:
            input_ids: [batch, seq] token indices
            cache: Optional KV cache for generation

        Returns:
            LuminaOutput with logits, confidence, and hidden states
        """
        batch_size, seq_len = input_ids.shape

        # Embed tokens
        x = self.token_embedding(input_ids)
        x = self.dropout(x)

        # Create causal mask
        mask = nn.MultiHeadAttention.create_additive_causal_mask(seq_len)
        mask = mask.astype(x.dtype)

        # Process through transformer layers
        new_cache = []
        for i, layer in enumerate(self.layers):
            layer_cache = cache[i] if cache is not None else None
            x, layer_new_cache = layer(x, mask, layer_cache)
            new_cache.append(layer_new_cache)

        # Final normalization
        hidden_states = self.norm(x)

        # Language modeling logits
        logits = self.lm_head(hidden_states)

        # Confidence estimates
        confidence = self.confidence_head(hidden_states)

        # Compute entropy of predictions (measure of uncertainty)
        probs = mx.softmax(logits, axis=-1)
        # Clamp for numerical stability
        probs_clamped = mx.clip(probs, 1e-10, 1.0)
        entropy = -mx.sum(probs_clamped * mx.log(probs_clamped), axis=-1)

        output = LuminaOutput(
            logits=logits,
            confidence=confidence,
            hidden_states=hidden_states,
            entropy=entropy,
        )

        return output, new_cache if cache is not None else None

    def generate_step(
        self,
        input_ids: mx.array,
        cache: Optional[list] = None,
        temperature: float = 1.0,
    ) -> Tuple[mx.array, ConfidenceOutput, list]:
        """
        Single generation step.

        Returns next token, its confidence, and updated cache.
        """
        output, new_cache = self(input_ids, cache)

        # Get logits for last position
        logits = output.logits[:, -1, :]

        # Apply temperature
        if temperature != 1.0:
            logits = logits / temperature

        # Sample next token
        probs = mx.softmax(logits, axis=-1)
        next_token = mx.random.categorical(probs)

        # Get confidence for last position
        confidence = ConfidenceOutput(
            overall=output.confidence.overall[:, -1],
            epistemic=output.confidence.epistemic[:, -1],
            aleatoric=output.confidence.aleatoric[:, -1],
            distribution_shift=output.confidence.distribution_shift[:, -1],
        )

        return next_token, confidence, new_cache


def count_parameters(model: nn.Module) -> int:
    """Count total trainable parameters."""
    def _count(params):
        total = 0
        if isinstance(params, dict):
            for v in params.values():
                total += _count(v)
        elif isinstance(params, list):
            for v in params:
                total += _count(v)
        elif hasattr(params, 'size'):
            total += params.size
        return total
    return _count(model.parameters())


def create_model(config_name: str = "small") -> LuminaModel:
    """Create a Lumina model with predefined config."""
    from .config import get_config

    config = get_config(config_name)
    model = LuminaModel(config)

    num_params = count_parameters(model)
    print(f"Created Lumina '{config_name}' model with {num_params:,} parameters")

    return model
