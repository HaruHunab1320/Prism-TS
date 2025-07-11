import { ConfidenceResult, EnsembleWeights } from './types';

/**
 * Ensemble methods for combining multiple confidence signals
 */
export class ConfidenceEnsemble {
  private weights: EnsembleWeights;
  private normalizeWeights: boolean;

  constructor(options: {
    weights?: EnsembleWeights;
    normalizeWeights?: boolean;
  } = {}) {
    this.weights = options.weights || {};
    this.normalizeWeights = options.normalizeWeights ?? true;
  }

  /**
   * Combine multiple confidence signals
   */
  combine(signals: { [source: string]: number | ConfidenceResult }): ConfidenceResult {
    const normalizedSignals = this.normalizeSignals(signals);
    const weights = this.getWeights(Object.keys(normalizedSignals));
    
    let weightedSum = 0;
    let totalWeight = 0;
    const contributions: Array<{ source: string; value: number; weight: number }> = [];

    for (const [source, confidence] of Object.entries(normalizedSignals)) {
      const weight = weights[source] || 1;
      weightedSum += confidence * weight;
      totalWeight += weight;
      contributions.push({ source, value: confidence, weight });
    }

    const finalConfidence = totalWeight > 0 ? weightedSum / totalWeight : 0;

    return {
      value: finalConfidence,
      explanation: this.generateExplanation(contributions, finalConfidence),
      provenance: {
        sources: contributions.map(c => ({
          method: 'ensemble' as const,
          contribution: c.weight / totalWeight,
          raw_value: c.value,
          adjusted_value: c.value * c.weight / totalWeight,
          reason: `${c.source} signal`
        })),
        adjustments: [],
        timestamp: new Date()
      }
    };
  }

  /**
   * Combine signals with custom aggregation function
   */
  combineWithFunction(
    signals: { [source: string]: number | ConfidenceResult },
    aggregator: (values: number[], weights: number[]) => number
  ): ConfidenceResult {
    const normalizedSignals = this.normalizeSignals(signals);
    const weights = this.getWeights(Object.keys(normalizedSignals));
    
    const values = Object.values(normalizedSignals);
    const weightArray = Object.keys(normalizedSignals).map(k => weights[k] || 1);
    
    const finalConfidence = aggregator(values, weightArray);

    return {
      value: finalConfidence,
      explanation: `Custom ensemble aggregation: ${finalConfidence.toFixed(3)}`
    };
  }

  /**
   * Use voting-based ensemble
   */
  vote(
    signals: { [source: string]: number | ConfidenceResult },
    thresholds: { high: number; medium: number } = { high: 0.7, medium: 0.4 }
  ): ConfidenceResult {
    const normalizedSignals = this.normalizeSignals(signals);
    
    const votes = {
      high: 0,
      medium: 0,
      low: 0
    };

    for (const confidence of Object.values(normalizedSignals)) {
      if (confidence >= thresholds.high) {
        votes.high++;
      } else if (confidence >= thresholds.medium) {
        votes.medium++;
      } else {
        votes.low++;
      }
    }

    // Determine winning category
    const total = votes.high + votes.medium + votes.low;
    const winner = this.getWinningCategory(votes);
    
    // Map back to confidence value
    const confidenceMap = {
      high: (thresholds.high + 1) / 2,
      medium: (thresholds.high + thresholds.medium) / 2,
      low: thresholds.medium / 2
    };

    const finalConfidence = confidenceMap[winner];

    return {
      value: finalConfidence,
      explanation: `Voting ensemble: ${votes.high}/${total} high, ${votes.medium}/${total} medium, ${votes.low}/${total} low. Result: ${winner} confidence.`
    };
  }

  /**
   * Weighted median ensemble
   */
  weightedMedian(signals: { [source: string]: number | ConfidenceResult }): ConfidenceResult {
    const normalizedSignals = this.normalizeSignals(signals);
    const weights = this.getWeights(Object.keys(normalizedSignals));
    
    // Sort by confidence value
    const sorted = Object.entries(normalizedSignals)
      .map(([source, value]) => ({ source, value, weight: weights[source] || 1 }))
      .sort((a, b) => a.value - b.value);

    // Find weighted median
    const totalWeight = sorted.reduce((sum, item) => sum + item.weight, 0);
    const medianWeight = totalWeight / 2;
    
    let cumulativeWeight = 0;
    let median = 0;
    
    for (const item of sorted) {
      cumulativeWeight += item.weight;
      if (cumulativeWeight >= medianWeight) {
        median = item.value;
        break;
      }
    }

    return {
      value: median,
      explanation: `Weighted median of ${Object.keys(signals).length} signals: ${median.toFixed(3)}`
    };
  }

  /**
   * Update weights based on historical performance
   */
  updateWeights(performance: { [source: string]: number }): void {
    for (const [source, accuracy] of Object.entries(performance)) {
      // Increase weight for more accurate sources
      this.weights[source] = (this.weights[source] || 1) * (0.5 + accuracy);
    }
    
    // Normalize if requested
    if (this.normalizeWeights) {
      this.normalizeWeightValues();
    }
  }

  private normalizeSignals(signals: { [source: string]: number | ConfidenceResult }): { [source: string]: number } {
    const normalized: { [source: string]: number } = {};
    
    for (const [source, signal] of Object.entries(signals)) {
      if (typeof signal === 'number') {
        normalized[source] = Math.max(0, Math.min(1, signal));
      } else {
        normalized[source] = Math.max(0, Math.min(1, signal.value));
      }
    }
    
    return normalized;
  }

  private getWeights(sources: string[]): EnsembleWeights {
    const weights: EnsembleWeights = {};
    
    for (const source of sources) {
      weights[source] = this.weights[source] || 1;
    }
    
    if (this.normalizeWeights) {
      const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
      for (const source of Object.keys(weights)) {
        weights[source] /= total;
      }
    }
    
    return weights;
  }

  private normalizeWeightValues(): void {
    const total = Object.values(this.weights).reduce((sum, w) => sum + w, 0);
    if (total > 0) {
      for (const source of Object.keys(this.weights)) {
        this.weights[source] /= total;
      }
    }
  }

  private generateExplanation(
    contributions: Array<{ source: string; value: number; weight: number }>,
    finalConfidence: number
  ): string {
    const parts = contributions
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map(c => `${c.source}: ${(c.value * 100).toFixed(0)}% (weight: ${c.weight.toFixed(2)})`)
      .join(', ');

    return `Ensemble confidence: ${(finalConfidence * 100).toFixed(1)}% from ${contributions.length} sources. Top contributors: ${parts}`;
  }

  private getWinningCategory(votes: { high: number; medium: number; low: number }): 'high' | 'medium' | 'low' {
    if (votes.high >= votes.medium && votes.high >= votes.low) return 'high';
    if (votes.medium >= votes.low) return 'medium';
    return 'low';
  }
}