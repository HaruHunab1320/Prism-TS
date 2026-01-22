"""
Lumina Training Losses

Loss functions for training the confidence head with proper calibration.

Key losses:
1. Language Modeling Loss - Standard cross-entropy
2. Brier Score - Calibration loss: (confidence - correctness)²
3. Focal Loss - Focus on hard examples
4. Entropy Regularization - Prevent overconfident collapse
"""

import mlx.core as mx
import mlx.nn as nn
from typing import NamedTuple, Optional

from .model import LuminaOutput


class LossOutput(NamedTuple):
    """Combined loss output with components for logging."""

    total: mx.array
    lm_loss: mx.array
    brier_loss: mx.array
    focal_loss: mx.array
    entropy_reg: mx.array


def cross_entropy_loss(
    logits: mx.array,
    targets: mx.array,
    label_smoothing: float = 0.0,
    ignore_index: int = -100,
) -> mx.array:
    """
    Cross-entropy loss with optional label smoothing.

    Args:
        logits: [batch, seq, vocab]
        targets: [batch, seq]
        label_smoothing: Smoothing factor (0.0 = no smoothing)
        ignore_index: Index to ignore in loss computation

    Returns:
        Scalar loss value
    """
    batch_size, seq_len, vocab_size = logits.shape

    # Flatten
    logits_flat = logits.reshape(-1, vocab_size)
    targets_flat = targets.reshape(-1)

    # Create mask for valid positions
    mask = (targets_flat != ignore_index).astype(logits.dtype)

    # Replace ignore_index with 0 for indexing (will be masked out)
    targets_safe = mx.where(targets_flat == ignore_index, 0, targets_flat)

    # Log softmax for numerical stability
    log_probs = mx.log(mx.softmax(logits_flat, axis=-1) + 1e-10)

    # Gather the log probs for target tokens
    target_log_probs = mx.take_along_axis(
        log_probs, targets_safe[:, None], axis=-1
    ).squeeze(-1)

    if label_smoothing > 0.0:
        # Smooth loss: (1 - smooth) * target_loss + smooth * uniform_loss
        smooth_loss = -log_probs.mean(axis=-1)
        loss = (1 - label_smoothing) * (-target_log_probs) + label_smoothing * smooth_loss
    else:
        loss = -target_log_probs

    # Apply mask and compute mean
    loss = (loss * mask).sum() / (mask.sum() + 1e-10)

    return loss


def brier_score(
    confidence: mx.array,
    correct: mx.array,
    mask: Optional[mx.array] = None,
) -> mx.array:
    """
    Brier score for confidence calibration.

    Brier Score = (1/N) Σ (confidence - correctness)²

    Lower is better. Perfect calibration = 0.

    Args:
        confidence: [batch, seq] predicted confidence scores
        correct: [batch, seq] binary correctness (1 if prediction was correct)
        mask: Optional mask for valid positions

    Returns:
        Scalar Brier score
    """
    squared_error = (confidence - correct.astype(confidence.dtype)) ** 2

    if mask is not None:
        squared_error = squared_error * mask
        return squared_error.sum() / (mask.sum() + 1e-10)
    else:
        return squared_error.mean()


def focal_loss(
    confidence: mx.array,
    correct: mx.array,
    gamma: float = 2.0,
    alpha: float = 0.25,
    mask: Optional[mx.array] = None,
) -> mx.array:
    """
    Focal loss for hard examples.

    Focal Loss = -α(1-p)^γ log(p)

    Focuses learning on examples where the model is wrong or uncertain.

    Args:
        confidence: [batch, seq] predicted confidence
        correct: [batch, seq] binary correctness
        gamma: Focusing parameter (higher = more focus on hard examples)
        alpha: Weighting factor
        mask: Optional mask for valid positions

    Returns:
        Scalar focal loss
    """
    # p is probability of being correct
    # If correct=1, p = confidence; if correct=0, p = 1 - confidence
    p = mx.where(correct.astype(mx.bool_), confidence, 1 - confidence)
    p = mx.clip(p, 1e-7, 1.0)  # Numerical stability

    focal_weight = (1 - p) ** gamma
    ce = -mx.log(p)
    loss = alpha * focal_weight * ce

    if mask is not None:
        loss = loss * mask
        return loss.sum() / (mask.sum() + 1e-10)
    else:
        return loss.mean()


def entropy_regularization(
    logits: mx.array,
    mask: Optional[mx.array] = None,
) -> mx.array:
    """
    Entropy regularization to prevent overconfident predictions.

    Encourages the model to maintain some uncertainty in its predictions.

    Args:
        logits: [batch, seq, vocab]
        mask: Optional mask for valid positions

    Returns:
        Negative entropy (to be minimized, which maximizes entropy)
    """
    probs = mx.softmax(logits, axis=-1)
    probs = mx.clip(probs, 1e-10, 1.0)
    entropy = -mx.sum(probs * mx.log(probs), axis=-1)  # [batch, seq]

    # We want to maximize entropy, so return negative
    # (minimizing negative entropy = maximizing entropy)
    if mask is not None:
        entropy = entropy * mask
        return -entropy.sum() / (mask.sum() + 1e-10)
    else:
        return -entropy.mean()


def compute_correctness(
    logits: mx.array,
    targets: mx.array,
    ignore_index: int = -100,
) -> mx.array:
    """
    Compute per-position correctness for calibration training.

    Args:
        logits: [batch, seq, vocab]
        targets: [batch, seq]
        ignore_index: Index to ignore

    Returns:
        [batch, seq] binary correctness
    """
    predictions = mx.argmax(logits, axis=-1)
    correct = (predictions == targets).astype(mx.float32)

    # Mask out ignore positions
    mask = (targets != ignore_index).astype(mx.float32)
    correct = correct * mask

    return correct


def lumina_loss(
    output: LuminaOutput,
    targets: mx.array,
    lm_weight: float = 1.0,
    brier_weight: float = 0.1,
    focal_weight: float = 0.05,
    entropy_weight: float = 0.01,
    label_smoothing: float = 0.1,
    ignore_index: int = -100,
) -> LossOutput:
    """
    Combined Lumina training loss.

    Args:
        output: LuminaOutput from model forward pass
        targets: [batch, seq] target token indices
        lm_weight: Weight for language modeling loss
        brier_weight: Weight for Brier calibration loss
        focal_weight: Weight for focal loss
        entropy_weight: Weight for entropy regularization
        label_smoothing: Label smoothing factor
        ignore_index: Index to ignore in loss

    Returns:
        LossOutput with total loss and components
    """
    # Create mask for valid positions
    mask = (targets != ignore_index).astype(output.logits.dtype)

    # Language modeling loss
    lm_loss = cross_entropy_loss(
        output.logits,
        targets,
        label_smoothing=label_smoothing,
        ignore_index=ignore_index,
    )

    # Compute correctness for calibration losses
    correct = compute_correctness(output.logits, targets, ignore_index)

    # Brier score (calibration)
    brier = brier_score(output.confidence.overall, correct, mask)

    # Focal loss (hard examples)
    focal = focal_loss(output.confidence.overall, correct, mask=mask)

    # Entropy regularization
    entropy_reg = entropy_regularization(output.logits, mask)

    # Total weighted loss
    total = (
        lm_weight * lm_loss
        + brier_weight * brier
        + focal_weight * focal
        + entropy_weight * entropy_reg
    )

    return LossOutput(
        total=total,
        lm_loss=lm_loss,
        brier_loss=brier,
        focal_loss=focal,
        entropy_reg=entropy_reg,
    )


class CalibrationMetrics(NamedTuple):
    """Metrics for evaluating confidence calibration."""

    ece: float  # Expected Calibration Error
    mce: float  # Maximum Calibration Error
    brier: float  # Brier Score
    accuracy: float  # Overall accuracy
    avg_confidence: float  # Average confidence


def compute_calibration_metrics(
    confidences: mx.array,
    correct: mx.array,
    num_bins: int = 10,
) -> CalibrationMetrics:
    """
    Compute calibration metrics.

    Args:
        confidences: [N] confidence scores
        correct: [N] binary correctness
        num_bins: Number of bins for ECE/MCE

    Returns:
        CalibrationMetrics with ECE, MCE, Brier, etc.
    """
    # Convert to numpy for binning (MLX doesn't have histogram)
    conf_np = confidences.tolist()
    corr_np = correct.tolist()
    n = len(conf_np)

    if n == 0:
        return CalibrationMetrics(0.0, 0.0, 0.0, 0.0, 0.0)

    # Compute bin edges
    bin_edges = [i / num_bins for i in range(num_bins + 1)]

    # Bin predictions
    bin_accs = []
    bin_confs = []
    bin_counts = []

    for i in range(num_bins):
        low, high = bin_edges[i], bin_edges[i + 1]
        in_bin = [(c, r) for c, r in zip(conf_np, corr_np) if low <= c < high]

        if in_bin:
            bin_conf = sum(c for c, _ in in_bin) / len(in_bin)
            bin_acc = sum(r for _, r in in_bin) / len(in_bin)
            bin_confs.append(bin_conf)
            bin_accs.append(bin_acc)
            bin_counts.append(len(in_bin))
        else:
            bin_confs.append(0)
            bin_accs.append(0)
            bin_counts.append(0)

    # ECE: weighted average of |accuracy - confidence| per bin
    ece = sum(
        (count / n) * abs(acc - conf)
        for acc, conf, count in zip(bin_accs, bin_confs, bin_counts)
    )

    # MCE: maximum calibration error across bins
    mce = max(
        abs(acc - conf) if count > 0 else 0
        for acc, conf, count in zip(bin_accs, bin_confs, bin_counts)
    )

    # Brier score
    brier = sum((c - r) ** 2 for c, r in zip(conf_np, corr_np)) / n

    # Overall metrics
    accuracy = sum(corr_np) / n
    avg_confidence = sum(conf_np) / n

    return CalibrationMetrics(
        ece=ece,
        mce=mce,
        brier=brier,
        accuracy=accuracy,
        avg_confidence=avg_confidence,
    )
