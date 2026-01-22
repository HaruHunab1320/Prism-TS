"""
Run the same evaluation suite on GPT-2 for comparison.
"""

import argparse
import json
import math
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

import numpy as np
import torch
from transformers import GPT2LMHeadModel, GPT2Tokenizer
from tqdm import tqdm


@dataclass
class GPT2EvaluationResults:
    """Container for GPT-2 evaluation results."""
    lambada_accuracy: float = 0.0
    lambada_perplexity: float = 0.0
    hellaswag_accuracy: float = 0.0
    ece: float = 0.0
    mce: float = 0.0
    brier_score: float = 0.0
    selective_accuracy_90: float = 0.0
    selective_accuracy_70: float = 0.0
    selective_accuracy_50: float = 0.0
    auroc_uncertainty: float = 0.0
    calibration_bins: List[float] = field(default_factory=list)
    calibration_accuracies: List[float] = field(default_factory=list)


def load_lambada_dataset(max_samples: int = 5000) -> List[Dict]:
    """Load LAMBADA dataset."""
    try:
        from datasets import load_dataset
        dataset = load_dataset("lambada", split="test")

        samples = []
        for i, item in enumerate(dataset):
            if i >= max_samples:
                break
            text = item["text"]
            words = text.strip().split()
            if len(words) > 1:
                context = " ".join(words[:-1])
                target = words[-1]
                samples.append({"context": context, "target": target})
        return samples
    except Exception as e:
        print(f"Could not load LAMBADA: {e}")
        return []


def load_hellaswag_dataset(max_samples: int = 1000) -> List[Dict]:
    """Load HellaSwag dataset."""
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


def evaluate_lambada_gpt2(model, tokenizer, max_samples: int = 300) -> Tuple[float, float]:
    """Evaluate GPT-2 on LAMBADA."""
    print("\n--- LAMBADA Evaluation (GPT-2) ---")
    samples = load_lambada_dataset(max_samples)

    if not samples:
        return 0.0, float('inf')

    model.eval()
    correct = 0
    total = 0
    total_loss = 0.0

    with torch.no_grad():
        for sample in tqdm(samples, desc="LAMBADA"):
            context = sample["context"]
            target = sample["target"]

            context_ids = tokenizer.encode(context, return_tensors="pt")
            target_ids = tokenizer.encode(" " + target)

            if len(target_ids) == 0:
                continue

            outputs = model(context_ids)
            next_logits = outputs.logits[0, -1, :]

            predicted_token = torch.argmax(next_logits).item()

            if predicted_token == target_ids[0]:
                correct += 1

            log_probs = torch.log_softmax(next_logits, dim=-1)
            total_loss -= log_probs[target_ids[0]].item()

            total += 1

    accuracy = correct / total if total > 0 else 0.0
    perplexity = math.exp(total_loss / total) if total > 0 else float('inf')

    print(f"  Accuracy: {accuracy:.4f}")
    print(f"  Perplexity: {perplexity:.2f}")

    return accuracy, perplexity


def evaluate_hellaswag_gpt2(model, tokenizer, max_samples: int = 300) -> float:
    """Evaluate GPT-2 on HellaSwag."""
    print("\n--- HellaSwag Evaluation (GPT-2) ---")
    samples = load_hellaswag_dataset(max_samples)

    if not samples:
        return 0.0

    model.eval()
    correct = 0
    total = 0

    with torch.no_grad():
        for sample in tqdm(samples, desc="HellaSwag"):
            context = sample["context"]
            endings = sample["endings"]
            label = sample["label"]

            scores = []
            for ending in endings:
                full_text = context + " " + ending
                input_ids = tokenizer.encode(full_text, return_tensors="pt")
                context_len = len(tokenizer.encode(context))

                if input_ids.shape[1] <= context_len:
                    scores.append(float('-inf'))
                    continue

                outputs = model(input_ids)
                log_probs = torch.log_softmax(outputs.logits[0], dim=-1)

                total_log_prob = 0.0
                for i in range(context_len, input_ids.shape[1]):
                    target = input_ids[0, i].item()
                    total_log_prob += log_probs[i-1, target].item()

                avg_log_prob = total_log_prob / (input_ids.shape[1] - context_len)
                scores.append(avg_log_prob)

            predicted = np.argmax(scores)
            if predicted == label:
                correct += 1
            total += 1

    accuracy = correct / total if total > 0 else 0.0
    print(f"  Accuracy: {accuracy:.4f}")

    return accuracy


def compute_calibration_metrics(
    confidences: List[float],
    correctness: List[int],
    n_bins: int = 10,
) -> Dict:
    """Compute calibration metrics."""
    bin_boundaries = np.linspace(0, 1, n_bins + 1)

    bins = []
    accs = []
    counts = []

    for i in range(n_bins):
        low, high = bin_boundaries[i], bin_boundaries[i + 1]
        mask = [(low <= c < high) for c in confidences]
        bin_conf = [c for c, m in zip(confidences, mask) if m]
        bin_corr = [c for c, m in zip(correctness, mask) if m]

        if bin_conf:
            bins.append(np.mean(bin_conf))
            accs.append(np.mean(bin_corr))
            counts.append(len(bin_conf))
        else:
            bins.append((low + high) / 2)
            accs.append(0.0)
            counts.append(0)

    # ECE
    ece = 0.0
    total = sum(counts)
    for i, (acc, count) in enumerate(zip(accs, counts)):
        if count > 0:
            bin_center = (bin_boundaries[i] + bin_boundaries[i + 1]) / 2
            ece += (count / total) * abs(acc - bin_center)

    # MCE
    mce = 0.0
    for i, (acc, count) in enumerate(zip(accs, counts)):
        if count > 0:
            bin_center = (bin_boundaries[i] + bin_boundaries[i + 1]) / 2
            mce = max(mce, abs(acc - bin_center))

    return {
        "ece": ece,
        "mce": mce,
        "bins": bins,
        "accs": accs,
        "counts": counts,
    }


def evaluate_selective_prediction(
    confidences: List[float],
    correctness: List[int],
) -> Dict[str, float]:
    """Evaluate selective prediction."""
    sorted_pairs = sorted(zip(confidences, correctness), key=lambda x: -x[0])

    results = {}
    for coverage in [0.9, 0.7, 0.5]:
        n_keep = int(len(sorted_pairs) * coverage)
        if n_keep > 0:
            kept = sorted_pairs[:n_keep]
            acc = sum(c for _, c in kept) / n_keep
            results[f"acc_at_{int(coverage*100)}"] = acc

    return results


def compute_auroc_uncertainty(confidences: List[float], correctness: List[int]) -> float:
    """Compute AUROC for uncertainty predicting errors."""
    from sklearn.metrics import roc_auc_score

    uncertainties = [1 - c for c in confidences]
    errors = [1 - c for c in correctness]

    try:
        return roc_auc_score(errors, uncertainties)
    except:
        return 0.5


def collect_predictions_gpt2(
    model,
    tokenizer,
    texts: List[str],
    max_samples: int = 500,
) -> Tuple[List[float], List[int]]:
    """Collect confidence and correctness from GPT-2."""
    confidences = []
    correctness = []

    model.eval()

    with torch.no_grad():
        for text in tqdm(texts[:max_samples], desc="Collecting GPT-2 predictions"):
            input_ids = tokenizer.encode(text, return_tensors="pt")

            if input_ids.shape[1] < 10:
                continue

            input_ids = input_ids[:, :256]  # Truncate

            outputs = model(input_ids[:, :-1])
            probs = torch.softmax(outputs.logits[0], dim=-1)

            # Get max probability as confidence
            max_probs, predictions = probs.max(dim=-1)
            targets = input_ids[0, 1:]

            for i in range(len(predictions)):
                confidences.append(max_probs[i].item())
                correctness.append(int(predictions[i].item() == targets[i].item()))

    return confidences, correctness


def run_gpt2_evaluation(max_samples: int = 300) -> GPT2EvaluationResults:
    """Run full evaluation on GPT-2."""
    print("=" * 70)
    print("GPT-2 EVALUATION SUITE")
    print("=" * 70)

    print("\nLoading GPT-2...")
    tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
    model = GPT2LMHeadModel.from_pretrained("gpt2")
    model.eval()

    results = GPT2EvaluationResults()

    # Load test data
    print("\nLoading evaluation data...")
    try:
        from datasets import load_dataset
        wiki = load_dataset("wikitext", "wikitext-2-raw-v1", split="test")
        in_dist_texts = [t for t in wiki["text"] if len(t.strip()) > 100][:max_samples]
    except:
        in_dist_texts = ["The quick brown fox jumps over the lazy dog."] * 100

    # Standard benchmarks
    print("\n" + "=" * 50)
    print("STANDARD BENCHMARKS")
    print("=" * 50)

    results.lambada_accuracy, results.lambada_perplexity = evaluate_lambada_gpt2(
        model, tokenizer, max_samples
    )

    results.hellaswag_accuracy = evaluate_hellaswag_gpt2(
        model, tokenizer, max_samples
    )

    # Calibration
    print("\n" + "=" * 50)
    print("CALIBRATION ANALYSIS")
    print("=" * 50)

    print("\nCollecting predictions...")
    confidences, correctness = collect_predictions_gpt2(
        model, tokenizer, in_dist_texts, max_samples
    )

    cal_metrics = compute_calibration_metrics(confidences, correctness)
    results.ece = cal_metrics["ece"]
    results.mce = cal_metrics["mce"]
    results.calibration_bins = cal_metrics["bins"]
    results.calibration_accuracies = cal_metrics["accs"]

    print(f"\n  ECE: {results.ece:.4f}")
    print(f"  MCE: {results.mce:.4f}")

    # Selective prediction
    selective = evaluate_selective_prediction(confidences, correctness)
    results.selective_accuracy_90 = selective.get("acc_at_90", 0)
    results.selective_accuracy_70 = selective.get("acc_at_70", 0)
    results.selective_accuracy_50 = selective.get("acc_at_50", 0)

    print(f"\n  Selective Prediction:")
    print(f"    Accuracy @ 90% coverage: {results.selective_accuracy_90:.4f}")
    print(f"    Accuracy @ 70% coverage: {results.selective_accuracy_70:.4f}")
    print(f"    Accuracy @ 50% coverage: {results.selective_accuracy_50:.4f}")

    # Uncertainty AUROC
    results.auroc_uncertainty = compute_auroc_uncertainty(confidences, correctness)
    print(f"\n  Uncertainty AUROC: {results.auroc_uncertainty:.4f}")

    # Calibration curve
    print("\n  Calibration Curve:")
    print("    Confidence | Accuracy | Count")
    print("    " + "-" * 35)
    for b, a, c in zip(cal_metrics["bins"], cal_metrics["accs"], cal_metrics["counts"]):
        bar = "█" * int(a * 20) if c > 0 else ""
        print(f"    {b:>10.2f} | {a:>8.4f} | {c:>5} {bar}")

    # Summary
    print("\n" + "=" * 70)
    print("GPT-2 EVALUATION SUMMARY")
    print("=" * 70)
    print(f"""
┌─────────────────────────────────────────────────────────────────────┐
│ STANDARD BENCHMARKS                                                 │
├─────────────────────────────────────────────────────────────────────┤
│ LAMBADA Accuracy:        {results.lambada_accuracy:>8.4f}                              │
│ LAMBADA Perplexity:      {results.lambada_perplexity:>8.2f}                              │
│ HellaSwag Accuracy:      {results.hellaswag_accuracy:>8.4f}                              │
├─────────────────────────────────────────────────────────────────────┤
│ CALIBRATION                                                         │
├─────────────────────────────────────────────────────────────────────┤
│ ECE:                     {results.ece:>8.4f}                              │
│ MCE:                     {results.mce:>8.4f}                              │
│ Uncertainty AUROC:       {results.auroc_uncertainty:>8.4f}                              │
├─────────────────────────────────────────────────────────────────────┤
│ SELECTIVE PREDICTION                                                │
├─────────────────────────────────────────────────────────────────────┤
│ Accuracy @ 90% coverage: {results.selective_accuracy_90:>8.4f}                              │
│ Accuracy @ 70% coverage: {results.selective_accuracy_70:>8.4f}                              │
│ Accuracy @ 50% coverage: {results.selective_accuracy_50:>8.4f}                              │
└─────────────────────────────────────────────────────────────────────┘
""")

    return results


def main():
    parser = argparse.ArgumentParser(description="GPT-2 Evaluation Suite")
    parser.add_argument("--max-samples", type=int, default=300)
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()

    results = run_gpt2_evaluation(args.max_samples)

    if args.output:
        results_dict = {
            "lambada_accuracy": results.lambada_accuracy,
            "lambada_perplexity": results.lambada_perplexity,
            "hellaswag_accuracy": results.hellaswag_accuracy,
            "ece": results.ece,
            "mce": results.mce,
            "selective_accuracy_90": results.selective_accuracy_90,
            "selective_accuracy_70": results.selective_accuracy_70,
            "selective_accuracy_50": results.selective_accuracy_50,
            "auroc_uncertainty": results.auroc_uncertainty,
        }
        with open(args.output, "w") as f:
            json.dump(results_dict, f, indent=2)


if __name__ == "__main__":
    main()
