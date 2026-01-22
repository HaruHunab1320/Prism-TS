/**
 * Lumina Confidence-Gated Attention
 *
 * Modified attention mechanism that incorporates confidence scores.
 *
 * Standard:  Attention(Q, K, V) = softmax(QKᵀ / √d) · V
 * Lumina:    ConfAttention(Q, K, V, C) = softmax(QKᵀ / √d) ⊙ σ(C) · V
 *
 * Low-confidence information is downweighted in reasoning.
 */

import { Confidence } from '../core/types';

/**
 * Attention weights with confidence information.
 */
export interface ConfidenceAttentionWeights {
  /** Raw attention weights before confidence gating */
  rawWeights: Float32Array[];

  /** Confidence scores for each key position */
  keyConfidences: Confidence[];

  /** Final gated attention weights */
  gatedWeights: Float32Array[];

  /** How much confidence affected the attention (diagnostic) */
  confidenceImpact: number;
}

/**
 * Output from confidence-gated attention.
 */
export interface ConfidenceAttentionOutput {
  /** The attention output vectors */
  output: Float32Array[];

  /** Detailed attention weights (for interpretability) */
  weights: ConfidenceAttentionWeights;

  /** Aggregated confidence of the attention output */
  outputConfidence: Confidence;
}

/**
 * Configuration for confidence-gated attention.
 */
export interface ConfidenceAttentionConfig {
  /** Number of attention heads */
  numHeads: number;

  /** Dimension of each head */
  headDimension: number;

  /** Whether to use confidence gating */
  useConfidenceGating: boolean;

  /** Temperature for confidence sigmoid (higher = sharper gating) */
  confidenceTemperature: number;

  /** Minimum attention weight (prevents complete zeroing) */
  minAttentionWeight: number;

  /** Whether to learn confidence temperature */
  learnableTemperature: boolean;
}

export const DEFAULT_ATTENTION_CONFIG: ConfidenceAttentionConfig = {
  numHeads: 8,
  headDimension: 64,
  useConfidenceGating: true,
  confidenceTemperature: 1.0,
  minAttentionWeight: 0.01,
  learnableTemperature: true,
};

/**
 * Interface for the confidence-gated attention layer.
 */
export interface ConfidenceGatedAttentionLayer {
  /**
   * Forward pass through attention with confidence gating.
   *
   * @param query - Query vectors [seq_len, hidden_dim]
   * @param key - Key vectors [seq_len, hidden_dim]
   * @param value - Value vectors [seq_len, hidden_dim]
   * @param keyConfidence - Confidence scores for each key position
   * @param mask - Optional attention mask
   * @returns Attention output with confidence information
   */
  forward(
    query: Float32Array[],
    key: Float32Array[],
    value: Float32Array[],
    keyConfidence: Confidence[],
    mask?: boolean[][]
  ): ConfidenceAttentionOutput;

  /** Configuration */
  config: ConfidenceAttentionConfig;
}

/**
 * Multi-head attention with per-head confidence tracking.
 * Different heads may specialize in different confidence patterns.
 */
export interface MultiHeadConfidenceAttention {
  /** Individual attention heads */
  heads: ConfidenceGatedAttentionLayer[];

  /** Output projection */
  outputProjection: Float32Array[];

  /**
   * Forward pass through all heads.
   */
  forward(
    query: Float32Array[],
    key: Float32Array[],
    value: Float32Array[],
    keyConfidence: Confidence[],
    mask?: boolean[][]
  ): {
    output: Float32Array[];
    perHeadConfidence: Confidence[];
    aggregatedConfidence: Confidence;
  };
}

/**
 * Cross-attention for attending to external context with confidence.
 * Useful for retrieval-augmented generation with uncertain sources.
 */
export interface ConfidenceCrossAttention extends ConfidenceGatedAttentionLayer {
  /**
   * Attend to external context, weighted by source confidence.
   *
   * @param query - Query from the model
   * @param externalKey - Keys from external source (e.g., retrieved documents)
   * @param externalValue - Values from external source
   * @param sourceConfidence - Confidence in each external source
   */
  crossAttend(
    query: Float32Array[],
    externalKey: Float32Array[],
    externalValue: Float32Array[],
    sourceConfidence: Confidence[]
  ): ConfidenceAttentionOutput;
}

/**
 * Compute confidence impact: how much did confidence gating change attention?
 * Higher values mean confidence had more effect on the final attention pattern.
 */
export function computeConfidenceImpact(
  rawWeights: Float32Array[],
  gatedWeights: Float32Array[]
): number {
  let totalDiff = 0;
  let count = 0;

  for (let i = 0; i < rawWeights.length; i++) {
    for (let j = 0; j < rawWeights[i].length; j++) {
      totalDiff += Math.abs(rawWeights[i][j] - gatedWeights[i][j]);
      count++;
    }
  }

  return count > 0 ? totalDiff / count : 0;
}
