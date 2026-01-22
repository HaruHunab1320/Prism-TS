"""
Comprehensive Benchmark: Lumina vs Standard GPT-2

Compare our Lumina model against standard GPT-2 on:
1. Perplexity (standard LM metric)
2. Top-k accuracy (prediction quality)
3. AUC-ROC (confidence calibration)
4. Brier score (calibration)
5. ECE (expected calibration error)
6. Generation quality (distinct-n, repetition)

This answers: "Is our model actually good, or just well-calibrated garbage?"
"""

import argparse
import json
import math
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from collections import Counter

import mlx.core as mx
import mlx.nn as nn
import numpy as np
from tqdm import tqdm

from .config import get_config, LuminaConfig
from .model import LuminaModel
from .data import load_tokenizer, create_eval_dataloader
from .train_phase4 import LuminaPhase4Model
from .losses import compute_calibration_metrics


@dataclass
class BenchmarkMetrics:
    """All benchmark metrics."""
    # Language modeling
    perplexity: float
    loss: float

    # Accuracy
    top1_accuracy: float
    top5_accuracy: float
    top10_accuracy: float

    # Calibration (for models with confidence)
    auc_roc: Optional[float] = None
    brier_score: Optional[float] = None
    ece: Optional[float] = None

    # Generation quality
    distinct_1: Optional[float] = None
    distinct_2: Optional[float] = None
    repetition_rate: Optional[float] = None

    # Uncertainty metrics
    avg_entropy: Optional[float] = None
    avg_confidence: Optional[float] = None


def compute_auc_roc(confidences: List[float], correct: List[int]) -> float:
    """
    Compute AUC-ROC for confidence calibration.

    Good AUC means: when confidence is high, predictions are correct.
    """
    if len(confidences) < 2:
        return 0.5

    # Sort by confidence descending
    pairs = sorted(zip(confidences, correct), key=lambda x: -x[0])

    # Count positives and negatives
    n_pos = sum(correct)
    n_neg = len(correct) - n_pos

    if n_pos == 0 or n_neg == 0:
        return 0.5

    # Compute AUC using trapezoidal rule
    tp = 0
    fp = 0
    auc = 0.0
    prev_tpr = 0.0
    prev_fpr = 0.0

    for conf, is_correct in pairs:
        if is_correct:
            tp += 1
        else:
            fp += 1

        tpr = tp / n_pos
        fpr = fp / n_neg

        # Trapezoidal area
        auc += (fpr - prev_fpr) * (tpr + prev_tpr) / 2

        prev_tpr = tpr
        prev_fpr = fpr

    return auc


def compute_distinct_n(tokens: List[int], n: int) -> float:
    """Compute distinct-n: ratio of unique n-grams."""
    if len(tokens) < n:
        return 0.0

    ngrams = [tuple(tokens[i:i+n]) for i in range(len(tokens) - n + 1)]
    return len(set(ngrams)) / len(ngrams) if ngrams else 0.0


def compute_repetition_rate(tokens: List[int], window: int = 32) -> float:
    """Compute repetition rate within sliding window."""
    if len(tokens) < window:
        return 0.0

    repetitions = 0
    total = 0

    for i in range(len(tokens) - window):
        window_tokens = tokens[i:i+window]
        # Check if any token repeats consecutively 3+ times
        for j in range(len(window_tokens) - 2):
            if window_tokens[j] == window_tokens[j+1] == window_tokens[j+2]:
                repetitions += 1
                break
        total += 1

    return repetitions / total if total > 0 else 0.0


def evaluate_lumina(
    model: LuminaModel,
    eval_loader,
    max_batches: int = 100,
) -> BenchmarkMetrics:
    """Evaluate Lumina model on all metrics."""
    total_loss = 0.0
    total_tokens = 0

    all_correct_top1 = []
    all_correct_top5 = []
    all_correct_top10 = []
    all_confidences = []
    all_entropies = []
    all_generated_tokens = []

    for batch_idx, batch in enumerate(tqdm(eval_loader, desc="Evaluating Lumina")):
        if batch_idx >= max_batches:
            break

        # Handle both base LuminaModel and Phase 4 model outputs
        result = model(batch.input_ids)

        # Phase 4 returns: (logits, entropy, confidence, layer_confidences)
        # Base model returns: (LuminaOutput, cache)
        if isinstance(result, tuple) and len(result) == 4:
            logits, entropy, confidence, _ = result
        else:
            output, _ = result
            logits = output.logits
            entropy = output.entropy
            confidence = output.confidence

        # Compute loss
        mask = (batch.labels != -100).astype(mx.float32)

        # Cross entropy loss
        log_probs = mx.log(mx.softmax(logits, axis=-1) + 1e-10)
        targets_safe = mx.clip(batch.labels, 0, logits.shape[-1] - 1)

        target_log_probs = mx.take_along_axis(
            log_probs, targets_safe[..., None], axis=-1
        ).squeeze(-1)

        loss = (-target_log_probs * mask).sum()
        n_tokens = mask.sum()

        total_loss += float(loss.item())
        total_tokens += int(n_tokens.item())

        # Top-k accuracy
        sorted_indices = mx.argsort(-logits, axis=-1)
        top1 = sorted_indices[..., :1]
        top5 = sorted_indices[..., :5]
        top10 = sorted_indices[..., :10]

        # Check if target is in top-k
        targets_expanded = targets_safe[..., None]

        correct_top1 = (top1 == targets_expanded).any(axis=-1).astype(mx.float32) * mask
        correct_top5 = (top5 == targets_expanded).any(axis=-1).astype(mx.float32) * mask
        correct_top10 = (top10 == targets_expanded).any(axis=-1).astype(mx.float32) * mask

        # Flatten and collect
        mask_flat = mask.reshape(-1).tolist()
        correct_top1_flat = correct_top1.reshape(-1).tolist()
        correct_top5_flat = correct_top5.reshape(-1).tolist()
        correct_top10_flat = correct_top10.reshape(-1).tolist()
        conf_flat = confidence.overall.reshape(-1).tolist()
        entropy_flat = entropy.reshape(-1).tolist()

        for i, m in enumerate(mask_flat):
            if m > 0.5:
                all_correct_top1.append(int(correct_top1_flat[i]))
                all_correct_top5.append(int(correct_top5_flat[i]))
                all_correct_top10.append(int(correct_top10_flat[i]))
                all_confidences.append(conf_flat[i])
                all_entropies.append(entropy_flat[i])

        # Collect generated tokens for diversity metrics
        predictions = mx.argmax(logits, axis=-1)
        all_generated_tokens.extend(predictions.reshape(-1).tolist())

    # Compute metrics
    avg_loss = total_loss / total_tokens
    perplexity = math.exp(avg_loss)

    top1_acc = sum(all_correct_top1) / len(all_correct_top1)
    top5_acc = sum(all_correct_top5) / len(all_correct_top5)
    top10_acc = sum(all_correct_top10) / len(all_correct_top10)

    # Calibration metrics
    auc = compute_auc_roc(all_confidences, all_correct_top1)

    # Brier score
    brier = sum((c - r) ** 2 for c, r in zip(all_confidences, all_correct_top1)) / len(all_confidences)

    # ECE
    cal_metrics = compute_calibration_metrics(
        mx.array(all_confidences),
        mx.array(all_correct_top1, dtype=mx.float32),
    )

    # Diversity metrics
    distinct_1 = compute_distinct_n(all_generated_tokens, 1)
    distinct_2 = compute_distinct_n(all_generated_tokens, 2)
    rep_rate = compute_repetition_rate(all_generated_tokens)

    return BenchmarkMetrics(
        perplexity=perplexity,
        loss=avg_loss,
        top1_accuracy=top1_acc,
        top5_accuracy=top5_acc,
        top10_accuracy=top10_acc,
        auc_roc=auc,
        brier_score=brier,
        ece=cal_metrics.ece,
        distinct_1=distinct_1,
        distinct_2=distinct_2,
        repetition_rate=rep_rate,
        avg_entropy=sum(all_entropies) / len(all_entropies),
        avg_confidence=sum(all_confidences) / len(all_confidences),
    )


def evaluate_gpt2_hf(
    model_name: str,
    eval_texts: List[str],
    tokenizer,
    max_length: int = 256,
    device: str = "mps",
) -> BenchmarkMetrics:
    """Evaluate HuggingFace GPT-2 on the same metrics."""
    try:
        import torch
        from transformers import GPT2LMHeadModel
    except ImportError:
        print("PyTorch/Transformers not available, skipping GPT-2 comparison")
        return None

    print(f"Loading {model_name} from HuggingFace...")
    hf_model = GPT2LMHeadModel.from_pretrained(model_name)
    hf_model.eval()

    # Try to use MPS if available
    if device == "mps" and torch.backends.mps.is_available():
        hf_model = hf_model.to("mps")
    elif device == "cuda" and torch.cuda.is_available():
        hf_model = hf_model.to("cuda")
    else:
        device = "cpu"
        hf_model = hf_model.to("cpu")

    print(f"Running on device: {device}")

    total_loss = 0.0
    total_tokens = 0

    all_correct_top1 = []
    all_correct_top5 = []
    all_correct_top10 = []
    all_confidences = []  # Top-1 probability as confidence
    all_entropies = []
    all_generated_tokens = []

    for text in tqdm(eval_texts, desc=f"Evaluating {model_name}"):
        tokens = tokenizer.encode(text)
        if len(tokens) < 2:
            continue
        tokens = tokens[:max_length]

        input_ids = torch.tensor([tokens[:-1]]).to(device)
        labels = torch.tensor([tokens[1:]]).to(device)

        with torch.no_grad():
            outputs = hf_model(input_ids, labels=labels)
            logits = outputs.logits

            # Loss
            loss_fn = torch.nn.CrossEntropyLoss(reduction='sum')
            loss = loss_fn(logits.view(-1, logits.size(-1)), labels.view(-1))

            total_loss += loss.item()
            total_tokens += labels.numel()

            # Probabilities and entropy
            probs = torch.softmax(logits, dim=-1)
            log_probs = torch.log(probs + 1e-10)
            entropy = -(probs * log_probs).sum(dim=-1)

            # Top-k predictions
            _, top_indices = torch.topk(probs, k=10, dim=-1)

            # Confidence = top-1 probability
            top1_probs = probs.gather(-1, top_indices[..., :1]).squeeze(-1)

            # Check accuracy
            for i in range(labels.size(1)):
                target = labels[0, i].item()
                top1 = top_indices[0, i, 0].item()
                top5 = top_indices[0, i, :5].tolist()
                top10 = top_indices[0, i, :10].tolist()

                all_correct_top1.append(1 if target == top1 else 0)
                all_correct_top5.append(1 if target in top5 else 0)
                all_correct_top10.append(1 if target in top10 else 0)
                all_confidences.append(top1_probs[0, i].item())
                all_entropies.append(entropy[0, i].item())

            # Generated tokens
            predictions = torch.argmax(logits, dim=-1)
            all_generated_tokens.extend(predictions[0].tolist())

    # Compute metrics
    avg_loss = total_loss / total_tokens
    perplexity = math.exp(avg_loss)

    top1_acc = sum(all_correct_top1) / len(all_correct_top1)
    top5_acc = sum(all_correct_top5) / len(all_correct_top5)
    top10_acc = sum(all_correct_top10) / len(all_correct_top10)

    # AUC (using top-1 prob as confidence)
    auc = compute_auc_roc(all_confidences, all_correct_top1)

    # Brier score
    brier = sum((c - r) ** 2 for c, r in zip(all_confidences, all_correct_top1)) / len(all_confidences)

    # ECE
    cal_metrics = compute_calibration_metrics(
        mx.array(all_confidences),
        mx.array(all_correct_top1, dtype=mx.float32),
    )

    # Diversity
    distinct_1 = compute_distinct_n(all_generated_tokens, 1)
    distinct_2 = compute_distinct_n(all_generated_tokens, 2)
    rep_rate = compute_repetition_rate(all_generated_tokens)

    return BenchmarkMetrics(
        perplexity=perplexity,
        loss=avg_loss,
        top1_accuracy=top1_acc,
        top5_accuracy=top5_acc,
        top10_accuracy=top10_acc,
        auc_roc=auc,
        brier_score=brier,
        ece=cal_metrics.ece,
        distinct_1=distinct_1,
        distinct_2=distinct_2,
        repetition_rate=rep_rate,
        avg_entropy=sum(all_entropies) / len(all_entropies),
        avg_confidence=sum(all_confidences) / len(all_confidences),
    )


def print_comparison(lumina: BenchmarkMetrics, gpt2: Optional[BenchmarkMetrics], title: str = ""):
    """Print side-by-side comparison."""
    print("\n" + "=" * 70)
    print(f"BENCHMARK RESULTS: {title}")
    print("=" * 70)

    def fmt(val, better_low=True):
        if val is None:
            return "N/A"
        return f"{val:.4f}"

    def compare(name, lval, gval, better_low=True, pct=False):
        lstr = fmt(lval)
        gstr = fmt(gval) if gval else "N/A"

        if gval is not None:
            if pct:
                diff = (lval - gval) * 100
                diff_str = f"{diff:+.1f}pp"
            else:
                diff = ((lval - gval) / gval) * 100 if gval != 0 else 0
                diff_str = f"{diff:+.1f}%"

            if better_low:
                winner = "✓ Lumina" if lval < gval else ("✓ GPT-2" if gval < lval else "=")
            else:
                winner = "✓ Lumina" if lval > gval else ("✓ GPT-2" if gval > lval else "=")
        else:
            diff_str = ""
            winner = ""

        print(f"{name:25} {lstr:>12} {gstr:>12} {diff_str:>10} {winner}")

    print(f"\n{'Metric':<25} {'Lumina':>12} {'GPT-2':>12} {'Diff':>10} {'Winner'}")
    print("-" * 70)

    print("\n--- Language Modeling ---")
    compare("Perplexity", lumina.perplexity, gpt2.perplexity if gpt2 else None, better_low=True)
    compare("Loss", lumina.loss, gpt2.loss if gpt2 else None, better_low=True)

    print("\n--- Accuracy ---")
    compare("Top-1 Accuracy", lumina.top1_accuracy, gpt2.top1_accuracy if gpt2 else None, better_low=False, pct=True)
    compare("Top-5 Accuracy", lumina.top5_accuracy, gpt2.top5_accuracy if gpt2 else None, better_low=False, pct=True)
    compare("Top-10 Accuracy", lumina.top10_accuracy, gpt2.top10_accuracy if gpt2 else None, better_low=False, pct=True)

    print("\n--- Calibration ---")
    compare("AUC-ROC", lumina.auc_roc, gpt2.auc_roc if gpt2 else None, better_low=False)
    compare("Brier Score", lumina.brier_score, gpt2.brier_score if gpt2 else None, better_low=True)
    compare("ECE", lumina.ece, gpt2.ece if gpt2 else None, better_low=True)

    print("\n--- Generation Quality ---")
    compare("Distinct-1", lumina.distinct_1, gpt2.distinct_1 if gpt2 else None, better_low=False)
    compare("Distinct-2", lumina.distinct_2, gpt2.distinct_2 if gpt2 else None, better_low=False)
    compare("Repetition Rate", lumina.repetition_rate, gpt2.repetition_rate if gpt2 else None, better_low=True)

    print("\n--- Uncertainty ---")
    compare("Avg Entropy", lumina.avg_entropy, gpt2.avg_entropy if gpt2 else None, better_low=False)
    compare("Avg Confidence", lumina.avg_confidence, gpt2.avg_confidence if gpt2 else None, better_low=False)

    print("\n" + "=" * 70)


def run_benchmark(
    checkpoint_path: str,
    gpt2_model: str = "gpt2",
    max_batches: int = 100,
    skip_gpt2: bool = False,
):
    """Run full benchmark comparison."""
    print("=" * 70)
    print("LUMINA vs GPT-2 BENCHMARK")
    print("=" * 70)

    # Load Lumina
    print(f"\nLoading Lumina from {checkpoint_path}...")
    checkpoint_dir = Path(checkpoint_path)
    with open(checkpoint_dir / "config.json") as f:
        config_data = json.load(f)

    model_config = get_config(config_data.get("model_config", "tiny"))
    weights = mx.load(str(checkpoint_dir / "model.safetensors"))

    # Detect if this is a Phase 4 model (has confidence gates)
    is_phase4 = any("confidence_gate" in k for k in weights.keys())

    if is_phase4:
        print("  Detected Phase 4 model (confidence-gated attention)")
        lumina_model = LuminaPhase4Model(model_config, base_model=None)
    else:
        lumina_model = LuminaModel(model_config)

    lumina_model.load_weights(list(weights.items()), strict=False)

    # Load tokenizer and data
    tokenizer = load_tokenizer("gpt2")
    eval_loader = create_eval_dataloader(
        tokenizer,
        batch_size=4,
        max_length=256,
        dataset_name="wikitext",
        max_samples=max_batches * 4,
    )

    # Evaluate Lumina
    print("\n--- Evaluating Lumina ---")
    lumina_metrics = evaluate_lumina(lumina_model, eval_loader, max_batches=max_batches)

    # Evaluate GPT-2
    gpt2_metrics = None
    if not skip_gpt2:
        print(f"\n--- Evaluating {gpt2_model} ---")

        # Get eval texts
        eval_texts = []
        eval_loader2 = create_eval_dataloader(
            tokenizer,
            batch_size=1,
            max_length=256,
            dataset_name="wikitext",
            max_samples=max_batches * 4,
        )
        for batch in eval_loader2:
            text = tokenizer.decode(batch.input_ids[0].tolist())
            if len(text.strip()) > 10:
                eval_texts.append(text)
            if len(eval_texts) >= max_batches * 4:
                break

        gpt2_metrics = evaluate_gpt2_hf(gpt2_model, eval_texts, tokenizer)

    # Print comparison
    print_comparison(lumina_metrics, gpt2_metrics, f"Lumina vs {gpt2_model}")

    return lumina_metrics, gpt2_metrics


def main():
    parser = argparse.ArgumentParser(description="Benchmark Lumina vs GPT-2")
    parser.add_argument("--checkpoint", type=str, required=True, help="Lumina checkpoint path")
    parser.add_argument("--gpt2-model", type=str, default="gpt2", help="GPT-2 model name (gpt2, gpt2-medium, etc)")
    parser.add_argument("--max-batches", type=int, default=100, help="Number of batches to evaluate")
    parser.add_argument("--skip-gpt2", action="store_true", help="Skip GPT-2 comparison")
    args = parser.parse_args()

    run_benchmark(
        args.checkpoint,
        gpt2_model=args.gpt2_model,
        max_batches=args.max_batches,
        skip_gpt2=args.skip_gpt2,
    )


if __name__ == "__main__":
    main()
