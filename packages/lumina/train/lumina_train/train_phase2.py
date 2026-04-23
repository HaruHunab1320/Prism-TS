"""
Phase 2 Training: Soft Token Propagation

Train with soft targets to teach the model to work with distributions.

Key differences from Phase 1:
1. Use soft targets (label smoothing on steroids)
2. KL divergence loss instead of cross-entropy
3. Track distribution preservation metrics

Usage:
    python -m lumina_train.train_phase2 --checkpoint outputs/lumina-tiny-xxx/checkpoint-yyy
"""

import argparse
import json
import time
from pathlib import Path
from typing import Optional, Dict
from dataclasses import dataclass, asdict

import mlx.core as mx
import mlx.nn as nn
import mlx.optimizers as optim
from tqdm import tqdm

from .config import get_config, LuminaConfig
from .model import LuminaModel, LuminaOutput
from .losses import lumina_loss, compute_calibration_metrics
from .data import load_tokenizer, create_train_dataloader, create_eval_dataloader, Batch
from .soft_embeddings import SoftTargetLoss, create_soft_targets_from_logits
from .train import flatten_params, get_lr_schedule


@dataclass
class Phase2Config:
    """Phase 2 training configuration."""

    # Checkpoint to continue from (Phase 1 trained model)
    checkpoint_path: Optional[str] = None

    # Model (if training from scratch)
    model_config: str = "tiny"

    # Soft target settings
    soft_target_temperature: float = 2.0  # Higher = softer targets
    soft_target_weight: float = 0.5  # Weight of soft target loss
    hard_target_weight: float = 0.5  # Weight of hard target loss

    # Data
    dataset: str = "wikitext"
    max_length: int = 256
    batch_size: int = 8

    # Training
    epochs: int = 5
    learning_rate: float = 5e-5  # Lower LR for fine-tuning
    weight_decay: float = 0.01
    warmup_steps: int = 50

    # Confidence head (continue training)
    brier_weight: float = 0.1

    # Logging
    log_interval: int = 20
    eval_interval: int = 200
    save_interval: int = 500

    # Output
    output_dir: str = "outputs"
    run_name: Optional[str] = None


def soft_target_loss(
    logits: mx.array,
    targets: mx.array,
    temperature: float = 2.0,
    smoothing: float = 0.2,  # Label smoothing factor
    ignore_index: int = -100,
) -> mx.array:
    """
    Compute soft target loss using label-smoothed cross-entropy.

    Instead of one-hot targets, we create soft targets:
    - (1 - smoothing) probability on correct token
    - smoothing / (vocab_size - 1) distributed across other tokens

    This teaches the model to maintain uncertainty, not collapse.
    """
    batch_size, seq_len, vocab_size = logits.shape

    # Create mask
    mask = (targets != ignore_index).astype(logits.dtype)
    targets_safe = mx.clip(targets, 0, vocab_size - 1)

    # Apply temperature to logits
    scaled_logits = logits / temperature
    log_probs = mx.log(mx.softmax(scaled_logits, axis=-1) + 1e-10)

    # Soft target loss = (1 - smooth) * hard_loss + smooth * uniform_loss
    # hard_loss = -log(P(correct))
    # uniform_loss = -mean(log(P(all)))

    # Hard target component
    # log_probs: [batch, seq, vocab], targets_safe: [batch, seq]
    target_log_probs = mx.take_along_axis(
        log_probs, targets_safe[..., None], axis=-1
    ).squeeze(-1)  # [batch, seq]
    hard_component = -target_log_probs

    # Uniform component (encourages spreading probability)
    uniform_component = -log_probs.mean(axis=-1)  # [batch, seq]

    # Combined soft loss
    soft_loss = (1 - smoothing) * hard_component + smoothing * uniform_component

    # Apply mask and temperature scaling
    soft_loss = (soft_loss * mask).sum() / (mask.sum() + 1e-10)

    # Scale by temperature^2 (knowledge distillation convention)
    return soft_loss * (temperature ** 2)


def combined_loss(
    output: LuminaOutput,
    targets: mx.array,
    config: Phase2Config,
) -> Dict[str, mx.array]:
    """
    Combined loss for Phase 2:
    - Hard target loss (standard cross-entropy)
    - Soft target loss (KL divergence)
    - Brier calibration loss
    """
    mask = (targets != -100).astype(output.logits.dtype)

    # Hard target loss (cross-entropy)
    logits_flat = output.logits.reshape(-1, output.logits.shape[-1])
    targets_flat = targets.reshape(-1)
    targets_safe = mx.clip(targets_flat, 0, output.logits.shape[-1] - 1)

    log_probs = mx.log(mx.softmax(logits_flat, axis=-1) + 1e-10)
    target_log_probs = mx.take_along_axis(log_probs, targets_safe[:, None], axis=-1).squeeze(-1)
    hard_loss = (-target_log_probs * mask.reshape(-1)).sum() / (mask.sum() + 1e-10)

    # Soft target loss
    soft_loss = soft_target_loss(
        output.logits,
        targets,
        temperature=config.soft_target_temperature,
    )

    # Brier calibration loss
    predictions = mx.argmax(output.logits, axis=-1)
    correct = (predictions == targets).astype(mx.float32) * mask
    brier = ((output.confidence.overall - correct) ** 2 * mask).sum() / (mask.sum() + 1e-10)

    # Total loss
    total = (
        config.hard_target_weight * hard_loss
        + config.soft_target_weight * soft_loss
        + config.brier_weight * brier
    )

    return {
        "total": total,
        "hard_loss": hard_loss,
        "soft_loss": soft_loss,
        "brier_loss": brier,
    }


def evaluate_phase2(
    model: LuminaModel,
    eval_loader,
    config: Phase2Config,
    max_batches: int = 50,
) -> Dict[str, float]:
    """Evaluate model with Phase 2 metrics."""
    total_hard_loss = 0.0
    total_soft_loss = 0.0
    total_brier = 0.0
    num_batches = 0

    all_confidences = []
    all_correct = []
    all_entropies = []

    for batch in eval_loader:
        if num_batches >= max_batches:
            break

        output, _ = model(batch.input_ids)
        losses = combined_loss(output, batch.labels, config)

        total_hard_loss += losses["hard_loss"].item()
        total_soft_loss += losses["soft_loss"].item()
        total_brier += losses["brier_loss"].item()
        num_batches += 1

        # Collect metrics
        mask = (batch.labels != -100).astype(mx.float32)
        predictions = mx.argmax(output.logits, axis=-1)
        correct = (predictions == batch.labels).astype(mx.float32) * mask

        conf_all = output.confidence.overall.reshape(-1).tolist()
        corr_all = correct.reshape(-1).tolist()
        entropy_all = output.entropy.reshape(-1).tolist()
        mask_flat = mask.reshape(-1).tolist()

        for c, r, e, m in zip(conf_all, corr_all, entropy_all, mask_flat):
            if m > 0.5:
                all_confidences.append(c)
                all_correct.append(r)
                all_entropies.append(e)

    # Compute calibration
    cal_metrics = compute_calibration_metrics(
        mx.array(all_confidences),
        mx.array(all_correct),
    )

    # Compute average entropy
    avg_entropy = sum(all_entropies) / len(all_entropies) if all_entropies else 0.0

    return {
        "eval_hard_loss": total_hard_loss / num_batches,
        "eval_soft_loss": total_soft_loss / num_batches,
        "eval_brier": total_brier / num_batches,
        "eval_ece": cal_metrics.ece,
        "eval_accuracy": cal_metrics.accuracy,
        "eval_avg_entropy": avg_entropy,
    }


def train_phase2(config: Phase2Config):
    """Phase 2 training: soft token propagation."""
    # Setup output
    output_dir = Path(config.output_dir)
    if config.run_name:
        output_dir = output_dir / config.run_name
    else:
        output_dir = output_dir / f"lumina-phase2-{int(time.time())}"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Output directory: {output_dir}")

    # Save config
    with open(output_dir / "config.json", "w") as f:
        json.dump(asdict(config), f, indent=2)

    # Load tokenizer
    tokenizer = load_tokenizer("gpt2")

    # Load or create model
    if config.checkpoint_path:
        print(f"Loading model from {config.checkpoint_path}")
        checkpoint_dir = Path(config.checkpoint_path)
        with open(checkpoint_dir / "config.json") as f:
            train_config = json.load(f)
        model_config = get_config(train_config["model_config"])
        model = LuminaModel(model_config)
        weights = mx.load(str(checkpoint_dir / "model.safetensors"))
        model.load_weights(list(weights.items()))
    else:
        print(f"Creating new model with config '{config.model_config}'")
        model_config = get_config(config.model_config)
        model = LuminaModel(model_config)

    # Create data loaders
    print(f"Loading {config.dataset} dataset...")
    train_loader = create_train_dataloader(
        tokenizer,
        batch_size=config.batch_size,
        max_length=config.max_length,
        dataset_name=config.dataset,
    )
    eval_loader = create_eval_dataloader(
        tokenizer,
        batch_size=config.batch_size,
        max_length=config.max_length,
        dataset_name=config.dataset,
        max_samples=400,
    )

    print(f"Train batches: {len(train_loader)}")

    # Optimizer
    total_steps = len(train_loader) * config.epochs
    optimizer = optim.AdamW(
        learning_rate=config.learning_rate,
        weight_decay=config.weight_decay,
    )

    state = [model.state, optimizer.state]

    # Loss function
    def loss_fn(model, batch):
        output, _ = model(batch.input_ids)
        losses = combined_loss(output, batch.labels, config)
        return losses["total"], losses

    loss_and_grad_fn = nn.value_and_grad(model, loss_fn)

    # Training loop
    print("\n" + "=" * 60)
    print("PHASE 2 TRAINING: SOFT TOKEN PROPAGATION")
    print("=" * 60)
    print(f"Total steps: {total_steps}")
    print(f"Soft target temperature: {config.soft_target_temperature}")
    print(f"Loss weights - Hard: {config.hard_target_weight}, Soft: {config.soft_target_weight}")
    print("-" * 60)

    global_step = 0
    best_eval_loss = float("inf")

    for epoch in range(config.epochs):
        epoch_losses = {"total": 0, "hard": 0, "soft": 0, "brier": 0}
        num_batches = 0

        progress = tqdm(train_loader, desc=f"Epoch {epoch + 1}/{config.epochs}")

        for batch in progress:
            # Update LR
            lr = get_lr_schedule(
                global_step,
                config.warmup_steps,
                config.learning_rate,
                total_steps,
            )
            optimizer.learning_rate = lr

            # Forward + backward
            (_, losses), grads = loss_and_grad_fn(model, batch)

            # Clip gradients
            grads, _ = optim.clip_grad_norm(grads, max_norm=1.0)

            # Update
            optimizer.update(model, grads)
            mx.eval(state)

            # Track
            epoch_losses["total"] += losses["total"].item()
            epoch_losses["hard"] += losses["hard_loss"].item()
            epoch_losses["soft"] += losses["soft_loss"].item()
            epoch_losses["brier"] += losses["brier_loss"].item()
            num_batches += 1
            global_step += 1

            progress.set_postfix({
                "total": f"{losses['total'].item():.3f}",
                "hard": f"{losses['hard_loss'].item():.3f}",
                "soft": f"{losses['soft_loss'].item():.3f}",
                "brier": f"{losses['brier_loss'].item():.3f}",
            })

            # Evaluate
            if global_step % config.eval_interval == 0:
                print(f"\nEvaluating at step {global_step}...")
                eval_metrics = evaluate_phase2(model, eval_loader, config)
                print(f"  Hard loss: {eval_metrics['eval_hard_loss']:.4f}")
                print(f"  Soft loss: {eval_metrics['eval_soft_loss']:.4f}")
                print(f"  ECE: {eval_metrics['eval_ece']:.4f}")
                print(f"  Accuracy: {eval_metrics['eval_accuracy']:.4f}")
                print(f"  Avg entropy: {eval_metrics['eval_avg_entropy']:.4f}")

                total_eval = eval_metrics["eval_hard_loss"] + eval_metrics["eval_soft_loss"]
                if total_eval < best_eval_loss:
                    best_eval_loss = total_eval
                    save_checkpoint(model, global_step, config, eval_metrics, output_dir)

            # Save periodically
            if global_step % config.save_interval == 0:
                save_checkpoint(
                    model, global_step, config,
                    {"step_loss": epoch_losses["total"] / num_batches},
                    output_dir
                )

        # Epoch summary
        print(f"\nEpoch {epoch + 1} complete")
        print(f"  Avg total loss: {epoch_losses['total'] / num_batches:.4f}")
        print(f"  Avg hard loss: {epoch_losses['hard'] / num_batches:.4f}")
        print(f"  Avg soft loss: {epoch_losses['soft'] / num_batches:.4f}")
        print(f"  Avg brier: {epoch_losses['brier'] / num_batches:.4f}")

    # Final evaluation
    print("\nFinal evaluation...")
    final_metrics = evaluate_phase2(model, eval_loader, config, max_batches=100)
    print(f"Final hard loss: {final_metrics['eval_hard_loss']:.4f}")
    print(f"Final ECE: {final_metrics['eval_ece']:.4f}")
    print(f"Final accuracy: {final_metrics['eval_accuracy']:.4f}")

    save_checkpoint(model, global_step, config, final_metrics, output_dir)
    print(f"\nPhase 2 training complete! Output: {output_dir}")

    return model, final_metrics


def save_checkpoint(model, step, config, metrics, output_dir):
    """Save checkpoint."""
    checkpoint_dir = output_dir / f"checkpoint-{step}"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    weights = flatten_params(model.parameters())
    mx.save_safetensors(str(checkpoint_dir / "model.safetensors"), weights)

    with open(checkpoint_dir / "config.json", "w") as f:
        json.dump(asdict(config), f, indent=2)

    with open(checkpoint_dir / "metrics.json", "w") as f:
        json.dump({"step": step, **metrics}, f, indent=2)

    print(f"Saved checkpoint to {checkpoint_dir}")


def main():
    parser = argparse.ArgumentParser(description="Phase 2: Soft Token Training")
    parser.add_argument("--checkpoint", type=str, help="Phase 1 checkpoint to continue from")
    parser.add_argument("--config", type=str, default="tiny", help="Model config if no checkpoint")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=5e-5)
    parser.add_argument("--soft-temp", type=float, default=2.0, help="Soft target temperature")
    parser.add_argument("--soft-weight", type=float, default=0.5, help="Soft loss weight")
    parser.add_argument("--output-dir", type=str, default="outputs")
    parser.add_argument("--run-name", type=str, default=None)
    args = parser.parse_args()

    config = Phase2Config(
        checkpoint_path=args.checkpoint,
        model_config=args.config,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        soft_target_temperature=args.soft_temp,
        soft_target_weight=args.soft_weight,
        hard_target_weight=1.0 - args.soft_weight,
        output_dir=args.output_dir,
        run_name=args.run_name,
    )

    train_phase2(config)


if __name__ == "__main__":
    main()
