import { 
  DomainCalibrationConfig, 
  CalibrationCurve
} from './types';

/**
 * Base calibrator class for domain-specific confidence adjustment
 */
export abstract class DomainCalibrator {
  protected config: DomainCalibrationConfig;

  constructor(config: DomainCalibrationConfig) {
    this.config = config;
  }

  /**
   * Calibrate a raw confidence value based on domain knowledge
   */
  async calibrate(rawConfidence: number, context: any): Promise<number> {
    let calibrated = rawConfidence;

    // Apply domain-specific curve
    const category = this.categorize(context);
    if (category && this.config.curves[category]) {
      calibrated = this.applyCurve(calibrated, this.config.curves[category], context);
    }

    // Apply temporal decay if configured
    if (this.config.temporalDecay && context.timestamp) {
      calibrated = this.applyTemporalDecay(calibrated, context.timestamp);
    }

    return Math.max(0, Math.min(1, calibrated));
  }

  /**
   * Get explanation for calibration adjustments
   */
  async explainCalibration(rawConfidence: number, context: any): Promise<string> {
    const calibrated = await this.calibrate(rawConfidence, context);
    const delta = calibrated - rawConfidence;
    
    const explanations: string[] = [];
    
    const category = this.categorize(context);
    if (category) {
      explanations.push(`Category: ${category}`);
    }
    
    if (this.config.temporalDecay && context.timestamp) {
      const age = this.getAge(context.timestamp);
      explanations.push(`Age adjustment: ${age} ${this.config.temporalDecay.unit} old`);
    }
    
    return `Calibrated from ${(rawConfidence * 100).toFixed(1)}% to ${(calibrated * 100).toFixed(1)}% (${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}%). ${explanations.join('. ')}`;
  }

  protected abstract categorize(context: any): string | null;

  protected applyCurve(value: number, curve: CalibrationCurve, context: any): number {
    let adjusted = value * curve.baseConfidence;

    for (const [condition, adjustment] of Object.entries(curve.adjustments)) {
      if (this.checkCondition(condition, context)) {
        adjusted += adjustment;
      }
    }

    return adjusted;
  }

  protected checkCondition(_condition: string, _context: any): boolean {
    // Override in subclasses for domain-specific condition checking
    return false;
  }

  protected applyTemporalDecay(value: number, timestamp: Date): number {
    if (!this.config.temporalDecay) return value;

    const age = this.getAge(timestamp);
    const halfLife = this.parseHalfLife();
    
    // Exponential decay formula
    const decayFactor = Math.pow(0.5, age / halfLife);
    
    // Blend towards 0.5 (maximum uncertainty) as confidence decays
    return value * decayFactor + 0.5 * (1 - decayFactor);
  }

  private getAge(timestamp: Date): number {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();

    switch (this.config.temporalDecay?.unit) {
      case 'hours':
        return diff / (1000 * 60 * 60);
      case 'days':
        return diff / (1000 * 60 * 60 * 24);
      case 'weeks':
        return diff / (1000 * 60 * 60 * 24 * 7);
      case 'months':
        return diff / (1000 * 60 * 60 * 24 * 30);
      default:
        return 0;
    }
  }

  private parseHalfLife(): number {
    const match = this.config.temporalDecay?.halfLife.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }
}

/**
 * Security-specific calibrator
 */
export class SecurityCalibrator extends DomainCalibrator {
  constructor() {
    super({
      domain: 'security',
      curves: {
        'sql_injection': {
          baseConfidence: 0.95,
          adjustments: {
            'has_parameterized_queries': 0.05,
            'uses_orm': 0.03,
            'has_input_validation': 0.02,
            'complex_query': -0.1,
            'dynamic_query_building': -0.15
          }
        },
        'xss': {
          baseConfidence: 0.85,
          adjustments: {
            'has_output_encoding': 0.1,
            'uses_framework_protection': 0.05,
            'has_csp': 0.05,
            'user_generated_content': -0.1,
            'allows_html': -0.2
          }
        },
        'authentication': {
          baseConfidence: 0.75,
          adjustments: {
            'uses_oauth': 0.1,
            'has_mfa': 0.15,
            'password_complexity': 0.05,
            'custom_auth': -0.2,
            'no_rate_limiting': -0.15
          }
        }
      },
      temporalDecay: {
        halfLife: '30',
        unit: 'days'
      }
    });
  }

  protected categorize(context: any): string | null {
    if (context.type) return context.type;
    
    // Try to infer from context
    if (context.vulnerability?.includes('SQL')) return 'sql_injection';
    if (context.vulnerability?.includes('XSS') || context.vulnerability?.includes('script')) return 'xss';
    if (context.vulnerability?.includes('auth')) return 'authentication';
    
    return null;
  }

  protected checkCondition(condition: string, context: any): boolean {
    // Check various security-related conditions
    switch (condition) {
      case 'has_parameterized_queries':
        return context.codeFeatures?.includes('parameterized') || false;
      case 'uses_orm':
        return context.codeFeatures?.includes('orm') || false;
      case 'complex_query':
        return context.queryComplexity > 5 || false;
      // ... implement other conditions
      default:
        return false;
    }
  }
}

/**
 * Interactive calibrator that learns from feedback
 */
export class InteractiveCalibrator extends DomainCalibrator {
  private history: Array<{
    prediction: any;
    confidence: number;
    outcome: any;
    timestamp: Date;
  }> = [];

  constructor(domain: string) {
    super({
      domain,
      curves: {},
      temporalDecay: {
        halfLife: '7',
        unit: 'days'
      }
    });
  }

  /**
   * Provide feedback on a prediction
   */
  feedback(prediction: any, actualOutcome: any): void {
    const entry = this.history.find(h => h.prediction === prediction);
    if (entry) {
      entry.outcome = actualOutcome;
      this.recalibrate();
    }
  }

  /**
   * Save the learned calibration
   */
  save(_name: string): string {
    const calibrationData = {
      domain: this.config.domain,
      curves: this.config.curves,
      history: this.history,
      timestamp: new Date()
    };
    
    // In a real implementation, this would save to a file or database
    return JSON.stringify(calibrationData, null, 2);
  }

  /**
   * Load a saved calibration
   */
  static load(data: string): InteractiveCalibrator {
    const parsed = JSON.parse(data);
    const calibrator = new InteractiveCalibrator(parsed.domain);
    calibrator.config = parsed;
    calibrator.history = parsed.history;
    return calibrator;
  }

  protected categorize(context: any): string | null {
    // Use learned categories from history
    return context.category || 'default';
  }

  private recalibrate(): void {
    // Simple calibration learning - adjust base confidence based on accuracy
    const categories = new Map<string, { correct: number; total: number }>();

    for (const entry of this.history) {
      if (!entry.outcome) continue;
      
      const category = this.categorize(entry.prediction) || 'default';
      if (!categories.has(category)) {
        categories.set(category, { correct: 0, total: 0 });
      }
      
      const stats = categories.get(category)!;
      stats.total++;
      
      // Determine if prediction was correct (domain-specific logic needed)
      const wasCorrect = this.evaluatePrediction(entry.prediction, entry.outcome);
      if (wasCorrect) stats.correct++;
    }

    // Update curves based on observed accuracy
    for (const [category, stats] of categories) {
      const observedAccuracy = stats.correct / stats.total;
      this.config.curves[category] = {
        baseConfidence: observedAccuracy,
        adjustments: {}
      };
    }
  }

  private evaluatePrediction(prediction: any, outcome: any): boolean {
    // Override in domain-specific implementations
    return prediction === outcome;
  }
}