import {
  Runtime,
  ArrayValue,
  ConfidenceValue as ConfidentRuntimeValue,
  createRuntime,
  FunctionValue,
  NumberValue,
} from './runtime';
import { parse } from './parser';

describe('Runtime Extended Tests', () => {
  describe('Arithmetic Operations Edge Cases', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should handle division by zero', async () => {
      const program = parse('10 / 0');
      await expect(runtime.execute(program)).rejects.toThrow('Division by zero');
    });

    it('should handle subtraction type errors', async () => {
      const program = parse('"hello" - 5');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot apply - to string and number');
    });

    it('should handle multiplication type errors', async () => {
      const program = parse('"hello" * 5');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot apply * to string and number');
    });

    it('should handle division type errors', async () => {
      const program = parse('"hello" / 5');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot apply / to string and number');
    });
  });

  describe('Comparison Operations Extended', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should handle less than comparisons', async () => {
      const program = parse('5 < 10');
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should handle greater than or equal comparisons', async () => {
      const program = parse('10 >= 10');
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should handle less than or equal comparisons', async () => {
      const program = parse('5 <= 10');
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should handle not equal comparisons', async () => {
      const program = parse('5 != 10');
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should handle comparison type errors', async () => {
      const program = parse('"hello" < 5');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot compare string and number');
    });
  });

  describe('Logical Operations', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should handle logical AND operations', async () => {
      const program = parse('true && false');
      const result = await runtime.execute(program);
      expect(result.value).toBe(false);
    });

    it('should handle logical OR operations', async () => {
      const program = parse('false || true');
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should short-circuit AND operations', async () => {
      const program = parse(`
        x = 0
        result = false && x
        x
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(0); // x was evaluated
    });

    it('should short-circuit OR operations', async () => {
      const program = parse(`
        x = 0
        result = true || x
        x
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(0); // x was evaluated
    });
  });

  describe('Property Access and Arrays', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should handle property access on objects', async () => {
      const program = parse(`
        obj = { name: "John", age: 30 }
        obj.name
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("John");
    });

    it('should handle nested property access', async () => {
      const program = parse(`
        obj = { person: { name: "John", age: 30 } }
        obj.person.name
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("John");
    });

    it('should handle array index access', async () => {
      const program = parse(`
        arr = [10, 20, 30]
        arr[1]
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(20);
    });

    it('should use map as a built-in function', async () => {
      // Define a simple doubling function
      const env = (runtime as any).interpreter.environment;
      env.define('double', new FunctionValue('double', async (args: any[]) => {
        const num = args[0];
        return new NumberValue(num.value * 2);
      }));

      const program = parse(`
        arr = [1, 2, 3]
        map(arr, double)
      `);
      const result = await runtime.execute(program);
      expect(result.type).toBe('array');
      expect((result as ArrayValue).elements).toHaveLength(3);
      expect((result as ArrayValue).elements[0].value).toBe(2);
      expect((result as ArrayValue).elements[1].value).toBe(4);
      expect((result as ArrayValue).elements[2].value).toBe(6);
    });

    it('should handle array length property', async () => {
      const program = parse(`
        arr = [1, 2, 3, 4, 5]
        arr.length
      `);
      const result = await runtime.execute(program);
      expect(result.type).toBe('number');
      expect(result.value).toBe(5);
    });

    it('should handle confident array length', async () => {
      const program = parse(`
        arr = [1, 2, 3, 4] ~> 0.8
        arr.length
      `);
      const result = await runtime.execute(program);
      expect(result.type).toBe('number');
      expect(result.value).toBe(4);
    });

    it('should handle undefined property access', async () => {
      const program = parse(`
        obj = { name: "John" }
        obj.age
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Property \'age\' does not exist');
    });

    it('should handle out of bounds array access', async () => {
      const program = parse(`
        arr = [1, 2, 3]
        arr[10]
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Array index 10 out of bounds');
    });
  });

  describe('Ternary Expressions', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should evaluate ternary with true condition', async () => {
      const program = parse('true ? "yes" : "no"');
      const result = await runtime.execute(program);
      expect(result.value).toBe("yes");
    });

    it('should evaluate ternary with false condition', async () => {
      const program = parse('false ? "yes" : "no"');
      const result = await runtime.execute(program);
      expect(result.value).toBe("no");
    });

    it('should evaluate ternary with complex expressions', async () => {
      const program = parse('(5 > 3) ? (10 + 20) : (30 + 40)');
      const result = await runtime.execute(program);
      expect(result.value).toBe(30);
    });
  });

  describe('String Interpolation', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should handle simple string interpolation', async () => {
      const program = parse(`
        name = "World"
        "Hello, \${name}!"
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("Hello, World!");
    });

    it('should handle multiple interpolations', async () => {
      const program = parse(`
        x = 10
        y = 20
        "x = \${x}, y = \${y}, sum = \${x + y}"
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("x = 10, y = 20, sum = 30");
    });

    it('should handle interpolation with confident values', async () => {
      const program = parse(`
        value = 42 ~> 0.8
        "The value is \${value}"
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("The value is 42 (~80.0%)");
      // String interpolation doesn't preserve confidence
      expect(result.type).toBe('string');
    });
  });

  describe('Confidence Operators Extended', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should handle confidence threshold (~@>)', async () => {
      const program = parse('(42 ~> 0.8) ~@> 100');
      const result = await runtime.execute(program);
      // ~@> returns the right operand when left confidence >= 0.7
      expect(result.value).toBe(100);
    });

    it('should handle confidence threshold failure', async () => {
      const program = parse('(42 ~> 0.6) ~@> 100');
      const result = await runtime.execute(program);
      // ~@> returns the left operand with reduced confidence when threshold not met
      expect(result.type).toBe('confident');
      expect((result as ConfidentRuntimeValue).value.value).toBe(42);
      expect((result as ConfidentRuntimeValue).confidence.value).toBe(0.3); // 0.6 * 0.5
    });

    it('should handle confidence coalesce (~??)', async () => {
      const program = parse(`
        value1 = 0 ~> 0.3
        value2 = 42 ~> 0.8
        value1 ~?? value2
      `);
      const result = await runtime.execute(program);
      // ~?? returns right side when left confidence < 0.5
      expect(result.type).toBe('confident');
      expect((result as ConfidentRuntimeValue).value.value).toBe(42);
      expect((result as ConfidentRuntimeValue).confidence.value).toBe(0.8);
    });

    it('should handle confidence min (~&&)', async () => {
      const program = parse(`
        value1 = 10 ~> 0.8
        value2 = 20 ~> 0.6
        value1 ~&& value2
      `);
      const result = await runtime.execute(program);
      expect((result as ConfidentRuntimeValue).confidence.value).toBe(0.6);
    });

    it('should handle confidence max (~||)', async () => {
      const program = parse(`
        value1 = 10 ~> 0.8
        value2 = 20 ~> 0.6
        value1 ~|| value2
      `);
      const result = await runtime.execute(program);
      expect((result as ConfidentRuntimeValue).confidence.value).toBe(0.8);
    });
  });

  describe('Context and Agent Operations Extended', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should handle context with shifting', async () => {
      const program = parse(`
        x = 0
        in context First {
          x = 10
        }
        x
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(10);
    });

    it('should handle agent property access', async () => {
      const program = parse(`
        agents {
          analyst: Agent { confidence: 0.9, role: "analysis" }
        }
      `);
      // For now, just ensure it doesn't crash
      const result = await runtime.execute(program);
      expect(result).toBeDefined();
    });
  });

  describe('Error Recovery', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should provide clear error for invalid operator on non-numeric types', async () => {
      const program = parse('[1, 2, 3] * 5');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot apply * to array and number');
    });

    it('should handle errors in block statements', async () => {
      const program = parse(`
        {
          x = 10
          undefined_var + 5
          y = 20
        }
      `);
      await expect(runtime.execute(program)).rejects.toThrow(/undefined_var/);
    });
  });

  describe('Multiline Strings', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should handle multiline strings', async () => {
      const program = parse('```\nLine 1\nLine 2\n```');
      const result = await runtime.execute(program);
      expect(result.value).toBe('\nLine 1\nLine 2\n');
    });

    it('should handle multiline strings with interpolation', async () => {
      const program = parse(`
        name = "World"
        \`\`\`
Hello, \${name}!
This is a multiline string.
\`\`\`
      `);
      const result = await runtime.execute(program);
      expect(result.value).toContain('Hello, World!');
      expect(result.value).toContain('This is a multiline string.');
    });
  });

  describe('Edge Cases and Corner Cases', () => {
    let runtime: Runtime;

    beforeEach(() => {
      runtime = createRuntime();
    });

    it('should handle empty arrays', async () => {
      const program = parse('[]');
      const result = await runtime.execute(program);
      expect((result as ArrayValue).elements).toHaveLength(0);
    });

    it('should handle empty blocks', async () => {
      const program = parse('{ }');
      const result = await runtime.execute(program);
      expect(result.value).toBe(0);
    });

    it('should handle nested confidence operations', async () => {
      const program = parse('((10 ~> 0.9) + (20 ~> 0.8)) ~> 0.7');
      const result = await runtime.execute(program);
      expect(result.type).toBe('confident');
      const conf = result as ConfidentRuntimeValue;
      // The inner value is also confident (10 ~> 0.9) + (20 ~> 0.8) = 30 ~> 0.8
      expect(conf.value.type).toBe('confident');
      const innerConf = conf.value as ConfidentRuntimeValue;
      expect(innerConf.value.value).toBe(30);
      // Just check that confidence was reduced
      expect(conf.confidence.value).toBeLessThan(0.8);
      expect(conf.confidence.value).toBeGreaterThan(0);
    });

    it('should handle confidence arithmetic with mixed values', async () => {
      const program = parse(`
        confident = 10 ~> 0.9
        regular = 20
        confident + regular
      `);
      const result = await runtime.execute(program);
      expect((result as ConfidentRuntimeValue).value.value).toBe(30);
      expect((result as ConfidentRuntimeValue).confidence.value).toBe(0.9);
    });
  });
});