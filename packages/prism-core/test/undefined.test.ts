import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { Runtime } from '../src/runtime';
import { UndefinedValue, NullValue, BooleanValue, StringValue, NumberValue } from '../src/runtime';

describe('Undefined Support', () => {
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

  describe('Basic undefined', () => {
    it('should create undefined value', async () => {
      const code = `
        x = undefined
        x
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(UndefinedValue);
    });

    it('should stringify undefined correctly', async () => {
      const code = `
        x = undefined
        x
      `;
      const result = await execute(code);
      expect(result.toString()).toBe('undefined');
    });
  });

  describe('Undefined comparisons', () => {
    it('should compare undefined with undefined', async () => {
      const code = `
        result = undefined == undefined
        result
      `;
      const result = await execute(code);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should compare undefined with null', async () => {
      const code = `
        result = undefined == null
        result
      `;
      const result = await execute(code);
      expect((result as BooleanValue).value).toBe(true); // JavaScript behavior: undefined == null is true
    });

    it('should not equal other values', async () => {
      const code = `
        result = undefined == 0
        result
      `;
      const result = await execute(code);
      expect((result as BooleanValue).value).toBe(false);
    });

    it('should handle inequality', async () => {
      const code = `
        result = undefined != null
        result
      `;
      const result = await execute(code);
      expect((result as BooleanValue).value).toBe(false); // JavaScript behavior: undefined != null is false
    });
  });

  describe('Undefined in data structures', () => {
    it('should store undefined in arrays', async () => {
      const code = `
        arr = [1, undefined, 3, undefined, 5]
        arr[1]
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(UndefinedValue);
    });

    it('should store undefined in objects', async () => {
      const code = `
        obj = { name: "Alice", age: undefined, email: null }
        obj.age
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(UndefinedValue);
    });
  });

  describe('Undefined with optional chaining', () => {
    it('should return null for optional chain on undefined', async () => {
      const code = `
        x = undefined
        result = x?.property
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NullValue);
    });

    it('should handle undefined in nested optional chains', async () => {
      const code = `
        obj = { data: undefined }
        result = obj?.data?.value
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NullValue);
    });
  });

  describe('Undefined in expressions', () => {
    it('should be falsy in conditions', async () => {
      const code = `
        x = undefined
        result = "initial"
        if (x) {
          result = "truthy"
        } else {
          result = "falsy"
        }
        result
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('falsy');
    });

    it('should work with ternary operator', async () => {
      const code = `
        value = undefined
        result = value ? "has value" : "no value"
        result
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('no value');
    });

    it('should work with logical operators', async () => {
      const code = `
        a = undefined
        b = 42
        result = a || b
        result
      `;
      const result = await execute(code);
      // || returns first truthy value or last value (like JavaScript)
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(42);
    });
  });

  describe('Undefined with confidence', () => {
    it('should support confidence on undefined', async () => {
      const code = `
        value = undefined ~> 0.3
        conf = <~ value
        conf
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(0.3);
    });

    it('should handle undefined with confidence coalesce', async () => {
      const code = `
        value = undefined ~> 0.3
        fallback = value ~?? "default"
        fallback
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe('default');
    });
  });

  describe('Undefined vs null distinction', () => {
    it('should distinguish between null and undefined', async () => {
      const code = `
        nullValue = null
        undefinedValue = undefined
        areEqual = nullValue == undefinedValue
        areEqual
      `;
      const result = await execute(code);
      expect((result as BooleanValue).value).toBe(true); // JavaScript behavior: null == undefined is true
    });

    it('should handle both in array methods', async () => {
      const code = `
        data = [1, null, 3, undefined, 5]
        // Filter out null (in Prism, this also filters undefined since null == undefined)
        withoutNull = filter(data, x => x != null)
        withoutNull.length
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(3); // Only [1, 3, 5] remain
      
      const code2 = `
        data = [1, null, 3, undefined, 5]
        // Filter out undefined (in Prism, this also filters null since undefined == null)
        withoutUndefined = filter(data, x => x != undefined)
        withoutUndefined.length
      `;
      const result2 = await execute(code2);
      expect((result2 as NumberValue).value).toBe(3); // Only [1, 3, 5] remain
    });
  });
});