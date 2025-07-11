import { ConfidenceEnsemble } from '../src/ensemble';

describe('ConfidenceEnsemble', () => {
  let ensemble: ConfidenceEnsemble;

  beforeEach(() => {
    ensemble = new ConfidenceEnsemble();
  });

  describe('Basic combination', () => {
    it('should combine multiple confidence signals with equal weights', () => {
      const signals = {
        source1: 0.8,
        source2: 0.6,
        source3: 0.7
      };

      const result = ensemble.combine(signals);
      
      expect(result.value).toBeCloseTo(0.7, 2); // Average
      expect(result.explanation).toContain('3 sources');
      expect(result.provenance?.sources).toHaveLength(3);
    });

    it('should apply custom weights', () => {
      ensemble = new ConfidenceEnsemble({
        weights: {
          important: 0.7,
          secondary: 0.2,
          minor: 0.1
        }
      });

      const signals = {
        important: 0.9,
        secondary: 0.5,
        minor: 0.3
      };

      const result = ensemble.combine(signals);
      
      // 0.9 * 0.7 + 0.5 * 0.2 + 0.3 * 0.1 = 0.63 + 0.1 + 0.03 = 0.76
      expect(result.value).toBeCloseTo(0.76, 2);
    });

    it('should normalize weights if requested', () => {
      ensemble = new ConfidenceEnsemble({
        weights: { a: 2, b: 3, c: 5 },
        normalizeWeights: true
      });

      const signals = { a: 1.0, b: 1.0, c: 1.0 };
      const result = ensemble.combine(signals);
      
      // All 1.0 values should still average to 1.0 regardless of weights
      expect(result.value).toBe(1.0);
    });
  });

  describe('Voting ensemble', () => {
    it('should use voting to determine confidence', () => {
      const signals = {
        high1: 0.8,
        high2: 0.9,
        medium: 0.5,
        low: 0.2
      };

      const result = ensemble.vote(signals);
      
      expect(result.value).toBeGreaterThan(0.7); // High confidence wins
      expect(result.explanation).toContain('2/4 high');
    });

    it('should use custom thresholds for voting', () => {
      const signals = {
        val1: 0.6,
        val2: 0.65,
        val3: 0.55
      };

      const result = ensemble.vote(signals, { high: 0.8, medium: 0.5 });
      
      // All values are in medium range
      expect(result.value).toBeCloseTo(0.65, 1); // (0.8 + 0.5) / 2
      expect(result.explanation).toContain('3/3 medium');
    });
  });

  describe('Weighted median', () => {
    it('should calculate weighted median', () => {
      const signals = {
        low: 0.3,
        medium: 0.6,
        high: 0.9
      };

      const result = ensemble.weightedMedian(signals);
      
      expect(result.value).toBe(0.6); // Middle value
      expect(result.explanation).toContain('Weighted median');
    });

    it('should respect weights in median calculation', () => {
      ensemble = new ConfidenceEnsemble({
        weights: {
          outlier: 0.1,
          normal1: 0.4,
          normal2: 0.5
        }
      });

      const signals = {
        outlier: 0.1,
        normal1: 0.7,
        normal2: 0.8
      };

      const result = ensemble.weightedMedian(signals);
      
      // Should lean towards the higher weighted values
      expect(result.value).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('Custom aggregation', () => {
    it('should support custom aggregation functions', () => {
      const signals = { a: 0.2, b: 0.4, c: 0.6, d: 0.8 };
      
      // Custom aggregator: harmonic mean
      const harmonicMean = (values: number[], weights: number[]) => {
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (let i = 0; i < values.length; i++) {
          if (values[i] > 0) {
            weightedSum += weights[i] / values[i];
            totalWeight += weights[i];
          }
        }
        
        return totalWeight / weightedSum;
      };

      const result = ensemble.combineWithFunction(signals, harmonicMean);
      
      expect(result.value).toBeLessThan(0.5); // Harmonic mean is lower than arithmetic
      expect(result.explanation).toContain('Custom ensemble');
    });
  });

  describe('Weight updates', () => {
    it('should update weights based on performance', () => {
      ensemble = new ConfidenceEnsemble({
        weights: { model1: 1, model2: 1 }
      });

      // Update based on accuracy
      ensemble.updateWeights({
        model1: 0.9, // 90% accurate
        model2: 0.6  // 60% accurate
      });

      const signals = { model1: 0.8, model2: 0.8 };
      const result = ensemble.combine(signals);
      
      // model1 should have more influence
      expect(result.value).toBe(0.8); // Still 0.8 but model1 has more weight
      expect(result.provenance?.sources[0].contribution).toBeGreaterThan(
        result.provenance?.sources[1].contribution || 0
      );
    });
  });

  describe('Provenance tracking', () => {
    it('should track contribution of each source', () => {
      ensemble = new ConfidenceEnsemble({
        weights: { primary: 0.6, secondary: 0.4 }
      });

      const signals = { primary: 0.9, secondary: 0.5 };
      const result = ensemble.combine(signals);
      
      expect(result.provenance).toBeDefined();
      expect(result.provenance!.sources).toHaveLength(2);
      
      const primarySource = result.provenance!.sources.find(s => s.reason === 'primary signal');
      expect(primarySource?.contribution).toBeCloseTo(0.6, 2);
      expect(primarySource?.raw_value).toBe(0.9);
    });
  });
});