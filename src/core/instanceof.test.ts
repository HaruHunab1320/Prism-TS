import { createRuntime } from './runtime';
import { parse } from './parser';

describe('instanceof operator', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Basic type checking', () => {
    it('should check numbers', async () => {
      const program = parse(`42 instanceof "number"`);
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should check strings', async () => {
      const program = parse(`"hello" instanceof "string"`);
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should check booleans', async () => {
      const program = parse(`true instanceof "boolean"`);
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should check arrays', async () => {
      const program = parse(`[1, 2, 3] instanceof "array"`);
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should check objects', async () => {
      const program = parse(`{a: 1} instanceof "object"`);
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should check functions', async () => {
      const program = parse(`(x => x + 1) instanceof "function"`);
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should check null', async () => {
      const program = parse(`null instanceof "null"`);
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should check undefined', async () => {
      const program = parse(`undefined instanceof "undefined"`);
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });
  });

  describe('Negative tests', () => {
    it('should return false for wrong type', async () => {
      const program = parse(`42 instanceof "string"`);
      const result = await runtime.execute(program);
      expect(result.value).toBe(false);
    });

    it('should return false for array vs object', async () => {
      const program = parse(`[1, 2, 3] instanceof "object"`);
      const result = await runtime.execute(program);
      expect(result.value).toBe(false);
    });

    it('should return false for object vs array', async () => {
      const program = parse(`{a: 1} instanceof "array"`);
      const result = await runtime.execute(program);
      expect(result.value).toBe(false);
    });
  });

  describe('With variables', () => {
    it('should work with variables', async () => {
      const program = parse(`
        x = "hello";
        x instanceof "string"
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should work with type names in variables', async () => {
      const program = parse(`
        value = 42;
        typeName = "number";
        value instanceof typeName
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });
  });

  describe('With confidence values', () => {
    it('should check the wrapped value type', async () => {
      const program = parse(`(42 ~> 0.8) instanceof "number"`);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('true');
    });

    it('should work with confident strings', async () => {
      const program = parse(`("hello" ~> 0.9) instanceof "string"`);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('true');
    });

    it('should return false for wrong type with confidence', async () => {
      const program = parse(`(42 ~> 0.8) instanceof "string"`);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('false');
    });
  });

  describe('Combined with typeof', () => {
    it('should work together with typeof', async () => {
      const program = parse(`
        x = [1, 2, 3];
        typeOfX = typeof x;
        isArray = x instanceof "array";
        typeOfX + " - " + isArray
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("array - true");
    });

    it('should be consistent with typeof', async () => {
      const program = parse(`
        value = "test";
        (typeof value == "string") == (value instanceof "string")
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });
  });

  describe('Error cases', () => {
    it('should throw for unknown type names', async () => {
      const program = parse(`42 instanceof "notAType"`);
      await expect(runtime.execute(program)).rejects.toThrow('Unknown type name: notatype');
    });

    it('should throw for non-string right operand', async () => {
      const program = parse(`42 instanceof 123`);
      await expect(runtime.execute(program)).rejects.toThrow('Right-hand side of instanceof must be a type name or constructor');
    });
  });

  describe('Real-world patterns', () => {
    it('should work in conditional logic', async () => {
      const program = parse(`
        data = [1, 2, 3];
        data instanceof "array" ? data.length : 0
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(3);
    });

    it('should work for type guards', async () => {
      const program = parse(`
        process = value => value instanceof "number" ? value * 2 : value instanceof "string" ? value + value : "unknown";
        process(21)
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(42);
    });
  });
});