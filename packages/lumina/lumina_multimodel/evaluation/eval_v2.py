#!/usr/bin/env python3
"""
Lumina PoC v2 - Rigorous Evaluation

Measures meaningful metrics beyond token-level accuracy:
1. Answer-only token accuracy (ignoring question tokens)
2. Exact match accuracy (full answer string match)
3. Syntax validity (for code domains)
4. Calibration metrics (ECE, Brier score)
5. OOD detection (AUROC on out-of-domain queries)
6. Selective prediction curves
"""

import json
import argparse
import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import mlx.core as mx
    import mlx.nn as nn
    HAS_MLX = True
except ImportError:
    HAS_MLX = False
    print("MLX not available")
    sys.exit(1)

from transformers import GPT2Tokenizer
import numpy as np

from config_v2 import (
    OUTPUTS_DIR, DATASETS_DIR, MODEL_SIZES, DOMAINS, THRESHOLDS
)
from models.base import TinySpecialist


@dataclass
class EvalResults:
    """Comprehensive evaluation results."""
    # Basic metrics
    token_accuracy: float          # All tokens
    answer_token_accuracy: float   # Answer portion only
    exact_match: float             # Full answer match

    # Calibration
    ece: float                     # Expected Calibration Error
    brier_score: float             # Brier score
    avg_confidence: float          # Mean confidence

    # OOD Detection
    ood_auroc: float               # AUROC for OOD detection
    ood_detection_rate: float      # % of OOD correctly flagged (conf < 0.5)

    # Selective Prediction
    acc_at_80: float               # Accuracy on top 80% confident
    acc_at_50: float               # Accuracy on top 50% confident

    # Domain-specific
    syntax_valid_rate: float       # % with valid syntax (code domains)

    # Counts
    n_samples: int
    n_ood_samples: int

    def to_dict(self) -> Dict:
        return {
            "token_accuracy": self.token_accuracy,
            "answer_token_accuracy": self.answer_token_accuracy,
            "exact_match": self.exact_match,
            "ece": self.ece,
            "brier_score": self.brier_score,
            "avg_confidence": self.avg_confidence,
            "ood_auroc": self.ood_auroc,
            "ood_detection_rate": self.ood_detection_rate,
            "acc_at_80": self.acc_at_80,
            "acc_at_50": self.acc_at_50,
            "syntax_valid_rate": self.syntax_valid_rate,
            "n_samples": self.n_samples,
            "n_ood_samples": self.n_ood_samples,
        }

    def print_report(self, domain: str):
        """Print formatted evaluation report."""
        print(f"\n{'='*60}")
        print(f" {domain.upper()} SPECIALIST EVALUATION")
        print(f"{'='*60}")

        print(f"\n[Accuracy Metrics]")
        print(f"  Token accuracy (all):      {self.token_accuracy:.2%}")
        print(f"  Token accuracy (answer):   {self.answer_token_accuracy:.2%}")
        print(f"  Exact match:               {self.exact_match:.2%}")

        print(f"\n[Calibration Metrics]")
        print(f"  ECE:                       {self.ece:.4f}  {'✓' if self.ece < THRESHOLDS.target_ece else '✗'} (target < {THRESHOLDS.target_ece})")
        print(f"  Brier Score:               {self.brier_score:.4f}")
        print(f"  Avg Confidence:            {self.avg_confidence:.2%}")

        print(f"\n[OOD Detection]")
        print(f"  AUROC:                     {self.ood_auroc:.4f}  {'✓' if self.ood_auroc > THRESHOLDS.ood_auroc else '✗'} (target > {THRESHOLDS.ood_auroc})")
        print(f"  Detection Rate:            {self.ood_detection_rate:.2%}  {'✓' if self.ood_detection_rate > THRESHOLDS.ood_decline_rate else '✗'} (target > {THRESHOLDS.ood_decline_rate:.0%})")

        print(f"\n[Selective Prediction]")
        print(f"  Acc @ 80% coverage:        {self.acc_at_80:.2%}")
        print(f"  Acc @ 50% coverage:        {self.acc_at_50:.2%}")

        if self.syntax_valid_rate >= 0:
            print(f"\n[Syntax Validity]")
            print(f"  Valid syntax rate:         {self.syntax_valid_rate:.2%}  {'✓' if self.syntax_valid_rate > THRESHOLDS.valid_syntax_rate else '✗'} (target > {THRESHOLDS.valid_syntax_rate:.0%})")

        print(f"\n[Sample Counts]")
        print(f"  Total samples:             {self.n_samples}")
        print(f"  OOD samples:               {self.n_ood_samples}")
        print(f"{'='*60}\n")


def load_model(domain: str, size: str) -> Tuple[TinySpecialist, GPT2Tokenizer]:
    """Load a trained specialist model."""
    model_dir = OUTPUTS_DIR / f"{domain}_specialist_{size}"
    weights_path = model_dir / "model.safetensors"

    if not weights_path.exists():
        raise FileNotFoundError(f"No model found at {weights_path}")

    config = MODEL_SIZES[size]
    model = TinySpecialist(config)
    weights = mx.load(str(weights_path))
    model.load_weights(list(weights.items()))

    tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
    tokenizer.pad_token = tokenizer.eos_token

    return model, tokenizer


def load_val_data(domain: str, data_root: Optional[Path] = None) -> List[Dict]:
    """Load validation data for a domain."""
    if data_root is None:
        candidates = [
            DATASETS_DIR.parent / "datasets_merged",
            DATASETS_DIR.parent / "datasets_real",
            DATASETS_DIR,
        ]
        for cand in candidates:
            if (cand / f"{domain}_specialist" / "val.jsonl").exists():
                data_root = cand
                break
        else:
            data_root = DATASETS_DIR

    val_path = data_root / f"{domain}_specialist" / "val.jsonl"

    if not val_path.exists():
        raise FileNotFoundError(f"No validation data at {val_path}")

    data = []
    with open(val_path) as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))

    return data


def extract_answer(text: str) -> str:
    """Extract answer portion from formatted text."""
    if "Answer:" in text:
        return text.split("Answer:", 1)[1].strip()
    return text


def check_prism_syntax(code: str) -> bool:
    """Basic Prism syntax validation."""
    # Extract code from markdown blocks
    code_match = re.search(r'```(?:prism)?\s*(.*?)```', code, re.DOTALL)
    if code_match:
        code = code_match.group(1).strip()

    # Basic syntax checks for Prism
    checks = [
        # Has valid operators
        any(op in code for op in ['~>', '<~', '~+', '~-', '~*', '~/',
                                   '~==', '~!=', '~&&', '~||', '~??',
                                   'const ', 'let ', 'function ', 'uncertain if']),
        # Balanced braces/parens (simple check)
        code.count('{') == code.count('}'),
        code.count('(') == code.count(')'),
        code.count('[') == code.count(']'),
        # No obvious errors
        'undefined' not in code.lower() or 'undefined' in code,  # Allow literal undefined
    ]

    return all(checks)


def check_code_syntax(code: str, lang: str) -> bool:
    """Basic code syntax validation."""
    code_match = re.search(r'```(?:\w+)?\s*(.*?)```', code, re.DOTALL)
    if code_match:
        code = code_match.group(1).strip()

    # Basic checks
    checks = [
        code.count('{') == code.count('}'),
        code.count('(') == code.count(')'),
        code.count('[') == code.count(']'),
        len(code) > 0,
    ]

    return all(checks)


def compute_ece(confidences: List[float], correctness: List[bool], n_bins: int = 15) -> float:
    """Compute Expected Calibration Error."""
    if len(confidences) == 0:
        return 0.0

    confidences = np.array(confidences)
    correctness = np.array(correctness, dtype=float)

    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0

    for i in range(n_bins):
        mask = (confidences > bin_boundaries[i]) & (confidences <= bin_boundaries[i + 1])
        if mask.sum() > 0:
            bin_conf = confidences[mask].mean()
            bin_acc = correctness[mask].mean()
            ece += mask.sum() * abs(bin_acc - bin_conf)

    return ece / len(confidences)


def compute_brier(confidences: List[float], correctness: List[bool]) -> float:
    """Compute Brier score."""
    if len(confidences) == 0:
        return 0.0

    confidences = np.array(confidences)
    correctness = np.array(correctness, dtype=float)

    return np.mean((confidences - correctness) ** 2)


def compute_auroc(scores: List[float], labels: List[bool]) -> float:
    """Compute AUROC for OOD detection."""
    if len(scores) == 0 or sum(labels) == 0 or sum(labels) == len(labels):
        return 0.5  # No discrimination possible

    scores = np.array(scores)
    labels = np.array(labels)

    # Sort by score descending
    sorted_indices = np.argsort(-scores)
    labels = labels[sorted_indices]

    # Compute AUROC via trapezoidal rule
    n_pos = labels.sum()
    n_neg = len(labels) - n_pos

    if n_pos == 0 or n_neg == 0:
        return 0.5

    tpr = np.cumsum(labels) / n_pos
    fpr = np.cumsum(~labels) / n_neg

    # Add origin
    tpr = np.concatenate([[0], tpr])
    fpr = np.concatenate([[0], fpr])

    auroc = np.trapz(tpr, fpr)
    return auroc


def selective_accuracy(confidences: List[float], correctness: List[bool], coverage: float) -> float:
    """Compute accuracy at given coverage level."""
    if len(confidences) == 0:
        return 0.0

    n_select = max(1, int(len(confidences) * coverage))

    # Sort by confidence descending
    sorted_indices = np.argsort(confidences)[::-1]
    selected_correct = [correctness[i] for i in sorted_indices[:n_select]]

    return np.mean(selected_correct)


def evaluate_specialist(
    model: TinySpecialist,
    tokenizer: GPT2Tokenizer,
    val_data: List[Dict],
    domain: str,
    max_samples: int = 500,
) -> EvalResults:
    """Run comprehensive evaluation on a specialist."""

    # Metrics accumulators
    all_token_correct = []
    answer_token_correct = []
    exact_matches = []
    confidences = []
    correctness_for_calib = []  # Per-sample correctness
    syntax_valid = []

    # OOD tracking
    ood_scores = []  # Higher = more OOD
    ood_labels = []  # True = is OOD

    # Limit samples for speed, but force-include OOD rows if present
    ood_samples = [s for s in val_data if s.get("category") == "ood"]
    non_ood_samples = [s for s in val_data if s.get("category") != "ood"]

    if ood_samples:
        target_ood = min(len(ood_samples), max(1, max_samples // 5))
        target_non_ood = max_samples - target_ood
        samples = ood_samples[:target_ood] + non_ood_samples[:target_non_ood]
    else:
        samples = val_data[:max_samples]
    n_ood = 0

    for sample in samples:
        question = sample["question"]
        expected_answer = sample["answer"]
        is_ood = sample.get("category") == "ood"

        if is_ood:
            n_ood += 1

        # Format input
        input_text = f"Question: {question}\nAnswer:"
        full_text = f"Question: {question}\nAnswer: {expected_answer}"

        # Tokenize
        input_tokens = tokenizer.encode(input_text)
        full_tokens = tokenizer.encode(full_text)
        answer_start_idx = len(input_tokens)

        # Model forward pass
        input_ids = mx.array([full_tokens[:-1]])  # All but last
        target_ids = mx.array([full_tokens[1:]])   # Shifted

        logits, confidence = model(input_ids)
        preds = mx.argmax(logits, axis=-1)

        # Token accuracy (all)
        correct_tokens = (preds[0] == target_ids[0]).tolist()
        all_token_correct.extend(correct_tokens)

        # Token accuracy (answer only)
        answer_correct = []
        if answer_start_idx < len(correct_tokens):
            answer_correct = correct_tokens[answer_start_idx - 1:]  # -1 for shift
            answer_token_correct.extend(answer_correct)

        # Exact match
        pred_tokens = preds[0].tolist()
        pred_answer_tokens = pred_tokens[answer_start_idx - 1:]
        target_answer_tokens = full_tokens[answer_start_idx:]

        # Decode and compare
        pred_answer = tokenizer.decode(pred_answer_tokens, skip_special_tokens=True)
        target_answer = tokenizer.decode(target_answer_tokens, skip_special_tokens=True)
        is_exact_match = pred_answer.strip() == target_answer.strip()
        exact_matches.append(is_exact_match)

        # Confidence (sequence-level mean)
        conf_overall = float(confidence["overall"].mean().item())
        confidences.append(conf_overall)

        # Correctness for calibration (use answer token accuracy as proxy)
        if len(answer_correct) > 0:
            sample_correct = sum(answer_correct) / len(answer_correct) > 0.8
        else:
            sample_correct = is_exact_match
        correctness_for_calib.append(sample_correct)

        # OOD detection
        ood_score = float(confidence["distribution_shift"].mean().item())
        ood_scores.append(ood_score)
        ood_labels.append(is_ood)

        # Syntax validity (for code domains)
        if domain == "prism":
            syntax_valid.append(check_prism_syntax(pred_answer))
        elif domain == "code":
            syntax_valid.append(check_code_syntax(pred_answer, "javascript"))

    # Compute metrics
    token_accuracy = np.mean(all_token_correct) if all_token_correct else 0.0
    answer_token_accuracy = np.mean(answer_token_correct) if answer_token_correct else 0.0
    exact_match = np.mean(exact_matches) if exact_matches else 0.0

    ece = compute_ece(confidences, correctness_for_calib)
    brier = compute_brier(confidences, correctness_for_calib)
    avg_conf = np.mean(confidences) if confidences else 0.0

    # OOD metrics
    ood_auroc = compute_auroc(ood_scores, ood_labels)

    # OOD detection rate: what % of OOD samples have confidence < 0.5?
    ood_detected = sum(1 for i, is_ood in enumerate(ood_labels)
                       if is_ood and confidences[i] < 0.5)
    ood_detection_rate = ood_detected / max(1, n_ood)

    # Selective prediction
    acc_at_80 = selective_accuracy(confidences, correctness_for_calib, 0.8)
    acc_at_50 = selective_accuracy(confidences, correctness_for_calib, 0.5)

    # Syntax validity
    syntax_rate = np.mean(syntax_valid) if syntax_valid else -1.0

    return EvalResults(
        token_accuracy=token_accuracy,
        answer_token_accuracy=answer_token_accuracy,
        exact_match=exact_match,
        ece=ece,
        brier_score=brier,
        avg_confidence=avg_conf,
        ood_auroc=ood_auroc,
        ood_detection_rate=ood_detection_rate,
        acc_at_80=acc_at_80,
        acc_at_50=acc_at_50,
        syntax_valid_rate=syntax_rate,
        n_samples=len(samples),
        n_ood_samples=n_ood,
    )


def main():
    parser = argparse.ArgumentParser(description="Lumina PoC v2 Evaluation")
    parser.add_argument("--size", type=str, default="small",
                        choices=["small", "medium", "large", "xlarge"])
    parser.add_argument("--domains", type=str, nargs="+", default=None,
                        help="Domains to evaluate (default: all trained)")
    parser.add_argument("--max-samples", type=int, default=500,
                        help="Max samples per domain")
    parser.add_argument("--output", type=str, default=None,
                        help="Output JSON file for results")
    parser.add_argument("--data-root", type=Path, default=None,
                        help="Override dataset root (e.g., datasets_merged)")

    args = parser.parse_args()

    print("\n" + "=" * 60)
    print(" Lumina PoC v2 - Rigorous Evaluation")
    print("=" * 60)

    # Determine domains to evaluate
    if args.domains:
        domains = args.domains
    else:
        domains = []
        for domain in DOMAINS:
            model_path = OUTPUTS_DIR / f"{domain}_specialist_{args.size}" / "model.safetensors"
            if model_path.exists():
                domains.append(domain)

    if not domains:
        print("\nNo trained models found!")
        return

    print(f"\nEvaluating: {', '.join(domains)}")
    print(f"Model size: {args.size}")
    print(f"Max samples: {args.max_samples}")

    all_results = {}

    for domain in domains:
        try:
            print(f"\nLoading {domain} specialist...")
            model, tokenizer = load_model(domain, args.size)

            print(f"Loading validation data...")
            val_data = load_val_data(domain, data_root=args.data_root)

            print(f"Running evaluation ({len(val_data)} samples)...")
            results = evaluate_specialist(
                model, tokenizer, val_data, domain,
                max_samples=args.max_samples
            )

            results.print_report(domain)
            all_results[domain] = results.to_dict()

        except Exception as e:
            print(f"Error evaluating {domain}: {e}")
            import traceback
            traceback.print_exc()

    # Summary
    print("\n" + "=" * 60)
    print(" SUMMARY")
    print("=" * 60)

    print(f"\n{'Domain':<12} {'Ans Acc':>10} {'Exact':>10} {'ECE':>10} {'OOD AUROC':>10}")
    print("-" * 54)

    for domain, results in all_results.items():
        print(f"{domain:<12} {results['answer_token_accuracy']:>10.2%} "
              f"{results['exact_match']:>10.2%} {results['ece']:>10.4f} "
              f"{results['ood_auroc']:>10.4f}")

    # Targets check
    print(f"\n[Targets]")
    all_pass = True
    for domain, results in all_results.items():
        ece_pass = results['ece'] < THRESHOLDS.target_ece
        ood_pass = results['ood_auroc'] > THRESHOLDS.ood_auroc

        if not ece_pass:
            print(f"  ✗ {domain} ECE ({results['ece']:.4f}) > target ({THRESHOLDS.target_ece})")
            all_pass = False
        if not ood_pass:
            print(f"  ✗ {domain} OOD AUROC ({results['ood_auroc']:.4f}) < target ({THRESHOLDS.ood_auroc})")
            all_pass = False

    if all_pass:
        print("  ✓ All metrics within targets!")

    # Save results
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(all_results, f, indent=2)
        print(f"\nResults saved to: {output_path}")

    print()


if __name__ == "__main__":
    main()
