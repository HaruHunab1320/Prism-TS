/**
 * Lumina Branching Computation
 *
 * When uncertainty exceeds a threshold, computation forks into parallel branches.
 * Each branch maintains its own hypothesis and confidence.
 *
 * This maps directly to Prism's `uncertain if` control flow.
 */

import {
  Confidence,
  Entropy,
  HiddenState,
  HiddenStateSequence,
  TokenDistribution,
} from '../core/types';
import { ConfidenceOutput } from '../core/confidence';

/**
 * Unique identifier for a computation branch.
 */
export type BranchId = string;

/**
 * Status of a computation branch.
 */
export enum BranchStatus {
  /** Branch is actively being computed */
  ACTIVE = 'active',

  /** Branch was pruned due to low confidence */
  PRUNED = 'pruned',

  /** Branch was merged with another branch */
  MERGED = 'merged',

  /** Branch completed successfully */
  COMPLETED = 'completed',

  /** Branch encountered an error */
  ERROR = 'error',
}

/**
 * A single computation branch representing one hypothesis.
 */
export interface ComputationBranch {
  /** Unique identifier */
  id: BranchId;

  /** Parent branch (null for root) */
  parentId: BranchId | null;

  /** Current status */
  status: BranchStatus;

  /** Hidden state sequence for this branch */
  states: HiddenStateSequence;

  /** Generated tokens so far */
  tokens: number[];

  /** Current confidence in this branch */
  confidence: Confidence;

  /** Detailed confidence breakdown */
  confidenceOutput: ConfidenceOutput;

  /** Point at which this branch was forked */
  forkPosition: number;

  /** Reason for forking */
  forkReason: string;

  /** Accumulated log probability */
  logProbability: number;

  /** Generation step count */
  stepCount: number;
}

/**
 * Decision about whether to fork computation.
 */
export interface ForkDecision {
  /** Whether to fork */
  shouldFork: boolean;

  /** How many branches to create */
  numBranches: number;

  /** Reason for the decision */
  reason: string;

  /** The token distribution that triggered consideration */
  distribution?: TokenDistribution;
}

/**
 * Configuration for the fork decision policy.
 */
export interface ForkPolicy {
  /** Entropy threshold above which to consider forking */
  entropyThreshold: Entropy;

  /** Minimum probability mass in top-1 to avoid forking */
  topProbabilityThreshold: number;

  /** Maximum number of active branches */
  maxBranches: number;

  /** Minimum confidence to keep a branch alive */
  pruneThreshold: Confidence;

  /** Whether to allow forking */
  enabled: boolean;

  /** Maximum depth of branching (forks from forks) */
  maxDepth: number;
}

export const DEFAULT_FORK_POLICY: ForkPolicy = {
  entropyThreshold: 2.0,
  topProbabilityThreshold: 0.7,
  maxBranches: 4,
  pruneThreshold: 0.1,
  enabled: true,
  maxDepth: 3,
};

/**
 * Interface for the fork decision module.
 */
export interface ForkDecisionModule {
  /**
   * Decide whether to fork based on current state.
   *
   * @param state - Current hidden state
   * @param distribution - Current token distribution
   * @param activeBranches - Number of currently active branches
   * @param depth - Current branching depth
   * @returns Fork decision
   */
  decide(
    state: HiddenState,
    distribution: TokenDistribution,
    activeBranches: number,
    depth: number
  ): ForkDecision;

  /** Policy configuration */
  policy: ForkPolicy;
}

/**
 * Result of branch merging.
 */
export interface MergeResult {
  /** Whether branches were merged */
  merged: boolean;

  /** The resulting merged branch (if merged) */
  mergedBranch?: ComputationBranch;

  /** Branches that were merged */
  sourceBranches: BranchId[];

  /** Confidence in the merge decision */
  mergeConfidence: Confidence;
}

/**
 * Criteria for merging branches.
 */
export interface MergeCriteria {
  /** Maximum token-level divergence to consider merging */
  maxDivergence: number;

  /** Minimum semantic similarity to merge */
  minSimilarity: number;

  /** Whether both branches must have similar confidence */
  requireSimilarConfidence: boolean;

  /** Confidence difference threshold */
  confidenceDifferenceThreshold: number;
}

export const DEFAULT_MERGE_CRITERIA: MergeCriteria = {
  maxDivergence: 0.1,
  minSimilarity: 0.9,
  requireSimilarConfidence: false,
  confidenceDifferenceThreshold: 0.2,
};

/**
 * Interface for the branch merger module.
 */
export interface BranchMerger {
  /**
   * Check if two branches should be merged.
   *
   * @param branchA - First branch
   * @param branchB - Second branch
   * @returns Merge result
   */
  shouldMerge(branchA: ComputationBranch, branchB: ComputationBranch): MergeResult;

  /**
   * Merge two branches into one.
   *
   * @param branchA - First branch
   * @param branchB - Second branch
   * @returns Merged branch
   */
  merge(branchA: ComputationBranch, branchB: ComputationBranch): ComputationBranch;

  /** Merge criteria */
  criteria: MergeCriteria;
}

/**
 * The branch manager coordinates all active branches.
 */
export interface BranchManager {
  /** All branches (including inactive) */
  branches: Map<BranchId, ComputationBranch>;

  /** Currently active branch IDs */
  activeBranches: Set<BranchId>;

  /** Fork decision module */
  forkDecision: ForkDecisionModule;

  /** Branch merger */
  merger: BranchMerger;

  /**
   * Create initial root branch.
   */
  createRoot(initialState: HiddenStateSequence): ComputationBranch;

  /**
   * Fork a branch into multiple branches.
   *
   * @param parentId - Branch to fork from
   * @param distribution - Distribution that caused the fork
   * @param numBranches - Number of branches to create
   * @returns Created branches
   */
  fork(
    parentId: BranchId,
    distribution: TokenDistribution,
    numBranches: number
  ): ComputationBranch[];

  /**
   * Prune branches below confidence threshold.
   *
   * @returns IDs of pruned branches
   */
  prune(): BranchId[];

  /**
   * Attempt to merge convergent branches.
   *
   * @returns Merge results
   */
  attemptMerges(): MergeResult[];

  /**
   * Get the highest-confidence active branch.
   */
  getBestBranch(): ComputationBranch | null;

  /**
   * Get all active branches sorted by confidence.
   */
  getActiveBranchesByConfidence(): ComputationBranch[];
}

/**
 * Output from branched inference - maps to Prism's uncertain control flow.
 */
export interface BranchedOutput {
  /** All completed branches */
  branches: Array<{
    content: string;
    confidence: Confidence;
    confidenceOutput: ConfidenceOutput;
    tokens: number[];
    reasoningTrace: string[];
  }>;

  /** Statistics about the branching process */
  stats: {
    totalBranchesCreated: number;
    branchesPruned: number;
    branchesMerged: number;
    maxConcurrentBranches: number;
    totalSteps: number;
  };

  /** Recommendation for resolution */
  resolution: BranchResolution;
}

/**
 * How to resolve multiple branches into a final output.
 */
export enum BranchResolution {
  /** Use the highest-confidence branch */
  HIGHEST_CONFIDENCE = 'highest_confidence',

  /** Require human review of options */
  HUMAN_REVIEW = 'human_review',

  /** Ensemble/combine the branches */
  ENSEMBLE = 'ensemble',

  /** All branches converged to same answer */
  CONVERGED = 'converged',
}

/**
 * Determine recommended resolution strategy.
 */
export function recommendResolution(branches: ComputationBranch[]): BranchResolution {
  if (branches.length === 0) {
    return BranchResolution.HIGHEST_CONFIDENCE;
  }

  if (branches.length === 1) {
    return BranchResolution.HIGHEST_CONFIDENCE;
  }

  // Check if branches converged
  const firstTokens = JSON.stringify(branches[0].tokens);
  const allConverged = branches.every((b) => JSON.stringify(b.tokens) === firstTokens);
  if (allConverged) {
    return BranchResolution.CONVERGED;
  }

  // Check confidence distribution
  const confidences = branches.map((b) => b.confidence);
  const maxConf = Math.max(...confidences);
  const secondMaxConf = confidences.filter((c) => c !== maxConf).sort((a, b) => b - a)[0] || 0;

  // Clear winner
  if (maxConf - secondMaxConf > 0.3) {
    return BranchResolution.HIGHEST_CONFIDENCE;
  }

  // Close call - might need human review or ensemble
  if (maxConf < 0.6) {
    return BranchResolution.HUMAN_REVIEW;
  }

  return BranchResolution.ENSEMBLE;
}

/**
 * Generate a unique branch ID.
 */
export function generateBranchId(): BranchId {
  return `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
