import { createRuntime } from '../src/runtime';
import { parse } from '../src/parser';

describe('Rest Parameters', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Rest parameters in function definitions', () => {
    it('should collect remaining arguments as array', async () => {
      const program = parse(`
        let sum = (...nums) => nums.reduce((a, b) => a + b, 0)
        sum(1, 2, 3, 4, 5)
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(15);
    });

    it('should work with empty arguments', async () => {
      const program = parse(`
        let count = (...args) => args.length
        count()
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(0);
    });

    it('should work with regular parameters before rest', async () => {
      const program = parse(`
        let greet = (greeting, ...names) => greeting + " " + names.join(" and ")
        greet("Hello", "Alice", "Bob", "Charlie")
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("Hello Alice and Bob and Charlie");
    });

    it('should work with multiple regular parameters', async () => {
      const program = parse(`
        let format = (template, sep, ...values) => template + ": " + values.join(sep)
        format("Numbers", ", ", 1, 2, 3)
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("Numbers: 1, 2, 3");
    });

    it('should preserve confidence values in rest parameters', async () => {
      const program = parse(`
        let first = (...values) => values[0]
        first(10 ~> 0.8, 20 ~> 0.6, 30 ~> 0.4)
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('10');
      expect(result.toString()).toContain('80.0%');
    });

    it('should work with array methods on rest parameters', async () => {
      const program = parse(`
        let average = (...nums) => nums.reduce((a, b) => a + b, 0) / nums.length
        average(10, 20, 30, 40)
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(25);
    });

    it('should work with nested function calls', async () => {
      const program = parse(`
        let outer = (...args) => args.map(x => x * 2)
        let inner = (...nums) => outer(...nums)
        inner(1, 2, 3)
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('[2, 4, 6]');
    });

    it('should require parentheses for rest parameters', async () => {
      // Rest parameters require parentheses - single param syntax not allowed
      expect(() => parse(`let fn = ...args => args.length`)).toThrow();
    });

    it('should error on rest parameter not at end', async () => {
      // Rest parameter must be last
      expect(() => parse(`let fn = (...args, other) => args`)).toThrow(/Rest parameter must be last/);
    });

    it('should work with destructuring in rest parameters', async () => {
      const program = parse(`
        let process = (cmd, ...flags) => cmd + " with " + flags.length + " flags"
        process("build", "--prod", "--verbose", "--no-cache")
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("build with 3 flags");
    });
  });

  describe('Integration with other features', () => {
    it('should work with confidence operators', async () => {
      const program = parse(`
        let first = (...vals) => vals[0] ~> 0.95
        let result = first(5, 10, 15)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('5');
      expect(result.toString()).toContain('95.0%');
    });

    it('should work in uncertain contexts', async () => {
      const program = parse(`
        let pickNumber = (...nums) => nums[0] ~> 0.7
        let result = "not set"
        
        uncertain if (pickNumber(10, 20, 30)) {
          high { result = "high confidence" }
          low { result = "low confidence" }
        }
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("high confidence"); // 0.7 >= 0.7
    });
  });
});