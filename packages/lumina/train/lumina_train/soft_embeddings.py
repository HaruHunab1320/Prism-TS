"""
Soft Embeddings for Phase 2: Distribution Propagation

Instead of collapsing to a single token and embedding it:
    argmax(softmax(logits)) → token → embed(token)

We propagate the full distribution:
    softmax(logits) @ embedding_matrix → weighted embedding

This preserves uncertainty through the computation.
"""

import math
from typing import Optional, Tuple, NamedTuple

import mlx.core as mx
import mlx.nn as nn

from .config import LuminaConfig


class SoftEmbedding(NamedTuple):
    """A soft embedding: weighted superposition of token embeddings."""

    # The weighted embedding vector: Σᵢ p(tokenᵢ) · embed(tokenᵢ)
    vector: mx.array  # [batch, seq, hidden_dim]

    # Entropy of the distribution (uncertainty measure)
    entropy: mx.array  # [batch, seq]

    # Top-k probabilities for sparse representation
    top_probs: mx.array  # [batch, seq, k]
    top_indices: mx.array  # [batch, seq, k]


class SoftEmbeddingLayer(nn.Module):
    """
    Soft embedding layer that converts distributions to weighted embeddings.

    Standard embedding: token_id → embedding_vector
    Soft embedding: distribution → weighted_sum(embeddings)
    """

    def __init__(self, config: LuminaConfig, embedding_matrix: mx.array):
        """
        Args:
            config: Model configuration
            embedding_matrix: The token embedding matrix [vocab_size, hidden_dim]
        """
        super().__init__()
        self.config = config
        self.vocab_size = config.vocab_size
        self.hidden_dim = config.hidden_dim

        # Store reference to embedding matrix (shared with token embeddings)
        self.embedding_matrix = embedding_matrix

        # Optional: learnable temperature for sharpening/softening distributions
        self.temperature = mx.array([1.0])

        # Top-k for sparse soft embeddings (memory optimization)
        self.top_k = min(100, config.vocab_size)  # Keep top 100 tokens

    def forward_dense(self, distribution: mx.array) -> SoftEmbedding:
        """
        Full dense soft embedding (exact but memory intensive).

        Args:
            distribution: [batch, seq, vocab_size] probability distribution

        Returns:
            SoftEmbedding with weighted vector
        """
        # Apply temperature
        if self.temperature.item() != 1.0:
            logits = mx.log(distribution + 1e-10) / self.temperature
            distribution = mx.softmax(logits, axis=-1)

        # Weighted sum of embeddings: [batch, seq, vocab] @ [vocab, hidden]
        # Result: [batch, seq, hidden]
        soft_vector = distribution @ self.embedding_matrix

        # Compute entropy
        dist_clamped = mx.clip(distribution, 1e-10, 1.0)
        entropy = -mx.sum(dist_clamped * mx.log(dist_clamped), axis=-1)

        # Get top-k for sparse representation
        top_probs, top_indices = mx.topk(distribution, k=self.top_k, axis=-1)

        return SoftEmbedding(
            vector=soft_vector,
            entropy=entropy,
            top_probs=top_probs,
            top_indices=top_indices,
        )

    def forward_sparse(self, distribution: mx.array) -> SoftEmbedding:
        """
        Sparse soft embedding using top-k approximation (memory efficient).

        Only considers top-k tokens in the distribution.

        Args:
            distribution: [batch, seq, vocab_size] probability distribution

        Returns:
            SoftEmbedding with approximate weighted vector
        """
        batch_size, seq_len, _ = distribution.shape

        # Get top-k probabilities and indices
        top_probs, top_indices = mx.topk(distribution, k=self.top_k, axis=-1)

        # Renormalize top-k probabilities
        top_probs = top_probs / (top_probs.sum(axis=-1, keepdims=True) + 1e-10)

        # Gather embeddings for top-k tokens
        # top_indices: [batch, seq, k]
        # We need embeddings: [batch, seq, k, hidden]
        top_embeddings = self.embedding_matrix[top_indices.reshape(-1)]
        top_embeddings = top_embeddings.reshape(batch_size, seq_len, self.top_k, self.hidden_dim)

        # Weighted sum: [batch, seq, k, 1] * [batch, seq, k, hidden] → [batch, seq, hidden]
        soft_vector = (top_probs[..., None] * top_embeddings).sum(axis=2)

        # Compute entropy from full distribution
        dist_clamped = mx.clip(distribution, 1e-10, 1.0)
        entropy = -mx.sum(dist_clamped * mx.log(dist_clamped), axis=-1)

        return SoftEmbedding(
            vector=soft_vector,
            entropy=entropy,
            top_probs=top_probs,
            top_indices=top_indices,
        )

    def __call__(self, distribution: mx.array, sparse: bool = True) -> SoftEmbedding:
        """
        Convert distribution to soft embedding.

        Args:
            distribution: [batch, seq, vocab_size] probability distribution
            sparse: If True, use top-k approximation

        Returns:
            SoftEmbedding
        """
        if sparse:
            return self.forward_sparse(distribution)
        else:
            return self.forward_dense(distribution)


class SoftTargetLoss(nn.Module):
    """
    Loss function for training with soft targets.

    Instead of cross-entropy with hard labels:
        L = -log P(correct_token)

    We use KL divergence with soft targets:
        L = KL(soft_target || model_prediction)

    This teaches the model to match distributions, not just pick winners.
    """

    def __init__(self, label_smoothing: float = 0.1, temperature: float = 1.0):
        super().__init__()
        self.label_smoothing = label_smoothing
        self.temperature = temperature

    def __call__(
        self,
        logits: mx.array,
        targets: mx.array,
        soft_targets: Optional[mx.array] = None,
        mask: Optional[mx.array] = None,
    ) -> mx.array:
        """
        Compute loss with soft targets.

        Args:
            logits: [batch, seq, vocab] model output logits
            targets: [batch, seq] hard target indices (for label smoothing fallback)
            soft_targets: [batch, seq, vocab] optional soft target distribution
            mask: [batch, seq] valid positions

        Returns:
            Scalar loss
        """
        batch_size, seq_len, vocab_size = logits.shape

        # Apply temperature
        scaled_logits = logits / self.temperature
        log_probs = mx.log(mx.softmax(scaled_logits, axis=-1) + 1e-10)

        if soft_targets is not None:
            # KL divergence with soft targets
            # KL(soft_target || pred) = sum(soft_target * (log(soft_target) - log(pred)))
            soft_targets_clamped = mx.clip(soft_targets, 1e-10, 1.0)
            kl = soft_targets_clamped * (mx.log(soft_targets_clamped) - log_probs)
            loss = kl.sum(axis=-1)  # [batch, seq]
        else:
            # Fall back to label-smoothed cross entropy
            # Create smooth distribution: (1-smooth)*one_hot + smooth*uniform
            one_hot = mx.zeros((batch_size, seq_len, vocab_size))
            # MLX doesn't have scatter, so we use a different approach
            smooth_dist = mx.ones((batch_size, seq_len, vocab_size)) * (self.label_smoothing / vocab_size)

            # Add (1 - label_smoothing) to correct positions
            # This is a workaround for lack of scatter_
            targets_safe = mx.clip(targets, 0, vocab_size - 1)
            target_probs = mx.take_along_axis(
                log_probs, targets_safe[..., None], axis=-1
            ).squeeze(-1)

            # Smooth loss = (1-smooth)*target_loss + smooth*uniform_loss
            target_loss = -target_probs
            uniform_loss = -log_probs.mean(axis=-1)
            loss = (1 - self.label_smoothing) * target_loss + self.label_smoothing * uniform_loss

        # Apply mask
        if mask is not None:
            loss = loss * mask
            return loss.sum() / (mask.sum() + 1e-10)
        else:
            return loss.mean()


class DistributionPropagationLayer(nn.Module):
    """
    Layer that processes soft embeddings while preserving distribution information.

    Key insight: Instead of processing a single embedding, we process the
    weighted superposition and track how confidence should propagate.
    """

    def __init__(self, config: LuminaConfig):
        super().__init__()
        self.config = config

        # Linear transformation that preserves soft structure
        self.linear = nn.Linear(config.hidden_dim, config.hidden_dim, bias=False)

        # Confidence scaling based on entropy
        self.confidence_scale = nn.Linear(1, 1, bias=True)

    def __call__(
        self,
        soft_embedding: SoftEmbedding,
        hard_embedding: Optional[mx.array] = None,
    ) -> Tuple[mx.array, mx.array]:
        """
        Process soft embedding.

        Args:
            soft_embedding: SoftEmbedding from distribution
            hard_embedding: Optional hard embedding to blend with

        Returns:
            (processed_embedding, confidence_weight)
        """
        # Transform the soft vector
        processed = self.linear(soft_embedding.vector)

        # Compute confidence weight from entropy
        # High entropy = low confidence, low entropy = high confidence
        max_entropy = math.log(self.config.vocab_size)
        normalized_entropy = soft_embedding.entropy / max_entropy
        confidence = 1.0 - normalized_entropy  # [batch, seq]

        # Optional: blend with hard embedding based on confidence
        if hard_embedding is not None:
            # High confidence → use soft, Low confidence → use hard (?)
            # Actually, we might want the opposite for stability
            # This is a design choice to experiment with
            blend_weight = mx.sigmoid(self.confidence_scale(confidence[..., None]))
            processed = blend_weight * processed + (1 - blend_weight) * hard_embedding

        return processed, confidence


def create_soft_targets_from_logits(
    logits: mx.array,
    temperature: float = 1.0,
    top_k: Optional[int] = None,
) -> mx.array:
    """
    Create soft targets from model logits (for knowledge distillation style training).

    Args:
        logits: [batch, seq, vocab] raw logits
        temperature: Temperature for softmax (higher = softer)
        top_k: If set, zero out everything outside top-k

    Returns:
        [batch, seq, vocab] soft target distribution
    """
    scaled_logits = logits / temperature
    soft_targets = mx.softmax(scaled_logits, axis=-1)

    if top_k is not None:
        # Keep only top-k, zero out rest
        top_values, top_indices = mx.topk(soft_targets, k=top_k, axis=-1)
        # Create mask
        mask = mx.zeros_like(soft_targets)
        # This is inefficient but MLX doesn't have scatter
        # In practice, we'd use a more efficient implementation
        # For now, just threshold instead
        threshold = mx.sort(soft_targets, axis=-1)[..., -top_k]
        mask = (soft_targets >= threshold[..., None]).astype(soft_targets.dtype)
        soft_targets = soft_targets * mask
        # Renormalize
        soft_targets = soft_targets / (soft_targets.sum(axis=-1, keepdims=True) + 1e-10)

    return soft_targets


# Demonstration of the concept
def demo_soft_vs_hard():
    """
    Demonstrate the difference between hard and soft embeddings.
    """
    print("=" * 60)
    print("SOFT VS HARD EMBEDDING DEMONSTRATION")
    print("=" * 60)

    # Simulate a distribution where model is uncertain between "cat" and "dog"
    # In a real scenario, these would be actual token IDs
    vocab_size = 100
    hidden_dim = 64

    # Create mock embedding matrix
    embedding_matrix = mx.random.normal((vocab_size, hidden_dim))

    # Scenario 1: Model is very confident (90% "cat")
    # Create distribution array directly
    dist_confident_arr = [0.0] * vocab_size
    dist_confident_arr[10] = 0.9  # "cat" = token 10
    dist_confident_arr[20] = 0.1  # "dog" = token 20
    dist_confident = mx.array([[dist_confident_arr]])

    # Scenario 2: Model is uncertain (50% "cat", 50% "dog")
    dist_uncertain_arr = [0.0] * vocab_size
    dist_uncertain_arr[10] = 0.5
    dist_uncertain_arr[20] = 0.5
    dist_uncertain = mx.array([[dist_uncertain_arr]])

    print("\nScenario 1: Confident (90% cat, 10% dog)")
    print("-" * 40)

    # Hard embedding: just pick "cat"
    hard_embed_1 = embedding_matrix[10]  # Always picks cat
    print(f"Hard embedding: Always picks 'cat' (token 10)")
    print(f"  → Information lost: model's 10% belief in 'dog'")

    # Soft embedding: weighted average
    soft_embed_1 = 0.9 * embedding_matrix[10] + 0.1 * embedding_matrix[20]
    print(f"Soft embedding: 0.9 * cat + 0.1 * dog")
    print(f"  → Information preserved: full distribution")

    print("\nScenario 2: Uncertain (50% cat, 50% dog)")
    print("-" * 40)

    # Hard embedding: arbitrarily picks one
    hard_embed_2 = embedding_matrix[10]  # Randomly picks cat
    print(f"Hard embedding: Picks 'cat' (but could be dog!)")
    print(f"  → Information lost: 50% probability mass discarded")

    # Soft embedding: equal blend
    soft_embed_2 = 0.5 * embedding_matrix[10] + 0.5 * embedding_matrix[20]
    print(f"Soft embedding: 0.5 * cat + 0.5 * dog")
    print(f"  → Information preserved: uncertainty is explicit")

    # Compute entropies
    entropy_1 = -(0.9 * math.log(0.9) + 0.1 * math.log(0.1))
    entropy_2 = -(0.5 * math.log(0.5) + 0.5 * math.log(0.5))

    print(f"\nEntropy (uncertainty measure):")
    print(f"  Scenario 1: {entropy_1:.3f} (low uncertainty)")
    print(f"  Scenario 2: {entropy_2:.3f} (high uncertainty)")

    print("\n" + "=" * 60)
    print("KEY INSIGHT: Soft embeddings preserve the probability wave.")
    print("Hard embeddings collapse it. Lumina keeps it intact.")
    print("=" * 60)


if __name__ == "__main__":
    demo_soft_vs_hard()
