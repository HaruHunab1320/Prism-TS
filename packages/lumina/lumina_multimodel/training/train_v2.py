#!/usr/bin/env python3
"""
Lumina PoC v2 Training Script

Improvements over v1:
- GPT-2 tokenizer for proper text handling
- Larger models with configurable sizes
- Better calibration loss
- Comprehensive evaluation metrics
- Resume from checkpoint support

Usage:
    python train_v2.py --domain prism --size medium --epochs 20
    python train_v2.py --domain math --size large --epochs 30
"""

import argparse
import json
import os
import sys
import random
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from dataclasses import asdict
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).parent.parent))

# MLX imports
try:
    import mlx.core as mx
    import mlx.nn as nn
    import mlx.optimizers as optim
except ImportError:
    print("MLX not available. Install: pip install mlx")
    sys.exit(1)

# Tokenizer
try:
    from transformers import GPT2Tokenizer
    HAS_TOKENIZER = True
except ImportError:
    HAS_TOKENIZER = False
    print("Warning: transformers not installed. Using simple tokenizer.")
    print("Install for better results: pip install transformers")

from config_v2 import (
    DATASETS_DIR, OUTPUTS_DIR, MODEL_SIZES, TrainConfig, DATASET_CONFIG
)
from models.base import TinySpecialist, ConfidenceOutput


# ============================================================================
# Tokenizer
# ============================================================================

class Tokenizer:
    """Wrapper for GPT-2 tokenizer with fallback."""

    def __init__(self):
        if HAS_TOKENIZER:
            self.tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
            self.tokenizer.pad_token = self.tokenizer.eos_token
            self.vocab_size = self.tokenizer.vocab_size
        else:
            self.tokenizer = None
            self.vocab_size = 50257  # GPT-2 vocab size

    def encode(self, text: str, max_length: int = 256) -> List[int]:
        if self.tokenizer:
            tokens = self.tokenizer.encode(
                text,
                max_length=max_length,
                truncation=True,
                padding='max_length'
            )
        else:
            # Simple fallback
            tokens = [ord(c) % self.vocab_size for c in text[:max_length]]
            tokens = tokens + [0] * (max_length - len(tokens))
        return tokens

    def decode(self, tokens: List[int]) -> str:
        if self.tokenizer:
            return self.tokenizer.decode(tokens, skip_special_tokens=True)
        else:
            return "".join(chr(t % 128) if t > 0 else "" for t in tokens)


# ============================================================================
# Data Loading
# ============================================================================

def load_jsonl(path: Path) -> List[Dict]:
    """Load JSONL file."""
    if not path.exists():
        return []
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]


def prepare_batch(
    samples: List[Dict],
    tokenizer: Tokenizer,
    max_length: int = 256
) -> Tuple[mx.array, mx.array, mx.array, mx.array, mx.array]:
    """Prepare a batch with answer-span masking for LM loss."""
    input_ids = []
    labels = []
    confidences = []
    answer_masks = []
    ood_labels = []

    for sample in samples:
        # Format as Q&A
        input_text = f"Question: {sample['question']}\nAnswer:"
        full_text = f"{input_text} {sample['answer']}"

        # Padded tokens for model input/labels
        full_tokens = tokenizer.encode(full_text, max_length + 1)
        input_ids.append(full_tokens[:-1])
        labels.append(full_tokens[1:])

        # Unpadded tokens to locate the answer boundary
        if tokenizer.tokenizer:
            input_tokens = tokenizer.tokenizer.encode(
                input_text, max_length=max_length + 1, truncation=True
            )
        else:
            input_tokens = [ord(c) % tokenizer.vocab_size for c in input_text[: max_length + 1]]

        answer_start = min(len(input_tokens), max_length)

        # Mask LM loss to answer tokens only (align with shifted labels)
        mask = [0.0] * max_length
        start_idx = max(0, answer_start - 1)
        for i in range(start_idx, max_length):
            mask[i] = 1.0
        answer_masks.append(mask)

        # Confidence targets
        conf = sample.get("confidence", {})
        confidences.append([
            conf.get("overall", 0.8),
            conf.get("epistemic", 0.1),
            conf.get("aleatoric", 0.1),
            conf.get("distribution_shift", 0.1),
        ])
        ood_labels.append(1.0 if sample.get("category") == "ood" else 0.0)

    return (
        mx.array(input_ids),
        mx.array(labels),
        mx.array(confidences),
        mx.array(answer_masks),
        mx.array(ood_labels),
    )


# ============================================================================
# Loss Functions with Calibration
# ============================================================================

def compute_loss(
    model: TinySpecialist,
    input_ids: mx.array,
    labels: mx.array,
    answer_mask: mx.array,
    target_conf: mx.array,
    ood_labels: mx.array,
    config: TrainConfig
) -> Tuple[mx.array, Dict[str, float]]:
    """Compute combined loss with calibration."""

    logits, confidence = model(input_ids)
    _, _, V = logits.shape

    # Language modeling loss (answer tokens only)
    log_probs = mx.log(mx.softmax(logits, axis=-1) + 1e-8)
    target_log_probs = mx.take_along_axis(log_probs, labels[..., None], axis=-1).squeeze(-1)
    nll = -target_log_probs
    mask_sum = mx.maximum(answer_mask.sum(), mx.array(1.0))
    lm_loss = (nll * answer_mask).sum() / mask_sum

    # Predicted tokens
    preds = mx.argmax(logits, axis=-1)
    correct = (preds == labels).astype(mx.float32)
    accuracy = (correct * answer_mask).sum() / mask_sum

    # Per-sample accuracy target for confidence head
    per_sample_correct = (correct * answer_mask).sum(axis=1) / mx.maximum(answer_mask.sum(axis=1), mx.array(1.0))

    # Confidence MSE loss (overall + OOD)
    conf_loss = (
        mx.mean((confidence["overall"] - per_sample_correct) ** 2) +
        mx.mean((confidence["distribution_shift"] - ood_labels) ** 2)
    ) / 2

    # ECE-inspired loss: penalize gap between confidence and accuracy
    calibration_loss = mx.abs(confidence["overall"].mean() - accuracy)

    # Total loss
    total = (
        config.lm_weight * lm_loss +
        config.confidence_weight * conf_loss +
        config.calibration_weight * calibration_loss
    )

    metrics = {
        "total": float(total.item()),
        "lm": float(lm_loss.item()),
        "conf": float(conf_loss.item()),
        "calib": float(calibration_loss.item()),
        "acc": float(accuracy.item()),
        "avg_conf": float(confidence["overall"].mean().item()),
    }

    return total, metrics


# ============================================================================
# Utilities
# ============================================================================

def count_parameters(params) -> int:
    """Count parameters in nested dict."""
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
    """Flatten nested params for saving."""
    flat = {}
    if isinstance(params, dict):
        for k, v in params.items():
            new_key = f"{prefix}.{k}" if prefix else k
            flat.update(flatten_params(v, new_key))
    elif isinstance(params, list):
        for i, v in enumerate(params):
            new_key = f"{prefix}.{i}" if prefix else str(i)
            flat.update(flatten_params(v, new_key))
    elif hasattr(params, 'shape'):
        flat[prefix] = params
    return flat


def save_checkpoint(
    model: TinySpecialist,
    optimizer,
    epoch: int,
    step: int,
    metrics: Dict,
    output_dir: Path
):
    """Save training checkpoint."""
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save model weights
    weights = flatten_params(model.parameters())
    mx.save_safetensors(str(output_dir / "model.safetensors"), weights)

    # Save training state
    state = {
        "epoch": epoch,
        "step": step,
        "metrics": metrics,
    }
    with open(output_dir / "training_state.json", "w") as f:
        json.dump(state, f, indent=2)


# ============================================================================
# Training
# ============================================================================

def train(
    domain: str,
    model_size: str = "medium",
    epochs: int = 20,
    batch_size: int = 8,
    learning_rate: float = 3e-4,
    resume: Optional[Path] = None,
    data_root: Optional[Path] = None,
    max_train_samples: Optional[int] = None,
    max_val_samples: Optional[int] = None,
    warmup_epochs: int = 1,
):
    """Train a specialist with improved pipeline."""

    print(f"\n{'='*60}")
    print(f"Training {domain.upper()} Specialist (v2)")
    print(f"{'='*60}")

    # Config
    model_config = MODEL_SIZES[model_size]
    train_config = TrainConfig(
        model_size=model_size,
        epochs=epochs,
        batch_size=batch_size,
        learning_rate=learning_rate,
    )

    print(f"Model size: {model_size} (~{model_config.approx_params}M params)")
    print(f"Epochs: {epochs}")
    print(f"Batch size: {batch_size}")
    print(f"Warmup epochs (full LM loss): {warmup_epochs}")

    # Load data
    if data_root is None:
        candidates = [
            DATASETS_DIR.parent / "datasets_merged",
            DATASETS_DIR.parent / "datasets_real",
            DATASETS_DIR,
        ]
        for cand in candidates:
            if (cand / f"{domain}_specialist" / "train.jsonl").exists():
                data_root = cand
                break
        else:
            data_root = DATASETS_DIR.parent / "datasets_real"

    train_path = data_root / f"{domain}_specialist" / "train.jsonl"
    val_path = data_root / f"{domain}_specialist" / "val.jsonl"

    if not train_path.exists():
        print(f"Error: Data not found at {train_path}")
        print("Run data ingestion/generation first.")
        return

    train_data = load_jsonl(train_path)
    val_data = load_jsonl(val_path)

    if max_train_samples:
        train_data = train_data[:max_train_samples]
    if max_val_samples:
        val_data = val_data[:max_val_samples]

    print(f"Data root: {data_root}")
    print(f"Train samples: {len(train_data):,}")
    print(f"Val samples: {len(val_data):,}")

    # Tokenizer
    tokenizer = Tokenizer()
    print(f"Tokenizer: {'GPT-2' if HAS_TOKENIZER else 'Simple'}")

    # Create model
    model = TinySpecialist(model_config)
    num_params = count_parameters(model.parameters())
    print(f"Model parameters: {num_params:,}")

    # Optimizer with warmup
    total_steps = (len(train_data) // batch_size) * epochs
    warmup_steps = int(total_steps * train_config.warmup_ratio)

    optimizer = optim.AdamW(
        learning_rate=learning_rate,
        weight_decay=train_config.weight_decay
    )

    # Training state
    state = [model.state, optimizer.state]
    start_epoch = 0
    global_step = 0

    # Resume from checkpoint
    if resume and resume.exists():
        print(f"Resuming from {resume}")
        weights = mx.load(str(resume / "model.safetensors"))
        model.load_weights(list(weights.items()))

        state_path = resume / "training_state.json"
        if state_path.exists():
            with open(state_path) as f:
                saved_state = json.load(f)
            start_epoch = saved_state["epoch"]
            global_step = saved_state["step"]

    # Output directory
    output_dir = OUTPUTS_DIR / f"{domain}_specialist_{model_size}"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Loss function
    def loss_fn(model, input_ids, labels, answer_mask, confidences, ood_labels):
        total, _ = compute_loss(
            model, input_ids, labels, answer_mask, confidences, ood_labels, train_config
        )
        return total

    loss_and_grad = nn.value_and_grad(model, loss_fn)

    # Training loop
    best_val_loss = float("inf")
    history = []

    for epoch in range(start_epoch, epochs):
        random.shuffle(train_data)

        epoch_metrics = {"lm": 0, "conf": 0, "calib": 0, "acc": 0}
        num_batches = 0

        pbar = tqdm(
            range(0, len(train_data), batch_size),
            desc=f"Epoch {epoch+1}/{epochs}"
        )

        for i in pbar:
            batch = train_data[i:i + batch_size]
            if len(batch) < 2:
                continue

            # Learning rate warmup
            if global_step < warmup_steps:
                lr = learning_rate * (global_step / warmup_steps)
                optimizer.learning_rate = lr
            else:
                # Cosine decay
                progress = (global_step - warmup_steps) / (total_steps - warmup_steps)
                lr = learning_rate * 0.5 * (1 + math.cos(math.pi * progress))
                optimizer.learning_rate = lr

            # Prepare batch
            input_ids, labels, confidences, answer_mask, ood_labels = prepare_batch(batch, tokenizer)
            if epoch < warmup_epochs:
                answer_mask = mx.ones(labels.shape)

            # Forward + backward
            loss, grads = loss_and_grad(model, input_ids, labels, answer_mask, confidences, ood_labels)

            # Get metrics (re-run forward for metrics)
            _, metrics = compute_loss(
                model, input_ids, labels, answer_mask, confidences, ood_labels, train_config
            )

            # Gradient clipping
            grads, _ = optim.clip_grad_norm(grads, max_norm=train_config.max_grad_norm)

            # Update
            optimizer.update(model, grads)
            mx.eval(state)

            # Track metrics
            for k in epoch_metrics:
                epoch_metrics[k] += metrics.get(k, 0)
            num_batches += 1
            global_step += 1

            # Update progress bar
            pbar.set_postfix({
                "loss": f"{metrics['total']:.4f}",
                "acc": f"{metrics['acc']:.2f}",
                "conf": f"{metrics['avg_conf']:.2f}",
            })

        # Average epoch metrics
        for k in epoch_metrics:
            epoch_metrics[k] /= num_batches

        # Validation
        val_metrics = evaluate(model, val_data, tokenizer, train_config)

        print(f"Epoch {epoch+1}: train_loss={epoch_metrics['lm']:.4f}, "
              f"val_loss={val_metrics['lm']:.4f}, "
              f"acc={val_metrics['acc']:.2f}, "
              f"conf={val_metrics['avg_conf']:.2f}")

        # Save best
        if val_metrics["total"] < best_val_loss:
            best_val_loss = val_metrics["total"]
            save_checkpoint(model, optimizer, epoch, global_step, val_metrics, output_dir)
            print(f"  ✓ Saved best model")

        history.append({
            "epoch": epoch + 1,
            "train": epoch_metrics,
            "val": val_metrics,
        })

    # Save training history
    with open(output_dir / "history.json", "w") as f:
        json.dump(history, f, indent=2)

    # Save config
    with open(output_dir / "config.json", "w") as f:
        json.dump({
            "domain": domain,
            "model_size": model_size,
            "model_config": asdict(model_config) if hasattr(model_config, '__dataclass_fields__') else model_config.__dict__,
            "train_config": asdict(train_config) if hasattr(train_config, '__dataclass_fields__') else train_config.__dict__,
            "best_val_loss": best_val_loss,
            "total_epochs": epochs,
        }, f, indent=2)

    print(f"\n✓ Training complete!")
    print(f"  Model saved to: {output_dir}")
    print(f"  Best val loss: {best_val_loss:.4f}")


def evaluate(
    model: TinySpecialist,
    data: List[Dict],
    tokenizer: Tokenizer,
    config: TrainConfig,
    max_batches: int = 100
) -> Dict[str, float]:
    """Evaluate model on validation set."""
    metrics = {"total": 0, "lm": 0, "conf": 0, "calib": 0, "acc": 0, "avg_conf": 0}
    num_batches = 0

    for i in range(0, min(len(data), max_batches * config.batch_size), config.batch_size):
        batch = data[i:i + config.batch_size]
        if len(batch) < 2:
            continue

        input_ids, labels, confidences, answer_mask, ood_labels = prepare_batch(batch, tokenizer)
        _, batch_metrics = compute_loss(model, input_ids, labels, answer_mask, confidences, ood_labels, config)

        for k in metrics:
            metrics[k] += batch_metrics.get(k, 0)
        num_batches += 1

    for k in metrics:
        metrics[k] /= max(num_batches, 1)

    return metrics


# ============================================================================
# Main
# ============================================================================

import math

def main():
    parser = argparse.ArgumentParser(description="Train Lumina specialist v2")
    parser.add_argument("--domain", type=str, required=True,
                        choices=["prism", "math", "code", "general"])
    parser.add_argument("--size", type=str, default="medium",
                        choices=["small", "medium", "large", "xlarge"])
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--resume", type=Path, default=None)
    parser.add_argument("--data-root", type=Path, default=None,
                        help="Override dataset root (e.g., datasets_merged)")
    parser.add_argument("--max-train-samples", type=int, default=None,
                        help="Cap training samples for quick validation runs")
    parser.add_argument("--max-val-samples", type=int, default=None,
                        help="Cap validation samples for quick validation runs")
    parser.add_argument("--warmup-epochs", type=int, default=1,
                        help="Epochs with full-sequence LM loss before answer-only loss")

    args = parser.parse_args()

    train(
        domain=args.domain,
        model_size=args.size,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        resume=args.resume,
        data_root=args.data_root,
        max_train_samples=args.max_train_samples,
        max_val_samples=args.max_val_samples,
        warmup_epochs=args.warmup_epochs,
    )


if __name__ == "__main__":
    main()
