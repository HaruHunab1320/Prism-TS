// Test for null support
import { tokenize } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { createRuntime } from '../src/runtime';
import { NullValue, BooleanValue, StringValue, ArrayValue, NumberValue, ConfidenceValue } from '../src/runtime';

describe('Null Support', () => {
  let runtime: any;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Basic null operations', () => {
    it('should support null assignment', async () => {
      const source = `
        value = null
        value
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NullValue);
    });

    it('should support null in comparisons', async () => {
      const source = `
        value = null
        value == null
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should support null inequality', async () => {
      const source = `
        value = 42
        value != null
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    it('should treat null as falsy', async () => {
      const source = `
        value = null
        if (value) {
          "truthy"
        } else {
          "falsy"
        }
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('falsy');
    });
  });

  describe('Null in data structures', () => {
    it('should support null in arrays', async () => {
      const source = `
        arr = [1, null, 3]
        arr[1]
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NullValue);
    });

    it('should support null in objects', async () => {
      const source = `
        obj = { name: "Alice", email: null }
        obj.email
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NullValue);
    });

    it('should support nested nulls', async () => {
      const source = `
        data = {
          user: {
            name: "Bob",
            phone: null,
            address: {
              street: "123 Main",
              apt: null
            }
          }
        }
        data.user.address.apt
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NullValue);
    });
  });

  describe('Null with operators', () => {
    it('should support ternary with null', async () => {
      const source = `
        value = null
        result = value != null ? value : "default"
        result
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('default');
    });

    it('should work with logical operators', async () => {
      const source = `
        a = null
        b = false
        a || b
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(false);
    });

    it('should work with logical AND', async () => {
      const source = `
        a = null
        b = true
        a && b
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      // && returns first falsy value or last value
      expect(result).toBeInstanceOf(NullValue);
      expect(result.value).toBe(null);
    });
  });

  describe('Null with confidence', () => {
    it('should support null with confidence values', async () => {
      const source = `
        value = null ~> 0.9
        value
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ConfidenceValue);
      expect((result as ConfidenceValue).value).toBeInstanceOf(NullValue);
      expect((result as ConfidenceValue).confidence.value).toBe(0.9);
    });

    it('should support confident null comparisons', async () => {
      const source = `
        value = null ~> 0.8
        check = value ~== null
        check
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ConfidenceValue);
      expect((result as ConfidenceValue).value).toBeInstanceOf(BooleanValue);
      expect(((result as ConfidenceValue).value as BooleanValue).value).toBe(true);
      expect((result as ConfidenceValue).confidence.value).toBe(0.8);
    });
  });

  describe('Null with array methods', () => {
    it('should filter out nulls', async () => {
      const source = `
        data = [1, null, 2, null, 3]
        filtered = filter(data, x => x != null)
        filtered
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ArrayValue);
      const array = result as ArrayValue;
      expect(array.elements).toHaveLength(3);
      expect((array.elements[0] as NumberValue).value).toBe(1);
      expect((array.elements[1] as NumberValue).value).toBe(2);
      expect((array.elements[2] as NumberValue).value).toBe(3);
    });

    it('should map with null handling', async () => {
      const source = `
        data = [1, null, 3]
        mapped = map(data, x => x != null ? x * 2 : 0)
        mapped
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ArrayValue);
      const array = result as ArrayValue;
      expect(array.elements).toHaveLength(3);
      expect((array.elements[0] as NumberValue).value).toBe(2);
      expect((array.elements[1] as NumberValue).value).toBe(0);
      expect((array.elements[2] as NumberValue).value).toBe(6);
    });

    it('should reduce with null values', async () => {
      const source = `
        data = [1, null, 2, null, 3]
        sum = reduce(data, (acc, val, idx) => val != null ? acc + val : acc, 0)
        sum
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(6);
    });
  });

  describe('Null edge cases', () => {
    it('should distinguish null from other falsy values', async () => {
      const source = `
        nullVal = null
        zero = 0
        empty = ""
        falseVal = false
        
        results = [
          nullVal == null,
          zero == null,
          empty == null,
          falseVal == null
        ]
        results
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ArrayValue);
      const array = result as ArrayValue;
      expect(array.elements).toHaveLength(4);
      expect((array.elements[0] as BooleanValue).value).toBe(true);
      expect((array.elements[1] as BooleanValue).value).toBe(false);
      expect((array.elements[2] as BooleanValue).value).toBe(false);
      expect((array.elements[3] as BooleanValue).value).toBe(false);
    });

    it('should support multiple null assignments', async () => {
      const source = `
        a = null
        b = null
        c = a
        c == b
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });
  });
});