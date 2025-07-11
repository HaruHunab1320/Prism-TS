import { 
  SensorConfidenceParams, 
  APIReliabilityParams,
  ConfidenceResult 
} from './types';

/**
 * Extract confidence from sensor readings
 */
export class SensorConfidenceExtractor {
  /**
   * Calculate confidence based on sensor characteristics
   */
  fromSensor(_reading: any, params: SensorConfidenceParams): ConfidenceResult {
    const factors: { [key: string]: number } = {};

    // Age factor - newer calibrations are more reliable
    if (params.calibrationDate) {
      const daysSinceCalibration = params.age;
      factors.calibration = Math.max(0, 1 - daysSinceCalibration / 365); // Decay over a year
    }

    // Environmental factor
    factors.environment = this.assessEnvironmentalConditions(params.environment);

    // Historical accuracy
    factors.history = params.history;

    // Sensor age
    const sensorAgeFactor = Math.max(0, 1 - params.age / 3650); // 10 year lifespan
    factors.age = sensorAgeFactor;

    // Aggregate factors
    const confidence = this.aggregateFactors(factors);

    return {
      value: confidence,
      explanation: this.generateSensorExplanation(factors, confidence),
      provenance: {
        sources: [{
          method: 'heuristic',
          contribution: 1.0,
          raw_value: confidence,
          adjusted_value: confidence,
          reason: 'Sensor characteristics analysis'
        }],
        adjustments: Object.entries(factors).map(([type, value]) => ({
          type: type as any,
          delta: value - 0.5,
          reason: `${type} factor`
        })),
        timestamp: new Date()
      }
    };
  }

  /**
   * Extract confidence from multiple sensor readings
   */
  fromMultipleSensors(
    readings: Array<{ sensor: string; value: any; params: SensorConfidenceParams }>,
    options: { aggregation?: 'mean' | 'median' | 'weighted' } = {}
  ): ConfidenceResult {
    const confidences = readings.map(r => ({
      sensor: r.sensor,
      confidence: this.fromSensor(r.value, r.params)
    }));

    const values = confidences.map(c => c.confidence.value);
    let aggregated: number;

    switch (options.aggregation || 'mean') {
      case 'median':
        values.sort((a, b) => a - b);
        aggregated = values[Math.floor(values.length / 2)];
        break;
      
      case 'weighted':
        // Weight by historical accuracy
        const weights = readings.map(r => r.params.history);
        const weightedSum = values.reduce((sum, val, i) => sum + val * weights[i], 0);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        aggregated = totalWeight > 0 ? weightedSum / totalWeight : 0;
        break;
      
      default:
        aggregated = values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    return {
      value: aggregated,
      explanation: `Aggregated confidence from ${readings.length} sensors: ${(aggregated * 100).toFixed(1)}%`
    };
  }

  private assessEnvironmentalConditions(environment: any): number {
    let score = 1.0;

    // Temperature effects
    if (environment.temperature !== undefined) {
      const optimalTemp = environment.optimalTemperature || 20;
      const tempDiff = Math.abs(environment.temperature - optimalTemp);
      score *= Math.max(0.5, 1 - tempDiff / 50);
    }

    // Humidity effects
    if (environment.humidity !== undefined) {
      const optimalHumidity = environment.optimalHumidity || 50;
      const humidityDiff = Math.abs(environment.humidity - optimalHumidity);
      score *= Math.max(0.7, 1 - humidityDiff / 100);
    }

    // Vibration/movement
    if (environment.vibration !== undefined) {
      score *= Math.max(0.6, 1 - environment.vibration / 10);
    }

    return score;
  }

  private aggregateFactors(factors: { [key: string]: number }): number {
    const weights = {
      calibration: 0.3,
      environment: 0.25,
      history: 0.35,
      age: 0.1
    };

    let weighted = 0;
    let totalWeight = 0;

    for (const [factor, value] of Object.entries(factors)) {
      const weight = (weights as any)[factor] || 0.25;
      weighted += value * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weighted / totalWeight : 0.5;
  }

  private generateSensorExplanation(factors: { [key: string]: number }, confidence: number): string {
    const factorStrings = Object.entries(factors)
      .map(([name, value]) => `${name}: ${(value * 100).toFixed(0)}%`)
      .join(', ');

    return `Sensor confidence: ${(confidence * 100).toFixed(1)}% based on ${factorStrings}`;
  }
}

/**
 * Extract confidence from API reliability
 */
export class APIConfidenceExtractor {
  private providerHistory = new Map<string, {
    calls: number;
    successes: number;
    totalLatency: number;
    lastFailure?: Date;
  }>();

  /**
   * Calculate confidence based on API characteristics
   */
  fromAPIReliability(params: APIReliabilityParams): ConfidenceResult {
    const factors: { [key: string]: number } = {};

    // Historical accuracy is primary factor
    factors.accuracy = params.historicalAccuracy;

    // Latency factor - faster responses often more reliable
    if (params.latency !== undefined) {
      const latencyScore = Math.max(0, 1 - params.latency / 5000); // 5 second max
      factors.latency = latencyScore;
    }

    // Recency of failures
    if (params.lastFailure) {
      const hoursSinceFailure = (Date.now() - params.lastFailure.getTime()) / (1000 * 60 * 60);
      factors.reliability = Math.min(1, hoursSinceFailure / 24); // Full confidence after 24 hours
    }

    // Provider reputation
    factors.reputation = this.getProviderReputation(params.provider);

    const confidence = this.aggregateFactors(factors);

    return {
      value: confidence,
      explanation: this.generateAPIExplanation(params.provider, factors, confidence)
    };
  }

  /**
   * Track API call for future confidence calculations
   */
  trackAPICall(provider: string, success: boolean, latency: number): void {
    if (!this.providerHistory.has(provider)) {
      this.providerHistory.set(provider, {
        calls: 0,
        successes: 0,
        totalLatency: 0
      });
    }

    const history = this.providerHistory.get(provider)!;
    history.calls++;
    if (success) {
      history.successes++;
      history.totalLatency += latency;
    } else {
      history.lastFailure = new Date();
    }
  }

  /**
   * Get calculated reliability for a provider
   */
  getProviderReliability(provider: string): APIReliabilityParams {
    const history = this.providerHistory.get(provider);
    
    if (!history || history.calls === 0) {
      return {
        provider,
        historicalAccuracy: 0.5 // Unknown provider starts at 50%
      };
    }

    return {
      provider,
      historicalAccuracy: history.successes / history.calls,
      latency: history.successes > 0 ? history.totalLatency / history.successes : undefined,
      lastFailure: history.lastFailure
    };
  }

  private getProviderReputation(provider: string): number {
    // Known provider reputations (could be loaded from config)
    const reputations: { [key: string]: number } = {
      'openai': 0.95,
      'anthropic': 0.95,
      'google': 0.93,
      'weather.com': 0.85,
      'openweathermap': 0.80,
      'newsapi': 0.75
    };

    return reputations[provider.toLowerCase()] || 0.7;
  }

  private aggregateFactors(factors: { [key: string]: number }): number {
    const weights = {
      accuracy: 0.4,
      latency: 0.2,
      reliability: 0.25,
      reputation: 0.15
    };

    let weighted = 0;
    let totalWeight = 0;

    for (const [factor, value] of Object.entries(factors)) {
      const weight = (weights as any)[factor] || 0.25;
      weighted += value * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weighted / totalWeight : 0.5;
  }

  private generateAPIExplanation(provider: string, factors: { [key: string]: number }, confidence: number): string {
    const factorStrings = Object.entries(factors)
      .map(([name, value]) => `${name}: ${(value * 100).toFixed(0)}%`)
      .join(', ');

    return `API confidence for ${provider}: ${(confidence * 100).toFixed(1)}% based on ${factorStrings}`;
  }
}