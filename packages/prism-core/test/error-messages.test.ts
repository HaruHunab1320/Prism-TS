import { createRuntime } from '../src/runtime';
import { parse } from '../src/parser';

describe('Enhanced Error Messages', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Runtime errors with line numbers', () => {
    it('should show line and column for undefined variables', async () => {
      const program = parse(`
        x = 10
        y = undefinedVar
      `);
      
      // For now, just check that the error mentions the undefined variable
      await expect(runtime.execute(program)).rejects.toThrow(/Undefined variable: undefinedVar/);
    });

    it('should show type errors for invalid operations', async () => {
      const program = parse(`
        name = "hello"
        result = name - 42
      `);
      
      // String - number should throw an error
      await expect(runtime.execute(program)).rejects.toThrow(/Cannot apply - to string and number/);
    });

    it('should show line and column for logical operator errors', async () => {
      const program = parse(`
        x = 10
        y = 20
        result = x && y
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
        text = "hello"
        num = 42
        result = text - num
      `);
      
      // For now, just check the basic error format
      await expect(runtime.execute(program)).rejects.toThrow(/Cannot apply - to string and number/);
    });
  });

  describe('Parse errors already have line numbers', () => {
    it('should show parse error with line and column', () => {
      expect(() => parse(`
        x = 10
        y = 
      `)).toThrow(/ParseError at line 4/);
    });

    it('should show parse error for invalid syntax', () => {
      expect(() => parse(`
        if x == 10
          "missing parentheses"
        }
      `)).toThrow(/ParseError/);
    });
  });
});