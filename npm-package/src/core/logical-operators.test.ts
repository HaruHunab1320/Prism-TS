import { createRuntime } from './runtime';
import { parse } from './parser';

describe('Logical Operators with Type Coercion', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('|| operator (Logical OR)', () => {
    it('should return first truthy value', async () => {
      const program = parse('"hello" || "world"');
      const result = await runtime.execute(program);
      expect(result.value).toBe("hello");
    });

    it('should return second value if first is falsy', async () => {
      const program = parse('0 || "default"');
      const result = await runtime.execute(program);
      expect(result.value).toBe("default");
    });

    it('should work with null values', async () => {
      const program = parse('null || "fallback"');
      const result = await runtime.execute(program);
      expect(result.value).toBe("fallback");
    });

    it('should work with undefined values', async () => {
      const program = parse('undefined || 42');
      const result = await runtime.execute(program);
      expect(result.value).toBe(42);
    });

    it('should return last value if all are falsy', async () => {
      const program = parse('0 || false || null');
      const result = await runtime.execute(program);
      expect(result.value).toBe(null);
    });

    it('should work with variables', async () => {
      const program = parse(`
        userInput = ""
        defaultValue = "anonymous"
        name = userInput || defaultValue
        name
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("anonymous");
    });

    it('should preserve confidence values', async () => {
      const program = parse(`
        value = (100 ~> 0.8) || "fallback"
        value
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('100');
      expect(result.toString()).toContain('80.0%');
    });

    it('should short-circuit evaluation', async () => {
      const program = parse(`
        callCount = 0
        increment = () => callCount + 1
        result = "truthy" || increment()
        result + " calls: " + callCount
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("truthy calls: 0"); // increment should not be called
    });

    it('should chain multiple OR operations', async () => {
      const program = parse(`
        first = null
        second = 0
        third = "found"
        result = first || second || third || "default"
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("found");
    });

    it('should work with array properties', async () => {
      const program = parse(`
        arr = []
        fallback = [1, 2, 3]
        result = arr.length || fallback.length
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(3);
    });
  });

  describe('&& operator (Logical AND)', () => {
    it('should return first falsy value', async () => {
      const program = parse('0 && "never reached"');
      const result = await runtime.execute(program);
      expect(result.value).toBe(0);
    });

    it('should return second value if first is truthy', async () => {
      const program = parse('"hello" && "world"');
      const result = await runtime.execute(program);
      expect(result.value).toBe("world");
    });

    it('should work with null values', async () => {
      const program = parse('"exists" && null');
      const result = await runtime.execute(program);
      expect(result.value).toBe(null);
    });

    it('should work with undefined values', async () => {
      const program = parse('42 && undefined');
      const result = await runtime.execute(program);
      expect(result.type).toBe('undefined');
    });

    it('should short-circuit on falsy', async () => {
      const program = parse(`
        callCount = 0
        increment = () => callCount + 1  
        result = false && increment()
        resultStr = result + ""
        resultStr + " calls: " + callCount
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("false calls: 0"); // increment should not be called
    });

    it('should chain multiple AND operations', async () => {
      const program = parse(`
        result = 1 && 2 && 3 && 4
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(4);
    });

    it('should preserve confidence values when truthy', async () => {
      const program = parse(`
        value = "test" && (100 ~> 0.8)
        value
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('100');
      expect(result.toString()).toContain('80.0%');
    });
  });

  describe('Mixed && and || operators', () => {
    it('should handle precedence correctly', async () => {
      const program = parse('0 || 1 && 2');
      const result = await runtime.execute(program);
      expect(result.value).toBe(2); // && has higher precedence
    });

    it('should work with parentheses', async () => {
      const program = parse('(0 || 1) && 2');
      const result = await runtime.execute(program);
      expect(result.value).toBe(2);
    });

    it('should handle complex expressions', async () => {
      const program = parse(`
        a = null
        b = ""
        c = "default"
        d = 42
        result = a || b || (c && d)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(42);
    });

    it('should work in conditions', async () => {
      const program = parse(`
        userRole = ""
        defaultRole = "guest"
        role = userRole || defaultRole
        if (role == "guest") {
          "is guest"
        } else {
          "not guest"
        }
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("is guest");
    });
  });

  describe('Backward compatibility', () => {
    it('should still work in boolean contexts', async () => {
      const program = parse(`
        if ("hello" || "") {
          "truthy"
        } else {
          "falsy"
        }
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("truthy");
    });

    it('should work with NOT operator', async () => {
      const program = parse('!(0 || false)');
      const result = await runtime.execute(program);
      expect(result.value).toBe(true);
    });

    it('should work in while loops', async () => {
      const program = parse(`
        count = 3
        result = ""
        while (count || false) {
          result = result + count
          count = count - 1
        }
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("321");
    });
  });
});