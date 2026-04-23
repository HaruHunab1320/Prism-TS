/**
 * Lumina Core Types
 *
 * Fundamental type definitions for the superposition-native architecture.
 */

/** Token identifier (vocabulary index) */
export type TokenId = number;

/** Probability value between 0 and 1 */
export type Probability = number;

/** Confidence score between 0 and 1 */
export type Confidence = number;

/** Entropy value (non-negative) */
export type Entropy = number;

/**
 * A probability distribution over tokens.
 * Sparse representation: only stores non-negligible probabilities.
 */
export interface TokenDistribution {
  /** Sparse mapping from token ID to probability */
  probabilities: Map<TokenId, Probability>;

  /** Entropy of the distribution: H = -Σ p(x) log p(x) */
  entropy: Entropy;

  /** Number of tokens with non-negligible probability */
  supportSize: number;

  /** Vocabulary size this distribution is over */
  vocabSize: number;
}

/**
 * A soft embedding: weighted superposition of token embeddings.
 * This is the key innovation - instead of collapsing to a single token,
 * we propagate the full distribution as a weighted embedding.
 */
export interface SoftEmbedding {
  /** The weighted embedding vector: Σᵢ p(tokenᵢ) · embed(tokenᵢ) */
  vector: Float32Array;

  /** The underlying token distribution */
  distribution: TokenDistribution;

  /** Embedding dimension */
  dimension: number;
}

/**
 * Hidden state at a single position in the sequence.
 */
export interface HiddenState {
  /** The hidden state vector */
  vector: Float32Array;

  /** Position in the sequence */
  position: number;

  /** Confidence associated with this state */
  confidence: Confidence;

  /** Layer index this state is from */
  layer: number;
}

/**
 * Sequence of hidden states (full context).
 */
export interface HiddenStateSequence {
  states: HiddenState[];
  sequenceLength: number;
  hiddenDimension: number;
}

/**
 * Multi-resolution output: different abstraction levels have different confidences.
 *
 * Layer N:   [abstract intent]       confidence: 0.92
 * Layer N-k: [semantic structure]    confidence: 0.78
 * Layer 0:   [specific tokens]       confidence: 0.65
 */
export interface MultiResolutionState {
  /** Intent-level representation (high abstraction) */
  intent: {
    vector: Float32Array;
    confidence: Confidence;
    layer: number;
  };

  /** Semantic-level representation (mid abstraction) */
  semantic: {
    vector: Float32Array;
    confidence: Confidence;
    layer: number;
  };

  /** Token-level representation (low abstraction) */
  surface: {
    vector: Float32Array;
    confidence: Confidence;
    layer: number;
  };
}

/**
 * Configuration for the Lumina model.
 */
export interface LuminaConfig {
  /** Vocabulary size */
  vocabSize: number;

  /** Hidden state dimension */
  hiddenDimension: number;

  /** Number of transformer layers */
  numLayers: number;

  /** Number of attention heads */
  numHeads: number;

  /** Maximum sequence length */
  maxSequenceLength: number;

  /** Dimension of the confidence head */
  confidenceHeadDimension: number;

  /** Layers to extract for multi-resolution output */
  multiResolutionLayers: {
    intent: number;
    semantic: number;
    surface: number;
  };

  /** Branching configuration */
  branching: {
    /** Entropy threshold to trigger forking */
    entropyThreshold: Entropy;

    /** Maximum number of active branches */
    maxBranches: number;

    /** Minimum confidence to keep a branch alive */
    pruneThreshold: Confidence;

    /** Whether branching is enabled */
    enabled: boolean;
  };

  /** Confidence gating in attention */
  confidenceGatedAttention: boolean;
}

/**
 * Default configuration values.
 */
export const DEFAULT_CONFIG: Partial<LuminaConfig> = {
  confidenceHeadDimension: 256,
  branching: {
    entropyThreshold: 2.0,
    maxBranches: 4,
    pruneThreshold: 0.1,
    enabled: true,
  },
  confidenceGatedAttention: true,
};
