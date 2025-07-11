import {
  ConfidenceValue,
  Confident,
  combineConfidence,
  ConfidenceThreshold,
  ConfidenceLevel,
  withConfidence,
  getConfidenceLevel,
} from '../src/confidence/types';

describe('Confidence System', () => {
  describe('ConfidenceValue', () => {
    it('should create valid confidence values', () => {
      const conf = new ConfidenceValue(0.8);
      expect(conf.value).toBe(0.8);
      expect(conf.level).toBe(ConfidenceLevel.HIGH);
    });

    it('should clamp values to valid range', () => {
      const low = new ConfidenceValue(-0.1);
      const high = new ConfidenceValue(1.1);
      
      expect(low.value).toBe(0.0);
      expect(high.value).toBe(1.0);
    });

    it('should determine confidence levels correctly', () => {
      expect(new ConfidenceValue(0.9).level).toBe(ConfidenceLevel.HIGH);
      expect(new ConfidenceValue(0.6).level).toBe(ConfidenceLevel.MEDIUM);
      expect(new ConfidenceValue(0.3).level).toBe(ConfidenceLevel.LOW);
    });

    it('should support comparison operations', () => {
      const conf1 = new ConfidenceValue(0.8);
      const conf2 = new ConfidenceValue(0.6);
      
      expect(conf1.greaterThan(conf2)).toBe(true);
      expect(conf2.greaterThan(conf1)).toBe(false);
      expect(conf1.greaterThanOrEqual(conf1)).toBe(true);
      expect(conf1.lessThan(conf2)).toBe(false);
    });

    it('should combine with other confidence values', () => {
      const conf1 = new ConfidenceValue(0.8);
      const conf2 = new ConfidenceValue(0.6);
      
      const min = conf1.min(conf2);
      const max = conf1.max(conf2);
      const avg = conf1.average(conf2);
      
      expect(min.value).toBe(0.6);
      expect(max.value).toBe(0.8);
      expect(avg.value).toBeCloseTo(0.7);
    });
  });

  describe('Confident trait', () => {
    class TestValue implements Confident<number> {
      constructor(public value: number, public confidence: ConfidenceValue) {}
      
      withConfidence(confidence: ConfidenceValue): TestValue {
        return new TestValue(this.value, confidence);
      }
    }

    it('should work with confident values', () => {
      const conf = new ConfidenceValue(0.8);
      const value = new TestValue(42, conf);
      
      expect(value.confidence.value).toBe(0.8);
      expect(value.value).toBe(42);
    });

    it('should allow confidence updates', () => {
      const original = new TestValue(42, new ConfidenceValue(0.6));
      const updated = original.withConfidence(new ConfidenceValue(0.9));
      
      expect(updated.confidence.value).toBe(0.9);
      expect(updated.value).toBe(42);
      expect(original.confidence.value).toBe(0.6); // original unchanged
    });
  });

  describe('Confidence operations', () => {
    it('should combine confidence values using different strategies', () => {
      const values = [
        new ConfidenceValue(0.8),
        new ConfidenceValue(0.6),
        new ConfidenceValue(0.9),
      ];
      
      const minResult = combineConfidence(values, 'min');
      const maxResult = combineConfidence(values, 'max');
      const avgResult = combineConfidence(values, 'average');
      const productResult = combineConfidence(values, 'product');
      
      expect(minResult.value).toBe(0.6);
      expect(maxResult.value).toBe(0.9);
      expect(avgResult.value).toBeCloseTo(0.767, 2);
      expect(productResult.value).toBeCloseTo(0.432, 2);
    });

    it('should handle empty arrays', () => {
      const result = combineConfidence([], 'average');
      expect(result.value).toBe(0.5); // default uncertainty
    });
  });

  describe('Thresholds and levels', () => {
    it('should classify confidence levels correctly', () => {
      expect(getConfidenceLevel(0.95)).toBe(ConfidenceLevel.HIGH);
      expect(getConfidenceLevel(0.75)).toBe(ConfidenceLevel.HIGH);
      expect(getConfidenceLevel(0.65)).toBe(ConfidenceLevel.MEDIUM);
      expect(getConfidenceLevel(0.55)).toBe(ConfidenceLevel.MEDIUM);
      expect(getConfidenceLevel(0.45)).toBe(ConfidenceLevel.LOW);
      expect(getConfidenceLevel(0.25)).toBe(ConfidenceLevel.LOW);
    });

    it('should work with custom thresholds', () => {
      const threshold = new ConfidenceThreshold({
        high: 0.9,
        medium: 0.7,
      });
      
      expect(threshold.classify(0.95)).toBe(ConfidenceLevel.HIGH);
      expect(threshold.classify(0.8)).toBe(ConfidenceLevel.MEDIUM);
      expect(threshold.classify(0.6)).toBe(ConfidenceLevel.LOW);
    });
  });

  describe('Utility functions', () => {
    it('should create confident wrappers', () => {
      const confidentValue = withConfidence(42, 0.8);
      
      expect(confidentValue.value).toBe(42);
      expect(confidentValue.confidence.value).toBe(0.8);
    });

    it('should propagate confidence through operations', () => {
      const val1 = withConfidence(10, 0.8);
      const val2 = withConfidence(20, 0.6);
      
      // Simulate arithmetic operation with confidence propagation
      const result = withConfidence(
        val1.value + val2.value,
        val1.confidence.min(val2.confidence).value
      );
      
      expect(result.value).toBe(30);
      expect(result.confidence.value).toBe(0.6); // minimum confidence
    });
  });

  describe('Error handling', () => {
    it('should handle invalid confidence values gracefully', () => {
      expect(() => new ConfidenceValue(NaN)).toThrow();
      expect(() => new ConfidenceValue(Infinity)).toThrow();
    });

    it('should provide meaningful error messages', () => {
      try {
        new ConfidenceValue(NaN);
      } catch (error) {
        expect((error as Error).message).toContain('Invalid confidence value');
      }
    });
  });
});