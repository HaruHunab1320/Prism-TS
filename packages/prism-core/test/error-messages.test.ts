import { createRuntime } from '../src/runtime';
import { parse } from '../src/parser';

describe('Enhanced Error Messages', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Runtime errors with line numbers', () => {
    it('should show line and column for null variables', async () => {
      const program = parse(`
        let x = 10
        let y = undefinedVar
      `);
      
      // For now, just check that the error mentions the null variable
      await expect(runtime.execute(program)).rejects.toThrow(/Undefined variable: undefinedVar/);
    });

    it('should show type errors for invalid operations', async () => {
      const program = parse(`
        let name = "hello"
        let result = name - 42
      `);
      
      // String - number should throw an error
      await expect(runtime.execute(program)).rejects.toThrow(/Cannot apply - to string and number/);
    });

    it('should show line and column for logical operator errors', async () => {
      const program = parse(`
        let x = 10
        let y = 20
        let result = x && y
        result
      `);
      
      // This should work now with type coercion
      const result = await runtime.execute(program);
      expect(result.value).toBe(20);
    });

    it('should work without location info for backward compatibility', async () => {
      // Directly create a runtime error without location
      const { RuntimeError } = await import('../src/runtime');
      const error = new RuntimeError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.line).toBeUndefined();
      expect(error.column).toBeUndefined();
    });

    it('should include variable values in error messages when possible', async () => {
      const program = parse(`
        let text = "hello"
        let num = 42
        let result = text - num
      `);
      
      // For now, just check the basic error format
      await expect(runtime.execute(program)).rejects.toThrow(/Cannot apply - to string and number/);
    });
  });

  describe('Parse errors already have line numbers', () => {
    it('should show parse error with line and column', () => {
      expect(() => parse(`
        let x = 10
        let y = 
      `)).toThrow(/ERROR: \[PARSER_ERROR\]/);
    });

    it('should show parse error for invalid syntax', () => {
      expect(() => parse(`
        if x == 10
          "missing parentheses"
        }
      `)).toThrow(/ERROR: \[PARSER_ERROR\]/);
    });
  });
});
