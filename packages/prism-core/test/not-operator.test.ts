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
        result = !true
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(false);
    });

    it('should negate false to true', async () => {
      const code = `
        result = !false
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should work with variables', async () => {
      const code = `
        someValue = true
        result = !someValue
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(false);
    });

    it('should work with null (falsy)', async () => {
      const code = `
        value = null
        result = !value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should work with undefined (falsy)', async () => {
      const code = `
        value = undefined
        result = !value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should work with empty string (falsy)', async () => {
      const code = `
        value = ""
        result = !value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should work with non-empty string (truthy)', async () => {
      const code = `
        value = "hello"
        result = !value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(false);
    });

    it('should work with zero (falsy)', async () => {
      const code = `
        value = 0
        result = !value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should work with non-zero number (truthy)', async () => {
      const code = `
        value = 42
        result = !value
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
        someValue = false
        result = "no"
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
        a = true
        b = false
        result = !(a && b)
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should work with double negation', async () => {
      const code = `
        value = true
        result = !!value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should work with complex expressions', async () => {
      const code = `
        a = true
        b = false
        c = true
        result = !(a && (b || c))
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
        arr = []
        isEmpty = !arr.length
        isEmpty
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should check for non-empty array', async () => {
      const code = `
        arr = [1, 2, 3]
        hasItems = !(!arr.length)
        hasItems
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });
  });
});