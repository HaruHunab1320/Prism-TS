/**
 * @prism-lang/confidence - Confidence extraction library for Prism
 * 
 * Provides standardized patterns for extracting confidence values from LLMs and other sources
 */

export * from './types';
export * from './extractor';
export * from './calibration';
export * from './ensemble';
export * from './patterns';
export * from './sources';

// Re-export main classes for convenience
export { ConfidenceExtractor } from './extractor';
export { DomainCalibrator, SecurityCalibrator, InteractiveCalibrator } from './calibration';
export { ConfidenceEnsemble } from './ensemble';
export { 
  ConfidenceBudgetManager, 
  ConfidenceContractManager,
  DifferentialConfidenceManager,
  TemporalConfidence 
} from './patterns';
export { SensorConfidenceExtractor, APIConfidenceExtractor } from './sources';

// Export a default instance for simple usage
import { ConfidenceExtractor } from './extractor';
export const confidence = new ConfidenceExtractor();

// Export pre-configured calibrators
import { SecurityCalibrator } from './calibration';
export const calibrators = {
  security: new SecurityCalibrator()
};

/**
 * Smart extract - tries to determine the best extraction method
 */
export async function smartExtract(input: any): Promise<number> {
  const extractor = new ConfidenceExtractor();
  
  if (typeof input === 'function') {
    // It's a sampler function, use consistency
    const result = await extractor.fromConsistency(input);
    return result.value;
  } else if (typeof input === 'string') {
    // It's a response, analyze it
    const result = await extractor.fromResponseAnalysis(input);
    return result.value;
  } else if (input && typeof input === 'object' && 'confidence' in input) {
    // It already has confidence
    return input.confidence;
  } else {
    // Default to 0.5 (maximum uncertainty)
    return 0.5;
  }
}