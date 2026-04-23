"""
Phase 4 Training: Confidence-Gated Attention

Train the model to use confidence-gated attention, where attention weights
are modulated by the source token's confidence scores.

Key innovations:
1. Confidence flows backward through attention
2. Low-confidence tokens have reduced influence
3. Model learns to track uncertainty through computation

Usage:
    python -m lumina_train.train_phase4 --checkpoint outputs/lumina-phase2-xxx/checkpoint-yyy
"""

import argparse
import json
import time
from pathlib import Path
from typing import Optional, Dict, Tuple, List
from dataclasses import dataclass, asdict
import math

import mlx.core as mx
import mlx.nn as nn
import mlx.optimizers as optim
from tqdm import tqdm

from .config import get_config, LuminaConfig
from .model import LuminaModel, ConfidenceOutput
from .confidence_attention import ConfidenceGatedAttention, ConfidenceGatedTransformerLayer
from .losses import compute_calibration_metrics
from .data import load_tokenizer, create_train_dataloader, create_eval_dataloader
from .train import flatten_params, get_lr_schedule


@dataclass
class Phase4Config:
    """Phase 4 training configuration."""

    # Checkpoint to continue from
    checkpoint_path: Optional[str] = None
    model_config: str = "tiny"

    # Data
    dataset: str = "wikitext"
    max_length: int = 256
    batch_size: int = 8

    # Training
    epochs: int = 3
    learning_rate: float = 3e-5  # Lower LR for fine-tuning
    weight_decay: float = 0.01
    warmup_steps: int = 100

    # Loss weights
    lm_weight: float = 1.0
    calibration_weight: float = 0.1
    propagation_weight: float = 0.2  # Encourage proper confidence propagation

    # Confidence gating
    gating_warmup_steps: int = 200  # Steps before full gating
    min_gating_strength: float = 0.0
    max_gating_strength: float = 1.0

    # Logging
    log_interval: int = 20
    eval_interval: int = 200
    save_interval: int = 500

    # Output
    output_dir: str = "outputs"
    run_name: Optional[str] = None


class LuminaPhase4Model(nn.Module):
    """
    Lumina model with confidence-gated attention layers.

    This is an enhanced version of LuminaModel where attention is
    modulated by confidence scores.
    """

    def __init__(self, config: LuminaConfig, base_model: Optional[LuminaModel] = None):
        super().__init__()
        self.config = config

        if base_model is not None:
            # Copy base model components that we can transfer directly
            self.token_embedding = base_model.token_embedding
            self.confidence_head = base_model.confidence_head
            self.lm_head = base_model.lm_head
            self.norm = base_model.norm

            # Create new confidence-gated layers (train from scratch)
            # The confidence gating mechanism is new, so we initialize fresh
            self.layers = [
                ConfidenceGatedTransformerLayer(config)
                for _ in range(config.num_layers)
            ]

            # Copy what we can from old layers to new layers
            for i, (new_layer, old_layer) in enumerate(zip(self.layers, base_model.layers)):
                try:
                    # Try to copy attention weights
                    new_layer.attention.q_proj.weight = old_layer.attention.q_proj.weight
                    new_layer.attention.k_proj.weight = old_layer.attention.k_proj.weight
                    new_layer.attention.v_proj.weight = old_layer.attention.v_proj.weight
                    new_layer.attention.o_proj.weight = old_layer.attention.o_proj.weight
                except AttributeError:
                    print(f"  Layer {i}: Initializing attention from scratch")

                try:
                    # Try to copy norms (use correct attribute names)
                    new_layer.attn_norm.weight = old_layer.attention_norm.weight
                    new_layer.mlp_norm.weight = old_layer.ffn_norm.weight
                except AttributeError:
                    print(f"  Layer {i}: Initializing norms from scratch")

                try:
                    # Try to copy MLP weights
                    new_layer.mlp_up.weight = old_layer.feed_forward.w1.weight
                    new_layer.mlp_down.weight = old_layer.feed_forward.w2.weight
                except AttributeError:
                    print(f"  Layer {i}: Initializing MLP from scratch")
        else:
            # Create from scratch
            self.token_embedding = nn.Embedding(config.vocab_size, config.hidden_dim)
            self.layers = [
                ConfidenceGatedTransformerLayer(config)
                for _ in range(config.num_layers)
            ]
            self.norm = nn.LayerNorm(config.hidden_dim)
            self.lm_head = nn.Linear(config.hidden_dim, config.vocab_size, bias=False)

            # Confidence head (same as base model)
            from .model import ConfidenceHead
            self.confidence_head = ConfidenceHead(config)

    def __call__(
        self,
        input_ids: mx.array,
        use_confidence_gating: bool = True,
        gating_strength: float = 1.0,
    ) -> Tuple[mx.array, mx.array, ConfidenceOutput, List[mx.array]]:
        """
        Forward pass with confidence-gated attention.

        Args:
            input_ids: [batch, seq] input token IDs
            use_confidence_gating: Whether to use confidence gating
            gating_strength: How strongly to apply gating (0=none, 1=full)

        Returns:
            (logits, entropy, confidence, layer_confidences)
        """
        batch_size, seq_len = input_ids.shape

        # Embed
        hidden_states = self.token_embedding(input_ids)

        # Create causal mask
        causal_mask = mx.tril(mx.ones((seq_len, seq_len)))[None, None, :, :]

        # Initial confidence from first pass confidence head estimate
        # We'll use uniform confidence initially and refine through layers
        confidence = mx.ones((batch_size, seq_len)) * 0.5

        # Track confidence at each layer
        layer_confidences = [confidence]

        # Forward through layers with confidence gating
        for layer in self.layers:
            # Get confidence estimate for current hidden state
            layer_conf = self.confidence_head(hidden_states)
            confidence = layer_conf.overall

            # Apply layer with gating
            hidden_states, effective_conf = layer(
                hidden_states,
                confidence,
                causal_mask,
                use_confidence_gating=use_confidence_gating,
            )

            # Blend effective confidence with gating strength
            confidence = (1 - gating_strength) * confidence + gating_strength * effective_conf
            layer_confidences.append(confidence)

        # Final norm
        hidden_states = self.norm(hidden_states)

        # Output logits
        logits = self.lm_head(hidden_states)

        # Compute entropy
        probs = mx.softmax(logits, axis=-1)
        log_probs = mx.log(probs + 1e-10)
        entropy = -mx.sum(probs * log_probs, axis=-1)

        # Final confidence
        final_confidence = self.confidence_head(hidden_states)

        return logits, entropy, final_confidence, layer_confidences


def confidence_propagation_loss(
    layer_confidences: List[mx.array],
    predictions_correct: mx.array,
    mask: mx.array,
) -> mx.array:
    """
    Loss to encourage proper confidence propagation.

    The confidence should converge toward the actual correctness as we go
    through layers. Final layer confidence should match actual accuracy.
    """
    if len(layer_confidences) < 2:
        return mx.array(0.0)

    final_conf = layer_confidences[-1]

    # Loss: final confidence should predict correctness
    brier = ((final_conf - predictions_correct) ** 2 * mask).sum() / (mask.sum() + 1e-10)

    # Bonus: confidence should become more accurate through layers
    # (later layers should be better calibrated than earlier)
    consistency_loss = mx.array(0.0)
    for i, conf in enumerate(layer_confidences[:-1]):
        # Distance to ground truth should decrease
        dist_i = ((conf - predictions_correct) ** 2 * mask).sum()
        dist_final = ((final_conf - predictions_correct) ** 2 * mask).sum()
        # Penalize if earlier layer is better than final
        consistency_loss = consistency_loss + mx.maximum(dist_final - dist_i, 0.0)

    return brier + 0.1 * consistency_loss / len(layer_confidences)


def train_phase4(config: Phase4Config):
    """Phase 4 training: confidence-gated attention."""
    # Setup output
    output_dir = Path(config.output_dir)
    if config.run_name:
        output_dir = output_dir / config.run_name
    else:
        output_dir = output_dir / f"lumina-phase4-{int(time.time())}"
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Output directory: {output_dir}")

    # Save config
    with open(output_dir / "config.json", "w") as f:
        json.dump(asdict(config), f, indent=2)

    # Load tokenizer
    tokenizer = load_tokenizer("gpt2")

    # Load base model
    if config.checkpoint_path:
        print(f"Loading base model from {config.checkpoint_path}")
        checkpoint_dir = Path(config.checkpoint_path)
        with open(checkpoint_dir / "config.json") as f:
            train_config = json.load(f)
        model_config = get_config(train_config.get("model_config", config.model_config))
        base_model = LuminaModel(model_config)
        weights = mx.load(str(checkpoint_dir / "model.safetensors"))
        base_model.load_weights(list(weights.items()))

        # Create Phase 4 model from base
        model = LuminaPhase4Model(model_config, base_model)
    else:
        print(f"Creating new model with config '{config.model_config}'")
        model_config = get_config(config.model_config)
        model = LuminaPhase4Model(model_config)

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
    def loss_fn(model, batch, step):
        # Compute gating strength (warmup)
        if step < config.gating_warmup_steps:
            gating_strength = config.min_gating_strength + \
                (config.max_gating_strength - config.min_gating_strength) * (step / config.gating_warmup_steps)
        else:
            gating_strength = config.max_gating_strength

        # Forward pass
        logits, entropy, confidence, layer_confs = model(
            batch.input_ids,
            use_confidence_gating=True,
            gating_strength=gating_strength,
        )

        mask = (batch.labels != -100).astype(logits.dtype)
        targets_safe = mx.clip(batch.labels, 0, logits.shape[-1] - 1)

        # LM loss
        log_probs = mx.log(mx.softmax(logits, axis=-1) + 1e-10)
        target_log_probs = mx.take_along_axis(log_probs, targets_safe[..., None], axis=-1).squeeze(-1)
        lm_loss = (-target_log_probs * mask).sum() / (mask.sum() + 1e-10)

        # Calibration loss (Brier)
        predictions = mx.argmax(logits, axis=-1)
        correct = (predictions == batch.labels).astype(mx.float32) * mask
        brier = ((confidence.overall - correct) ** 2 * mask).sum() / (mask.sum() + 1e-10)

        # Propagation loss
        prop_loss = confidence_propagation_loss(layer_confs, correct, mask)

        # Total loss
        total = (
            config.lm_weight * lm_loss
            + config.calibration_weight * brier
            + config.propagation_weight * prop_loss
        )

        return total, {
            "total": total,
            "lm_loss": lm_loss,
            "brier": brier,
            "prop_loss": prop_loss,
            "gating_strength": mx.array(gating_strength),
        }

    # Training loop
    print("\n" + "=" * 60)
    print("PHASE 4 TRAINING: CONFIDENCE-GATED ATTENTION")
    print("=" * 60)
    print(f"Total steps: {total_steps}")
    print(f"Gating warmup: {config.gating_warmup_steps} steps")
    print("-" * 60)

    global_step = 0
    best_eval_loss = float("inf")

    for epoch in range(config.epochs):
        epoch_losses = {"total": 0, "lm": 0, "brier": 0, "prop": 0}
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
            def step_loss_fn(model, batch):
                return loss_fn(model, batch, global_step)

            loss_and_grad_fn = nn.value_and_grad(model, step_loss_fn)
            (_, losses), grads = loss_and_grad_fn(model, batch)

            # Clip gradients
            grads, _ = optim.clip_grad_norm(grads, max_norm=1.0)

            # Update
            optimizer.update(model, grads)
            mx.eval(state)

            # Track
            epoch_losses["total"] += losses["total"].item()
            epoch_losses["lm"] += losses["lm_loss"].item()
            epoch_losses["brier"] += losses["brier"].item()
            epoch_losses["prop"] += losses["prop_loss"].item()
            num_batches += 1
            global_step += 1

            progress.set_postfix({
                "total": f"{losses['total'].item():.3f}",
                "lm": f"{losses['lm_loss'].item():.3f}",
                "brier": f"{losses['brier'].item():.3f}",
                "gate": f"{losses['gating_strength'].item():.2f}",
            })

            # Evaluate
            if global_step % config.eval_interval == 0:
                eval_metrics = evaluate_phase4(model, eval_loader, global_step, config)
                print(f"\n  LM Loss: {eval_metrics['lm_loss']:.4f}")
                print(f"  ECE: {eval_metrics['ece']:.4f}")
                print(f"  Accuracy: {eval_metrics['accuracy']:.4f}")

                if eval_metrics["lm_loss"] < best_eval_loss:
                    best_eval_loss = eval_metrics["lm_loss"]
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
        print(f"  Avg LM loss: {epoch_losses['lm'] / num_batches:.4f}")
        print(f"  Avg Brier: {epoch_losses['brier'] / num_batches:.4f}")
        print(f"  Avg Prop loss: {epoch_losses['prop'] / num_batches:.4f}")

    # Final evaluation
    print("\nFinal evaluation...")
    final_metrics = evaluate_phase4(model, eval_loader, global_step, config, max_batches=100)
    print(f"Final LM loss: {final_metrics['lm_loss']:.4f}")
    print(f"Final ECE: {final_metrics['ece']:.4f}")
    print(f"Final Accuracy: {final_metrics['accuracy']:.4f}")

    save_checkpoint(model, global_step, config, final_metrics, output_dir)
    print(f"\nPhase 4 training complete! Output: {output_dir}")

    return model, final_metrics


def evaluate_phase4(
    model: LuminaPhase4Model,
    eval_loader,
    step: int,
    config: Phase4Config,
    max_batches: int = 50,
) -> Dict[str, float]:
    """Evaluate Phase 4 model."""
    total_lm_loss = 0.0
    num_batches = 0

    all_confidences = []
    all_correct = []

    gating_strength = min(1.0, step / config.gating_warmup_steps) if config.gating_warmup_steps > 0 else 1.0

    for batch in eval_loader:
        if num_batches >= max_batches:
            break

        logits, entropy, confidence, layer_confs = model(
            batch.input_ids,
            use_confidence_gating=True,
            gating_strength=gating_strength,
        )

        mask = (batch.labels != -100).astype(logits.dtype)
        targets_safe = mx.clip(batch.labels, 0, logits.shape[-1] - 1)

        # LM loss
        log_probs = mx.log(mx.softmax(logits, axis=-1) + 1e-10)
        target_log_probs = mx.take_along_axis(log_probs, targets_safe[..., None], axis=-1).squeeze(-1)
        lm_loss = (-target_log_probs * mask).sum() / (mask.sum() + 1e-10)

        total_lm_loss += lm_loss.item()
        num_batches += 1

        # Collect metrics
        predictions = mx.argmax(logits, axis=-1)
        correct = (predictions == batch.labels).astype(mx.float32) * mask

        conf_all = confidence.overall.reshape(-1).tolist()
        corr_all = correct.reshape(-1).tolist()
        mask_flat = mask.reshape(-1).tolist()

        for c, r, m in zip(conf_all, corr_all, mask_flat):
            if m > 0.5:
                all_confidences.append(c)
                all_correct.append(r)

    # Compute calibration
    cal_metrics = compute_calibration_metrics(
        mx.array(all_confidences),
        mx.array(all_correct),
    )

    return {
        "lm_loss": total_lm_loss / num_batches,
        "ece": cal_metrics.ece,
        "accuracy": cal_metrics.accuracy,
    }


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
    parser = argparse.ArgumentParser(description="Phase 4: Confidence-Gated Attention")
    parser.add_argument("--checkpoint", type=str, help="Phase 2/3 checkpoint to continue from")
    parser.add_argument("--config", type=str, default="tiny", help="Model config if no checkpoint")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=3e-5)
    parser.add_argument("--output-dir", type=str, default="outputs")
    parser.add_argument("--run-name", type=str, default=None)
    args = parser.parse_args()

    config = Phase4Config(
        checkpoint_path=args.checkpoint,
        model_config=args.config,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        output_dir=args.output_dir,
        run_name=args.run_name,
    )

    train_phase4(config)


if __name__ == "__main__":
    main()
