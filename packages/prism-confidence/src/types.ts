/**
 * Core types for the confidence extraction library
 */

export interface ConfidenceResult {
  value: number;
  explanation?: string;
  provenance?: ConfidenceProvenance;
  metadata?: {
    method?: string;
    hedgingIndicators?: string[];
    certaintyIndicators?: string[];
    uncertaintyScore?: number;
    consistency?: number;
    overlap?: number;
    samples?: string[];
    parsed?: any;
    [key: string]: any;
  };
}

export interface ConfidenceProvenance {
  sources: Array<{
    method: 'consistency' | 'perplexity' | 'calibration' | 'heuristic' | 'linguistic' | 'structured' | 'ensemble';
    contribution: number;
    raw_value: number;
    adjusted_value: number;
    reason: string;
  }>;
  adjustments: Array<{
    type: 'calibration' | 'temporal' | 'domain';
    delta: number;
    reason: string;
  }>;
  timestamp: Date;
}

export interface ConsistencyOptions {
  samples?: number;
  temperature?: number | number[];
  timeout?: number;
  aggregation?: 'mean' | 'median' | 'mode' | 'weighted';
}

export interface ResponseAnalysisOptions {
  checkHedging?: boolean;
  checkCertainty?: boolean;
  checkSpecificity?: boolean;
  checkCompleteness?: boolean;
  customMarkers?: {
    high?: string[];
    medium?: string[];
    low?: string[];
  };
}

export interface DifferentialConfidence {
  [aspect: string]: number;
}

export interface CalibrationCurve {
  baseConfidence: number;
  adjustments: {
    [condition: string]: number;
  };
}

export interface DomainCalibrationConfig {
  domain: string;
  curves: {
    [category: string]: CalibrationCurve;
  };
  temporalDecay?: {
    halfLife: string;
    unit: 'hours' | 'days' | 'weeks' | 'months';
  };
}

export interface EnsembleWeights {
  [source: string]: number;
}

export interface ConfidenceBudget {
  minTotal: number;
  items: Array<{
    value: any;
    confidence: number;
  }>;
}

export interface ConfidenceContract {
  requirements: {
    [check: string]: number;
  };
}

export interface ExtractionLevel {
  level: 'simple' | 'controlled' | 'advanced';
  options?: any;
}

// Sensor and API confidence types
export interface SensorConfidenceParams {
  age: number;
  environment: any;
  history: number;
  calibrationDate?: Date;
}

export interface APIReliabilityParams {
  provider: string;
  historicalAccuracy: number;
  latency?: number;
  lastFailure?: Date;
}