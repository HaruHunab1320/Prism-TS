"""
Lumina Training Script

Train a Lumina model with confidence head on Apple Silicon using MLX.

Usage:
    python -m lumina_train.train --config small --epochs 10
    python -m lumina_train.train --config tiny --epochs 5 --debug
"""

import argparse
import json
import time
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass, asdict

import mlx.core as mx
import mlx.nn as nn
import mlx.optimizers as optim
from tqdm import tqdm

from .config import get_config, LuminaConfig
from .model import LuminaModel, create_model, count_parameters
from .losses import lumina_loss, LossOutput, compute_calibration_metrics
from .data import (
    load_tokenizer,
    create_train_dataloader,
    create_eval_dataloader,
    Batch,
)


@dataclass
class TrainConfig:
    """Training configuration."""

    # Model
    model_config: str = "small"

    # Data
    dataset: str = "wikitext"
    max_samples: Optional[int] = None
    max_length: int = 256
    batch_size: int = 8

    # Training
    epochs: int = 10
    learning_rate: float = 1e-4
    weight_decay: float = 0.01
    warmup_steps: int = 100
    max_grad_norm: float = 1.0

    # Loss weights
    lm_weight: float = 1.0
    brier_weight: float = 0.1
    focal_weight: float = 0.05
    entropy_weight: float = 0.01
    label_smoothing: float = 0.1

    # Logging
    log_interval: int = 10
    eval_interval: int = 100
    save_interval: int = 500

    # Output
    output_dir: str = "outputs"
    run_name: Optional[str] = None

    # Debug
    debug: bool = False


def get_lr_schedule(
    step: int,
    warmup_steps: int,
    base_lr: float,
    total_steps: int,
) -> float:
    """Cosine learning rate schedule with warmup."""
    if step < warmup_steps:
        return base_lr * step / warmup_steps
    else:
        progress = (step - warmup_steps) / (total_steps - warmup_steps)
        return base_lr * 0.5 * (1.0 + mx.cos(mx.array(progress * 3.14159)).item())


def train_step(
    model: LuminaModel,
    batch: Batch,
    config: TrainConfig,
) -> LossOutput:
    """Single training step - compute loss."""
    output, _ = model(batch.input_ids)
    loss = lumina_loss(
        output,
        batch.labels,
        lm_weight=config.lm_weight,
        brier_weight=config.brier_weight,
        focal_weight=config.focal_weight,
        entropy_weight=config.entropy_weight,
        label_smoothing=config.label_smoothing,
    )
    return loss


def evaluate(
    model: LuminaModel,
    eval_loader,
    config: TrainConfig,
    max_batches: int = 50,
) -> Dict[str, float]:
    """Evaluate model on validation set."""
    total_loss = 0.0
    total_lm_loss = 0.0
    total_brier = 0.0
    num_batches = 0

    all_confidences = []
    all_correct = []

    for batch in eval_loader:
        if num_batches >= max_batches:
            break

        output, _ = model(batch.input_ids)
        loss = lumina_loss(
            output,
            batch.labels,
            lm_weight=config.lm_weight,
            brier_weight=config.brier_weight,
            focal_weight=config.focal_weight,
            entropy_weight=config.entropy_weight,
            label_smoothing=0.0,  # No smoothing for eval
        )

        total_loss += loss.total.item()
        total_lm_loss += loss.lm_loss.item()
        total_brier += loss.brier_loss.item()
        num_batches += 1

        # Collect for calibration metrics
        # MLX doesn't support boolean indexing, so we flatten and filter
        mask = (batch.labels != -100).astype(mx.float32)
        predictions = mx.argmax(output.logits, axis=-1)
        correct = (predictions == batch.labels).astype(mx.float32) * mask

        # Flatten and convert to lists, then filter
        conf_all = output.confidence.overall.reshape(-1).tolist()
        corr_all = correct.reshape(-1).tolist()
        mask_flat = mask.reshape(-1).tolist()

        for c, r, m in zip(conf_all, corr_all, mask_flat):
            if m > 0.5:  # Valid position
                all_confidences.append(c)
                all_correct.append(r)

    # Compute calibration metrics
    cal_metrics = compute_calibration_metrics(
        mx.array(all_confidences),
        mx.array(all_correct),
    )

    return {
        "eval_loss": total_loss / num_batches,
        "eval_lm_loss": total_lm_loss / num_batches,
        "eval_brier": total_brier / num_batches,
        "eval_ece": cal_metrics.ece,
        "eval_mce": cal_metrics.mce,
        "eval_accuracy": cal_metrics.accuracy,
        "eval_avg_confidence": cal_metrics.avg_confidence,
    }


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


def save_checkpoint(
    model: LuminaModel,
    optimizer: optim.Optimizer,
    step: int,
    config: TrainConfig,
    metrics: Dict[str, float],
    output_dir: Path,
):
    """Save model checkpoint."""
    checkpoint_dir = output_dir / f"checkpoint-{step}"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    # Save model weights (flattened for safetensors)
    weights = flatten_params(model.parameters())
    mx.save_safetensors(str(checkpoint_dir / "model.safetensors"), weights)

    # Save config and metrics
    with open(checkpoint_dir / "config.json", "w") as f:
        json.dump(asdict(config), f, indent=2)

    with open(checkpoint_dir / "metrics.json", "w") as f:
        json.dump({"step": step, **metrics}, f, indent=2)

    print(f"Saved checkpoint to {checkpoint_dir}")


def train(config: TrainConfig):
    """Main training function."""
    # Setup output directory
    output_dir = Path(config.output_dir)
    if config.run_name:
        output_dir = output_dir / config.run_name
    else:
        output_dir = output_dir / f"lumina-{config.model_config}-{int(time.time())}"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Output directory: {output_dir}")

    # Save config
    with open(output_dir / "config.json", "w") as f:
        json.dump(asdict(config), f, indent=2)

    # Load tokenizer
    print("Loading tokenizer...")
    tokenizer = load_tokenizer("gpt2")

    # Create model
    print(f"Creating model with config '{config.model_config}'...")
    model = create_model(config.model_config)
    model_config = get_config(config.model_config)

    # Create data loaders
    print(f"Loading {config.dataset} dataset...")
    train_loader = create_train_dataloader(
        tokenizer,
        batch_size=config.batch_size,
        max_length=config.max_length,
        dataset_name=config.dataset,
        max_samples=config.max_samples if not config.debug else 100,
    )
    eval_loader = create_eval_dataloader(
        tokenizer,
        batch_size=config.batch_size,
        max_length=config.max_length,
        dataset_name=config.dataset,
        max_samples=50 if not config.debug else 20,
    )

    print(f"Train batches: {len(train_loader)}, Eval batches: {len(eval_loader)}")

    # Setup optimizer
    total_steps = len(train_loader) * config.epochs
    optimizer = optim.AdamW(
        learning_rate=config.learning_rate,
        weight_decay=config.weight_decay,
    )

    # Training state
    state = [model.state, optimizer.state]

    # Loss and gradient function
    def loss_fn(model, batch):
        loss = train_step(model, batch, config)
        return loss.total, loss

    loss_and_grad_fn = nn.value_and_grad(model, loss_fn)

    # Training loop
    print("\nStarting training...")
    print(f"Total steps: {total_steps}")
    print(f"Warmup steps: {config.warmup_steps}")
    print("-" * 50)

    global_step = 0
    best_eval_loss = float("inf")

    for epoch in range(config.epochs):
        epoch_loss = 0.0
        epoch_lm_loss = 0.0
        epoch_brier = 0.0
        num_batches = 0

        progress_bar = tqdm(
            train_loader,
            desc=f"Epoch {epoch + 1}/{config.epochs}",
            leave=True,
        )

        for batch in progress_bar:
            # Update learning rate
            lr = get_lr_schedule(
                global_step,
                config.warmup_steps,
                config.learning_rate,
                total_steps,
            )
            optimizer.learning_rate = lr

            # Forward and backward
            (loss_value, loss_output), grads = loss_and_grad_fn(model, batch)

            # Gradient clipping
            grads, _ = optim.clip_grad_norm(grads, max_norm=config.max_grad_norm)

            # Update weights
            optimizer.update(model, grads)
            mx.eval(state)

            # Track losses
            epoch_loss += loss_output.total.item()
            epoch_lm_loss += loss_output.lm_loss.item()
            epoch_brier += loss_output.brier_loss.item()
            num_batches += 1
            global_step += 1

            # Update progress bar
            progress_bar.set_postfix({
                "loss": f"{loss_output.total.item():.4f}",
                "lm": f"{loss_output.lm_loss.item():.4f}",
                "brier": f"{loss_output.brier_loss.item():.4f}",
                "lr": f"{lr:.2e}",
            })

            # Logging
            if global_step % config.log_interval == 0:
                avg_loss = epoch_loss / num_batches
                avg_lm = epoch_lm_loss / num_batches
                avg_brier = epoch_brier / num_batches

            # Evaluation
            if global_step % config.eval_interval == 0:
                print(f"\nEvaluating at step {global_step}...")
                eval_metrics = evaluate(model, eval_loader, config)
                print(f"  Eval loss: {eval_metrics['eval_loss']:.4f}")
                print(f"  Eval LM loss: {eval_metrics['eval_lm_loss']:.4f}")
                print(f"  Eval Brier: {eval_metrics['eval_brier']:.4f}")
                print(f"  Eval ECE: {eval_metrics['eval_ece']:.4f}")
                print(f"  Eval accuracy: {eval_metrics['eval_accuracy']:.4f}")
                print(f"  Avg confidence: {eval_metrics['eval_avg_confidence']:.4f}")

                # Save best model
                if eval_metrics["eval_loss"] < best_eval_loss:
                    best_eval_loss = eval_metrics["eval_loss"]
                    save_checkpoint(
                        model, optimizer, global_step, config,
                        eval_metrics, output_dir
                    )

            # Periodic save
            if global_step % config.save_interval == 0:
                save_checkpoint(
                    model, optimizer, global_step, config,
                    {"train_loss": epoch_loss / num_batches},
                    output_dir
                )

            if config.debug and global_step >= 50:
                print("Debug mode: stopping early")
                break

        # End of epoch summary
        print(f"\nEpoch {epoch + 1} complete")
        print(f"  Avg train loss: {epoch_loss / num_batches:.4f}")
        print(f"  Avg LM loss: {epoch_lm_loss / num_batches:.4f}")
        print(f"  Avg Brier: {epoch_brier / num_batches:.4f}")

        if config.debug:
            break

    # Final evaluation
    print("\nFinal evaluation...")
    final_metrics = evaluate(model, eval_loader, config, max_batches=100)
    print(f"Final eval loss: {final_metrics['eval_loss']:.4f}")
    print(f"Final ECE: {final_metrics['eval_ece']:.4f}")
    print(f"Final accuracy: {final_metrics['eval_accuracy']:.4f}")

    # Save final model
    save_checkpoint(model, optimizer, global_step, config, final_metrics, output_dir)

    print(f"\nTraining complete! Output saved to {output_dir}")
    return model, final_metrics


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Train Lumina model")

    # Model
    parser.add_argument(
        "--config", type=str, default="small",
        choices=["tiny", "small", "base", "medium"],
        help="Model configuration"
    )

    # Data
    parser.add_argument("--dataset", type=str, default="wikitext")
    parser.add_argument("--max-samples", type=int, default=None)
    parser.add_argument("--max-length", type=int, default=256)
    parser.add_argument("--batch-size", type=int, default=8)

    # Training
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--weight-decay", type=float, default=0.01)
    parser.add_argument("--warmup-steps", type=int, default=100)

    # Loss weights
    parser.add_argument("--lm-weight", type=float, default=1.0)
    parser.add_argument("--brier-weight", type=float, default=0.1)
    parser.add_argument("--focal-weight", type=float, default=0.05)
    parser.add_argument("--entropy-weight", type=float, default=0.01)

    # Logging
    parser.add_argument("--log-interval", type=int, default=10)
    parser.add_argument("--eval-interval", type=int, default=100)
    parser.add_argument("--save-interval", type=int, default=500)

    # Output
    parser.add_argument("--output-dir", type=str, default="outputs")
    parser.add_argument("--run-name", type=str, default=None)

    # Debug
    parser.add_argument("--debug", action="store_true")

    args = parser.parse_args()

    config = TrainConfig(
        model_config=args.config,
        dataset=args.dataset,
        max_samples=args.max_samples,
        max_length=args.max_length,
        batch_size=args.batch_size,
        epochs=args.epochs,
        learning_rate=args.lr,
        weight_decay=args.weight_decay,
        warmup_steps=args.warmup_steps,
        lm_weight=args.lm_weight,
        brier_weight=args.brier_weight,
        focal_weight=args.focal_weight,
        entropy_weight=args.entropy_weight,
        log_interval=args.log_interval,
        eval_interval=args.eval_interval,
        save_interval=args.save_interval,
        output_dir=args.output_dir,
        run_name=args.run_name,
        debug=args.debug,
    )

    train(config)


if __name__ == "__main__":
    main()
