#!/usr/bin/env python3
"""
Train a tiny specialist model for the Lumina PoC.

Usage:
    python train_specialist.py --domain prism --epochs 10
    python train_specialist.py --domain math --epochs 10
    python train_specialist.py --domain general --epochs 10
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List, Dict
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import mlx.core as mx
    import mlx.nn as nn
    import mlx.optimizers as optim
    HAS_MLX = True
except ImportError:
    HAS_MLX = False
    print("MLX not available. Please install: pip install mlx")
    sys.exit(1)

from config import DATASETS_DIR, OUTPUTS_DIR, SPECIALIST_CONFIG, TrainConfig
from models.base import TinySpecialist


# ============================================================================
# Utilities
# ============================================================================

def count_parameters(params) -> int:
    """Count total parameters in nested MLX parameter dict."""
    total = 0
    if isinstance(params, dict):
        for v in params.values():
            total += count_parameters(v)
    elif isinstance(params, list):
        for v in params:
            total += count_parameters(v)
    elif hasattr(params, 'size'):
        total += params.size
    return total


def flatten_params(params, prefix=""):
    """Flatten nested parameter dict for saving."""
    flat = {}
    if isinstance(params, dict):
        for k, v in params.items():
            new_key = f"{prefix}.{k}" if prefix else k
            flat.update(flatten_params(v, new_key))
    elif isinstance(params, list):
        for i, v in enumerate(params):
            new_key = f"{prefix}.{i}" if prefix else str(i)
            flat.update(flatten_params(v, new_key))
    elif hasattr(params, 'shape'):  # MLX array
        flat[prefix] = params
    return flat


# ============================================================================
# Data Loading
# ============================================================================

def load_jsonl(path: Path) -> List[Dict]:
    """Load JSONL file."""
    with open(path) as f:
        return [json.loads(line) for line in f]


def simple_tokenize(text: str, vocab_size: int = 32000) -> List[int]:
    """Very simple character-level tokenization for PoC."""
    # In production, use a proper tokenizer
    tokens = []
    for char in text[:512]:  # Limit length
        tokens.append(ord(char) % vocab_size)
    return tokens


def prepare_batch(samples: List[Dict], max_len: int = 256) -> tuple:
    """Prepare a batch of samples."""
    input_ids = []
    labels = []
    confidences = []

    for sample in samples:
        # Combine question and answer
        text = f"Q: {sample['question']}\nA: {sample['answer']}"
        tokens = simple_tokenize(text)

        # Pad or truncate
        if len(tokens) < max_len:
            tokens = tokens + [0] * (max_len - len(tokens))
        else:
            tokens = tokens[:max_len]

        input_ids.append(tokens[:-1])  # Input
        labels.append(tokens[1:])      # Target (shifted)

        # Confidence targets
        conf = sample.get("confidence", {"overall": 0.8, "epistemic": 0.1, "aleatoric": 0.1, "distribution_shift": 0.1})
        confidences.append([
            conf.get("overall", 0.8),
            conf.get("epistemic", 0.1),
            conf.get("aleatoric", 0.1),
            conf.get("distribution_shift", 0.1),
        ])

    return (
        mx.array(input_ids),
        mx.array(labels),
        mx.array(confidences)
    )


# ============================================================================
# Loss Functions
# ============================================================================

def compute_loss(
    model: TinySpecialist,
    input_ids: mx.array,
    labels: mx.array,
    target_confidences: mx.array,
    config: TrainConfig
) -> tuple:
    """Compute combined LM + confidence loss."""

    logits, confidence = model(input_ids)

    # Language modeling loss (cross entropy)
    # Reshape for loss computation
    B, T, V = logits.shape
    logits_flat = logits.reshape(-1, V)
    labels_flat = labels.reshape(-1)

    # Simple cross-entropy
    log_probs = mx.log(mx.softmax(logits_flat, axis=-1) + 1e-8)
    lm_loss = -mx.mean(mx.take_along_axis(log_probs, labels_flat[:, None], axis=1))

    # Confidence losses (MSE for each component)
    conf_loss = (
        mx.mean((confidence["overall"] - target_confidences[:, 0]) ** 2) +
        mx.mean((confidence["epistemic"] - target_confidences[:, 1]) ** 2) +
        mx.mean((confidence["aleatoric"] - target_confidences[:, 2]) ** 2) +
        mx.mean((confidence["distribution_shift"] - target_confidences[:, 3]) ** 2)
    ) / 4

    # Combined loss
    total_loss = config.lm_weight * lm_loss + config.confidence_weight * conf_loss

    return total_loss, lm_loss, conf_loss


# ============================================================================
# Training Loop
# ============================================================================

def train(
    domain: str,
    config: TrainConfig,
    model_config = SPECIALIST_CONFIG
):
    """Train a specialist model."""

    print(f"\n{'='*60}")
    print(f"Training {domain.upper()} Specialist")
    print(f"{'='*60}")

    # Load data
    train_path = DATASETS_DIR / f"{domain}_specialist" / "train.jsonl"
    val_path = DATASETS_DIR / f"{domain}_specialist" / "val.jsonl"

    if not train_path.exists():
        print(f"Error: Training data not found at {train_path}")
        print("Run: python data/generate_all.py first")
        sys.exit(1)

    train_data = load_jsonl(train_path)
    val_data = load_jsonl(val_path)

    print(f"Train samples: {len(train_data)}")
    print(f"Val samples: {len(val_data)}")

    # Create model
    model = TinySpecialist(model_config)
    num_params = count_parameters(model.parameters())
    print(f"Model parameters: {num_params:,}")

    # Optimizer
    optimizer = optim.AdamW(learning_rate=config.learning_rate, weight_decay=config.weight_decay)

    # Training state
    state = [model.state, optimizer.state]

    # Loss function for gradients
    def loss_fn(model, input_ids, labels, confidences):
        total, _, _ = compute_loss(model, input_ids, labels, confidences, config)
        return total

    loss_and_grad = nn.value_and_grad(model, loss_fn)

    # Training loop
    output_dir = OUTPUTS_DIR / f"{domain}_specialist"
    output_dir.mkdir(parents=True, exist_ok=True)

    best_val_loss = float("inf")
    global_step = 0

    for epoch in range(config.epochs):
        # Shuffle training data
        import random
        random.shuffle(train_data)

        epoch_loss = 0
        num_batches = 0

        # Create batches
        for i in tqdm(range(0, len(train_data), config.batch_size), desc=f"Epoch {epoch+1}"):
            batch_samples = train_data[i:i + config.batch_size]
            if len(batch_samples) < 2:
                continue

            input_ids, labels, confidences = prepare_batch(batch_samples)

            # Forward + backward
            loss, grads = loss_and_grad(model, input_ids, labels, confidences)

            # Clip gradients
            grads, _ = optim.clip_grad_norm(grads, max_norm=config.max_grad_norm)

            # Update
            optimizer.update(model, grads)
            mx.eval(state)

            epoch_loss += loss.item()
            num_batches += 1
            global_step += 1

        avg_train_loss = epoch_loss / num_batches

        # Validation
        val_loss = 0
        val_batches = 0
        for i in range(0, len(val_data), config.batch_size):
            batch_samples = val_data[i:i + config.batch_size]
            if len(batch_samples) < 2:
                continue
            input_ids, labels, confidences = prepare_batch(batch_samples)
            total, lm, conf = compute_loss(model, input_ids, labels, confidences, config)
            val_loss += total.item()
            val_batches += 1

        avg_val_loss = val_loss / max(val_batches, 1)

        print(f"Epoch {epoch+1}: train_loss={avg_train_loss:.4f}, val_loss={avg_val_loss:.4f}")

        # Save best model
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            weights = flatten_params(model.parameters())
            mx.save_safetensors(str(output_dir / "model.safetensors"), weights)
            print(f"  Saved best model (val_loss={avg_val_loss:.4f})")

    # Save final config
    with open(output_dir / "config.json", "w") as f:
        json.dump({
            "domain": domain,
            "model_config": model_config.__dict__,
            "train_config": config.__dict__,
            "best_val_loss": best_val_loss,
        }, f, indent=2)

    print(f"\nTraining complete! Model saved to {output_dir}")


def main():
    parser = argparse.ArgumentParser(description="Train Lumina specialist")
    parser.add_argument("--domain", type=str, required=True, choices=["prism", "math", "general"])
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=3e-4)

    args = parser.parse_args()

    config = TrainConfig(
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
    )

    train(args.domain, config)


if __name__ == "__main__":
    main()
