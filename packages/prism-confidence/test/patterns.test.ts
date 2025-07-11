import {
  ConfidenceBudgetManager,
  ConfidenceContractManager,
  DifferentialConfidenceManager,
  TemporalConfidence
} from '../src/patterns';

describe('Confidence Patterns', () => {
  describe('ConfidenceBudgetManager', () => {
    let budget: ConfidenceBudgetManager;

    beforeEach(() => {
      budget = new ConfidenceBudgetManager(2.5);
    });

    it('should track confidence budget', () => {
      expect(budget.met()).toBe(false);
      expect(budget.getRemaining()).toBe(2.5);
      
      budget.add('result1', 0.8);
      expect(budget.getTotal()).toBe(0.8);
      expect(budget.getRemaining()).toBe(1.7);
      
      budget.add('result2', 0.9);
      expect(budget.getTotal()).toBeCloseTo(1.7, 10);
      expect(budget.met()).toBe(false);
      
      budget.add('result3', 0.9);
      expect(budget.getTotal()).toBe(2.6);
      expect(budget.met()).toBe(true);
      expect(budget.getRemaining()).toBe(0);
    });

    it('should provide budget status', () => {
      budget.add('check1', 0.7);
      budget.add('check2', 0.8);
      
      const status = budget.getStatus();
      expect(status.met).toBe(false);
      expect(status.total).toBe(1.5);
      expect(status.required).toBe(2.5);
      expect(status.remaining).toBe(1.0);
      expect(status.items).toBe(2);
    });

    it('should clear budget', () => {
      budget.add('item', 1.0);
      expect(budget.getTotal()).toBe(1.0);
      
      budget.clear();
      expect(budget.getTotal()).toBe(0);
      expect(budget.getStatus().items).toBe(0);
    });
  });

  describe('ConfidenceContractManager', () => {
    let contract: ConfidenceContractManager;

    beforeEach(() => {
      contract = new ConfidenceContractManager({
        security_check: 0.9,
        performance_check: 0.7,
        style_check: 0.5
      });
    });

    it('should verify contract requirements', () => {
      const results = {
        security_check: { value: 'passed', confidence: 0.95 },
        performance_check: { value: 'passed', confidence: 0.8 },
        style_check: { value: 'passed', confidence: 0.6 }
      };

      const verification = contract.verify(results);
      expect(verification.passed).toBe(true);
      expect(verification.failures).toHaveLength(0);
    });

    it('should detect contract failures', () => {
      const results = {
        security_check: { value: 'passed', confidence: 0.85 }, // Below 0.9
        performance_check: { value: 'passed', confidence: 0.6 }, // Below 0.7
        style_check: { value: 'passed', confidence: 0.6 }
      };

      const verification = contract.verify(results);
      expect(verification.passed).toBe(false);
      expect(verification.failures).toHaveLength(2);
      expect(verification.failures[0].check).toBe('security_check');
      expect(verification.failures[0].required).toBe(0.9);
      expect(verification.failures[0].actual).toBe(0.85);
    });

    it('should handle missing results', () => {
      const results = {
        security_check: { value: 'passed', confidence: 0.95 }
        // Missing other checks
      };

      const verification = contract.verify(results);
      expect(verification.passed).toBe(false);
      expect(verification.failures).toHaveLength(2);
      expect(verification.failures.find(f => f.check === 'performance_check')?.actual).toBe(0);
    });

    it('should check individual requirements', () => {
      expect(contract.checkRequirement('security_check', 0.95)).toBe(true);
      expect(contract.checkRequirement('security_check', 0.85)).toBe(false);
      expect(contract.checkRequirement('unknown_check', 0.5)).toBe(true); // No requirement
    });

    it('should provide contract summary', () => {
      const summary = contract.getSummary();
      expect(summary).toContain('security_check: 90%');
      expect(summary).toContain('performance_check: 70%');
      expect(summary).toContain('style_check: 50%');
    });
  });

  describe('DifferentialConfidenceManager', () => {
    let differential: DifferentialConfidenceManager;

    beforeEach(() => {
      differential = new DifferentialConfidenceManager();
    });

    it('should manage multiple confidence aspects', () => {
      differential.setAspect('accuracy', 0.9);
      differential.setAspect('precision', 0.7);
      differential.setAspect('recall', 0.8);
      
      expect(differential.getAspect('accuracy')).toBe(0.9);
      expect(differential.getAspect('precision')).toBe(0.7);
      expect(differential.getAspect('unknown')).toBe(0);
    });

    it('should clamp confidence values', () => {
      differential.setAspect('test', 1.5);
      expect(differential.getAspect('test')).toBe(1.0);
      
      differential.setAspect('test', -0.5);
      expect(differential.getAspect('test')).toBe(0);
    });

    it('should find highest and lowest aspects', () => {
      differential.setAspect('high', 0.95);
      differential.setAspect('medium', 0.6);
      differential.setAspect('low', 0.3);
      
      const highest = differential.getHighest();
      expect(highest?.aspect).toBe('high');
      expect(highest?.confidence).toBe(0.95);
      
      const lowest = differential.getLowest();
      expect(lowest?.aspect).toBe('low');
      expect(lowest?.confidence).toBe(0.3);
    });

    it('should calculate average confidence', () => {
      differential.setAspect('a', 0.8);
      differential.setAspect('b', 0.6);
      differential.setAspect('c', 0.7);
      
      expect(differential.getAverage()).toBeCloseTo(0.7, 2);
    });

    it('should provide differential summary', () => {
      differential.setAspect('diagnosis', 0.9);
      differential.setAspect('treatment', 0.6);
      
      const summary = differential.getSummary();
      expect(summary).toContain('diagnosis: 90%');
      expect(summary).toContain('treatment: 60%');
    });

    it('should return all aspects', () => {
      differential.setAspect('x', 0.5);
      differential.setAspect('y', 0.7);
      
      const all = differential.getAllAspects();
      expect(all).toEqual({ x: 0.5, y: 0.7 });
    });
  });

  describe('TemporalConfidence', () => {
    it('should decay confidence over time', () => {
      const temporal = new TemporalConfidence(0.9, {
        halfLife: 1,
        unit: 'hours',
        timestamp: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      });
      
      const current = temporal.getCurrent();
      expect(current).toBeLessThan(0.9);
      expect(current).toBeGreaterThan(0.5);
      expect(current).toBeCloseTo(0.7, 1); // 0.9 * 0.5 + 0.5 * 0.5
    });

    it('should check staleness', () => {
      const fresh = new TemporalConfidence(0.9, {
        halfLife: 30,
        unit: 'days',
        timestamp: new Date()
      });
      
      expect(fresh.isStale()).toBe(false);
      expect(fresh.isStale(0.95)).toBe(true); // Below threshold
      
      const old = new TemporalConfidence(0.9, {
        halfLife: 1,
        unit: 'days',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      });
      
      expect(old.isStale(0.6)).toBe(true);
    });

    it('should explain decay', () => {
      const temporal = new TemporalConfidence(0.8, {
        halfLife: 2,
        unit: 'hours',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      });
      
      const explanation = temporal.getDecayExplanation();
      expect(explanation).toContain('Original: 80.0%');
      expect(explanation).toContain('Current:');
      expect(explanation).toContain('decay after 2.0 hours');
    });

    it('should handle different time units', () => {
      const now = new Date();
      
      const hours = new TemporalConfidence(0.9, { unit: 'hours', halfLife: 24 });
      expect(hours.getAge()).toBeLessThan(1);
      
      const days = new TemporalConfidence(0.9, { 
        unit: 'days', 
        halfLife: 7,
        timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      });
      expect(days.getAge()).toBeCloseTo(3, 1);
    });
  });
});