"""
Configuration for Lumina Specialist Network PoC

All model sizes are kept tiny for local Mac training.
"""

from dataclasses import dataclass
from typing import List, Optional
from pathlib import Path


# ============================================================================
# Paths
# ============================================================================

POC_ROOT = Path(__file__).parent
DATASETS_DIR = POC_ROOT / "datasets"
OUTPUTS_DIR = POC_ROOT / "outputs"


# ============================================================================
# Model Configurations
# ============================================================================

@dataclass
class ModelConfig:
    """Base configuration for tiny models."""
    name: str
    vocab_size: int = 32000  # Use smaller vocab for efficiency
    hidden_size: int = 256
    num_layers: int = 4
    num_heads: int = 4
    intermediate_size: int = 512
    max_position_embeddings: int = 512
    dropout: float = 0.1

    # Confidence head
    confidence_hidden_size: int = 64

    @property
    def num_params(self) -> int:
        """Approximate parameter count."""
        embed = self.vocab_size * self.hidden_size
        attention = self.num_layers * (4 * self.hidden_size * self.hidden_size)
        ffn = self.num_layers * (2 * self.hidden_size * self.intermediate_size)
        confidence = self.hidden_size * self.confidence_hidden_size + self.confidence_hidden_size
        return embed + attention + ffn + confidence


# Tiny Router (~2M params)
ROUTER_CONFIG = ModelConfig(
    name="router",
    hidden_size=256,
    num_layers=4,
    num_heads=4,
    intermediate_size=512,
)

# Tiny Specialists (~5M params each)
SPECIALIST_CONFIG = ModelConfig(
    name="specialist",
    hidden_size=384,
    num_layers=6,
    num_heads=6,
    intermediate_size=768,
)

# Tiny Aggregator (~2M params)
AGGREGATOR_CONFIG = ModelConfig(
    name="aggregator",
    hidden_size=256,
    num_layers=4,
    num_heads=4,
    intermediate_size=512,
)


# ============================================================================
# Training Configurations
# ============================================================================

@dataclass
class TrainConfig:
    """Training configuration."""
    batch_size: int = 16
    learning_rate: float = 3e-4
    epochs: int = 10
    warmup_steps: int = 100
    weight_decay: float = 0.01
    max_grad_norm: float = 1.0

    # Loss weights
    lm_weight: float = 1.0
    confidence_weight: float = 0.2

    # Logging
    log_interval: int = 10
    eval_interval: int = 100
    save_interval: int = 500


# ============================================================================
# Domain Definitions
# ============================================================================

DOMAINS = ["prism", "math", "general"]

DOMAIN_DESCRIPTIONS = {
    "prism": "Prism programming language: confidence operators, uncertain control flow, syntax",
    "math": "Mathematics: calculations, equations, proofs, statistics",
    "general": "General knowledge: facts, explanations, definitions",
}

# Keywords for simple rule-based baseline
DOMAIN_KEYWORDS = {
    "prism": [
        "prism", "~>", "<~", "~~", "~??", "confidence", "uncertain if",
        "high {", "medium {", "low {", "~+", "~-", "~*", "~/",
        "parallax", "operator", "syntax"
    ],
    "math": [
        "calculate", "equation", "derivative", "integral", "sum",
        "multiply", "divide", "solve", "prove", "theorem", "formula",
        "x^2", "sqrt", "log", "sin", "cos", "probability"
    ],
    "general": [
        "what is", "who is", "explain", "define", "describe",
        "history", "science", "technology", "how does"
    ],
}


# ============================================================================
# Dataset Sizes (small for PoC)
# ============================================================================

@dataclass
class DatasetSize:
    """Dataset size configuration."""
    train: int
    val: int


DATASET_SIZES = {
    "router": DatasetSize(train=5000, val=500),
    "prism": DatasetSize(train=10000, val=1000),
    "math": DatasetSize(train=10000, val=1000),
    "general": DatasetSize(train=10000, val=1000),
    "aggregator": DatasetSize(train=5000, val=500),
}


# ============================================================================
# Evaluation Thresholds
# ============================================================================

@dataclass
class EvalThresholds:
    """Success criteria for PoC validation."""
    router_accuracy: float = 0.85
    specialist_ece: float = 0.10
    ood_auroc: float = 0.75
    decline_rate: float = 0.50
    aggregator_coherence: float = 0.80
    false_confidence_rate: float = 0.15


THRESHOLDS = EvalThresholds()


# ============================================================================
# Prism Examples (for specialist training)
# ============================================================================

PRISM_EXAMPLES = [
    # Confidence assignment
    ("How do I assign a value with confidence?",
     "Use the ~> operator: `const x = 42 ~> 0.9` assigns 42 with 90% confidence."),

    ("What does ~> mean in Prism?",
     "The ~> operator attaches a confidence value (0-1) to an expression."),

    # Confidence extraction
    ("How do I get the confidence of a value?",
     "Use the <~ operator: `const conf = <~myValue` extracts the confidence."),

    # Uncertain control flow
    ("How do I handle different confidence levels?",
     "Use uncertain if: `uncertain if (value) { high { ... } medium { ... } low { ... } }`"),

    # Operators
    ("What is ~+ in Prism?",
     "The ~+ operator performs confident addition, propagating the minimum confidence."),

    ("How does ~|| work?",
     "The ~|| operator is confident OR - it selects the operand with higher confidence."),

    # Patterns
    ("How do I chain confidence operations?",
     "Use the ~~ operator for chaining: `value1 ~~ transform ~~ validate`"),

    ("What is the ~?? operator?",
     "The ~?? operator is confidence coalescing - returns right operand if left has low confidence."),
]

MATH_EXAMPLES = [
    ("What is 2 + 2?", "2 + 2 = 4"),
    ("What is the derivative of x^2?", "The derivative of x^2 is 2x."),
    ("What is the square root of 16?", "The square root of 16 is 4."),
    ("Solve x + 5 = 10", "x = 5"),
    ("What is 15% of 200?", "15% of 200 is 30."),
]

GENERAL_EXAMPLES = [
    ("What is the capital of France?", "The capital of France is Paris."),
    ("Who wrote Romeo and Juliet?", "William Shakespeare wrote Romeo and Juliet."),
    ("What is photosynthesis?", "Photosynthesis is the process by which plants convert sunlight into energy."),
]

# Out-of-distribution examples (should trigger low confidence)
OOD_EXAMPLES = [
    "What's the best restaurant in Paris?",
    "Should I buy Bitcoin?",
    "What will the weather be tomorrow?",
    "Who will win the next election?",
    "Is this stock a good investment?",
]
