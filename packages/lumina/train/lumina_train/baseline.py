"""
Baseline Comparison

Compare Lumina's explicit confidence head against standard approaches:
1. Standard LM (no confidence training)
2. Logit entropy as uncertainty proxy
3. Top-1 probability as confidence proxy

This validates that the confidence head actually improves calibration.
"""

import argparse
import json
from pathlib import Path

import mlx.core as mx
import mlx.nn as nn

from .config import get_config
from .model import LuminaModel
from .losses import compute_calibration_metrics
from .data import load_tokenizer, create_eval_dataloader


def evaluate_with_entropy_confidence(
    model: LuminaModel,
    eval_loader,
    max_batches: int = 100,
):
    """
    Evaluate using logit entropy as confidence proxy (standard approach).

    High entropy = low confidence
    Low entropy = high confidence

    We convert entropy to confidence via: conf = 1 - normalized_entropy
    """
    all_entropy_conf = []
    all_head_conf = []
    all_top1_conf = []
    all_correct = []

    for i, batch in enumerate(eval_loader):
        if i >= max_batches:
            break

        output, _ = model(batch.input_ids)

        # Get predictions and correctness
        logits = output.logits[:, :-1, :]
        targets = batch.labels[:, :-1]
        mask = (targets != -100).astype(mx.float32)

        predictions = mx.argmax(logits, axis=-1)
        correct = (predictions == targets).astype(mx.float32) * mask

        # Method 1: Confidence head (our approach)
        head_conf = output.confidence.overall[:, :-1]

        # Method 2: Entropy-based confidence (standard approach)
        probs = mx.softmax(logits, axis=-1)
        probs_clamped = mx.clip(probs, 1e-10, 1.0)
        entropy = -mx.sum(probs_clamped * mx.log(probs_clamped), axis=-1)
        # Normalize entropy: max entropy for vocab 50257 is ln(50257) ≈ 10.8
        max_entropy = 10.8
        normalized_entropy = entropy / max_entropy
        entropy_conf = 1.0 - normalized_entropy  # High entropy = low confidence

        # Method 3: Top-1 probability as confidence
        top1_prob = mx.max(probs, axis=-1)

        # Collect results
        head_flat = head_conf.reshape(-1).tolist()
        entropy_flat = entropy_conf.reshape(-1).tolist()
        top1_flat = top1_prob.reshape(-1).tolist()
        correct_flat = correct.reshape(-1).tolist()
        mask_flat = mask.reshape(-1).tolist()

        for h, e, t, c, m in zip(head_flat, entropy_flat, top1_flat, correct_flat, mask_flat):
            if m > 0.5:
                all_head_conf.append(h)
                all_entropy_conf.append(e)
                all_top1_conf.append(t)
                all_correct.append(c)

    # Compute calibration metrics for each method
    head_metrics = compute_calibration_metrics(
        mx.array(all_head_conf),
        mx.array(all_correct),
    )

    entropy_metrics = compute_calibration_metrics(
        mx.array(all_entropy_conf),
        mx.array(all_correct),
    )

    top1_metrics = compute_calibration_metrics(
        mx.array(all_top1_conf),
        mx.array(all_correct),
    )

    return {
        "confidence_head": {
            "ece": head_metrics.ece,
            "mce": head_metrics.mce,
            "brier": head_metrics.brier,
            "avg_confidence": head_metrics.avg_confidence,
            "accuracy": head_metrics.accuracy,
        },
        "entropy_based": {
            "ece": entropy_metrics.ece,
            "mce": entropy_metrics.mce,
            "brier": entropy_metrics.brier,
            "avg_confidence": entropy_metrics.avg_confidence,
            "accuracy": entropy_metrics.accuracy,
        },
        "top1_probability": {
            "ece": top1_metrics.ece,
            "mce": top1_metrics.mce,
            "brier": top1_metrics.brier,
            "avg_confidence": top1_metrics.avg_confidence,
            "accuracy": top1_metrics.accuracy,
        },
    }


def print_comparison(results: dict):
    """Print comparison table."""
    print("\n" + "=" * 70)
    print("CALIBRATION METHOD COMPARISON")
    print("=" * 70)
    print("\n" + "-" * 70)
    print(f"{'Method':<25} {'ECE ↓':>10} {'MCE ↓':>10} {'Brier ↓':>10} {'Avg Conf':>10}")
    print("-" * 70)

    methods = [
        ("Confidence Head (Ours)", results["confidence_head"]),
        ("Entropy-based (Standard)", results["entropy_based"]),
        ("Top-1 Probability", results["top1_probability"]),
    ]

    # Find best ECE for highlighting
    best_ece = min(m[1]["ece"] for m in methods)

    for name, metrics in methods:
        ece_str = f"{metrics['ece']:.4f}"
        if metrics['ece'] == best_ece:
            ece_str = f"{ece_str} ✓"

        print(f"{name:<25} {ece_str:>10} {metrics['mce']:>10.4f} {metrics['brier']:>10.4f} {metrics['avg_confidence']:>10.4f}")

    print("-" * 70)
    print(f"{'Accuracy':<25} {results['confidence_head']['accuracy']*100:>10.1f}%")
    print("-" * 70)

    # Calculate improvement
    ece_improvement = (results["entropy_based"]["ece"] - results["confidence_head"]["ece"]) / results["entropy_based"]["ece"] * 100
    brier_improvement = (results["entropy_based"]["brier"] - results["confidence_head"]["brier"]) / results["entropy_based"]["brier"] * 100

    print(f"\n📊 IMPROVEMENT OVER ENTROPY BASELINE:")
    print(f"   ECE:   {ece_improvement:+.1f}% {'(better)' if ece_improvement > 0 else '(worse)'}")
    print(f"   Brier: {brier_improvement:+.1f}% {'(better)' if brier_improvement > 0 else '(worse)'}")
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(description="Compare calibration methods")
    parser.add_argument("--checkpoint", type=str, required=True)
    parser.add_argument("--max-batches", type=int, default=100)
    args = parser.parse_args()

    # Load model
    checkpoint_dir = Path(args.checkpoint)
    with open(checkpoint_dir / "config.json") as f:
        train_config = json.load(f)

    model_config = get_config(train_config["model_config"])
    model = LuminaModel(model_config)

    weights = mx.load(str(checkpoint_dir / "model.safetensors"))
    model.load_weights(list(weights.items()))
    print(f"Loaded model from {checkpoint_dir}")

    # Load data
    tokenizer = load_tokenizer("gpt2")
    eval_loader = create_eval_dataloader(
        tokenizer,
        batch_size=8,
        max_length=256,
        dataset_name="wikitext",
        max_samples=args.max_batches * 8,
    )

    # Run comparison
    print("Running calibration comparison...")
    results = evaluate_with_entropy_confidence(model, eval_loader, args.max_batches)

    # Print results
    print_comparison(results)

    # Save results
    with open(checkpoint_dir / "baseline_comparison.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {checkpoint_dir / 'baseline_comparison.json'}")


if __name__ == "__main__":
    main()
