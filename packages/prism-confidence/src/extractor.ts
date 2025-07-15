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
      provenance: this.buildProvenance('consistency', confidence, consistency, explanation),
      metadata: {
        method: 'consistency',
        consistency,
        samples: results,
        overlap: this.calculateOverlap(results)
      }
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
    const hedgingIndicators = this.findHedgingIndicators(response);
    const certaintyIndicators = this.findCertaintyIndicators(response);

    return {
      value: confidence,
      explanation,
      provenance: this.buildProvenance('linguistic', confidence, scores, explanation),
      metadata: {
        method: 'response_analysis',
        hedgingIndicators,
        certaintyIndicators,
        uncertaintyScore: scores.hedging ? 1 - scores.hedging : undefined,
        scores
      }
    };
  }

  /**
   * Extract confidence from structured response
   */
  async fromStructuredResponse(response: string): Promise<ConfidenceResult> {
    // Try to parse JSON first
    try {
      // Extract JSON from code blocks if present
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                       response.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response;
      
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed.confidence === 'number') {
        return {
          value: Math.max(0, Math.min(1, parsed.confidence)),
          explanation: `Extracted from JSON: confidence=${parsed.confidence}`,
          provenance: this.buildProvenance('structured', parsed.confidence, parsed, 'JSON extraction'),
          metadata: {
            method: 'structured_json',
            parsed
          }
        };
      }
    } catch (e) {
      // JSON parsing failed, try other patterns
    }

    // Try XML-style tags
    const xmlMatch = response.match(/<confidence>(\d+(?:\.\d+)?)<\/confidence>/i);
    if (xmlMatch) {
      const confidence = parseFloat(xmlMatch[1]);
      return {
        value: Math.max(0, Math.min(1, confidence)),
        explanation: `Extracted from XML tags: confidence=${confidence}`,
        provenance: this.buildProvenance('structured', confidence, xmlMatch[0], 'XML extraction'),
        metadata: {
          method: 'structured_xml'
        }
      };
    }

    // Other patterns
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
          provenance: this.buildProvenance('structured', confidence, match[0], 'Pattern match'),
          metadata: {
            method: 'structured_pattern'
          }
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
  private calculateOverlap(results: string[]): number {
    if (results.length < 2) return 1;
    
    // Calculate word overlap between responses
    const tokenSets = results.map(r => new Set(r.toLowerCase().split(/\s+/)));
    let totalOverlap = 0;
    let comparisons = 0;
    
    for (let i = 0; i < tokenSets.length - 1; i++) {
      for (let j = i + 1; j < tokenSets.length; j++) {
        const intersection = new Set([...tokenSets[i]].filter(x => tokenSets[j].has(x)));
        const union = new Set([...tokenSets[i], ...tokenSets[j]]);
        totalOverlap += intersection.size / union.size;
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalOverlap / comparisons : 0;
  }

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
      'probably', 'uncertain', 'not sure', 'hard to say',
      'impossible to predict', 'cannot be certain', 'difficult to know'
    ];
    
    const hedgeCount = hedgingPhrases.filter(phrase => 
      text.toLowerCase().includes(phrase.toLowerCase())
    ).length;
    
    // More hedging = lower confidence (increased penalty)
    return Math.max(0, 1 - (hedgeCount * 0.2));
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
    
    const trimmedText = text.trim();
    const wordCount = trimmedText.split(/\s+/).filter(w => w.length > 0).length;
    
    // Check for implicit certainty in mathematical/factual statements
    const hasMathEquation = /\d+\s*[+\-*/]\s*\d+\s*=\s*\d+/.test(text);
    const isFactualStatement = /^[^?]*[.!]?$/.test(trimmedText) && !text.includes('?');
    const isSingleWordAnswer = wordCount <= 3 && /^[A-Z][a-zA-Z\s]*[a-zA-Z]?$/.test(trimmedText);
    
    // Base certainty score
    let certaintyScore = 0.5;
    
    // Explicit certainty markers
    certaintyScore += certaintyCount * 0.15;
    
    // Implicit certainty from math or factual statements
    if (hasMathEquation) {
      certaintyScore += 0.3;
    } else if (isSingleWordAnswer) {
      // Single word answers like "Paris" are typically certain
      certaintyScore += 0.4;
    } else if (isFactualStatement && text.length < 50) {
      certaintyScore += 0.2;
    }
    
    return Math.min(1, certaintyScore);
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
    // For very short responses, check if they're direct answers
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    const trimmedText = text.trim();
    
    // Direct factual answers can be complete in just a few words
    if (wordCount <= 10) {
      // Check if it's a direct answer (contains numbers, yes/no, single words, etc)
      const isDirectAnswer = /^\s*(yes|no|true|false|\d+|[\d\s+\-*/=]+)\s*$/i.test(trimmedText) ||
                           /=\s*\d+/.test(text) || // math equations
                           (wordCount <= 3 && /^[A-Z][a-zA-Z\s]*[a-zA-Z]$/.test(trimmedText)); // Capitalized word(s) like "Paris"
      if (isDirectAnswer) {
        return 1.0; // Maximum completeness for direct answers
      }
      // Short responses that aren't clear answers get moderate completeness
      return 0.6;
    }
    
    // For longer responses, evaluate based on length and structure
    const sentenceCount = text.split(/[.!?]+/).length - 1;
    const lengthScore = Math.min(1, wordCount / 100);
    const structureScore = Math.min(1, sentenceCount / 5);
    
    return (lengthScore + structureScore) / 2;
  }

  private aggregateScores(scores: { [key: string]: number }): number {
    // Check if this looks like a short factual answer
    const isShortFactual = scores.completeness && scores.completeness >= 0.9 && 
                          scores.certainty && scores.certainty >= 0.7;
    
    // Adjust weights based on response type
    const weights = isShortFactual ? {
      hedging: 0.2,      // Less important for factual answers
      certainty: 0.35,   // More important for factual answers  
      specificity: 0.15, // Less important for simple facts
      completeness: 0.3  // Important for direct answers
    } : {
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

  private findHedgingIndicators(text: string): string[] {
    const hedgingPhrases = [
      'might be', 'possibly', 'perhaps', 'could be', 'may be',
      'it seems', 'appears to', 'suggests that', 'likely',
      'probably', 'uncertain', 'not sure', 'hard to say',
      'impossible to predict', 'cannot be certain', 'difficult to know'
    ];
    
    return hedgingPhrases.filter(phrase => 
      text.toLowerCase().includes(phrase.toLowerCase())
    );
  }

  private findCertaintyIndicators(text: string): string[] {
    const certaintyPhrases = [
      'definitely', 'certainly', 'absolutely', 'clearly',
      'obviously', 'without doubt', 'for sure', 'undoubtedly',
      'conclusively', 'unquestionably'
    ];
    
    return certaintyPhrases.filter(phrase => 
      text.toLowerCase().includes(phrase.toLowerCase())
    );
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