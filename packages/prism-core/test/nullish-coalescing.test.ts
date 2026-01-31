import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { Runtime } from '../src/runtime';
import { NumberValue, StringValue, BooleanValue, ConfidenceValue } from '../src/runtime';

describe('Nullish Coalescing Operator', () => {
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

  describe('Basic nullish coalescing', () => {
    it('should return right side for null', async () => {
      const code = `
        let result = null ?? "default"
        result
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('default');
    });

    it('should return right side for null', async () => {
      const code = `
        let result = null ?? "default"
        result
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('default');
    });

    it('should return left side for non-null/null values', async () => {
      const code = `
        let result = "value" ?? "default"
        result
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('value');
    });

    it('should return 0 when left is 0', async () => {
      const code = `
        let result = 0 ?? 42
        result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(0);
    });

    it('should return false when left is false', async () => {
      const code = `
        let result = false ?? true
        result
      `;
      const result = await execute(code);
      expect((result as BooleanValue).value).toBe(false);
    });

    it('should return empty string when left is empty string', async () => {
      const code = `
        let result = "" ?? "default"
        result
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('');
    });
  });

  describe('Chaining nullish coalescing', () => {
    it('should chain multiple ?? operators', async () => {
      const code = `
        let result = null ?? null ?? "final"
        result
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('final');
    });

    it('should stop at first non-nullish value', async () => {
      const code = `
        let result = null ?? "second" ?? "third"
        result
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('second');
    });

    it('should work with variables', async () => {
      const code = `
        let a = null
        let b = null
        let c = "value"
        let result = a ?? b ?? c
        result
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('value');
    });
  });

  describe('Difference from logical OR', () => {
    it('should differ from || for falsy values', async () => {
      const code = `
        let zero = 0 ?? 10
        zero
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(0);
      
      const code2 = `
        let emptyStr = "" ?? "default"
        emptyStr
      `;
      const result2 = await execute(code2);
      expect((result2 as StringValue).value).toBe('');
      
      const code3 = `
        let falseBool = false ?? true
        falseBool
      `;
      const result3 = await execute(code3);
      expect((result3 as BooleanValue).value).toBe(false);
    });

    it('should behave like || for null/null', async () => {
      const code = `
        let nullResult = null ?? "default"
        nullResult
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('default');
      
      const code2 = `
        let undefinedResult = null ?? "default"
        undefinedResult
      `;
      const result2 = await execute(code2);
      expect((result2 as StringValue).value).toBe('default');
    });
  });

  describe('With other operators', () => {
    it('should work with ternary operator', async () => {
      const code = `
        let value = null
        let result = (value ?? "default") == "default" ? "correct" : "wrong"
        result
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('correct');
    });

    it('should work with optional chaining', async () => {
      const code = `
        let obj = { data: null }
        let result = obj?.data ?? "fallback"
        result
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('fallback');
    });

    it('should have correct precedence', async () => {
      const code = `
        let result = null ?? "default" + " value"
        result
      `;
      const result = await execute(code);
      // Should be null ?? ("default" + " value"), not (null ?? "default") + " value"
      expect((result as StringValue).value).toBe('default value');
    });
  });

  describe('With confidence values', () => {
    it('should work with confident null', async () => {
      const code = `
        let value = null ~> 0.8
        let result = value ?? "default"
        result
      `;
      const result = await execute(code);
      // The result should be a confidence value wrapping a string
      expect(result instanceof ConfidenceValue).toBe(true);
      const confResult = result as ConfidenceValue;
      expect(confResult.value instanceof StringValue).toBe(true);
      expect((confResult.value as StringValue).value).toBe('default');
    });

    it('should preserve confidence when not null', async () => {
      const code = `
        let value = "data" ~> 0.7
        let result = value ?? "default"
        <~ result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(0.7);
    });

    it('should handle confidence on both sides', async () => {
      const code = `
        let left = null ~> 0.8
        let right = "default" ~> 0.6
        let result = left ?? right
        <~ result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(0.6);
    });
  });

  describe('Complex scenarios', () => {
    it('should work in object property access chains', async () => {
      const code = `
        let config = {
          server: {
            host: null,
            port: null
          }
        }
        let host = config.server.host ?? "localhost"
        host
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('localhost');
      
      const code2 = `
        config = {
          server: {
            host: null,
            port: null
          }
        }
        let port = config.server.port ?? 3000
        port
      `;
      const result2 = await execute(code2);
      expect((result2 as NumberValue).value).toBe(3000);
    });

    it('should work with function results', async () => {
      const code = `
        let getValue = () => null
        let result = getValue() ?? "default"
        result
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('default');
    });

    it('should handle mixed null and null', async () => {
      const code = `
        let data = [null, null, 0, false, ""]
        let results = map(data, x => x ?? "replaced")
        results
      `;
      const result = await execute(code);
      const array = result as any;
      expect(array.value[0].value).toBe('replaced');
      expect(array.value[1].value).toBe('replaced');
      expect(array.value[2].value).toBe(0);
      expect(array.value[3].value).toBe(false);
      expect(array.value[4].value).toBe('');
    });
  });
});
