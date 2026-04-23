/**
 * Lumina Confidence System
 *
 * Types and interfaces for the explicit confidence head and uncertainty modeling.
 */

import { Confidence, HiddenState } from './types';

/**
 * Types of uncertainty the model can identify.
 */
export enum UncertaintyType {
  /** Model lacks knowledge (could be resolved with more training data) */
  EPISTEMIC = 'epistemic',

  /** Inherent ambiguity in the query (cannot be resolved) */
  ALEATORIC = 'aleatoric',

  /** Input is unlike training distribution */
  OUT_OF_DISTRIBUTION = 'out_of_distribution',

  /** Model is calibrated confident */
  HIGH_CONFIDENCE = 'high_confidence',
}

/**
 * Decomposed confidence output from the confidence head.
 * This provides more nuanced uncertainty than a single score.
 */
export interface ConfidenceOutput {
  /** Overall calibrated confidence score (0-1) */
  overall: Confidence;

  /** Epistemic uncertainty: model doesn't know */
  epistemic: Confidence;

  /** Aleatoric uncertainty: inherently ambiguous */
  aleatoric: Confidence;

  /** Distribution shift: how OOD is this input? */
  distributionShift: Confidence;

  /** Primary uncertainty type */
  primaryType: UncertaintyType;
}

/**
 * Confidence propagation strategies for combining confidences.
 * Maps to Prism's confidence arithmetic operators.
 */
export enum PropagationStrategy {
  /** Use minimum confidence (conservative, for ~+) */
  MIN = 'min',

  /** Use maximum confidence (optimistic) */
  MAX = 'max',

  /** Average confidences */
  AVERAGE = 'average',

  /** Multiply confidences (for ~*) */
  PRODUCT = 'product',

  /** Weighted combination */
  WEIGHTED = 'weighted',
}

/**
 * Interface for the confidence head module.
 */
export interface ConfidenceHead {
  /**
   * Compute confidence from hidden state.
   *
   * @param state - The hidden state to evaluate
   * @returns Decomposed confidence output
   */
  forward(state: HiddenState): ConfidenceOutput;

  /**
   * Compute confidence for a sequence of states.
   *
   * @param states - Sequence of hidden states
   * @returns Confidence for each position
   */
  forwardSequence(states: HiddenState[]): ConfidenceOutput[];
}

/**
 * Calibration metrics for evaluating confidence quality.
 */
export interface CalibrationMetrics {
  /** Expected Calibration Error: |accuracy - confidence| across bins */
  ece: number;

  /** Maximum Calibration Error: max |accuracy - confidence| */
  mce: number;

  /** Brier Score: mean squared error of probability estimates */
  brierScore: number;

  /** Negative Log Likelihood of confidence predictions */
  nll: number;

  /** Accuracy when confidence > threshold */
  accuracyAtConfidence: Map<number, number>;
}

/**
 * Training losses for confidence calibration.
 */
export interface ConfidenceLosses {
  /** Brier score loss: (confidence - correctness)² */
  brierLoss: number;

  /** Focal loss for hard examples */
  focalLoss: number;

  /** ECE-based calibration loss */
  calibrationLoss: number;

  /** Total combined loss */
  total: number;
}

/**
 * Combine confidences using a specified strategy.
 *
 * @param confidences - Array of confidence values to combine
 * @param strategy - How to combine them
 * @param weights - Optional weights for WEIGHTED strategy
 * @returns Combined confidence value
 */
export function combineConfidences(
  confidences: Confidence[],
  strategy: PropagationStrategy,
  weights?: number[]
): Confidence {
  if (confidences.length === 0) {
    return 0;
  }

  switch (strategy) {
    case PropagationStrategy.MIN:
      return Math.min(...confidences);

    case PropagationStrategy.MAX:
      return Math.max(...confidences);

    case PropagationStrategy.AVERAGE:
      return confidences.reduce((a, b) => a + b, 0) / confidences.length;

    case PropagationStrategy.PRODUCT:
      return confidences.reduce((a, b) => a * b, 1);

    case PropagationStrategy.WEIGHTED:
      if (!weights || weights.length !== confidences.length) {
        throw new Error('Weights required for WEIGHTED strategy');
      }
      const weightSum = weights.reduce((a, b) => a + b, 0);
      return confidences.reduce((sum, c, i) => sum + c * weights[i], 0) / weightSum;

    default:
      throw new Error(`Unknown propagation strategy: ${strategy}`);
  }
}

/**
 * Determine the primary uncertainty type from a confidence output.
 */
export function classifyUncertainty(output: ConfidenceOutput): UncertaintyType {
  const { epistemic, aleatoric, distributionShift, overall } = output;

  if (overall > 0.8) {
    return UncertaintyType.HIGH_CONFIDENCE;
  }

  if (distributionShift > Math.max(epistemic, aleatoric)) {
    return UncertaintyType.OUT_OF_DISTRIBUTION;
  }

  if (aleatoric > epistemic) {
    return UncertaintyType.ALEATORIC;
  }

  return UncertaintyType.EPISTEMIC;
}

/**
 * Confidence thresholds matching Prism's three-level system.
 */
export interface ConfidenceThresholds {
  /** Threshold for HIGH confidence (default: 0.7) */
  high: number;

  /** Threshold for MEDIUM confidence (default: 0.5) */
  medium: number;

  // Below medium is LOW
}

export const DEFAULT_THRESHOLDS: ConfidenceThresholds = {
  high: 0.7,
  medium: 0.5,
};

/**
 * Classify confidence into Prism's three-level system.
 */
export function classifyConfidenceLevel(
  confidence: Confidence,
  thresholds: ConfidenceThresholds = DEFAULT_THRESHOLDS
): 'high' | 'medium' | 'low' {
  if (confidence >= thresholds.high) {
    return 'high';
  }
  if (confidence >= thresholds.medium) {
    return 'medium';
  }
  return 'low';
}
