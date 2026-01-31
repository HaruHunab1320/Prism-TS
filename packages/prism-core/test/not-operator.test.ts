import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { Runtime } from '../src/runtime';
import { BooleanValue, StringValue } from '../src/runtime';

describe('Logical NOT Operator', () => {
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

  describe('Basic NOT operations', () => {
    it('should negate true to false', async () => {
      const code = `
        let result = !true
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(false);
    });

    it('should negate false to true', async () => {
      const code = `
        let result = !false
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should work with variables', async () => {
      const code = `
        let someValue = true
        let result = !someValue
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(false);
    });

    it('should work with null (falsy)', async () => {
      const code = `
        let value = null
        let result = !value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should work with null (falsy)', async () => {
      const code = `
        let value = null
        let result = !value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should work with empty string (falsy)', async () => {
      const code = `
        let value = ""
        let result = !value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should work with non-empty string (truthy)', async () => {
      const code = `
        let value = "hello"
        let result = !value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(false);
    });

    it('should work with zero (falsy)', async () => {
      const code = `
        let value = 0
        let result = !value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should work with non-zero number (truthy)', async () => {
      const code = `
        let value = 42
        let result = !value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(false);
    });
  });

  describe('NOT in expressions', () => {
    it('should work in if conditions', async () => {
      const code = `
        let someValue = false
        let result = "no"
        if (!someValue) {
          result = "yes"
        }
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('yes');
    });

    it('should work with parentheses', async () => {
      const code = `
        let a = true
        let b = false
        let result = !(a && b)
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should work with double negation', async () => {
      const code = `
        let value = true
        let result = !!value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should work with complex expressions', async () => {
      const code = `
        let a = true
        let b = false
        let c = true
        let result = !(a && (b || c))
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(false);
    });
  });

  describe('Common patterns', () => {
    it('should check for empty array', async () => {
      const code = `
        let arr = []
        let isEmpty = !arr.length
        isEmpty
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should check for non-empty array', async () => {
      const code = `
        let arr = [1, 2, 3]
        let hasItems = !(!arr.length)
        hasItems
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });
  });
});
