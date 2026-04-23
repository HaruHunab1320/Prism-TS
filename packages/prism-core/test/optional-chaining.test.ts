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
        let obj = null
        let result = obj?.name
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NullValue);
    });

    it('should return property value for non-null object', async () => {
      const code = `
        let obj = { name: "Alice", age: 30 }
        let result = obj?.name
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Alice');
    });

    it('should return null for missing property', async () => {
      const code = `
        let obj = { name: "Alice" }
        let result = obj?.email
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NullValue);
    });
  });

  describe('Chained optional access', () => {
    it('should handle multiple optional chains', async () => {
      const code = `
        let user = { profile: { name: "Bob" } }
        let result = user?.profile?.name
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Bob');
    });

    it('should short-circuit on null', async () => {
      const code = `
        let user = { profile: null }
        let result = user?.profile?.name
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NullValue);
    });

    it('should handle deeply nested chains', async () => {
      const code = `
        let data = { 
          level1: { 
            level2: { 
              level3: { 
                value: 42 
              } 
            } 
          } 
        }
        let result = data?.level1?.level2?.level3?.value
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
        let obj = { user: { name: "Charlie" } }
        let result = obj.user?.name
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Charlie');
    });

    it('should throw on regular access to null', async () => {
      const code = `
        let obj = { user: null }
        let result = obj.user.name
      `;
      await expect(execute(code)).rejects.toThrow();
    });
  });

  describe('With arrays', () => {
    it('should access array length with optional chaining', async () => {
      const code = `
        let arr = [1, 2, 3]
        let result = arr?.length
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(3);
    });

    it('should return null for null array', async () => {
      const code = `
        let arr = null
        let result = arr?.length
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NullValue);
    });
  });

  describe('With confidence values', () => {
    it('should preserve confidence through optional chain', async () => {
      const code = `
        let obj = { score: 85 } ~> 0.9
        let result = obj?.score
        <~ result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(0.9);
    });

    it('should return null for null with confidence', async () => {
      const code = `
        let obj = null ~> 0.8
        let result = obj?.name
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NullValue);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle optional chaining in expressions', async () => {
      const code = `
        let user = { age: 25 }
        let canDrink = user?.age >= 21
        canDrink
      `;
      const result = await execute(code);
      expect(result.value).toBe(true);
    });

    it('should work with ternary operators', async () => {
      const code = `
        let user = null
        let greeting = user?.name ? "Hello, " + user.name : "Hello, Guest"
        greeting
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('Hello, Guest');
    });

    it('should handle optional chaining with null fallback', async () => {
      const code = `
        let config = { settings: null }
        let theme = config?.settings?.theme
        let defaultTheme = theme != null ? theme : "light"
        defaultTheme
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('light');
    });
  });
});