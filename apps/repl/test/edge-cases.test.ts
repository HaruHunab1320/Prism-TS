import { PrismREPL } from '../src/repl';
import { MockLLMProvider } from '@prism/llm';

describe('REPL Edge Cases', () => {
  let repl: PrismREPL;
  let mockProvider: MockLLMProvider;

  beforeEach(() => {
    repl = new PrismREPL();
    mockProvider = new MockLLMProvider();
    mockProvider.setMockResponse('Edge case response from AI system', 0.75);
    repl.registerLLMProvider('mock', mockProvider);
    repl.setDefaultLLMProvider('mock');
  });

  describe('extreme confidence values', () => {
    it('should handle maximum confidence (1.0)', async () => {
      const result = await repl.evaluate('100 ~> 1.0');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('100');
        expect(result.value).toContain('100.0%');
      }
    });

    it('should handle minimum confidence (0.0)', async () => {
      const result = await repl.evaluate('50 ~> 0.0');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('50');
        expect(result.value).toContain('0.0%');
      }
    });

    it('should handle very low confidence', async () => {
      const result = await repl.evaluate('75 ~> 0.001');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('75');
        expect(result.value).toContain('0.1%');
      }
    });

    it('should handle very high confidence', async () => {
      const result = await repl.evaluate('25 ~> 0.999');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('25');
        expect(result.value).toContain('99.9%');
      }
    });
  });

  describe('division edge cases', () => {
    it('should handle normal division', async () => {
      const result = await repl.evaluate('10 / 2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('5');
      }
    });

    it('should handle floating point division', async () => {
      const result = await repl.evaluate('1 / 3');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(parseFloat(result.value)).toBeCloseTo(0.333333, 5);
      }
    });

    it('should error on division by zero', async () => {
      const result = await repl.evaluate('7 / 0');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Division by zero');
      }
    });
  });

  describe('complex confidence propagation', () => {
    it('should handle triple confidence propagation', async () => {
      await repl.evaluate('a = 10 ~> 0.9');
      await repl.evaluate('b = 20 ~> 0.1');
      await repl.evaluate('c = 30 ~> 0.8');
      
      const result = await repl.evaluate('a + b + c');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('60 (~10.0%)');
      }
    });

    it('should handle mixed operations with confidence', async () => {
      await repl.evaluate('a = 10 ~> 0.9');
      await repl.evaluate('b = 20 ~> 0.1');
      await repl.evaluate('c = 30 ~> 0.8');
      
      const result = await repl.evaluate('(a * b) + c');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('230 (~10.0%)');
      }
    });

    it('should handle parentheses with confidence', async () => {
      await repl.evaluate('a = 10 ~> 0.9');
      await repl.evaluate('b = 20 ~> 0.1');
      await repl.evaluate('c = 30 ~> 0.8');
      
      const result = await repl.evaluate('a * (b + c)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('500 (~10.0%)');
      }
    });
  });

  describe('boundary testing for uncertain if', () => {
    it('should handle value at high threshold', async () => {
      await repl.evaluate('val1 = 1 ~> 0.70');
      const result = await repl.evaluate(`
        result1 = 0
        uncertain if (val1 ~> 0.7) {
          high { result1 = 1 }
          medium { result1 = 2 }
          low { result1 = 3 }
        }
        result1
      `);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('1');
      }
    });

    it('should handle value below high threshold', async () => {
      await repl.evaluate('val2 = 1 ~> 0.69');
      const result = await repl.evaluate(`
        result2 = 0
        uncertain if (val2) {
          high { result2 = 1 }
          medium { result2 = 2 }
          low { result2 = 3 }
        }
        result2
      `);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('2'); // 0.69 is in medium range (< 0.7)
      }
    });
  });

  describe('string edge cases', () => {
    it('should handle empty string', async () => {
      const result = await repl.evaluate('empty_string = ""');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('');
      }
    });

    it('should handle space-only string', async () => {
      const result = await repl.evaluate('space_string = " "');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(' ');
      }
    });

    it('should handle special characters', async () => {
      const result = await repl.evaluate('special = "!@#$%^&*()"');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('!@#$%^&*()');
      }
    });
  });

  describe('error recovery', () => {
    it('should recover from syntax errors', async () => {
      // First, cause a syntax error
      const errorResult = await repl.evaluate('bad syntax here');
      expect(errorResult.success).toBe(false);
      
      // Should still be able to evaluate valid expressions
      const validResult = await repl.evaluate('2 + 2');
      expect(validResult.success).toBe(true);
      if (validResult.success) {
        expect(validResult.value).toBe('4');
      }
    });

    it('should recover from runtime errors', async () => {
      // First, cause a runtime error
      const errorResult = await repl.evaluate('undefined_var + 1');
      expect(errorResult.success).toBe(false);
      
      // Should still be able to evaluate valid expressions
      const validResult = await repl.evaluate('3 + 3');
      expect(validResult.success).toBe(true);
      if (validResult.success) {
        expect(validResult.value).toBe('6');
      }
    });
  });

  describe('complex expressions', () => {
    it('should handle deeply nested parentheses', async () => {
      const result = await repl.evaluate('((((10 + 5) * 2) - 3) / 4)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('6.75');
      }
    });

    it('should handle complex boolean logic', async () => {
      const result = await repl.evaluate('true && (false || true) && !false');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('true');
      }
    });

    it('should handle multiple comparisons', async () => {
      const result = await repl.evaluate('(10 > 5) && (20 < 30) && (15 == 15)');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('true');
      }
    });
  });

  describe('LLM integration', () => {
    it('should handle multiple LLM calls', async () => {
      const result1 = await repl.evaluate('llm1 = llm("First call")');
      expect(result1.success).toBe(true);
      
      const result2 = await repl.evaluate('llm2 = llm("Second call")');
      expect(result2.success).toBe(true);
      
      const result3 = await repl.evaluate('llm3 = llm("Third call")');
      expect(result3.success).toBe(true);
    });
  });

  describe('variable chaining', () => {
    it('should handle variable dependency chains', async () => {
      await repl.evaluate('chain1 = 10');
      await repl.evaluate('chain2 = chain1 + 5');
      await repl.evaluate('chain3 = chain2 * 2');
      await repl.evaluate('chain4 = chain3 ~> 0.95');
      
      const result = await repl.evaluate('final_chain = chain4 + chain1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('40 (~95.0%)'); // 30 + 10
      }
    });
  });

  describe('context scoping', () => {
    it('should maintain global variables after context', async () => {
      await repl.evaluate('global_var = 100');
      await repl.evaluate('in context TestScope { local_var = 200 }');
      
      const result = await repl.evaluate('global_var');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('100');
      }
    });
  });

  describe('session statistics', () => {
    it('should track evaluation statistics', async () => {
      // Perform some evaluations
      await repl.evaluate('1 + 1');
      await repl.evaluate('2 + 2');
      await repl.evaluate('bad syntax'); // This should fail
      await repl.evaluate('3 + 3');
      
      const stats = repl.getSessionStats();
      expect(stats.totalEvaluations).toBe(4);
      expect(stats.successfulEvaluations).toBe(3);
      expect(stats.errors).toBe(1);
    });
  });
});