"""
Comprehensive Evaluation Suite for Lumina

Tests the model on:
1. Standard LM Benchmarks (LAMBADA, HellaSwag)
2. Calibration Quality (selective prediction, reliability diagrams)
3. Out-of-Distribution Detection
4. Uncertainty Quality Metrics

This proves the Lumina thesis: a model that knows what it doesn't know.
"""

import argparse
import json
import math
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional
from collections import defaultdict

import mlx.core as mx
import mlx.nn as nn
import numpy as np
from tqdm import tqdm

from .config import get_config, LuminaConfig
from .model import LuminaModel
from .train_phase4 import LuminaPhase4Model
from .data import load_tokenizer


@dataclass
class EvaluationResults:
    """Container for all evaluation results."""
    # Standard benchmarks
    lambada_accuracy: float = 0.0
    lambada_perplexity: float = 0.0
    hellaswag_accuracy: float = 0.0

    # Calibration metrics
    ece: float = 0.0
    mce: float = 0.0  # Maximum calibration error
    brier_score: float = 0.0
    brier_reliability: float = 0.0
    brier_resolution: float = 0.0

    # Selective prediction
    selective_accuracy_90: float = 0.0  # Accuracy when keeping top 90% confident
    selective_accuracy_70: float = 0.0  # Accuracy when keeping top 70% confident
    selective_accuracy_50: float = 0.0  # Accuracy when keeping top 50% confident
    coverage_for_95_acc: float = 0.0    # How much data to keep for 95% accuracy

    # Uncertainty quality
    auroc_uncertainty: float = 0.0  # Does uncertainty predict errors?
    aupr_uncertainty: float = 0.0   # Area under precision-recall

    # OOD Detection
    ood_auroc: float = 0.0
    in_distribution_confidence: float = 0.0
    ood_confidence: float = 0.0

    # Calibration curve data (for plotting)
    calibration_bins: List[float] = field(default_factory=list)
    calibration_accuracies: List[float] = field(default_factory=list)
    calibration_counts: List[int] = field(default_factory=list)


def load_model(checkpoint_path: str):
    """Load model from checkpoint."""
    checkpoint_dir = Path(checkpoint_path)

    with open(checkpoint_dir / "config.json") as f:
        config_data = json.load(f)

    model_config = get_config(config_data.get("model_config", "tiny"))
    weights = mx.load(str(checkpoint_dir / "model.safetensors"))

    # Detect model type
    is_phase4 = any("confidence_gate" in k for k in weights.keys())

    if is_phase4:
        model = LuminaPhase4Model(model_config, base_model=None)
    else:
        model = LuminaModel(model_config)

    model.load_weights(list(weights.items()), strict=False)
    return model, model_config


def get_model_outputs(model, input_ids: mx.array):
    """Get logits, confidence, and entropy from model."""
    result = model(input_ids)

    if isinstance(result, tuple) and len(result) == 4:
        # Phase 4 model
        logits, entropy, confidence, _ = result
        conf_scores = confidence.overall
    else:
        # Base model
        output, _ = result
        logits = output.logits
        entropy = output.entropy
        conf_scores = output.confidence.overall

    return logits, conf_scores, entropy


# =============================================================================
# STANDARD BENCHMARKS
# =============================================================================

def load_lambada_dataset(max_samples: int = 5000) -> List[Dict]:
    """Load LAMBADA dataset for last-word prediction."""
    try:
        from datasets import load_dataset
        dataset = load_dataset("lambada", split="test")

        samples = []
        for i, item in enumerate(dataset):
            if i >= max_samples:
                break
            text = item["text"]
            # Split into context and target (last word)
            words = text.strip().split()
            if len(words) > 1:
                context = " ".join(words[:-1])
                target = words[-1]
                samples.append({"context": context, "target": target, "full": text})

        return samples
    except Exception as e:
        print(f"Could not load LAMBADA: {e}")
        return []


def evaluate_lambada(model, tokenizer, max_samples: int = 1000) -> Tuple[float, float]:
    """
    Evaluate on LAMBADA - predict the last word given context.

    Returns: (accuracy, perplexity)
    """
    print("\n--- LAMBADA Evaluation ---")
    samples = load_lambada_dataset(max_samples)

    if not samples:
        print("  LAMBADA dataset not available")
        return 0.0, float('inf')

    correct = 0
    total = 0
    total_loss = 0.0

    for sample in tqdm(samples, desc="LAMBADA"):
        context = sample["context"]
        target = sample["target"]

        # Tokenize
        context_ids = tokenizer.encode(context)
        target_ids = tokenizer.encode(" " + target)  # Space before target

        if len(target_ids) == 0:
            continue

        # Get model prediction
        input_tensor = mx.array([context_ids])
        logits, _, _ = get_model_outputs(model, input_tensor)

        # Get prediction for next token
        next_logits = logits[0, -1, :]
        predicted_token = int(mx.argmax(next_logits).item())

        # Check if correct (first token of target)
        if predicted_token == target_ids[0]:
            correct += 1

        # Compute loss for perplexity
        log_probs = mx.log(mx.softmax(next_logits, axis=-1) + 1e-10)
        target_log_prob = float(log_probs[target_ids[0]].item())
        total_loss -= target_log_prob

        total += 1

    accuracy = correct / total if total > 0 else 0.0
    perplexity = math.exp(total_loss / total) if total > 0 else float('inf')

    print(f"  Accuracy: {accuracy:.4f}")
    print(f"  Perplexity: {perplexity:.2f}")

    return accuracy, perplexity


def load_hellaswag_dataset(max_samples: int = 1000) -> List[Dict]:
    """Load HellaSwag dataset for commonsense reasoning."""
    try:
        from datasets import load_dataset
        dataset = load_dataset("hellaswag", split="validation")

        samples = []
        for i, item in enumerate(dataset):
            if i >= max_samples:
                break
            samples.append({
                "context": item["ctx"],
                "endings": item["endings"],
                "label": int(item["label"]),
            })

        return samples
    except Exception as e:
        print(f"Could not load HellaSwag: {e}")
        return []


def evaluate_hellaswag(model, tokenizer, max_samples: int = 500) -> float:
    """
    Evaluate on HellaSwag - choose the most likely completion.

    Returns: accuracy
    """
    print("\n--- HellaSwag Evaluation ---")
    samples = load_hellaswag_dataset(max_samples)

    if not samples:
        print("  HellaSwag dataset not available")
        return 0.0

    correct = 0
    total = 0

    for sample in tqdm(samples, desc="HellaSwag"):
        context = sample["context"]
        endings = sample["endings"]
        label = sample["label"]

        # Score each ending
        scores = []
        for ending in endings:
            full_text = context + " " + ending
            input_ids = tokenizer.encode(full_text)
            context_len = len(tokenizer.encode(context))

            if len(input_ids) <= context_len:
                scores.append(float('-inf'))
                continue

            input_tensor = mx.array([input_ids])
            logits, _, _ = get_model_outputs(model, input_tensor)

            # Compute average log prob of ending tokens
            log_probs = mx.log(mx.softmax(logits[0], axis=-1) + 1e-10)

            total_log_prob = 0.0
            for i in range(context_len, len(input_ids)):
                target = input_ids[i]
                total_log_prob += float(log_probs[i-1, target].item())

            avg_log_prob = total_log_prob / (len(input_ids) - context_len)
            scores.append(avg_log_prob)

        # Prediction is highest scoring ending
        predicted = np.argmax(scores)
        if predicted == label:
            correct += 1
        total += 1

    accuracy = correct / total if total > 0 else 0.0
    print(f"  Accuracy: {accuracy:.4f}")

    return accuracy


# =============================================================================
# CALIBRATION TESTS
# =============================================================================

def compute_calibration_curve(
    confidences: List[float],
    correctness: List[int],
    n_bins: int = 10,
) -> Tuple[List[float], List[float], List[int]]:
    """Compute calibration curve (reliability diagram data)."""
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    bin_centers = []
    bin_accuracies = []
    bin_counts = []

    for i in range(n_bins):
        low, high = bin_boundaries[i], bin_boundaries[i + 1]

        # Get samples in this bin
        mask = [(low <= c < high) for c in confidences]
        bin_conf = [c for c, m in zip(confidences, mask) if m]
        bin_corr = [c for c, m in zip(correctness, mask) if m]

        if bin_conf:
            bin_centers.append(np.mean(bin_conf))
            bin_accuracies.append(np.mean(bin_corr))
            bin_counts.append(len(bin_conf))
        else:
            bin_centers.append((low + high) / 2)
            bin_accuracies.append(0.0)
            bin_counts.append(0)

    return bin_centers, bin_accuracies, bin_counts


def compute_ece(confidences: List[float], correctness: List[int], n_bins: int = 10) -> float:
    """Compute Expected Calibration Error."""
    _, accuracies, counts = compute_calibration_curve(confidences, correctness, n_bins)
    bin_boundaries = np.linspace(0, 1, n_bins + 1)

    ece = 0.0
    total = sum(counts)

    for i, (acc, count) in enumerate(zip(accuracies, counts)):
        if count > 0:
            bin_center = (bin_boundaries[i] + bin_boundaries[i + 1]) / 2
            ece += (count / total) * abs(acc - bin_center)

    return ece


def compute_mce(confidences: List[float], correctness: List[int], n_bins: int = 10) -> float:
    """Compute Maximum Calibration Error."""
    _, accuracies, counts = compute_calibration_curve(confidences, correctness, n_bins)
    bin_boundaries = np.linspace(0, 1, n_bins + 1)

    max_error = 0.0
    for i, (acc, count) in enumerate(zip(accuracies, counts)):
        if count > 0:
            bin_center = (bin_boundaries[i] + bin_boundaries[i + 1]) / 2
            max_error = max(max_error, abs(acc - bin_center))

    return max_error


def compute_brier_decomposition(
    confidences: List[float],
    correctness: List[int],
) -> Tuple[float, float, float]:
    """
    Decompose Brier score into reliability, resolution, uncertainty.

    Brier = Reliability - Resolution + Uncertainty

    - Reliability: How well-calibrated (lower is better)
    - Resolution: How much confidence varies (higher is better)
    - Uncertainty: Inherent uncertainty in the data
    """
    n = len(confidences)
    if n == 0:
        return 0.0, 0.0, 0.0

    confidences = np.array(confidences)
    correctness = np.array(correctness)

    # Overall accuracy
    base_rate = np.mean(correctness)

    # Brier score
    brier = np.mean((confidences - correctness) ** 2)

    # Uncertainty (entropy of base rate)
    uncertainty = base_rate * (1 - base_rate)

    # Bin-wise decomposition
    n_bins = 10
    bin_boundaries = np.linspace(0, 1, n_bins + 1)

    reliability = 0.0
    resolution = 0.0

    for i in range(n_bins):
        low, high = bin_boundaries[i], bin_boundaries[i + 1]
        mask = (low <= confidences) & (confidences < high)

        if mask.sum() > 0:
            bin_conf = confidences[mask].mean()
            bin_acc = correctness[mask].mean()
            bin_count = mask.sum()

            reliability += (bin_count / n) * (bin_conf - bin_acc) ** 2
            resolution += (bin_count / n) * (bin_acc - base_rate) ** 2

    return reliability, resolution, uncertainty


def evaluate_selective_prediction(
    confidences: List[float],
    correctness: List[int],
) -> Dict[str, float]:
    """
    Evaluate selective prediction - accuracy when we only predict on confident samples.

    This is key for Lumina: if the model knows what it doesn't know,
    it should be more accurate when it's confident.
    """
    # Sort by confidence (descending)
    sorted_pairs = sorted(zip(confidences, correctness), key=lambda x: -x[0])

    results = {}

    # Accuracy at different coverage levels
    for coverage in [0.9, 0.7, 0.5, 0.3]:
        n_keep = int(len(sorted_pairs) * coverage)
        if n_keep > 0:
            kept = sorted_pairs[:n_keep]
            acc = sum(c for _, c in kept) / n_keep
            results[f"acc_at_{int(coverage*100)}"] = acc

    # Coverage needed for target accuracy
    for target_acc in [0.95, 0.90, 0.85]:
        cumsum = 0
        for i, (conf, corr) in enumerate(sorted_pairs):
            cumsum += corr
            current_acc = cumsum / (i + 1)
            if current_acc >= target_acc:
                results[f"coverage_for_{int(target_acc*100)}_acc"] = (i + 1) / len(sorted_pairs)
                break
        else:
            results[f"coverage_for_{int(target_acc*100)}_acc"] = 1.0

    return results


def compute_auroc_uncertainty(
    confidences: List[float],
    correctness: List[int],
) -> float:
    """
    Compute AUROC for uncertainty predicting errors.

    If high uncertainty predicts errors, AUROC should be high.
    We use (1 - confidence) as uncertainty.
    """
    from sklearn.metrics import roc_auc_score

    uncertainties = [1 - c for c in confidences]
    errors = [1 - c for c in correctness]

    try:
        return roc_auc_score(errors, uncertainties)
    except:
        return 0.5


# =============================================================================
# OOD DETECTION
# =============================================================================

def load_ood_dataset(dataset_name: str, max_samples: int = 500) -> List[str]:
    """Load an out-of-distribution dataset."""
    try:
        from datasets import load_dataset

        if dataset_name == "code":
            # Code is very different from WikiText
            dataset = load_dataset("codeparrot/github-code",
                                   languages=["Python"],
                                   split="train",
                                   streaming=True)
            texts = []
            for i, item in enumerate(dataset):
                if i >= max_samples:
                    break
                if len(item["code"]) > 100:
                    texts.append(item["code"][:500])
            return texts

        elif dataset_name == "math":
            # Math expressions
            dataset = load_dataset("competition_math", split="train")
            return [item["problem"][:500] for item in dataset[:max_samples]]

        elif dataset_name == "tweets":
            # Social media - very different style
            dataset = load_dataset("tweet_eval", "sentiment", split="test")
            return [item["text"] for item in dataset[:max_samples]]

        else:
            return []

    except Exception as e:
        print(f"Could not load OOD dataset {dataset_name}: {e}")
        return []


def evaluate_ood_detection(
    model,
    tokenizer,
    in_distribution_texts: List[str],
    max_samples: int = 200,
) -> Dict[str, float]:
    """
    Evaluate OOD detection capability.

    A well-calibrated model should be less confident on OOD data.
    """
    print("\n--- OOD Detection Evaluation ---")

    def get_avg_confidence(texts: List[str]) -> List[float]:
        confidences = []
        for text in texts[:max_samples]:
            input_ids = tokenizer.encode(text)[:256]
            if len(input_ids) < 10:
                continue

            input_tensor = mx.array([input_ids])
            _, conf, _ = get_model_outputs(model, input_tensor)
            avg_conf = float(conf.mean().item())
            confidences.append(avg_conf)

        return confidences

    # In-distribution confidence
    print("  Evaluating in-distribution...")
    in_conf = get_avg_confidence(in_distribution_texts)

    # Try different OOD datasets
    ood_results = {}

    for ood_name in ["code", "tweets"]:
        print(f"  Evaluating OOD ({ood_name})...")
        ood_texts = load_ood_dataset(ood_name, max_samples)

        if ood_texts:
            ood_conf = get_avg_confidence(ood_texts)

            if in_conf and ood_conf:
                # AUROC for detecting OOD (in-dist = 0, OOD = 1)
                from sklearn.metrics import roc_auc_score

                labels = [0] * len(in_conf) + [1] * len(ood_conf)
                # Lower confidence = more likely OOD
                scores = [1 - c for c in in_conf] + [1 - c for c in ood_conf]

                try:
                    auroc = roc_auc_score(labels, scores)
                    ood_results[f"auroc_{ood_name}"] = auroc
                    ood_results[f"in_conf_{ood_name}"] = np.mean(in_conf)
                    ood_results[f"ood_conf_{ood_name}"] = np.mean(ood_conf)

                    print(f"    In-dist confidence: {np.mean(in_conf):.4f}")
                    print(f"    OOD confidence: {np.mean(ood_conf):.4f}")
                    print(f"    AUROC: {auroc:.4f}")
                except:
                    pass

    return ood_results


# =============================================================================
# MAIN EVALUATION
# =============================================================================

def collect_predictions(
    model,
    tokenizer,
    texts: List[str],
    max_samples: int = 1000,
) -> Tuple[List[float], List[int]]:
    """Collect confidence scores and correctness for calibration analysis."""
    confidences = []
    correctness = []

    for text in tqdm(texts[:max_samples], desc="Collecting predictions"):
        input_ids = tokenizer.encode(text)
        if len(input_ids) < 10:
            continue

        input_tensor = mx.array([input_ids[:-1]])
        logits, conf, _ = get_model_outputs(model, input_tensor)

        # For each position, check if prediction is correct
        predictions = mx.argmax(logits[0], axis=-1)
        targets = mx.array(input_ids[1:])

        for i in range(len(predictions)):
            confidences.append(float(conf[0, i].item()))
            correctness.append(int(predictions[i].item() == targets[i].item()))

    return confidences, correctness


def run_evaluation_suite(
    checkpoint_path: str,
    max_samples: int = 500,
    skip_slow: bool = False,
) -> EvaluationResults:
    """Run the full evaluation suite."""
    print("=" * 70)
    print("LUMINA EVALUATION SUITE")
    print("=" * 70)

    # Load model
    print(f"\nLoading model from {checkpoint_path}...")
    model, config = load_model(checkpoint_path)
    tokenizer = load_tokenizer("gpt2")

    results = EvaluationResults()

    # Load in-distribution data for calibration tests
    print("\nLoading evaluation data...")
    try:
        from datasets import load_dataset
        wiki = load_dataset("wikitext", "wikitext-2-raw-v1", split="test")
        in_dist_texts = [t for t in wiki["text"] if len(t.strip()) > 100][:max_samples]
    except:
        in_dist_texts = ["The quick brown fox jumps over the lazy dog."] * 100

    # ===================
    # STANDARD BENCHMARKS
    # ===================
    print("\n" + "=" * 50)
    print("STANDARD BENCHMARKS")
    print("=" * 50)

    if not skip_slow:
        results.lambada_accuracy, results.lambada_perplexity = evaluate_lambada(
            model, tokenizer, max_samples=min(max_samples, 1000)
        )

        results.hellaswag_accuracy = evaluate_hellaswag(
            model, tokenizer, max_samples=min(max_samples, 500)
        )

    # ===================
    # CALIBRATION TESTS
    # ===================
    print("\n" + "=" * 50)
    print("CALIBRATION ANALYSIS")
    print("=" * 50)

    print("\nCollecting predictions for calibration analysis...")
    confidences, correctness = collect_predictions(
        model, tokenizer, in_dist_texts, max_samples
    )

    # Calibration curve
    bins, accs, counts = compute_calibration_curve(confidences, correctness)
    results.calibration_bins = bins
    results.calibration_accuracies = accs
    results.calibration_counts = counts

    # ECE and MCE
    results.ece = compute_ece(confidences, correctness)
    results.mce = compute_mce(confidences, correctness)

    print(f"\n  ECE (Expected Calibration Error): {results.ece:.4f}")
    print(f"  MCE (Maximum Calibration Error): {results.mce:.4f}")

    # Brier decomposition
    rel, res, unc = compute_brier_decomposition(confidences, correctness)
    results.brier_reliability = rel
    results.brier_resolution = res
    results.brier_score = rel - res + unc

    print(f"\n  Brier Score: {results.brier_score:.4f}")
    print(f"    - Reliability: {rel:.4f} (lower is better)")
    print(f"    - Resolution: {res:.4f} (higher is better)")
    print(f"    - Uncertainty: {unc:.4f}")

    # Selective prediction
    print("\n  Selective Prediction:")
    selective = evaluate_selective_prediction(confidences, correctness)
    results.selective_accuracy_90 = selective.get("acc_at_90", 0)
    results.selective_accuracy_70 = selective.get("acc_at_70", 0)
    results.selective_accuracy_50 = selective.get("acc_at_50", 0)
    results.coverage_for_95_acc = selective.get("coverage_for_95_acc", 1.0)

    print(f"    Accuracy @ 90% coverage: {results.selective_accuracy_90:.4f}")
    print(f"    Accuracy @ 70% coverage: {results.selective_accuracy_70:.4f}")
    print(f"    Accuracy @ 50% coverage: {results.selective_accuracy_50:.4f}")
    print(f"    Coverage for 95% accuracy: {results.coverage_for_95_acc:.2%}")

    # Uncertainty quality
    results.auroc_uncertainty = compute_auroc_uncertainty(confidences, correctness)
    print(f"\n  Uncertainty AUROC: {results.auroc_uncertainty:.4f}")
    print(f"    (Does uncertainty predict errors? >0.5 = yes)")

    # Calibration curve display
    print("\n  Calibration Curve (Reliability Diagram):")
    print("    Confidence | Accuracy | Count")
    print("    " + "-" * 35)
    for b, a, c in zip(bins, accs, counts):
        bar = "█" * int(a * 20) if c > 0 else ""
        print(f"    {b:>10.2f} | {a:>8.4f} | {c:>5} {bar}")

    # ===================
    # OOD DETECTION
    # ===================
    if not skip_slow:
        print("\n" + "=" * 50)
        print("OUT-OF-DISTRIBUTION DETECTION")
        print("=" * 50)

        ood_results = evaluate_ood_detection(
            model, tokenizer, in_dist_texts, max_samples=min(max_samples, 200)
        )

        if "auroc_code" in ood_results:
            results.ood_auroc = ood_results["auroc_code"]
            results.in_distribution_confidence = ood_results.get("in_conf_code", 0)
            results.ood_confidence = ood_results.get("ood_conf_code", 0)

    # ===================
    # SUMMARY
    # ===================
    print("\n" + "=" * 70)
    print("EVALUATION SUMMARY")
    print("=" * 70)

    print(f"""
┌─────────────────────────────────────────────────────────────────────┐
│ STANDARD BENCHMARKS                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ LAMBADA Accuracy:        {results.lambada_accuracy:>8.4f}                              │
│ LAMBADA Perplexity:      {results.lambada_perplexity:>8.2f}                              │
│ HellaSwag Accuracy:      {results.hellaswag_accuracy:>8.4f}                              │
├─────────────────────────────────────────────────────────────────────┤
│ CALIBRATION QUALITY                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ ECE:                     {results.ece:>8.4f}  (lower is better)               │
│ MCE:                     {results.mce:>8.4f}  (lower is better)               │
│ Brier Score:             {results.brier_score:>8.4f}  (lower is better)               │
│ Uncertainty AUROC:       {results.auroc_uncertainty:>8.4f}  (higher is better)              │
├─────────────────────────────────────────────────────────────────────┤
│ SELECTIVE PREDICTION (Key Lumina Metric!)                           │
├─────────────────────────────────────────────────────────────────────┤
│ Accuracy @ 90% coverage: {results.selective_accuracy_90:>8.4f}                              │
│ Accuracy @ 70% coverage: {results.selective_accuracy_70:>8.4f}                              │
│ Accuracy @ 50% coverage: {results.selective_accuracy_50:>8.4f}                              │
│ Coverage for 95% acc:    {results.coverage_for_95_acc:>8.2%}                              │
├─────────────────────────────────────────────────────────────────────┤
│ OOD DETECTION                                                       │
├─────────────────────────────────────────────────────────────────────┤
│ OOD AUROC:               {results.ood_auroc:>8.4f}                              │
│ In-dist Confidence:      {results.in_distribution_confidence:>8.4f}                              │
│ OOD Confidence:          {results.ood_confidence:>8.4f}                              │
└─────────────────────────────────────────────────────────────────────┘
""")

    return results


def main():
    parser = argparse.ArgumentParser(description="Lumina Evaluation Suite")
    parser.add_argument(
        "--checkpoint",
        type=str,
        required=True,
        help="Path to model checkpoint",
    )
    parser.add_argument(
        "--max-samples",
        type=int,
        default=500,
        help="Maximum samples per test",
    )
    parser.add_argument(
        "--skip-slow",
        action="store_true",
        help="Skip slow benchmarks (LAMBADA, HellaSwag, OOD)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Save results to JSON file",
    )
    args = parser.parse_args()

    results = run_evaluation_suite(
        args.checkpoint,
        max_samples=args.max_samples,
        skip_slow=args.skip_slow,
    )

    if args.output:
        # Save results
        results_dict = {
            "lambada_accuracy": results.lambada_accuracy,
            "lambada_perplexity": results.lambada_perplexity,
            "hellaswag_accuracy": results.hellaswag_accuracy,
            "ece": results.ece,
            "mce": results.mce,
            "brier_score": results.brier_score,
            "brier_reliability": results.brier_reliability,
            "brier_resolution": results.brier_resolution,
            "selective_accuracy_90": results.selective_accuracy_90,
            "selective_accuracy_70": results.selective_accuracy_70,
            "selective_accuracy_50": results.selective_accuracy_50,
            "coverage_for_95_acc": results.coverage_for_95_acc,
            "auroc_uncertainty": results.auroc_uncertainty,
            "ood_auroc": results.ood_auroc,
            "calibration_bins": results.calibration_bins,
            "calibration_accuracies": results.calibration_accuracies,
        }

        with open(args.output, "w") as f:
            json.dump(results_dict, f, indent=2)
        print(f"\nResults saved to {args.output}")


if __name__ == "__main__":
    main()
