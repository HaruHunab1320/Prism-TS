"""
Phase 4: Confidence-Gated Attention

Standard attention: output = softmax(QK^T/√d) @ V
Confidence-gated:   output = softmax(QK^T/√d) ⊙ confidence @ V

The key insight: tokens predicted with low confidence should have
less influence on future tokens. This propagates uncertainty through
the computation graph naturally.

This connects directly to Prism's confidence operators:
    result = computation(input ~> 0.8)  // input has 80% confidence
    // result inherits reduced confidence from uncertain inputs
"""

import math
from typing import Optional, Tuple, NamedTuple

import mlx.core as mx
import mlx.nn as nn

from .config import LuminaConfig


class ConfidenceGatedOutput(NamedTuple):
    """Output from confidence-gated attention."""
    output: mx.array          # [batch, seq, hidden]
    attention_weights: mx.array  # [batch, heads, seq, seq]
    gated_weights: mx.array      # [batch, heads, seq, seq] - after confidence gating
    effective_confidence: mx.array  # [batch, seq] - propagated confidence


class ConfidenceGatedAttention(nn.Module):
    """
    Multi-head attention with confidence gating.

    Standard attention computes:
        A = softmax(QK^T / sqrt(d))
        output = A @ V

    Confidence-gated attention modulates by source confidence:
        A = softmax(QK^T / sqrt(d))
        A_gated = A ⊙ confidence[source_positions]
        A_gated = A_gated / A_gated.sum()  # renormalize
        output = A_gated @ V

    This means:
    - High-confidence tokens contribute more
    - Low-confidence tokens contribute less
    - Uncertainty propagates through attention
    """

    def __init__(self, config: LuminaConfig):
        super().__init__()
        self.config = config
        self.hidden_dim = config.hidden_dim
        self.num_heads = config.num_heads
        self.head_dim = config.hidden_dim // config.num_heads

        # Standard attention projections
        self.q_proj = nn.Linear(config.hidden_dim, config.hidden_dim, bias=False)
        self.k_proj = nn.Linear(config.hidden_dim, config.hidden_dim, bias=False)
        self.v_proj = nn.Linear(config.hidden_dim, config.hidden_dim, bias=False)
        self.o_proj = nn.Linear(config.hidden_dim, config.hidden_dim, bias=False)

        # Confidence integration
        # Option 1: Direct gating (multiply attention by confidence)
        # Option 2: Learned gating (learn how much to weight confidence)
        self.confidence_gate = nn.Linear(1, config.num_heads, bias=True)

        # Gate temperature (controls sharpness of confidence effect)
        self.gate_temperature = 1.0

        # Minimum confidence floor (prevent complete zeroing)
        self.min_confidence = 0.1

    def __call__(
        self,
        hidden_states: mx.array,
        confidence: mx.array,
        mask: Optional[mx.array] = None,
        use_confidence_gating: bool = True,
    ) -> ConfidenceGatedOutput:
        """
        Forward pass with confidence gating.

        Args:
            hidden_states: [batch, seq, hidden_dim]
            confidence: [batch, seq] confidence scores per position
            mask: [batch, 1, seq, seq] attention mask (1 = attend, 0 = mask)
            use_confidence_gating: Whether to apply confidence gating

        Returns:
            ConfidenceGatedOutput with output and attention info
        """
        batch_size, seq_len, _ = hidden_states.shape

        # Project to Q, K, V
        q = self.q_proj(hidden_states)
        k = self.k_proj(hidden_states)
        v = self.v_proj(hidden_states)

        # Reshape for multi-head attention
        # [batch, seq, hidden] -> [batch, seq, heads, head_dim] -> [batch, heads, seq, head_dim]
        q = q.reshape(batch_size, seq_len, self.num_heads, self.head_dim).transpose(0, 2, 1, 3)
        k = k.reshape(batch_size, seq_len, self.num_heads, self.head_dim).transpose(0, 2, 1, 3)
        v = v.reshape(batch_size, seq_len, self.num_heads, self.head_dim).transpose(0, 2, 1, 3)

        # Compute attention scores
        # [batch, heads, seq, head_dim] @ [batch, heads, head_dim, seq] -> [batch, heads, seq, seq]
        scale = 1.0 / math.sqrt(self.head_dim)
        scores = (q @ k.transpose(0, 1, 3, 2)) * scale

        # Apply causal mask if provided
        if mask is not None:
            # mask: [batch, 1, seq, seq] or [1, 1, seq, seq]
            scores = scores + (1 - mask) * (-1e9)

        # Standard attention weights
        attention_weights = mx.softmax(scores, axis=-1)

        # Apply confidence gating
        if use_confidence_gating:
            # Clamp confidence to minimum
            clamped_confidence = mx.maximum(confidence, self.min_confidence)

            # Learn per-head gating strength
            # [batch, seq, 1] -> [batch, seq, heads]
            gate_strength = mx.sigmoid(self.confidence_gate(clamped_confidence[..., None]))

            # Interpolate between 1.0 (no gating) and confidence (full gating)
            # effective_gate[i] = (1 - gate_strength) * 1.0 + gate_strength * confidence[i]
            effective_gate = (1 - gate_strength) + gate_strength * clamped_confidence[..., None]

            # Reshape for broadcasting: [batch, seq, heads] -> [batch, heads, 1, seq]
            effective_gate = effective_gate.transpose(0, 2, 1)[:, :, None, :]

            # Apply gating to attention weights
            # Each attention score attending TO position j is multiplied by confidence[j]
            gated_weights = attention_weights * effective_gate

            # Renormalize (so weights still sum to 1)
            gated_weights = gated_weights / (gated_weights.sum(axis=-1, keepdims=True) + 1e-10)
        else:
            gated_weights = attention_weights

        # Apply attention to values
        # [batch, heads, seq, seq] @ [batch, heads, seq, head_dim] -> [batch, heads, seq, head_dim]
        output = gated_weights @ v

        # Reshape back
        # [batch, heads, seq, head_dim] -> [batch, seq, heads, head_dim] -> [batch, seq, hidden]
        output = output.transpose(0, 2, 1, 3).reshape(batch_size, seq_len, self.hidden_dim)

        # Output projection
        output = self.o_proj(output)

        # Compute effective confidence after attention
        # Each position's new confidence is weighted average of source confidences
        # weighted by how much attention it paid to each source
        effective_confidence = (gated_weights.mean(axis=1) @ confidence[..., None]).squeeze(-1)

        return ConfidenceGatedOutput(
            output=output,
            attention_weights=attention_weights,
            gated_weights=gated_weights,
            effective_confidence=effective_confidence,
        )


class ConfidenceGatedTransformerLayer(nn.Module):
    """
    Full transformer layer with confidence-gated attention.

    Architecture:
    1. LayerNorm
    2. Confidence-Gated Multi-Head Attention
    3. Residual + LayerNorm
    4. MLP
    5. Residual
    """

    def __init__(self, config: LuminaConfig):
        super().__init__()
        self.config = config

        # Attention
        self.attention = ConfidenceGatedAttention(config)
        self.attn_norm = nn.LayerNorm(config.hidden_dim)

        # MLP
        self.mlp_norm = nn.LayerNorm(config.hidden_dim)
        self.mlp_up = nn.Linear(config.hidden_dim, config.intermediate_dim, bias=False)
        self.mlp_down = nn.Linear(config.intermediate_dim, config.hidden_dim, bias=False)

    def __call__(
        self,
        hidden_states: mx.array,
        confidence: mx.array,
        mask: Optional[mx.array] = None,
        use_confidence_gating: bool = True,
    ) -> Tuple[mx.array, mx.array]:
        """
        Forward pass.

        Returns:
            (output, effective_confidence)
        """
        # Attention block
        normed = self.attn_norm(hidden_states)
        attn_output = self.attention(normed, confidence, mask, use_confidence_gating)
        hidden_states = hidden_states + attn_output.output

        # MLP block
        normed = self.mlp_norm(hidden_states)
        mlp_output = self.mlp_down(nn.gelu(self.mlp_up(normed)))
        hidden_states = hidden_states + mlp_output

        return hidden_states, attn_output.effective_confidence


class ConfidencePropagationAnalyzer:
    """
    Analyze how confidence propagates through attention layers.

    Useful for debugging and understanding the confidence flow.
    """

    @staticmethod
    def compute_confidence_flow(
        attention_weights: mx.array,
        initial_confidence: mx.array,
        num_layers: int = 1,
    ) -> mx.array:
        """
        Simulate confidence propagation through multiple layers.

        Args:
            attention_weights: [batch, heads, seq, seq] attention patterns
            initial_confidence: [batch, seq] initial confidence
            num_layers: Number of layers to simulate

        Returns:
            [batch, seq, num_layers+1] confidence at each layer
        """
        batch_size, num_heads, seq_len, _ = attention_weights.shape

        # Average across heads
        avg_attention = attention_weights.mean(axis=1)  # [batch, seq, seq]

        # Track confidence at each layer
        confidences = [initial_confidence]
        current_confidence = initial_confidence

        for _ in range(num_layers):
            # Propagate: new_conf[i] = sum_j(attention[i,j] * conf[j])
            current_confidence = (avg_attention @ current_confidence[..., None]).squeeze(-1)
            confidences.append(current_confidence)

        return mx.stack(confidences, axis=-1)

    @staticmethod
    def find_confidence_sinks(
        attention_weights: mx.array,
        confidence: mx.array,
        threshold: float = 0.3,
    ) -> mx.array:
        """
        Find positions that "absorb" confidence from uncertain sources.

        These are positions that attend heavily to low-confidence tokens.

        Returns:
            [batch, seq] scores indicating confidence sink strength
        """
        batch_size, num_heads, seq_len, _ = attention_weights.shape

        # Average across heads
        avg_attention = attention_weights.mean(axis=1)  # [batch, seq, seq]

        # Low confidence mask
        low_conf_mask = (confidence < threshold).astype(mx.float32)

        # How much does each position attend to low-confidence tokens?
        sink_score = (avg_attention * low_conf_mask[..., None, :]).sum(axis=-1)

        return sink_score

    @staticmethod
    def visualize_confidence_attention(
        attention_weights: mx.array,
        confidence: mx.array,
        tokens: list,
        head_idx: int = 0,
    ) -> str:
        """Create ASCII visualization of confidence-weighted attention."""
        attn = attention_weights[0, head_idx].tolist()  # [seq, seq]
        conf = confidence[0].tolist()  # [seq]

        lines = []
        lines.append("Confidence-Weighted Attention (head {})".format(head_idx))
        lines.append("=" * 60)

        # Header
        header = "       " + " ".join([f"{t[:4]:>5}" for t in tokens[:10]])
        lines.append(header)

        # Rows
        for i, token in enumerate(tokens[:10]):
            row_attn = attn[i][:10]
            row_str = f"{token[:5]:>5}: "
            for j, a in enumerate(row_attn):
                # Color by attention * confidence
                weighted = a * conf[j]
                if weighted > 0.3:
                    row_str += "█████ "
                elif weighted > 0.2:
                    row_str += "▓▓▓▓▓ "
                elif weighted > 0.1:
                    row_str += "▒▒▒▒▒ "
                elif weighted > 0.05:
                    row_str += "░░░░░ "
                else:
                    row_str += "      "
            lines.append(row_str)

        lines.append("")
        lines.append("Confidence: " + " ".join([f"{c:.2f}" for c in conf[:10]]))

        return "\n".join(lines)


def demo_confidence_gating():
    """Demonstrate confidence-gated attention."""
    from .config import get_config

    print("=" * 60)
    print("CONFIDENCE-GATED ATTENTION DEMO")
    print("=" * 60)

    config = get_config("tiny")
    attention = ConfidenceGatedAttention(config)

    # Create sample inputs
    batch_size = 1
    seq_len = 8
    hidden_states = mx.random.normal((batch_size, seq_len, config.hidden_dim))

    # Simulate varying confidence
    # Positions 0, 1, 2 have high confidence, 3, 4, 5 have low, 6, 7 medium
    confidence = mx.array([[0.9, 0.85, 0.8, 0.2, 0.15, 0.25, 0.5, 0.55]])

    # Create causal mask
    causal_mask = mx.tril(mx.ones((seq_len, seq_len)))[None, None, :, :]

    print("\nInput confidence:", confidence[0].tolist())

    # Run with and without gating
    output_gated = attention(hidden_states, confidence, causal_mask, use_confidence_gating=True)
    output_ungated = attention(hidden_states, confidence, causal_mask, use_confidence_gating=False)

    print("\nAttention weights (position 5 attending to all previous):")
    print("  Standard:", [f"{w:.3f}" for w in output_ungated.attention_weights[0, 0, 5, :6].tolist()])
    print("  Gated:   ", [f"{w:.3f}" for w in output_gated.gated_weights[0, 0, 5, :6].tolist()])

    print("\nEffective confidence after attention:")
    print("  ", [f"{c:.3f}" for c in output_gated.effective_confidence[0].tolist()])

    print("\nKey insight:")
    print("  - Positions with low input confidence (3,4,5) contribute less")
    print("  - Attention is renormalized to maintain proper weighting")
    print("  - Effective confidence tracks uncertainty propagation")
    print("=" * 60)


if __name__ == "__main__":
    demo_confidence_gating()
