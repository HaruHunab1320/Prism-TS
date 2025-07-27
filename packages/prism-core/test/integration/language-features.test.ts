import { createRuntime } from '../../src/runtime';
import { parse } from '../../src/parser';
import { ConfidenceValue, NumberValue, StringValue, BooleanValue } from '../../src/runtime';

describe('Integration: Core Language Features', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('complex confidence propagation', () => {
    it('should handle confidence propagation through multiple operations', async () => {
      const program = parse(`
        // Set up confident values
        a = 10 ~> 0.9
        b = 20 ~> 0.1
        c = 30 ~> 0.8
        
        // Complex expression with mixed operations
        result = (a * b) + c
      `);
      
      const result = await runtime.execute(program);
      expect(result).toBeInstanceOf(ConfidenceValue);
      expect((result as ConfidenceValue).value.value).toBe(230); // (10 * 20) + 30
    });

    it('should maintain confidence through variable assignments', async () => {
      const program = parse(`
        data_quality = 0.8
        measurement = 100
        processed = (measurement * 2) ~> data_quality
        
        // Use the confident value in further calculations
        final = processed + 50
      `);
      
      const result = await runtime.execute(program);
      expect(result).toBeInstanceOf(ConfidenceValue);
      expect((result as ConfidenceValue).value.value).toBe(250); // 200 + 50
    });
  });

  describe('edge cases and boundaries', () => {
    it('should handle extreme confidence values', async () => {
      const program = parse(`
        max_conf = 100 ~> 1.0
        min_conf = 50 ~> 0.0
        very_low = 75 ~> 0.001
        very_high = 25 ~> 0.999
        
        // Array to collect all values
        [max_conf, min_conf, very_low, very_high]
      `);
      
      const result = await runtime.execute(program);
      expect(result.value).toHaveLength(4);
    });

    it('should handle deeply nested operations', async () => {
      const program = parse(`
        result = ((((10 + 5) * 2) - 3) / 4)
      `);
      
      const result = await runtime.execute(program);
      expect(result).toBeInstanceOf(NumberValue);
      expect(result.value).toBe(6.75); // ((15 * 2) - 3) / 4 = 27 / 4
    });

    it('should handle long variable names and strings', async () => {
      const program = parse(`
        very_long_variable_name_that_tests_parser_limits = 42
        long_string = "This is a very long string that tests how well the parser and runtime handle extended text content!"
        
        result = very_long_variable_name_that_tests_parser_limits
      `);
      
      const result = await runtime.execute(program);
      expect(result).toBeInstanceOf(NumberValue);
      expect(result.value).toBe(42);
    });
  });

  describe('uncertain control flow boundaries', () => {
    it('should handle uncertain if at exact thresholds', async () => {
      const program = parse(`
        // Test at exact high threshold (0.7)
        val1 = 1 ~> 0.70
        result1 = 0
        
        uncertain if (val1) {
          high { result1 = 1 }
          medium { result1 = 2 }
          low { result1 = 3 }
        }
        
        result1
      `);
      
      const result = await runtime.execute(program);
      expect(result).toBeInstanceOf(NumberValue);
      expect(result.value).toBe(1); // Should execute high branch at threshold
    });

    it('should handle uncertain if just below thresholds', async () => {
      const program = parse(`
        // Just below high threshold
        val2 = 1 ~> 0.69
        result2 = 0
        
        uncertain if (val2) {
          high { result2 = 1 }
          medium { result2 = 2 }
          low { result2 = 3 }
        }
        
        result2
      `);
      
      const result = await runtime.execute(program);
      expect(result).toBeInstanceOf(NumberValue);
      expect(result.value).toBe(2); // Should execute medium branch
    });
  });


  describe('error recovery', () => {
    it('should continue after runtime errors', async () => {
      // First cause an error
      try {
        await runtime.execute(parse('undefined_var + 1'));
      } catch (e) {
        // Expected error
      }
      
      // Should still be able to execute valid code
      const result = await runtime.execute(parse('3 + 3'));
      expect(result).toBeInstanceOf(NumberValue);
      expect(result.value).toBe(6);
    });

    it('should handle division by zero gracefully', async () => {
      await expect(
        runtime.execute(parse('10 / 0'))
      ).rejects.toThrow();
      
      // Runtime should still be functional
      const result = await runtime.execute(parse('5 + 5'));
      expect(result).toBeInstanceOf(NumberValue);
      expect(result.value).toBe(10);
    });
  });

  describe('complex boolean logic', () => {
    it('should evaluate complex boolean expressions correctly', async () => {
      const program = parse(`
        complex_bool = true && (false || true) && !false
        comparison = (10 > 5) && (20 < 30) && (15 == 15)
        
        complex_bool && comparison
      `);
      
      const result = await runtime.execute(program);
      expect(result).toBeInstanceOf(BooleanValue);
      expect(result.value).toBe(true);
    });
  });

  describe('confidence operator combinations', () => {
    it('should handle chained confidence operations', async () => {
      const program = parse(`
        // Start with confident values
        step1 = 10 ~> 0.9
        step2 = 20 ~> 0.8
        step3 = 30 ~> 0.7
        
        // Chain multiple confidence operations
        result = step1 ~+ step2 ~* step3
      `);
      
      const result = await runtime.execute(program);
      expect(result).toBeInstanceOf(ConfidenceValue);
      expect(result.value.value).toBe(610); // 10 + (20 * 30)
      expect(result.confidence.value).toBe(0.7); // min confidence
    });

    it('should handle mixed confident and regular operations', async () => {
      const program = parse(`
        confident = 50 ~> 0.8
        regular = 25
        
        // Mix confident and regular operations
        result1 = confident + regular  // Regular addition
        
        result1
      `);
      
      const result = await runtime.execute(program);
      expect(result).toBeInstanceOf(ConfidenceValue);
      expect((result as ConfidenceValue).value.value).toBe(75); // 50 + 25
    });
  });
});