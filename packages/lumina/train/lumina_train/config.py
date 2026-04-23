"""
Lumina Model Configuration

Defines model architectures from tiny (for fast iteration) to GPT-2 scale.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class LuminaConfig:
    """Configuration for Lumina transformer with confidence head."""

    # Model architecture
    vocab_size: int = 50257  # GPT-2 tokenizer vocab size
    hidden_dim: int = 768
    num_layers: int = 12
    num_heads: int = 12
    intermediate_dim: int = 3072  # Usually 4x hidden_dim
    max_seq_length: int = 1024

    # Confidence head
    confidence_head_dim: int = 256
    num_uncertainty_types: int = 4  # epistemic, aleatoric, ood, high_conf

    # Training
    dropout: float = 0.1
    attention_dropout: float = 0.1
    layer_norm_eps: float = 1e-5

    # Confidence-specific
    confidence_loss_weight: float = 0.1
    entropy_reg_weight: float = 0.01
    label_smoothing: float = 0.1

    @property
    def head_dim(self) -> int:
        return self.hidden_dim // self.num_heads


# Predefined configurations for different scales
LUMINA_CONFIGS = {
    # Tiny model for fast iteration and debugging
    "tiny": LuminaConfig(
        hidden_dim=128,
        num_layers=4,
        num_heads=4,
        intermediate_dim=512,
        max_seq_length=256,
        confidence_head_dim=64,
    ),
    # Small model - good for initial experiments on M1/M2
    "small": LuminaConfig(
        hidden_dim=256,
        num_layers=6,
        num_heads=8,
        intermediate_dim=1024,
        max_seq_length=512,
        confidence_head_dim=128,
    ),
    # Base model - GPT-2 small equivalent
    "base": LuminaConfig(
        hidden_dim=768,
        num_layers=12,
        num_heads=12,
        intermediate_dim=3072,
        max_seq_length=1024,
        confidence_head_dim=256,
    ),
    # Medium model - GPT-2 medium equivalent
    "medium": LuminaConfig(
        hidden_dim=1024,
        num_layers=24,
        num_heads=16,
        intermediate_dim=4096,
        max_seq_length=1024,
        confidence_head_dim=256,
    ),
}


def get_config(name: str) -> LuminaConfig:
    """Get a predefined configuration by name."""
    if name not in LUMINA_CONFIGS:
        raise ValueError(f"Unknown config: {name}. Available: {list(LUMINA_CONFIGS.keys())}")
    return LUMINA_CONFIGS[name]
