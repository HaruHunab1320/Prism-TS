import { createRuntime } from '../src/runtime';
import { parse } from '../src/parser';

describe('Try/Catch/Finally', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Basic try/catch', () => {
    it('should catch runtime errors', async () => {
      const program = parse(`
        let result
        try {
          result = 10 / 0
        } catch (e) {
          result = "Error: " + e
        }
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe('Error: Division by zero');
    });

    it('should execute try block when no error', async () => {
      const program = parse(`
        let result
        try {
          result = 10 / 2
        } catch (e) {
          result = "Error"
        }
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(5);
    });

    it('should work without error variable', async () => {
      const program = parse(`
        let result
        try {
          result = 10 / 0
        } catch {
          result = "An error occurred"
        }
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe('An error occurred');
    });
  });

  describe('Finally block', () => {
    it('should execute finally after try', async () => {
      const program = parse(`
        let messages = []
        try {
          messages = messages.push("try")
        } finally {
          messages = messages.push("finally")
        }
        messages
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('[try, finally]');
    });

    it('should execute finally after catch', async () => {
      const program = parse(`
        let messages = []
        try {
          messages = messages.push("try")
          let x = 10 / 0
        } catch {
          messages = messages.push("catch")
        } finally {
          messages = messages.push("finally")
        }
        messages
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('[try, catch, finally]');
    });

    it('should execute finally even without catch', async () => {
      const program = parse(`
        let cleanup = false
        try {
          cleanup = true
        } finally {
          cleanup = false
        }
        cleanup
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(false);
    });
  });

  describe('Nested try/catch', () => {
    it('should handle nested try/catch blocks', async () => {
      const program = parse(`
        let messages = []
        try {
          messages = messages.push("outer try")
          try {
            messages = messages.push("inner try")
            let x = 10 / 0
          } catch (innerError) {
            messages = messages.push("inner catch: " + innerError)
          }
          messages = messages.push("outer try continues")
        } catch (outerError) {
          messages = messages.push("outer catch: " + outerError)
        }
        messages
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('inner catch');
      expect(result.toString()).toContain('outer try continues');
    });
  });

  describe('Error propagation', () => {
    it('should re-throw when no catch block', async () => {
      const program = parse(`
        try {
          let x = 10 / 0
        } finally {
          // No catch, error should propagate
        }
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Division by zero');
    });

    it('should handle different error types', async () => {
      const program = parse(`
        let results = []
        
        // Division by zero
        try {
          let x = 10 / 0
        } catch (e) {
          results = results.push(e)
        }
        
        // Undefined variable
        try {
          let y = undefinedVar
        } catch (e) {
          results = results.push(e)
        }
        
        // Array index out of bounds  
        try {
          let arr = [1, 2, 3]
          let val = arr[10]
        } catch (e) {
          results = results.push(e)
        }
        
        results
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('Division by zero');
      expect(result.toString()).toContain('Undefined variable');
    });
  });
});
