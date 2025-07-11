import { createRuntime } from '../src/runtime';
import { parse } from '../src/parser';

describe('typeof operator', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Basic types', () => {
    it('should return "number" for numbers', async () => {
      const program = parse(`typeof 42`);
      const result = await runtime.execute(program);
      expect(result.value).toBe('number');
    });

    it('should return "string" for strings', async () => {
      const program = parse(`typeof "hello"`);
      const result = await runtime.execute(program);
      expect(result.value).toBe('string');
    });

    it('should return "boolean" for booleans', async () => {
      const program = parse(`typeof true`);
      const result = await runtime.execute(program);
      expect(result.value).toBe('boolean');
    });

    it('should return "null" for null', async () => {
      const program = parse(`typeof null`);
      const result = await runtime.execute(program);
      expect(result.value).toBe('null');
    });

    it('should return "undefined" for undefined', async () => {
      const program = parse(`typeof undefined`);
      const result = await runtime.execute(program);
      expect(result.value).toBe('undefined');
    });
  });

  describe('Complex types', () => {
    it('should return "array" for arrays', async () => {
      const program = parse(`typeof [1, 2, 3]`);
      const result = await runtime.execute(program);
      expect(result.value).toBe('array');
    });

    it('should return "object" for objects', async () => {
      const program = parse(`typeof {name: "test", value: 42}`);
      const result = await runtime.execute(program);
      expect(result.value).toBe('object');
    });

    it('should return "function" for functions', async () => {
      const program = parse(`
        f = x => x * 2;
        typeof f
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe('function');
    });
  });

  describe('Variables', () => {
    it('should work with variables', async () => {
      const program = parse(`
        x = 42;
        typeof x
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe('number');
    });

    it('should work with expressions', async () => {
      const program = parse(`typeof (10 + 20)`);
      const result = await runtime.execute(program);
      expect(result.value).toBe('number');
    });
  });

  describe('Confidence values', () => {
    it('should return the type of the wrapped value', async () => {
      const program = parse(`typeof (42 ~> 0.8)`);
      const result = await runtime.execute(program);
      expect(result.value).toBe('number');
    });

    it('should work with confident strings', async () => {
      const program = parse(`typeof ("hello" ~> 0.9)`);
      const result = await runtime.execute(program);
      expect(result.value).toBe('string');
    });
  });

  describe('Type checking patterns', () => {
    it('should work in conditional expressions', async () => {
      const program = parse(`
        x = "hello";
        typeof x == "string" ? "It's a string!" : "Not a string"
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("It's a string!");
    });

    it('should work with function type checking', async () => {
      const program = parse(`
        add = (a, b) => a + b;
        isFunction = typeof add == "function";
        isFunction
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should distinguish arrays from objects', async () => {
      const program = parse(`
        arr = [1, 2, 3];
        obj = {a: 1, b: 2};
        arrType = typeof arr;
        objType = typeof obj;
        arrType + " vs " + objType
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("array vs object");
    });
  });
});