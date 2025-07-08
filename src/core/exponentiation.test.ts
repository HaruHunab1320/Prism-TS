import { Tokenizer } from './tokenizer';
import { Parser } from './parser';
import { Runtime } from './runtime';
import { NumberValue } from './runtime';

describe('Exponentiation Operator', () => {
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

  describe('Basic exponentiation', () => {
    it('should calculate powers of numbers', async () => {
      const code = `
        result = 2 ** 3
        result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(8);
    });

    it('should handle base 10 powers', async () => {
      const code = `
        result = 10 ** 3
        result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(1000);
    });

    it('should handle fractional exponents', async () => {
      const code = `
        result = 4 ** 0.5
        result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(2);
    });

    it('should handle negative exponents', async () => {
      const code = `
        result = 2 ** -3
        result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(0.125);
    });

    it('should handle zero exponent', async () => {
      const code = `
        result = 5 ** 0
        result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(1);
    });
  });

  describe('Right associativity', () => {
    it('should be right-associative', async () => {
      const code = `
        result = 2 ** 3 ** 2
        result
      `;
      const result = await execute(code);
      // Should be 2 ** (3 ** 2) = 2 ** 9 = 512
      expect((result as NumberValue).value).toBe(512);
    });

    it('should handle multiple exponentiations', async () => {
      const code = `
        result = 2 ** 2 ** 2 ** 2
        result
      `;
      const result = await execute(code);
      // Should be 2 ** (2 ** (2 ** 2)) = 2 ** (2 ** 4) = 2 ** 16 = 65536
      expect((result as NumberValue).value).toBe(65536);
    });
  });

  describe('Precedence', () => {
    it('should have higher precedence than multiplication', async () => {
      const code = `
        result = 2 * 3 ** 2
        result
      `;
      const result = await execute(code);
      // Should be 2 * (3 ** 2) = 2 * 9 = 18
      expect((result as NumberValue).value).toBe(18);
    });

    it('should have higher precedence than division', async () => {
      const code = `
        result = 16 / 2 ** 3
        result
      `;
      const result = await execute(code);
      // Should be 16 / (2 ** 3) = 16 / 8 = 2
      expect((result as NumberValue).value).toBe(2);
    });

    it('should work with parentheses', async () => {
      const code = `
        result = (2 + 3) ** 2
        result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(25);
    });
  });

  describe('With variables', () => {
    it('should work with variables', async () => {
      const code = `
        base = 3
        exponent = 4
        result = base ** exponent
        result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(81);
    });

    it('should work in expressions', async () => {
      const code = `
        x = 2
        y = 3
        result = x ** y + 1
        result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(9);
    });
  });

  describe('With confidence', () => {
    it('should propagate confidence', async () => {
      const code = `
        base = 2 ~> 0.9
        result = base ** 3
        <~ result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(0.9);
    });

    it('should use minimum confidence for both operands', async () => {
      const code = `
        base = 2 ~> 0.8
        exp = 3 ~> 0.6
        result = base ** exp
        <~ result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(0.6);
    });
  });

  describe('Edge cases', () => {
    it('should handle 0 ** 0', async () => {
      const code = `
        result = 0 ** 0
        result
      `;
      const result = await execute(code);
      // JavaScript Math.pow(0, 0) returns 1
      expect((result as NumberValue).value).toBe(1);
    });

    it('should handle negative base with integer exponent', async () => {
      const code = `
        result = (-2) ** 3
        result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(-8);
    });

    it('should handle very large results', async () => {
      const code = `
        result = 10 ** 10
        result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(10000000000);
    });
  });

  describe('Error cases', () => {
    it('should error on non-numeric operands', async () => {
      const code = `
        result = "2" ** 3
      `;
      await expect(execute(code)).rejects.toThrow('Cannot apply ** to string and number');
    });

    it('should error on null operands', async () => {
      const code = `
        result = null ** 2
      `;
      await expect(execute(code)).rejects.toThrow('Cannot apply ** to null and number');
    });
  });
});