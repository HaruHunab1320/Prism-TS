import { 
  SensorConfidenceExtractor, 
  APIConfidenceExtractor 
} from '../src/sources';

describe('Non-LLM Confidence Sources', () => {
  describe('SensorConfidenceExtractor', () => {
    let extractor: SensorConfidenceExtractor;

    beforeEach(() => {
      extractor = new SensorConfidenceExtractor();
    });

    it('should calculate confidence from sensor parameters', () => {
      const result = extractor.fromSensor('temperature: 25.3°C', {
        age: 30, // 30 days old sensor
        calibrationDate: new Date(),
        environment: {
          temperature: 20,
          humidity: 50
        },
        history: 0.95 // 95% historical accuracy
      });

      expect(result.value).toBeGreaterThan(0.8);
      expect(result.explanation).toContain('Sensor confidence');
      expect(result.provenance).toBeDefined();
    });

    it('should reduce confidence for poor environmental conditions', () => {
      const goodConditions = extractor.fromSensor('reading', {
        age: 1,
        environment: {
          temperature: 20, // Optimal
          humidity: 50,    // Optimal
          vibration: 0     // No vibration
        },
        history: 0.9
      });

      const poorConditions = extractor.fromSensor('reading', {
        age: 1,
        environment: {
          temperature: 45,  // Too hot
          humidity: 95,     // Too humid
          vibration: 8      // High vibration
        },
        history: 0.9
      });

      expect(goodConditions.value).toBeGreaterThan(poorConditions.value);
    });

    it('should aggregate multiple sensor readings', () => {
      const readings = [
        { sensor: 'sensor1', value: 25.1, params: { age: 10, environment: {}, history: 0.95 } },
        { sensor: 'sensor2', value: 25.3, params: { age: 20, environment: {}, history: 0.90 } },
        { sensor: 'sensor3', value: 24.9, params: { age: 5, environment: {}, history: 0.85 } }
      ];

      const result = extractor.fromMultipleSensors(readings);
      
      expect(result.value).toBeGreaterThan(0.7);
      expect(result.explanation).toContain('3 sensors');
    });

    it('should support different aggregation methods', () => {
      const readings = [
        { sensor: 'outlier', value: 100, params: { age: 1, environment: {}, history: 0.5 } },
        { sensor: 'good1', value: 25, params: { age: 1, environment: {}, history: 0.95 } },
        { sensor: 'good2', value: 26, params: { age: 1, environment: {}, history: 0.93 } }
      ];

      const mean = extractor.fromMultipleSensors(readings, { aggregation: 'mean' });
      const median = extractor.fromMultipleSensors(readings, { aggregation: 'median' });
      const weighted = extractor.fromMultipleSensors(readings, { aggregation: 'weighted' });

      // Weighted should favor the high-accuracy sensors
      expect(weighted.value).toBeGreaterThan(mean.value);
      expect(median.value).toBeDifferent;
    });

    it('should decay confidence for old sensors', () => {
      const newSensor = extractor.fromSensor('reading', {
        age: 30, // 30 days
        environment: {},
        history: 0.9
      });

      const oldSensor = extractor.fromSensor('reading', {
        age: 3000, // ~8 years
        environment: {},
        history: 0.9
      });

      expect(newSensor.value).toBeGreaterThan(oldSensor.value);
    });
  });

  describe('APIConfidenceExtractor', () => {
    let extractor: APIConfidenceExtractor;

    beforeEach(() => {
      extractor = new APIConfidenceExtractor();
    });

    it('should calculate confidence from API reliability', () => {
      const result = extractor.fromAPIReliability({
        provider: 'openai',
        historicalAccuracy: 0.95,
        latency: 200 // 200ms
      });

      expect(result.value).toBeGreaterThan(0.9);
      expect(result.explanation).toContain('API confidence for openai');
    });

    it('should factor in provider reputation', () => {
      const knownProvider = extractor.fromAPIReliability({
        provider: 'anthropic',
        historicalAccuracy: 0.8
      });

      const unknownProvider = extractor.fromAPIReliability({
        provider: 'unknown-api',
        historicalAccuracy: 0.8
      });

      expect(knownProvider.value).toBeGreaterThan(unknownProvider.value);
    });

    it('should reduce confidence for recent failures', () => {
      const noFailures = extractor.fromAPIReliability({
        provider: 'test-api',
        historicalAccuracy: 0.9
      });

      const recentFailure = extractor.fromAPIReliability({
        provider: 'test-api',
        historicalAccuracy: 0.9,
        lastFailure: new Date() // Just failed
      });

      const oldFailure = extractor.fromAPIReliability({
        provider: 'test-api',
        historicalAccuracy: 0.9,
        lastFailure: new Date(Date.now() - 48 * 60 * 60 * 1000) // 2 days ago
      });

      expect(noFailures.value).toBeGreaterThan(recentFailure.value);
      expect(oldFailure.value).toBeGreaterThan(recentFailure.value);
    });

    it('should track API calls and update reliability', () => {
      // Track some calls
      extractor.trackAPICall('test-provider', true, 100);
      extractor.trackAPICall('test-provider', true, 150);
      extractor.trackAPICall('test-provider', false, 0);
      extractor.trackAPICall('test-provider', true, 200);

      const reliability = extractor.getProviderReliability('test-provider');
      
      expect(reliability.historicalAccuracy).toBeCloseTo(0.75, 2); // 3/4 success
      expect(reliability.latency).toBeCloseTo(150, 0); // Average of successful
      expect(reliability.lastFailure).toBeDefined();
    });

    it('should handle unknown providers', () => {
      const reliability = extractor.getProviderReliability('never-seen-before');
      
      expect(reliability.provider).toBe('never-seen-before');
      expect(reliability.historicalAccuracy).toBe(0.5); // Default uncertainty
      expect(reliability.latency).toBeUndefined();
      expect(reliability.lastFailure).toBeUndefined();
    });

    it('should factor in latency', () => {
      const fast = extractor.fromAPIReliability({
        provider: 'fast-api',
        historicalAccuracy: 0.8,
        latency: 50 // Very fast
      });

      const slow = extractor.fromAPIReliability({
        provider: 'slow-api',
        historicalAccuracy: 0.8,
        latency: 4000 // 4 seconds
      });

      expect(fast.value).toBeGreaterThan(slow.value);
    });
  });
});