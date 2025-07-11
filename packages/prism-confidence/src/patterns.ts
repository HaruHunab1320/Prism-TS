import { ConfidenceBudget, ConfidenceContract, DifferentialConfidence } from './types';

/**
 * Confidence budget for high-stakes decisions
 */
export class ConfidenceBudgetManager {
  private budget: ConfidenceBudget;

  constructor(minTotal: number) {
    this.budget = {
      minTotal,
      items: []
    };
  }

  /**
   * Add a confident value to the budget
   */
  add(value: any, confidence: number): void {
    this.budget.items.push({ value, confidence });
  }

  /**
   * Check if budget is met
   */
  met(): boolean {
    const total = this.getTotal();
    return total >= this.budget.minTotal;
  }

  /**
   * Get current total confidence
   */
  getTotal(): number {
    return this.budget.items.reduce((sum, item) => sum + item.confidence, 0);
  }

  /**
   * Get remaining confidence needed
   */
  getRemaining(): number {
    return Math.max(0, this.budget.minTotal - this.getTotal());
  }

  /**
   * Get budget status
   */
  getStatus(): {
    met: boolean;
    total: number;
    required: number;
    remaining: number;
    items: number;
  } {
    const total = this.getTotal();
    return {
      met: this.met(),
      total,
      required: this.budget.minTotal,
      remaining: this.getRemaining(),
      items: this.budget.items.length
    };
  }

  /**
   * Clear the budget
   */
  clear(): void {
    this.budget.items = [];
  }
}

/**
 * Confidence contract for defining requirements
 */
export class ConfidenceContractManager {
  private contract: ConfidenceContract;

  constructor(requirements: { [check: string]: number }) {
    this.contract = { requirements };
  }

  /**
   * Verify results meet contract requirements
   */
  verify(results: { [check: string]: { value: any; confidence: number } }): {
    passed: boolean;
    failures: Array<{ check: string; required: number; actual: number }>;
  } {
    const failures: Array<{ check: string; required: number; actual: number }> = [];

    for (const [check, required] of Object.entries(this.contract.requirements)) {
      const result = results[check];
      if (!result) {
        failures.push({ check, required, actual: 0 });
      } else if (result.confidence < required) {
        failures.push({ check, required, actual: result.confidence });
      }
    }

    return {
      passed: failures.length === 0,
      failures
    };
  }

  /**
   * Get contract summary
   */
  getSummary(): string {
    const reqs = Object.entries(this.contract.requirements)
      .map(([check, conf]) => `${check}: ${(conf * 100).toFixed(0)}%`)
      .join(', ');
    
    return `Confidence contract requiring: ${reqs}`;
  }

  /**
   * Check if a single result meets its requirement
   */
  checkRequirement(check: string, confidence: number): boolean {
    const required = this.contract.requirements[check];
    return required ? confidence >= required : true;
  }
}

/**
 * Differential confidence for multi-aspect analysis
 */
export class DifferentialConfidenceManager {
  private aspects: DifferentialConfidence = {};

  /**
   * Set confidence for a specific aspect
   */
  setAspect(aspect: string, confidence: number): void {
    this.aspects[aspect] = Math.max(0, Math.min(1, confidence));
  }

  /**
   * Get confidence for a specific aspect
   */
  getAspect(aspect: string): number {
    return this.aspects[aspect] || 0;
  }

  /**
   * Get all aspects
   */
  getAllAspects(): DifferentialConfidence {
    return { ...this.aspects };
  }

  /**
   * Get aspect summary
   */
  getSummary(): string {
    const parts = Object.entries(this.aspects)
      .sort((a, b) => b[1] - a[1])
      .map(([aspect, conf]) => `${aspect}: ${(conf * 100).toFixed(0)}%`)
      .join(', ');
    
    return `Differential confidence: ${parts}`;
  }

  /**
   * Get highest confidence aspect
   */
  getHighest(): { aspect: string; confidence: number } | null {
    const entries = Object.entries(this.aspects);
    if (entries.length === 0) return null;

    return entries.reduce((highest, [aspect, conf]) => 
      conf > highest.confidence ? { aspect, confidence: conf } : highest,
      { aspect: entries[0][0], confidence: entries[0][1] }
    );
  }

  /**
   * Get lowest confidence aspect
   */
  getLowest(): { aspect: string; confidence: number } | null {
    const entries = Object.entries(this.aspects);
    if (entries.length === 0) return null;

    return entries.reduce((lowest, [aspect, conf]) => 
      conf < lowest.confidence ? { aspect, confidence: conf } : lowest,
      { aspect: entries[0][0], confidence: entries[0][1] }
    );
  }

  /**
   * Get average confidence across all aspects
   */
  getAverage(): number {
    const values = Object.values(this.aspects);
    if (values.length === 0) return 0;
    
    return values.reduce((sum, conf) => sum + conf, 0) / values.length;
  }
}

/**
 * Time-aware confidence for temporal decay
 */
export class TemporalConfidence {
  private value: number;
  private timestamp: Date;
  private halfLife: number;
  private unit: 'hours' | 'days' | 'weeks' | 'months';

  constructor(value: number, options: {
    halfLife?: number;
    unit?: 'hours' | 'days' | 'weeks' | 'months';
    timestamp?: Date;
  } = {}) {
    this.value = value;
    this.timestamp = options.timestamp || new Date();
    this.halfLife = options.halfLife || 30;
    this.unit = options.unit || 'days';
  }

  /**
   * Get current confidence accounting for decay
   */
  getCurrent(): number {
    const age = this.getAge();
    const decayFactor = Math.pow(0.5, age / this.halfLife);
    
    // Decay towards 0.5 (maximum uncertainty)
    return this.value * decayFactor + 0.5 * (1 - decayFactor);
  }

  /**
   * Get age in configured units
   */
  getAge(): number {
    const now = new Date();
    const diff = now.getTime() - this.timestamp.getTime();

    switch (this.unit) {
      case 'hours':
        return diff / (1000 * 60 * 60);
      case 'days':
        return diff / (1000 * 60 * 60 * 24);
      case 'weeks':
        return diff / (1000 * 60 * 60 * 24 * 7);
      case 'months':
        return diff / (1000 * 60 * 60 * 24 * 30);
    }
  }

  /**
   * Check if confidence has decayed below threshold
   */
  isStale(threshold: number = 0.6): boolean {
    return this.getCurrent() < threshold;
  }

  /**
   * Get decay explanation
   */
  getDecayExplanation(): string {
    const current = this.getCurrent();
    const age = this.getAge();
    const decayPercent = ((this.value - current) / this.value * 100).toFixed(1);
    
    return `Original: ${(this.value * 100).toFixed(1)}%, Current: ${(current * 100).toFixed(1)}% (${decayPercent}% decay after ${age.toFixed(1)} ${this.unit})`;
  }
}