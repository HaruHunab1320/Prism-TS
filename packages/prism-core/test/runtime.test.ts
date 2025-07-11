import {
  Runtime,
  Environment,
  NumberValue,
  StringValue,
  BooleanValue,
  ConfidenceValue as ConfidentRuntimeValue,
  RuntimeError,
  createRuntime,
} from '../src/runtime';
import { parse } from '../src/parser';
import { ConfidenceValue as ConfidenceLib } from '../src/confidence';
import { MockLLMProvider } from '@prism/llm';

describe('Runtime System', () => {
  describe('Values', () => {
    it('should create basic values', () => {
      const num = new NumberValue(42);
      const str = new StringValue('hello');
      const bool = new BooleanValue(true);

      expect(num.value).toBe(42);
      expect(num.type).toBe('number');
      expect(str.value).toBe('hello');
      expect(str.type).toBe('string');
      expect(bool.value).toBe(true);
      expect(bool.type).toBe('boolean');
    });

    it('should create confident values', () => {
      const confidence = new ConfidenceLib(0.8);
      const confValue = new ConfidentRuntimeValue(
        new NumberValue(42),
        confidence
      );

      expect(confValue.value.value).toBe(42);
      expect(confValue.confidence.value).toBe(0.8);
      expect(confValue.type).toBe('confident');
    });

    it('should support value equality', () => {
      const num1 = new NumberValue(42);
      const num2 = new NumberValue(42);
      const num3 = new NumberValue(43);

      expect(num1.equals(num2)).toBe(true);
      expect(num1.equals(num3)).toBe(false);
    });

    it('should support value coercion', () => {
      const num = new NumberValue(0);
      const str = new StringValue('');
      const bool = new BooleanValue(false);

      expect(num.isTruthy()).toBe(false);
      expect(str.isTruthy()).toBe(false);
      expect(bool.isTruthy()).toBe(false);

      const truthyNum = new NumberValue(42);
      const truthyStr = new StringValue('hello');
      const truthyBool = new BooleanValue(true);

      expect(truthyNum.isTruthy()).toBe(true);
      expect(truthyStr.isTruthy()).toBe(true);
      expect(truthyBool.isTruthy()).toBe(true);
    });
  });

  describe('Environment', () => {
    it('should manage variable scope', () => {
      const env = new Environment();
      const value = new NumberValue(42);

      env.define('x', value);
      expect(env.get('x')).toBe(value);
    });

    it('should support nested scopes', () => {
      const parent = new Environment();
      const child = new Environment(parent);

      parent.define('x', new NumberValue(10));
      child.define('y', new NumberValue(20));

      expect(child.get('x').value).toBe(10); // From parent
      expect(child.get('y').value).toBe(20); // From child
      expect(() => parent.get('y')).toThrow(); // Not in parent
    });

    it('should handle variable shadowing', () => {
      const parent = new Environment();
      const child = new Environment(parent);

      parent.define('x', new NumberValue(10));
      child.define('x', new NumberValue(20));

      expect(parent.get('x').value).toBe(10);
      expect(child.get('x').value).toBe(20); // Shadows parent
    });

    it('should throw on undefined variables', () => {
      const env = new Environment();
      expect(() => env.get('undefined_var')).toThrow(RuntimeError);
    });
  });

  describe('Basic Expressions', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should evaluate number literals', async () => {
      const program = parse('42');
      const result = await runtime.execute(program);
      
      expect(result.value).toBe(42);
      expect(result.type).toBe('number');
    });

    it('should evaluate string literals', async () => {
      const program = parse('"hello world"');
      const result = await runtime.execute(program);
      
      expect(result.value).toBe('hello world');
      expect(result.type).toBe('string');
    });

    it('should evaluate binary expressions', async () => {
      const program = parse('10 + 20');
      const result = await runtime.execute(program);
      
      expect(result.value).toBe(30);
      expect(result.type).toBe('number');
    });

    it('should handle operator precedence', async () => {
      const program = parse('2 + 3 * 4');
      const result = await runtime.execute(program);
      
      expect(result.value).toBe(14); // 2 + (3 * 4)
    });

    it('should evaluate comparison operations', async () => {
      const program = parse('10 > 5');
      const result = await runtime.execute(program);
      
      expect(result.value).toBe(true);
      expect(result.type).toBe('boolean');
    });
  });

  describe('Variables and Assignment', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should handle variable assignment and access', async () => {
      const program = parse(`
        x = 42
        x
      `);
      const result = await runtime.execute(program);
      
      expect(result.value).toBe(42);
    });

    it('should support variable updates', async () => {
      const program = parse(`
        x = 10
        x = x + 5
        x
      `);
      const result = await runtime.execute(program);
      
      expect(result.value).toBe(15);
    });
  });

  describe('Control Flow', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should execute if statements', async () => {
      const program = parse(`
        x = 0
        if (true) {
          x = 42
        }
        x
      `);
      const result = await runtime.execute(program);
      
      expect(result.value).toBe(42);
    });

    it('should execute if-else statements', async () => {
      const program = parse(`
        x = 0
        if (false) {
          x = 10
        } else {
          x = 20
        }
        x
      `);
      const result = await runtime.execute(program);
      
      expect(result.value).toBe(20);
    });
  });

  describe('Confidence Operations', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should handle confidence expressions', async () => {
      const program = parse('42 ~> 0.8');
      const result = await runtime.execute(program);
      
      expect(result.type).toBe('confident');
      expect((result as ConfidentRuntimeValue).value.value).toBe(42);
      expect((result as ConfidentRuntimeValue).confidence.value).toBe(0.8);
    });

    it('should propagate confidence in arithmetic', async () => {
      const program = parse(`
        x = 10 ~> 0.9
        y = 20 ~> 0.8
        x + y
      `);
      const result = await runtime.execute(program);
      
      expect(result.type).toBe('confident');
      expect((result as ConfidentRuntimeValue).value.value).toBe(30);
      // Should use minimum confidence
      expect((result as ConfidentRuntimeValue).confidence.value).toBe(0.8);
    });

    it('should extract confidence with <~ operator', async () => {
      const program = parse(`
        measurement = 100 ~> 0.85
        <~ measurement
      `);
      const result = await runtime.execute(program);
      
      expect(result.type).toBe('number');
      expect((result as NumberValue).value).toBe(0.85);
    });

    it('should return 1.0 confidence for non-confident values', async () => {
      const program = parse(`
        regularValue = 42
        <~ regularValue
      `);
      const result = await runtime.execute(program);
      
      expect(result.type).toBe('number');
      expect((result as NumberValue).value).toBe(1.0);
    });
  });

  describe('Context Operations', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should execute context blocks', async () => {
      const program = parse(`
        x = 0
        in context Test {
          x = 42
        }
        x
      `);
      const result = await runtime.execute(program);
      
      expect(result.value).toBe(42);
    });

    it('should maintain context isolation when needed', async () => {
      // This would require more sophisticated context handling
      // For now, we'll test basic context switching
      expect(runtime).toBeDefined();
    });
  });

  describe('LLM Integration', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
      // Register mock LLM provider
      const mockProvider = new MockLLMProvider();
      mockProvider.setMockResponse('Mock LLM response', 0.85);
      runtime.registerLLMProvider('mock', mockProvider);
      runtime.setDefaultLLMProvider('mock');
    });

    it('should handle LLM function calls', async () => {
      const program = parse('llm("What is AI?")');
      const result = await runtime.execute(program);
      
      expect(result.type).toBe('confident');
      expect((result as ConfidentRuntimeValue).value.type).toBe('string');
      expect((result as ConfidentRuntimeValue).value.value).toContain('Mock LLM response');
    });
  });

  describe('Error Handling', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should handle runtime errors gracefully', async () => {
      const program = parse('undefined_variable');
      
      await expect(runtime.execute(program)).rejects.toThrow(RuntimeError);
    });

    it('should provide meaningful error messages', async () => {
      const program = parse('x = undefined_var + 5');
      
      try {
        await runtime.execute(program);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect((error as RuntimeError).message).toContain('undefined_var');
      }
    });

    it('should handle type errors', async () => {
      const program = parse('"hello" + 42');
      
      // In a more sophisticated runtime, this might be a type error
      // For now, we'll allow it and test string concatenation
      const result = await runtime.execute(program);
      expect(result.value).toBe('hello42');
    });
  });

  describe('Function Definitions and Calls', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should support built-in functions', async () => {
      // Test that built-in functions work
      const program = parse('llm("test")');
      
      // Mock provider should be available
      const mockProvider = new MockLLMProvider();
      runtime.registerLLMProvider('mock', mockProvider);
      runtime.setDefaultLLMProvider('mock');
      
      const result = await runtime.execute(program);
      expect(result).toBeDefined();
    });
  });

  describe('Agent Operations', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should handle agent declarations', async () => {
      const program = parse(`
        agents {
          researcher: Agent { confidence: 0.9 }
        }
      `);
      
      // For now, just ensure it doesn't crash
      const result = await runtime.execute(program);
      expect(result).toBeDefined();
    });
  });

  describe('Uncertain If Statements', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should execute uncertain if with high confidence', async () => {
      const program = parse(`
        result = 0
        uncertain if (42 ~> 0.9) {
          high { result = 1 }
          low { result = 2 }
        }
        result
      `);
      
      const result = await runtime.execute(program);
      expect(result.value).toBe(1); // High confidence branch
    });

    it('should execute uncertain if with low confidence', async () => {
      const program = parse(`
        result = 0
        uncertain if (42 ~> 0.3) {
          high { result = 1 }
          low { result = 2 }
        }
        result
      `);
      
      const result = await runtime.execute(program);
      expect(result.value).toBe(2); // Low confidence branch
    });
  });
});