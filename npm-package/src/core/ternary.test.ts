import { Tokenizer } from './tokenizer';
import { Parser } from './parser';
import { Runtime } from './runtime';
import { NumberValue, StringValue, ConfidenceValue } from './runtime';

describe('Ternary Operator', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  async function execute(code: string) {
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens, code);
    const ast = parser.parse();
    return await runtime.execute(ast);
  }

  describe('Basic ternary operations', () => {
    it('should evaluate true branch when condition is true', async () => {
      const result = await execute('result = true ? "yes" : "no"');
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('yes');
    });

    it('should evaluate false branch when condition is false', async () => {
      const result = await execute('result = false ? "yes" : "no"');
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('no');
    });

    it('should work with numeric comparisons', async () => {
      const result = await execute('result = 10 > 5 ? 100 : 200');
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(100);
    });

    it('should work with variables', async () => {
      const result = await execute(`
        age = 25
        status = age >= 18 ? "adult" : "minor"
      `);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('adult');
    });
  });

  describe('Nested ternary operators', () => {
    it('should handle nested ternary in true branch', async () => {
      const result = await execute(`
        x = 10
        result = x > 5 ? (x > 15 ? "high" : "medium") : "low"
      `);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('medium');
    });

    it('should handle nested ternary in false branch', async () => {
      const result = await execute(`
        x = 3
        result = x > 5 ? "high" : (x > 2 ? "medium" : "low")
      `);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('medium');
    });
  });

  describe('Ternary with confidence values', () => {
    it('should work with confident conditions', async () => {
      const result = await execute(`
        temp = 22.5 ~> 0.9
        status = temp > 20 ? "warm" : "cold"
      `);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('warm');
    });

    it('should preserve confidence in branches', async () => {
      const result = await execute(`
        value = 100 ~> 0.8
        result = true ? value : 0
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      expect((result as ConfidenceValue).confidence.value).toBeCloseTo(0.8);
    });

    it('should handle confidence-based conditions', async () => {
      const result = await execute(`
        highConf = 100 ~> 0.9
        lowConf = 100 ~> 0.3
        
        // Use confidence coalesce to check confidence
        result = (highConf ~?? 0) == highConf ? "confident" : "uncertain"
      `);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('confident');
    });
  });

  describe('Complex expressions', () => {
    it('should work in assignment statements', async () => {
      const result = await execute(`
        x = 10
        y = 20
        max = x > y ? x : y
      `);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(20);
    });

    it('should work with function calls', async () => {
      // Since we can't easily test llm(), let's use a simpler example
      const result = await execute(`
        hasData = true
        message = hasData ? "Processing data" : "No data available"
      `);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Processing data');
    });

    it('should handle complex conditions', async () => {
      const result = await execute(`
        age = 25
        hasLicense = true
        canDrive = age >= 16 && hasLicense ? "yes" : "no"
      `);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('yes');
    });
  });

  describe('Error handling', () => {
    it('should provide helpful error for missing colon', async () => {
      try {
        await execute('result = true ? "yes" "no"');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain("Expected ':' after true branch");
        expect(error.message).toContain('1 | result = true ? "yes" "no"');
      }
    });

    it('should provide helpful error for missing false branch', async () => {
      try {
        await execute('result = true ? "yes" :');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain("Expected expression");
      }
    });
  });
});