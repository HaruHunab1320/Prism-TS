import { 
  ConfidenceResult, 
  ConsistencyOptions, 
  ResponseAnalysisOptions,
  ConfidenceProvenance 
} from './types';

/**
 * Main confidence extractor class providing three levels of API
 */
export class ConfidenceExtractor {

  /**
   * Level 1: Dead simple extraction
   */
  async extract(response: string | any): Promise<ConfidenceResult> {
    // Default to response analysis
    return this.fromResponseAnalysis(response);
  }

  /**
   * Level 2: Some control over extraction method
   */
  async extractWithOptions(
    response: string | any, 
    options: {
      method: 'consistency' | 'response_analysis' | 'structured';
      samples?: number;
      [key: string]: any;
    }
  ): Promise<ConfidenceResult> {
    switch (options.method) {
      case 'consistency':
        if (typeof response === 'function') {
          return this.fromConsistency(response, { samples: options.samples });
        }
        throw new Error('Consistency method requires a function');
      
      case 'response_analysis':
        return this.fromResponseAnalysis(response);
      
      case 'structured':
        return this.fromStructuredResponse(response);
      
      default:
        return this.extract(response);
    }
  }

  /**
   * Level 3: Full control - use individual methods directly
   */

  /**
   * Extract confidence from multiple samples using consistency
   */
  async fromConsistency(
    sampler: () => Promise<string>,
    options: ConsistencyOptions = {}
  ): Promise<ConfidenceResult> {
    const {
      samples = 5,
      // temperature = [0.1, 0.3, 0.5, 0.7, 0.9],
      aggregation = 'mean'
    } = options;

    const results: string[] = [];
    // const temps = Array.isArray(temperature) ? temperature : Array(samples).fill(temperature);

    // Collect samples
    for (let i = 0; i < samples; i++) {
      const result = await sampler();
      results.push(result);
    }

    // Analyze consistency
    const consistency = this.calculateConsistency(results);
    const confidence = this.consistencyToConfidence(consistency, aggregation);

    const explanation = this.generateConsistencyExplanation(results, consistency, confidence);

    return {
      value: confidence,
      explanation,
      provenance: this.buildProvenance('consistency', confidence, consistency, explanation)
    };
  }

  /**
   * Extract confidence from response characteristics
   */
  async fromResponseAnalysis(
    response: string,
    options: ResponseAnalysisOptions = {}
  ): Promise<ConfidenceResult> {
    const {
      checkHedging = true,
      checkCertainty = true,
      checkSpecificity = true,
      checkCompleteness = true,
      customMarkers
    } = options;

    const scores: { [key: string]: number } = {};
    
    if (checkHedging) {
      scores.hedging = this.analyzeHedging(response, customMarkers?.low);
    }
    
    if (checkCertainty) {
      scores.certainty = this.analyzeCertainty(response, customMarkers?.high);
    }
    
    if (checkSpecificity) {
      scores.specificity = this.analyzeSpecificity(response);
    }
    
    if (checkCompleteness) {
      scores.completeness = this.analyzeCompleteness(response);
    }

    const confidence = this.aggregateScores(scores);
    const explanation = this.generateAnalysisExplanation(response, scores, confidence);

    return {
      value: confidence,
      explanation,
      provenance: this.buildProvenance('linguistic', confidence, scores, explanation)
    };
  }

  /**
   * Extract confidence from structured response
   */
  async fromStructuredResponse(response: string): Promise<ConfidenceResult> {
    // Patterns to look for
    const patterns = [
      { regex: /confidence:\s*(\d+(?:\.\d+)?)\s*%/i, transform: (m: RegExpMatchArray) => parseFloat(m[1]) / 100 },
      { regex: /confidence:\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+)/i, transform: (m: RegExpMatchArray) => parseFloat(m[1]) / parseFloat(m[2]) },
      { regex: /certainty:\s*(high|medium|low)/i, map: { high: 0.9, medium: 0.6, low: 0.3 } },
      { regex: /\((\d+(?:\.\d+)?)\s*%\s*confident\)/i, transform: (m: RegExpMatchArray) => parseFloat(m[1]) / 100 }
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern.regex);
      if (match) {
        const confidence = pattern.transform 
          ? pattern.transform(match)
          : (pattern.map as any)[match[1].toLowerCase()];

        return {
          value: confidence,
          explanation: `Extracted from structured response: "${match[0]}"`,
          provenance: this.buildProvenance('structured', confidence, match[0], 'Pattern match')
        };
      }
    }

    // Fallback to response analysis
    return this.fromResponseAnalysis(response);
  }

  /**
   * Generate explanation for why this confidence was assigned
   */
  explain(result: ConfidenceResult): string {
    if (result.explanation) {
      return result.explanation;
    }

    if (result.provenance) {
      const sources = result.provenance.sources
        .map(s => `${s.method}: ${s.raw_value.toFixed(2)} (${s.reason})`)
        .join(', ');
      
      const adjustments = result.provenance.adjustments
        .map(a => `${a.type}: ${a.delta > 0 ? '+' : ''}${a.delta.toFixed(2)} (${a.reason})`)
        .join(', ');

      return `Confidence ${result.value.toFixed(2)} from ${sources}${adjustments ? ` with adjustments: ${adjustments}` : ''}`;
    }

    return `Confidence: ${result.value.toFixed(2)}`;
  }

  // Private helper methods
  private calculateConsistency(results: string[]): number {
    // Simplified consistency calculation
    // In a real implementation, this would use more sophisticated similarity metrics
    const uniqueResults = new Set(results);
    return 1 - (uniqueResults.size - 1) / results.length;
  }

  private consistencyToConfidence(consistency: number, _aggregation: string): number {
    // Map consistency score to confidence value
    return Math.pow(consistency, 0.5); // Square root for more generous scoring
  }

  private generateConsistencyExplanation(results: string[], consistency: number, confidence: number): string {
    const uniqueCount = new Set(results).size;
    const agreement = consistency > 0.8 ? 'High' : consistency > 0.5 ? 'Moderate' : 'Low';
    
    return `${agreement} confidence (${(confidence * 100).toFixed(1)}%): ${results.length - uniqueCount + 1}/${results.length} samples agreed. ${
      uniqueCount === 1 ? 'All samples identical.' : `${uniqueCount} unique variations found.`
    }`;
  }

  private analyzeHedging(text: string, customMarkers?: string[]): number {
    const hedgingPhrases = customMarkers || [
      'might be', 'possibly', 'perhaps', 'could be', 'may be',
      'it seems', 'appears to', 'suggests that', 'likely',
      'probably', 'uncertain', 'not sure', 'hard to say'
    ];
    
    const hedgeCount = hedgingPhrases.filter(phrase => 
      text.toLowerCase().includes(phrase.toLowerCase())
    ).length;
    
    // More hedging = lower confidence
    return Math.max(0, 1 - (hedgeCount * 0.15));
  }

  private analyzeCertainty(text: string, customMarkers?: string[]): number {
    const certaintyPhrases = customMarkers || [
      'definitely', 'certainly', 'absolutely', 'clearly',
      'obviously', 'without doubt', 'for sure', 'undoubtedly',
      'conclusively', 'unquestionably'
    ];
    
    const certaintyCount = certaintyPhrases.filter(phrase => 
      text.toLowerCase().includes(phrase.toLowerCase())
    ).length;
    
    // More certainty markers = higher confidence
    return Math.min(1, 0.5 + (certaintyCount * 0.15));
  }

  private analyzeSpecificity(text: string): number {
    // Check for specific details vs vague statements
    const specificIndicators = [
      /\d+(\.\d+)?%/, // Percentages
      /\d+/, // Numbers
      /"[^"]+"/g, // Quoted text
      /specifically/i,
      /exactly/i,
      /precisely/i
    ];
    
    let specificityScore = 0.5;
    for (const indicator of specificIndicators) {
      if (indicator.test(text)) {
        specificityScore += 0.1;
      }
    }
    
    return Math.min(1, specificityScore);
  }

  private analyzeCompleteness(text: string): number {
    // Longer, more detailed responses generally indicate higher confidence
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).length - 1;
    
    // Base score on length and structure
    const lengthScore = Math.min(1, wordCount / 100);
    const structureScore = Math.min(1, sentenceCount / 5);
    
    return (lengthScore + structureScore) / 2;
  }

  private aggregateScores(scores: { [key: string]: number }): number {
    // const values = Object.values(scores);
    const weights = {
      hedging: 0.3,
      certainty: 0.3,
      specificity: 0.2,
      completeness: 0.2
    };
    
    let weighted = 0;
    let totalWeight = 0;
    
    for (const [key, value] of Object.entries(scores)) {
      const weight = (weights as any)[key] || 0.25;
      weighted += value * weight;
      totalWeight += weight;
    }
    
    return weighted / totalWeight;
  }

  private generateAnalysisExplanation(
    _response: string, 
    scores: { [key: string]: number }, 
    confidence: number
  ): string {
    const factors = Object.entries(scores)
      .map(([key, value]) => `${key}: ${(value * 100).toFixed(0)}%`)
      .join(', ');
    
    return `Response analysis confidence: ${(confidence * 100).toFixed(1)}% based on ${factors}`;
  }

  private buildProvenance(
    method: string,
    finalValue: number,
    _rawData: any,
    reason: string
  ): ConfidenceProvenance {
    return {
      sources: [{
        method: method as any,
        contribution: 1.0,
        raw_value: finalValue,
        adjusted_value: finalValue,
        reason
      }],
      adjustments: [],
      timestamp: new Date()
    };
  }
}