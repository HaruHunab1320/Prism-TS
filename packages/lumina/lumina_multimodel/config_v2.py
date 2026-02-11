"""
Lumina PoC v2 Configuration

Upgraded for local scaling before cloud deployment.
- Proper GPT-2 tokenizer
- Larger models (within Mac M-series limits)
- More training data
- Better calibration
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict
from pathlib import Path


# ============================================================================
# Paths
# ============================================================================

POC_ROOT = Path(__file__).parent
DATASETS_DIR = POC_ROOT / "datasets_v2"
OUTPUTS_DIR = POC_ROOT / "outputs_v2"


# ============================================================================
# Model Configurations - Scaled for Mac
# ============================================================================

@dataclass
class ModelConfig:
    """Model configuration with size variants."""
    name: str
    vocab_size: int = 50257  # GPT-2 vocab size
    hidden_size: int = 512
    num_layers: int = 8
    num_heads: int = 8
    intermediate_size: int = 2048
    max_position_embeddings: int = 512
    dropout: float = 0.1

    # Confidence head
    confidence_hidden_size: int = 128

    @property
    def approx_params(self) -> int:
        """Approximate parameter count in millions."""
        embed = self.vocab_size * self.hidden_size
        attention = self.num_layers * (4 * self.hidden_size * self.hidden_size)
        ffn = self.num_layers * (2 * self.hidden_size * self.intermediate_size)
        return (embed + attention + ffn) // 1_000_000


# Size variants for different Mac hardware
MODEL_SIZES = {
    # ~20M params - Fast iteration (any Mac)
    "small": ModelConfig(
        name="small",
        hidden_size=384,
        num_layers=6,
        num_heads=6,
        intermediate_size=1536,
    ),

    # ~50M params - Good balance (M1/M2 8GB+)
    "medium": ModelConfig(
        name="medium",
        hidden_size=512,
        num_layers=8,
        num_heads=8,
        intermediate_size=2048,
    ),

    # ~100M params - Better quality (M1/M2 Pro 16GB+)
    "large": ModelConfig(
        name="large",
        hidden_size=768,
        num_layers=12,
        num_heads=12,
        intermediate_size=3072,
    ),

    # ~200M params - Best local quality (M1/M2 Max/Ultra 32GB+)
    "xlarge": ModelConfig(
        name="xlarge",
        hidden_size=1024,
        num_layers=16,
        num_heads=16,
        intermediate_size=4096,
    ),
}


# ============================================================================
# Training Configuration
# ============================================================================

@dataclass
class TrainConfig:
    """Training configuration."""
    # Model
    model_size: str = "medium"

    # Data
    batch_size: int = 8
    max_length: int = 256

    # Training
    epochs: int = 20
    learning_rate: float = 3e-4
    weight_decay: float = 0.01
    warmup_ratio: float = 0.1
    max_grad_norm: float = 1.0

    # Loss weights (tuned for calibration)
    lm_weight: float = 1.0
    confidence_weight: float = 0.3  # Increased for better calibration
    calibration_weight: float = 0.1  # ECE-based loss

    # Logging
    log_interval: int = 50
    eval_interval: int = 500
    save_interval: int = 1000


# ============================================================================
# Dataset Configuration
# ============================================================================

@dataclass
class DatasetConfig:
    """Dataset sizes for v2."""
    router_train: int = 20_000
    router_val: int = 2_000
    specialist_train: int = 50_000
    specialist_val: int = 5_000
    ood_ratio: float = 0.15  # 15% OOD examples for calibration


DATASET_CONFIG = DatasetConfig()


# ============================================================================
# Domain Definitions (Expanded)
# ============================================================================

DOMAINS = ["prism", "math", "code", "general"]

DOMAIN_DESCRIPTIONS = {
    "prism": "Prism programming language: confidence operators, uncertain control flow",
    "math": "Mathematics: calculations, equations, proofs, statistics, logic",
    "code": "Programming: JavaScript, TypeScript, Python patterns",
    "general": "General knowledge: facts, explanations, definitions",
}


# ============================================================================
# Prism Training Data (Expanded)
# ============================================================================

PRISM_PATTERNS = {
    "confidence_assignment": [
        ("How do I assign a value with confidence in Prism?",
         "Use the ~> operator: `const x = value ~> confidence` where confidence is 0-1. Example: `const score = 42 ~> 0.9` assigns 42 with 90% confidence."),
        ("What is the ~> operator?",
         "The ~> operator attaches a confidence score to a value. Syntax: `expression ~> confidence_value`. The confidence must be between 0 and 1."),
        ("Assign {value} with {conf}% confidence",
         "```prism\nconst result = {value} ~> {conf_decimal}\n```"),
    ],

    "confidence_extraction": [
        ("How do I get the confidence of a value?",
         "Use the <~ operator: `const conf = <~myValue` extracts the confidence score from a confident value."),
        ("Extract confidence from a variable",
         "```prism\nconst confidence = <~variable\nif (confidence > 0.8) {\n  // High confidence path\n}\n```"),
    ],

    "uncertain_control_flow": [
        ("How do I handle different confidence levels in Prism?",
         "Use uncertain if with confidence branches:\n```prism\nuncertain if (value) {\n  high { /* confidence > 0.8 */ }\n  medium { /* 0.5 < confidence <= 0.8 */ }\n  low { /* confidence <= 0.5 */ }\n}\n```"),
        ("What is uncertain if?",
         "uncertain if branches based on the confidence level of a value, with high, medium, low, and optional default branches."),
        ("Handle high and low confidence cases",
         "```prism\nuncertain if (prediction) {\n  high {\n    executePrediction(prediction)\n  }\n  low {\n    requestMoreData()\n  }\n}\n```"),
    ],

    "confident_operators": [
        ("What is ~+ in Prism?",
         "~+ is confident addition. It adds values and propagates the minimum confidence: `a ~+ b` results in confidence = min(conf(a), conf(b))."),
        ("What is ~* in Prism?",
         "~* is confident multiplication. It multiplies values and propagates confidence: `a ~* b`."),
        ("What is ~|| in Prism?",
         "~|| is confident OR. It selects the operand with higher confidence: `a ~|| b` returns whichever has higher confidence."),
        ("What is ~&& in Prism?",
         "~&& is confident AND. Both operands must have sufficient confidence for the result to be confident."),
        ("What is ~?? in Prism?",
         "~?? is confidence coalescing. Returns right operand if left has low confidence: `uncertain ~?? fallback`."),
    ],

    "pipeline_operators": [
        ("What is ~|> in Prism?",
         "~|> is the confidence pipeline operator. It chains transformations while tracking confidence: `value ~|> transform1 ~|> transform2`."),
        ("What is ~@> in Prism?",
         "~@> is the threshold gate. It only passes values above a confidence threshold: `value ~@> 0.8` returns null if confidence < 0.8."),
        ("What is ~||> in Prism?",
         "~||> is parallel confidence selection. It runs multiple sources and selects the highest confidence result."),
    ],

    "best_practices": [
        ("When should I use uncertain if?",
         "Use uncertain if when you need different behavior based on confidence levels. It's cleaner than manual confidence checks and makes intent explicit."),
        ("How do I handle low confidence values?",
         "Use ~?? for fallbacks, ~@> for thresholds, or uncertain if for branching. Always provide a low confidence path."),
        ("How do I propagate confidence through calculations?",
         "Use confident operators (~+, ~-, ~*, ~/) instead of regular operators. They automatically track and propagate confidence."),
    ],
}


# ============================================================================
# Math Training Data (Expanded)
# ============================================================================

MATH_PATTERNS = {
    "arithmetic": [
        ("What is {a} + {b}?", "{a} + {b} = {result}"),
        ("What is {a} - {b}?", "{a} - {b} = {result}"),
        ("What is {a} × {b}?", "{a} × {b} = {result}"),
        ("Calculate {a} ÷ {b}", "{a} ÷ {b} = {result}"),
    ],

    "algebra": [
        ("Solve for x: {a}x + {b} = {c}", "x = ({c} - {b}) / {a} = {result}"),
        ("Solve for x: x² = {a}", "x = ±√{a} = ±{result}"),
        ("Factor x² + {b}x + {c}", "Factors: (x + {p})(x + {q}) where {p} × {q} = {c} and {p} + {q} = {b}"),
    ],

    "calculus": [
        ("What is the derivative of x^{n}?", "d/dx(x^{n}) = {n}x^{n_minus_1}"),
        ("What is the derivative of sin(x)?", "d/dx(sin(x)) = cos(x)"),
        ("What is the derivative of e^x?", "d/dx(e^x) = e^x"),
        ("What is the integral of x^{n}?", "∫x^{n} dx = x^{n_plus_1}/{n_plus_1} + C"),
    ],

    "statistics": [
        ("What is the mean of {numbers}?", "Mean = sum / count = {result}"),
        ("What is standard deviation?", "Standard deviation measures the spread of data around the mean: σ = √(Σ(x-μ)²/n)"),
        ("What is a confidence interval?", "A confidence interval gives a range of values likely to contain the true population parameter, typically at 95% confidence."),
    ],
}


# ============================================================================
# Code Training Data (New domain)
# ============================================================================

CODE_PATTERNS = {
    "javascript": [
        ("How do I declare a variable in JavaScript?",
         "Use const for constants, let for variables: `const x = 5;` or `let y = 10;`"),
        ("How do I write a function in JavaScript?",
         "```javascript\nfunction name(params) {\n  return result;\n}\n// or arrow function:\nconst name = (params) => result;\n```"),
        ("How do I iterate over an array?",
         "Use forEach, map, or for...of:\n```javascript\narray.forEach(item => console.log(item));\nconst doubled = array.map(x => x * 2);\nfor (const item of array) { ... }\n```"),
    ],

    "typescript": [
        ("How do I add types in TypeScript?",
         "Add type annotations after variable names: `const x: number = 5;` or `function greet(name: string): string { ... }`"),
        ("How do I define an interface?",
         "```typescript\ninterface User {\n  name: string;\n  age: number;\n  email?: string; // optional\n}\n```"),
    ],

    "python": [
        ("How do I define a function in Python?",
         "```python\ndef function_name(params):\n    return result\n```"),
        ("How do I create a list comprehension?",
         "```python\nsquares = [x**2 for x in range(10)]\nfiltered = [x for x in items if x > 0]\n```"),
    ],
}


# ============================================================================
# OOD Examples (Expanded for better calibration)
# ============================================================================

OOD_EXAMPLES = [
    # Opinion/subjective
    "What's the best programming language?",
    "Should I learn Python or JavaScript first?",
    "Is functional programming better than OOP?",

    # Future predictions
    "Will AI replace programmers?",
    "What will programming look like in 2030?",
    "Which cryptocurrency should I invest in?",

    # Personal/recommendation
    "What laptop should I buy for programming?",
    "What's the best restaurant in San Francisco?",
    "Where should I go on vacation?",

    # Current events (not in training)
    "What happened in the news today?",
    "Who won the election?",
    "What's the current stock price of Apple?",

    # Unknowable
    "What was Einstein's favorite color?",
    "What will the weather be next month?",
    "What number am I thinking of?",

    # Harmful/unsafe
    "How do I hack into a website?",
    "How do I make explosives?",
    "How do I bypass security?",
]


# ============================================================================
# Evaluation Thresholds
# ============================================================================

@dataclass
class EvalThresholds:
    """Success criteria for validation."""
    # Routing
    router_accuracy: float = 0.90

    # Calibration (lower is better)
    target_ece: float = 0.08
    max_ece: float = 0.15

    # OOD Detection
    ood_auroc: float = 0.80
    ood_decline_rate: float = 0.60  # Should decline 60%+ of OOD

    # Generation quality
    valid_syntax_rate: float = 0.90  # For code domains


THRESHOLDS = EvalThresholds()
