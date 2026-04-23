"""
Lumina Evaluation Script

Evaluate a trained Lumina model and visualize calibration.

Usage:
    python -m lumina_train.evaluate --checkpoint outputs/lumina-small-xxx/checkpoint-1000
    python -m lumina_train.evaluate --checkpoint outputs/lumina-small-xxx/checkpoint-1000 --plot
"""

import argparse
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional

import mlx.core as mx
import mlx.nn as nn

from .config import get_config, LuminaConfig
from .model import LuminaModel, LuminaOutput
from .losses import compute_calibration_metrics, CalibrationMetrics
from .data import load_tokenizer, create_eval_dataloader, load_calibration_dataset


def load_model(checkpoint_path: str) -> Tuple[LuminaModel, LuminaConfig]:
    """Load a model from checkpoint."""
    checkpoint_dir = Path(checkpoint_path)

    # Load config
    with open(checkpoint_dir / "config.json") as f:
        train_config = json.load(f)

    model_config = get_config(train_config["model_config"])

    # Create model
    model = LuminaModel(model_config)

    # Load weights
    weights = mx.load(str(checkpoint_dir / "model.safetensors"))
    model.load_weights(list(weights.items()))

    print(f"Loaded model from {checkpoint_dir}")
    return model, model_config


def evaluate_language_modeling(
    model: LuminaModel,
    tokenizer,
    dataset_name: str = "wikitext",
    max_length: int = 256,
    max_batches: int = 100,
) -> Dict[str, float]:
    """Evaluate perplexity and calibration on language modeling."""
    eval_loader = create_eval_dataloader(
        tokenizer,
        batch_size=8,
        max_length=max_length,
        dataset_name=dataset_name,
        max_samples=max_batches * 8,
    )

    total_loss = 0.0
    total_tokens = 0
    all_confidences = []
    all_correct = []

    for batch in eval_loader:
        output, _ = model(batch.input_ids)

        # Compute loss (cross-entropy)
        logits = output.logits[:, :-1, :].reshape(-1, output.logits.shape[-1])
        targets = batch.labels[:, :-1].reshape(-1)

        mask = (targets != -100).astype(mx.float32)

        # Log softmax for loss computation
        log_probs = mx.log(mx.softmax(logits, axis=-1) + 1e-10)
        # Clip targets to valid range for indexing
        safe_targets = mx.clip(targets, 0, logits.shape[-1] - 1)
        target_log_probs = mx.take_along_axis(
            log_probs, safe_targets[:, None], axis=-1
        ).squeeze(-1)
        token_losses = -target_log_probs * mask

        total_loss += token_losses.sum().item()
        total_tokens += mask.sum().item()

        # Collect confidence/correctness for calibration
        predictions = mx.argmax(output.logits[:, :-1, :], axis=-1).reshape(-1)
        correct = (predictions == targets).astype(mx.float32) * mask

        # MLX doesn't support boolean indexing, so filter manually
        conf_all = output.confidence.overall[:, :-1].reshape(-1).tolist()
        corr_all = correct.tolist()
        mask_flat = mask.tolist()

        for c, r, m in zip(conf_all, corr_all, mask_flat):
            if m > 0.5:
                all_confidences.append(c)
                all_correct.append(r)

    # Compute metrics
    avg_loss = total_loss / total_tokens
    perplexity = mx.exp(mx.array(avg_loss)).item()

    cal_metrics = compute_calibration_metrics(
        mx.array(all_confidences),
        mx.array(all_correct),
    )

    return {
        "perplexity": perplexity,
        "loss": avg_loss,
        "ece": cal_metrics.ece,
        "mce": cal_metrics.mce,
        "brier": cal_metrics.brier,
        "accuracy": cal_metrics.accuracy,
        "avg_confidence": cal_metrics.avg_confidence,
        "num_tokens": total_tokens,
    }


def evaluate_calibration_dataset(
    model: LuminaModel,
    tokenizer,
    max_length: int = 128,
) -> Dict[str, Dict[str, float]]:
    """Evaluate on the calibration dataset with known uncertainty levels."""
    from .data import load_calibration_dataset, CalibrationExample

    examples = load_calibration_dataset()

    results_by_uncertainty = {"low": [], "medium": [], "high": []}

    for example in examples:
        # Tokenize
        encoding = tokenizer(
            example.text,
            truncation=True,
            max_length=max_length,
            padding="max_length",
            return_tensors="np",
        )

        input_ids = mx.array(encoding["input_ids"])
        output, _ = model(input_ids)

        # Get average confidence for the input (weighted by attention mask)
        mask = mx.array(encoding["attention_mask"]).astype(mx.float32)
        mask_sum = mask.sum().item()

        if mask_sum > 0:
            avg_conf = (output.confidence.overall * mask).sum().item() / mask_sum
            avg_epistemic = (output.confidence.epistemic * mask).sum().item() / mask_sum
            avg_aleatoric = (output.confidence.aleatoric * mask).sum().item() / mask_sum
        else:
            avg_conf = avg_epistemic = avg_aleatoric = 0.0

        results_by_uncertainty[example.expected_uncertainty].append({
            "text": example.text,
            "category": example.category,
            "expected": example.expected_uncertainty,
            "confidence": avg_conf,
            "epistemic": avg_epistemic,
            "aleatoric": avg_aleatoric,
        })

    # Compute summary statistics
    summary = {}
    for level, results in results_by_uncertainty.items():
        if results:
            confs = [r["confidence"] for r in results]
            summary[level] = {
                "count": len(results),
                "avg_confidence": sum(confs) / len(confs),
                "min_confidence": min(confs),
                "max_confidence": max(confs),
            }
        else:
            summary[level] = {"count": 0}

    return {
        "summary": summary,
        "details": results_by_uncertainty,
    }


def plot_calibration(
    confidences: List[float],
    correct: List[float],
    output_path: Optional[str] = None,
    num_bins: int = 10,
):
    """Plot calibration diagram."""
    try:
        import matplotlib.pyplot as plt
        import numpy as np
    except ImportError:
        print("matplotlib not installed. Run: pip install matplotlib")
        return

    # Compute bin statistics
    bin_edges = np.linspace(0, 1, num_bins + 1)
    bin_accs = []
    bin_confs = []
    bin_counts = []

    for i in range(num_bins):
        low, high = bin_edges[i], bin_edges[i + 1]
        in_bin = [(c, r) for c, r in zip(confidences, correct) if low <= c < high]

        if in_bin:
            bin_conf = np.mean([c for c, _ in in_bin])
            bin_acc = np.mean([r for _, r in in_bin])
            bin_confs.append(bin_conf)
            bin_accs.append(bin_acc)
            bin_counts.append(len(in_bin))
        else:
            bin_confs.append((low + high) / 2)
            bin_accs.append(0)
            bin_counts.append(0)

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    # Reliability diagram
    ax1 = axes[0]
    ax1.bar(bin_confs, bin_accs, width=0.08, alpha=0.7, label="Accuracy")
    ax1.plot([0, 1], [0, 1], "k--", label="Perfect calibration")
    ax1.set_xlabel("Mean Predicted Confidence")
    ax1.set_ylabel("Fraction of Positives")
    ax1.set_title("Reliability Diagram")
    ax1.legend()
    ax1.set_xlim(0, 1)
    ax1.set_ylim(0, 1)

    # Confidence histogram
    ax2 = axes[1]
    ax2.hist(confidences, bins=num_bins, range=(0, 1), alpha=0.7, edgecolor="black")
    ax2.set_xlabel("Confidence")
    ax2.set_ylabel("Count")
    ax2.set_title("Confidence Distribution")

    plt.tight_layout()

    if output_path:
        plt.savefig(output_path, dpi=150, bbox_inches="tight")
        print(f"Saved plot to {output_path}")
    else:
        plt.show()


def print_calibration_report(
    lm_results: Dict[str, float],
    cal_results: Dict[str, Dict],
):
    """Print a formatted calibration report."""
    print("\n" + "=" * 60)
    print("LUMINA CALIBRATION REPORT")
    print("=" * 60)

    print("\n📊 LANGUAGE MODELING METRICS")
    print("-" * 40)
    print(f"  Perplexity:        {lm_results['perplexity']:.2f}")
    print(f"  Loss:              {lm_results['loss']:.4f}")
    print(f"  Accuracy:          {lm_results['accuracy']*100:.1f}%")
    print(f"  Tokens evaluated:  {lm_results['num_tokens']:,}")

    print("\n🎯 CALIBRATION METRICS")
    print("-" * 40)
    print(f"  ECE (↓ better):    {lm_results['ece']:.4f}")
    print(f"  MCE (↓ better):    {lm_results['mce']:.4f}")
    print(f"  Brier (↓ better):  {lm_results['brier']:.4f}")
    print(f"  Avg Confidence:    {lm_results['avg_confidence']:.4f}")

    # Calibration gap
    gap = abs(lm_results['accuracy'] - lm_results['avg_confidence'])
    if gap < 0.05:
        status = "✅ Well calibrated"
    elif gap < 0.1:
        status = "⚠️  Slightly miscalibrated"
    else:
        status = "❌ Poorly calibrated"
    print(f"  Calibration Gap:   {gap:.4f} {status}")

    print("\n🔬 CALIBRATION DATASET RESULTS")
    print("-" * 40)
    summary = cal_results["summary"]

    for level in ["low", "medium", "high"]:
        if level in summary and summary[level]["count"] > 0:
            data = summary[level]
            expected_range = {
                "low": "should be HIGH (>0.7)",
                "medium": "should be MEDIUM (0.5-0.7)",
                "high": "should be LOW (<0.5)",
            }

            # Check if confidence matches expected
            avg = data["avg_confidence"]
            if level == "low" and avg > 0.7:
                match = "✅"
            elif level == "medium" and 0.5 <= avg <= 0.7:
                match = "✅"
            elif level == "high" and avg < 0.5:
                match = "✅"
            else:
                match = "❌"

            print(f"\n  {level.upper()} uncertainty examples ({data['count']} samples):")
            print(f"    Avg confidence: {avg:.3f} {match}")
            print(f"    Range: [{data['min_confidence']:.3f}, {data['max_confidence']:.3f}]")
            print(f"    (Confidence {expected_range[level]})")

    print("\n" + "=" * 60)


def main():
    """CLI entry point for evaluation."""
    parser = argparse.ArgumentParser(description="Evaluate Lumina model")
    parser.add_argument(
        "--checkpoint", type=str, required=True,
        help="Path to checkpoint directory"
    )
    parser.add_argument(
        "--dataset", type=str, default="wikitext",
        help="Dataset for language modeling evaluation"
    )
    parser.add_argument(
        "--max-length", type=int, default=256,
        help="Maximum sequence length"
    )
    parser.add_argument(
        "--max-batches", type=int, default=100,
        help="Maximum batches for evaluation"
    )
    parser.add_argument(
        "--plot", action="store_true",
        help="Generate calibration plots"
    )
    parser.add_argument(
        "--plot-output", type=str, default=None,
        help="Path to save plot (default: show)"
    )

    args = parser.parse_args()

    # Load model
    model, config = load_model(args.checkpoint)
    tokenizer = load_tokenizer("gpt2")

    # Evaluate language modeling
    print("Evaluating language modeling...")
    lm_results = evaluate_language_modeling(
        model, tokenizer,
        dataset_name=args.dataset,
        max_length=args.max_length,
        max_batches=args.max_batches,
    )

    # Evaluate calibration dataset
    print("Evaluating calibration dataset...")
    cal_results = evaluate_calibration_dataset(model, tokenizer, args.max_length)

    # Print report
    print_calibration_report(lm_results, cal_results)

    # Generate plots if requested
    if args.plot:
        # Would need to collect confidences during evaluation
        print("\nPlot generation requires collecting confidence data during eval.")
        print("This is a TODO for visualization.")

    # Save results
    checkpoint_dir = Path(args.checkpoint)
    with open(checkpoint_dir / "eval_results.json", "w") as f:
        json.dump({
            "language_modeling": lm_results,
            "calibration": cal_results,
        }, f, indent=2)

    print(f"\nResults saved to {checkpoint_dir / 'eval_results.json'}")


if __name__ == "__main__":
    main()
