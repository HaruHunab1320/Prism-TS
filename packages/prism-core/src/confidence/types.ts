export enum ConfidenceLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export type CombinationStrategy = 'min' | 'max' | 'average' | 'product';

export interface ThresholdConfig {
  high: number;
  medium: number;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  high: 0.7,
  medium: 0.5,
};

export class ConfidenceValue {
  private _value: number;

  constructor(value: number) {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      throw new Error(`Invalid confidence value: ${value}. Must be a finite number.`);
    }
    
    // Clamp to [0, 1] range
    this._value = Math.max(0, Math.min(1, value));
  }

  get value(): number {
    return this._value;
  }

  get level(): ConfidenceLevel {
    return getConfidenceLevel(this._value);
  }

  // Comparison operations
  greaterThan(other: ConfidenceValue): boolean {
    return this._value > other._value;
  }

  greaterThanOrEqual(other: ConfidenceValue): boolean {
    return this._value >= other._value;
  }

  lessThan(other: ConfidenceValue): boolean {
    return this._value < other._value;
  }

  lessThanOrEqual(other: ConfidenceValue): boolean {
    return this._value <= other._value;
  }

  equals(other: ConfidenceValue, tolerance: number = 1e-10): boolean {
    return Math.abs(this._value - other._value) < tolerance;
  }

  // Combination operations
  min(other: ConfidenceValue): ConfidenceValue {
    return new ConfidenceValue(Math.min(this._value, other._value));
  }

  max(other: ConfidenceValue): ConfidenceValue {
    return new ConfidenceValue(Math.max(this._value, other._value));
  }

  average(other: ConfidenceValue): ConfidenceValue {
    return new ConfidenceValue((this._value + other._value) / 2);
  }

  product(other: ConfidenceValue): ConfidenceValue {
    return new ConfidenceValue(this._value * other._value);
  }

  // Arithmetic operations (for uncertainty propagation)
  add(other: ConfidenceValue): ConfidenceValue {
    // For addition, we typically take the minimum confidence
    return this.min(other);
  }

  multiply(other: ConfidenceValue): ConfidenceValue {
    // For multiplication, confidence typically multiplies
    return this.product(other);
  }

  toString(): string {
    return `${(this._value * 100).toFixed(1)}%`;
  }
}

export interface Confident<T> {
  value: T;
  confidence: ConfidenceValue;
  withConfidence(confidence: ConfidenceValue): Confident<T>;
}

export class ConfidenceThreshold {
  private thresholds: ThresholdConfig;

  constructor(thresholds: Partial<ThresholdConfig> = {}) {
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...thresholds,
    };

    // Validate thresholds
    if (this.thresholds.high <= this.thresholds.medium) {
      throw new Error('High threshold must be greater than medium threshold');
    }
    if (this.thresholds.medium <= 0 || this.thresholds.high > 1) {
      throw new Error('Thresholds must be in the range (0, 1]');
    }
  }

  classify(confidence: number): ConfidenceLevel {
    if (confidence >= this.thresholds.high) {
      return ConfidenceLevel.HIGH;
    } else if (confidence >= this.thresholds.medium) {
      return ConfidenceLevel.MEDIUM;
    } else {
      return ConfidenceLevel.LOW;
    }
  }

  getThresholds(): ThresholdConfig {
    return { ...this.thresholds };
  }
}

// Default classifier instance
export const defaultThreshold = new ConfidenceThreshold();

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  return defaultThreshold.classify(confidence);
}

export function combineConfidence(
  values: ConfidenceValue[],
  strategy: CombinationStrategy
): ConfidenceValue {
  if (values.length === 0) {
    return new ConfidenceValue(0.5); // Default uncertainty
  }

  if (values.length === 1) {
    return values[0];
  }

  switch (strategy) {
    case 'min':
      return values.reduce((acc, val) => acc.min(val));
    
    case 'max':
      return values.reduce((acc, val) => acc.max(val));
    
    case 'average': {
      const sum = values.reduce((acc, val) => acc + val.value, 0);
      return new ConfidenceValue(sum / values.length);
    }
    
    case 'product': {
      const product = values.reduce((acc, val) => acc * val.value, 1);
      return new ConfidenceValue(product);
    }
    
    default:
      throw new Error(`Unknown combination strategy: ${strategy}`);
  }
}

// Utility class for wrapping values with confidence
export class ConfidentValue<T> implements Confident<T> {
  constructor(
    public value: T,
    public confidence: ConfidenceValue
  ) {}

  withConfidence(confidence: ConfidenceValue): ConfidentValue<T> {
    return new ConfidentValue(this.value, confidence);
  }

  map<U>(fn: (value: T) => U): ConfidentValue<U> {
    return new ConfidentValue(fn(this.value), this.confidence);
  }

  flatMap<U>(fn: (value: T) => ConfidentValue<U>): ConfidentValue<U> {
    const result = fn(this.value);
    // Combine confidences using minimum strategy
    const combinedConfidence = this.confidence.min(result.confidence);
    return new ConfidentValue(result.value, combinedConfidence);
  }
}

// Utility functions
export function withConfidence<T>(value: T, confidence: number): ConfidentValue<T> {
  return new ConfidentValue(value, new ConfidenceValue(confidence));
}

export function isHighConfidence(confidence: ConfidenceValue): boolean {
  return confidence.level === ConfidenceLevel.HIGH;
}

export function isMediumConfidence(confidence: ConfidenceValue): boolean {
  return confidence.level === ConfidenceLevel.MEDIUM;
}

export function isLowConfidence(confidence: ConfidenceValue): boolean {
  return confidence.level === ConfidenceLevel.LOW;
}