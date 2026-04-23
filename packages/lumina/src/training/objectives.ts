/**
 * Lumina Training Objectives
 *
 * Loss functions and training strategies for the superposition-native architecture.
 */

import { Confidence, Entropy } from '../core/types';
import { ComputationBranch } from '../inference/branching';

/**
 * Individual loss components.
 */
export interface LossComponents {
  /** Standard language modeling loss: -log P(token | context) */
  languageModelingLoss: number;

  /** Confidence calibration loss: (confidence - correctness)² */
  calibrationLoss: number;

  /** Entropy regularization: -λ · H(distribution) */
  entropyRegularization: number;

  /** Branch consistency: KL divergence when branches should agree */
  branchConsistencyLoss: number;

  /** Total weighted loss */
  totalLoss: number;
}

/**
 * Weights for combining loss components.
 */
export interface LossWeights {
  languageModeling: number;
  calibration: number;
  entropyRegularization: number;
  branchConsistency: number;
}

export const DEFAULT_LOSS_WEIGHTS: LossWeights = {
  languageModeling: 1.0,
  calibration: 0.1,
  entropyRegularization: 0.01,
  branchConsistency: 0.05,
};

/**
 * Compute Brier score for confidence calibration.
 * Brier Score = (1/N) Σ (confidence - correctness)²
 *
 * @param predictions - Array of (confidence, wasCorrect) pairs
 */
export function computeBrierScore(
  predictions: Array<{ confidence: Confidence; correct: boolean }>
): number {
  if (predictions.length === 0) return 0;

  const sumSquaredError = predictions.reduce((sum, { confidence, correct }) => {
    const correctness = correct ? 1 : 0;
    return sum + Math.pow(confidence - correctness, 2);
  }, 0);

  return sumSquaredError / predictions.length;
}

/**
 * Compute Expected Calibration Error.
 * Bins predictions by confidence and measures |accuracy - confidence| per bin.
 *
 * @param predictions - Array of (confidence, wasCorrect) pairs
 * @param numBins - Number of calibration bins
 */
export function computeECE(
  predictions: Array<{ confidence: Confidence; correct: boolean }>,
  numBins: number = 10
): number {
  if (predictions.length === 0) return 0;

  // Initialize bins
  const bins: Array<{ confidenceSum: number; correctSum: number; count: number }> = Array.from(
    { length: numBins },
    () => ({ confidenceSum: 0, correctSum: 0, count: 0 })
  );

  // Assign predictions to bins
  for (const { confidence, correct } of predictions) {
    const binIndex = Math.min(Math.floor(confidence * numBins), numBins - 1);
    bins[binIndex].confidenceSum += confidence;
    bins[binIndex].correctSum += correct ? 1 : 0;
    bins[binIndex].count += 1;
  }

  // Compute weighted calibration error
  let ece = 0;
  for (const bin of bins) {
    if (bin.count > 0) {
      const avgConfidence = bin.confidenceSum / bin.count;
      const accuracy = bin.correctSum / bin.count;
      ece += (bin.count / predictions.length) * Math.abs(accuracy - avgConfidence);
    }
  }

  return ece;
}

/**
 * Compute focal loss for hard examples.
 * Focal Loss = -α(1-p)^γ log(p)
 *
 * Focuses learning on hard, misclassified examples.
 *
 * @param confidence - Model's confidence
 * @param correct - Whether prediction was correct
 * @param gamma - Focusing parameter (higher = more focus on hard examples)
 * @param alpha - Weighting factor
 */
export function computeFocalLoss(
  confidence: Confidence,
  correct: boolean,
  gamma: number = 2.0,
  alpha: number = 0.25
): number {
  const p = correct ? confidence : 1 - confidence;
  const pt = Math.max(p, 1e-7); // Prevent log(0)

  return -alpha * Math.pow(1 - pt, gamma) * Math.log(pt);
}

/**
 * Compute KL divergence between two branches.
 * Used for branch consistency loss when branches should agree.
 *
 * @param branchA - First branch
 * @param branchB - Second branch
 */
export function computeBranchKL(
  branchA: ComputationBranch,
  branchB: ComputationBranch
): number {
  // Simplified: compare final confidence outputs
  const pA = branchA.confidence;
  const pB = branchB.confidence;

  // Symmetric KL divergence
  const klAB = pA * Math.log((pA + 1e-7) / (pB + 1e-7));
  const klBA = pB * Math.log((pB + 1e-7) / (pA + 1e-7));

  return (klAB + klBA) / 2;
}

/**
 * Entropy of a probability distribution.
 * H(p) = -Σ p(x) log p(x)
 *
 * @param probabilities - Array of probabilities (should sum to 1)
 */
export function computeEntropy(probabilities: number[]): Entropy {
  return -probabilities.reduce((sum, p) => {
    if (p > 0) {
      return sum + p * Math.log(p);
    }
    return sum;
  }, 0);
}

/**
 * Training phase definitions.
 */
export enum TrainingPhase {
  /** Standard pretraining with soft targets */
  PRETRAINING = 'pretraining',

  /** Calibration fine-tuning with uncertainty examples */
  CALIBRATION = 'calibration',

  /** Branching training with multiple hypotheses */
  BRANCHING = 'branching',

  /** Full end-to-end training */
  FULL = 'full',
}

/**
 * Training configuration for each phase.
 */
export interface PhaseConfig {
  phase: TrainingPhase;
  lossWeights: LossWeights;
  learningRate: number;
  batchSize: number;
  maxSteps: number;

  /** Phase-specific settings */
  settings: {
    /** Use soft targets in pretraining */
    labelSmoothing?: number;

    /** Include "I don't know" examples in calibration */
    uncertaintyExamples?: boolean;

    /** Number of branches for branching phase */
    numBranches?: number;

    /** Adversarial confidence attacks */
    adversarialCalibration?: boolean;
  };
}

/**
 * Default training phases.
 */
export const TRAINING_PHASES: PhaseConfig[] = [
  {
    phase: TrainingPhase.PRETRAINING,
    lossWeights: {
      languageModeling: 1.0,
      calibration: 0.05,
      entropyRegularization: 0.01,
      branchConsistency: 0.0,
    },
    learningRate: 1e-4,
    batchSize: 32,
    maxSteps: 100000,
    settings: {
      labelSmoothing: 0.1,
    },
  },
  {
    phase: TrainingPhase.CALIBRATION,
    lossWeights: {
      languageModeling: 0.5,
      calibration: 0.3,
      entropyRegularization: 0.01,
      branchConsistency: 0.0,
    },
    learningRate: 5e-5,
    batchSize: 16,
    maxSteps: 20000,
    settings: {
      uncertaintyExamples: true,
      adversarialCalibration: true,
    },
  },
  {
    phase: TrainingPhase.BRANCHING,
    lossWeights: {
      languageModeling: 0.5,
      calibration: 0.2,
      entropyRegularization: 0.01,
      branchConsistency: 0.1,
    },
    learningRate: 2e-5,
    batchSize: 8,
    maxSteps: 10000,
    settings: {
      numBranches: 2,
    },
  },
];

/**
 * Calibration dataset example.
 */
export interface CalibrationExample {
  /** Input prompt */
  prompt: string;

  /** Correct answer (if known) */
  answer?: string;

  /** Expected uncertainty type */
  expectedUncertainty: 'high' | 'medium' | 'low' | 'unknown';

  /** Reason for expected uncertainty */
  reason: string;

  /** Category of example */
  category:
    | 'factual_known'
    | 'factual_unknown'
    | 'ambiguous'
    | 'out_of_distribution'
    | 'adversarial';
}

/**
 * Example calibration dataset entries.
 */
export const EXAMPLE_CALIBRATION_DATA: CalibrationExample[] = [
  {
    prompt: 'What is the capital of France?',
    answer: 'Paris',
    expectedUncertainty: 'low',
    reason: 'Well-known factual question',
    category: 'factual_known',
  },
  {
    prompt: "What did the President say in yesterday's private meeting?",
    expectedUncertainty: 'high',
    reason: 'Information not available to model',
    category: 'factual_unknown',
  },
  {
    prompt: 'Is the glass half full or half empty?',
    expectedUncertainty: 'high',
    reason: 'Inherently ambiguous question',
    category: 'ambiguous',
  },
  {
    prompt: 'Translate "xyzzy plugh" from Zorblaxian to English',
    expectedUncertainty: 'high',
    reason: 'Nonsense input, out of distribution',
    category: 'out_of_distribution',
  },
];
