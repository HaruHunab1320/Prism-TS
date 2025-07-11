import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { Runtime } from '../src/runtime';
import { NullValue, NumberValue, StringValue } from '../src/runtime';

describe('Optional Chaining', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  const execute = async (code: string) => {
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens, code);
    const ast = parser.parse();
    return runtime.execute(ast);
  };

  describe('Basic optional chaining', () => {
    it('should return null for null object', async () => {
      const code = `
        obj = null
        result = obj?.name
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NullValue);
    });

    it('should return property value for non-null object', async () => {
      const code = `
        obj = { name: "Alice", age: 30 }
        result = obj?.name
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Alice');
    });

    it('should return null for missing property', async () => {
      const code = `
        obj = { name: "Alice" }
        result = obj?.email
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NullValue);
    });
  });

  describe('Chained optional access', () => {
    it('should handle multiple optional chains', async () => {
      const code = `
        user = { profile: { name: "Bob" } }
        result = user?.profile?.name
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Bob');
    });

    it('should short-circuit on null', async () => {
      const code = `
        user = { profile: null }
        result = user?.profile?.name
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NullValue);
    });

    it('should handle deeply nested chains', async () => {
      const code = `
        data = { 
          level1: { 
            level2: { 
              level3: { 
                value: 42 
              } 
            } 
          } 
        }
        result = data?.level1?.level2?.level3?.value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(42);
    });
  });

  describe('Mixed with regular property access', () => {
    it('should work with regular dot notation', async () => {
      const code = `
        obj = { user: { name: "Charlie" } }
        result = obj.user?.name
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Charlie');
    });

    it('should throw on regular access to null', async () => {
      const code = `
        obj = { user: null }
        result = obj.user.name
      `;
      await expect(execute(code)).rejects.toThrow();
    });
  });

  describe('With arrays', () => {
    it('should access array length with optional chaining', async () => {
      const code = `
        arr = [1, 2, 3]
        result = arr?.length
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(3);
    });

    it('should return null for null array', async () => {
      const code = `
        arr = null
        result = arr?.length
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NullValue);
    });
  });

  describe('With confidence values', () => {
    it('should preserve confidence through optional chain', async () => {
      const code = `
        obj = { score: 85 } ~> 0.9
        result = obj?.score
        <~ result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(0.9);
    });

    it('should return null for null with confidence', async () => {
      const code = `
        obj = null ~> 0.8
        result = obj?.name
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NullValue);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle optional chaining in expressions', async () => {
      const code = `
        user = { age: 25 }
        canDrink = user?.age >= 21
        canDrink
      `;
      const result = await execute(code);
      expect(result.value).toBe(true);
    });

    it('should work with ternary operators', async () => {
      const code = `
        user = null
        greeting = user?.name ? "Hello, " + user.name : "Hello, Guest"
        greeting
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('Hello, Guest');
    });

    it('should handle optional chaining with null fallback', async () => {
      const code = `
        config = { settings: null }
        theme = config?.settings?.theme
        defaultTheme = theme != null ? theme : "light"
        defaultTheme
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('light');
    });
  });
});