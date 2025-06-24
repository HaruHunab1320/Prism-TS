import { tokenize } from './tokenizer';
import { Parser } from './parser';
import { createRuntime } from './runtime';
import { NumberValue, StringValue, BooleanValue, ArrayValue, ObjectValue, ConfidenceValue } from './runtime';

describe('Arrays and Lists', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Array Literals', () => {
    test('empty array', async () => {
      const source = '[]';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ArrayValue);
      expect((result as ArrayValue).elements).toHaveLength(0);
    });

    test('array with numbers', async () => {
      const source = '[1, 2, 3]';
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

    test('array with mixed types', async () => {
      const source = '[1, "hello", true]';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ArrayValue);
      const array = result as ArrayValue;
      expect(array.elements).toHaveLength(3);
      expect((array.elements[0] as NumberValue).value).toBe(1);
      expect((array.elements[1] as StringValue).value).toBe('hello');
      expect((array.elements[2] as BooleanValue).value).toBe(true);
    });

    test('nested arrays', async () => {
      const source = '[[1, 2], [3, 4]]';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ArrayValue);
      const array = result as ArrayValue;
      expect(array.elements).toHaveLength(2);
      
      const inner1 = array.elements[0] as ArrayValue;
      expect(inner1.elements).toHaveLength(2);
      expect((inner1.elements[0] as NumberValue).value).toBe(1);
      
      const inner2 = array.elements[1] as ArrayValue;
      expect(inner2.elements).toHaveLength(2);
      expect((inner2.elements[0] as NumberValue).value).toBe(3);
    });

    test('array with confident values', async () => {
      const source = '[10 ~> 0.9, 20 ~> 0.7]';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ArrayValue);
      const array = result as ArrayValue;
      expect(array.elements).toHaveLength(2);
      
      const elem1 = array.elements[0] as ConfidenceValue;
      expect((elem1.value as NumberValue).value).toBe(10);
      expect(elem1.confidence.value).toBeCloseTo(0.9);
    });
  });

  describe('Array Property Access', () => {
    test('array length property', async () => {
      const source = `
        arr = [1, 2, 3, 4, 5]
        arr.length
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(5);
    });

    test('length of empty array', async () => {
      const source = '[].length';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(0);
    });

    test('length of confident array', async () => {
      const source = '([1, 2, 3] ~> 0.8).length';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(3);
    });
  });

  describe('Array Index Access', () => {
    test('basic index access', async () => {
      const source = `
        arr = ["a", "b", "c"]
        arr[1]
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('b');
    });

    test('index access with expression', async () => {
      const source = `
        arr = [10, 20, 30]
        idx = 2
        arr[idx]
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(30);
    });

    test('index access with confident array', async () => {
      const source = `
        arr = [10, 20, 30] ~> 0.7
        arr[1]
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect((conf.value as NumberValue).value).toBe(20);
      expect(conf.confidence.value).toBeCloseTo(0.7);
    });

    test('index out of bounds error', async () => {
      const source = '[1, 2, 3][5]';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      
      await expect(runtime.execute(ast)).rejects.toThrow('Array index 5 out of bounds');
    });

    test('negative index error', async () => {
      const source = '[1, 2, 3][-1]';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      
      await expect(runtime.execute(ast)).rejects.toThrow('Array index -1 out of bounds');
    });

    test('non-numeric index error', async () => {
      const source = '[1, 2, 3]["hello"]';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      
      await expect(runtime.execute(ast)).rejects.toThrow('Array index must be a number');
    });
  });

  describe('Object Literals', () => {
    test('empty object', async () => {
      const source = 'obj = {}; obj';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ObjectValue);
      expect((result as ObjectValue).properties.size).toBe(0);
    });

    test('object with properties', async () => {
      const source = 'obj = { name: "John", age: 30 }; obj';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ObjectValue);
      const obj = result as ObjectValue;
      expect(obj.properties.size).toBe(2);
      expect((obj.properties.get('name') as StringValue).value).toBe('John');
      expect((obj.properties.get('age') as NumberValue).value).toBe(30);
    });

    test('object with string keys', async () => {
      const source = 'obj = { "first name": "John", "age": 30 }; obj';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ObjectValue);
      const obj = result as ObjectValue;
      expect((obj.properties.get('first name') as StringValue).value).toBe('John');
    });

    test('nested objects', async () => {
      const source = 'obj = { user: { name: "John", age: 30 }, active: true }; obj';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ObjectValue);
      const obj = result as ObjectValue;
      const user = obj.properties.get('user') as ObjectValue;
      expect((user.properties.get('name') as StringValue).value).toBe('John');
    });
  });

  describe('Object Property Access', () => {
    test('basic property access', async () => {
      const source = `
        person = { name: "Alice", age: 25 }
        person.name
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Alice');
    });

    test('nested property access', async () => {
      const source = `
        data = { user: { name: "Bob", score: 100 } }
        data.user.score
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(100);
    });

    test('property access on confident object', async () => {
      const source = `
        obj = { value: 42 } ~> 0.6
        obj.value
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect((conf.value as NumberValue).value).toBe(42);
      expect(conf.confidence.value).toBeCloseTo(0.6);
    });

    test('non-existent property error', async () => {
      const source = 'obj = { name: "John" }; obj.age';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      
      await expect(runtime.execute(ast)).rejects.toThrow("Property 'age' does not exist");
    });
  });

  describe('Combined Operations', () => {
    test('array of objects', async () => {
      const source = `
        users = [
          { name: "Alice", score: 90 },
          { name: "Bob", score: 85 }
        ]
        users[0].name
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Alice');
    });

    test('object with array property', async () => {
      const source = `
        result = {
          data: [10, 20, 30],
          count: 3
        }
        result.data[1]
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(20);
    });

    test('complex nesting with confidence', async () => {
      const source = `
        analysis = {
          results: [
            { score: 95 ~> 0.9 },
            { score: 88 ~> 0.7 }
          ]
        } ~> 0.8
        analysis.results[0].score
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect(conf).toBeInstanceOf(ConfidenceValue);
      // The result should be wrapped in two confidence values
      // First from the object (0.8), then from the score (0.9)
    });
  });

  describe('Array Methods (via built-in functions)', () => {
    test('using arrays with ternary operator', async () => {
      const source = `
        scores = [85, 92, 78]
        scores.length > 2 ? "many" : "few"
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('many');
    });

    test('array assignment and modification', async () => {
      const source = `
        arr = [1, 2, 3]
        newArr = [arr[0], arr[1] * 2, arr[2]]
        newArr[1]
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(4);
    });
  });

  describe('Equality and comparison', () => {
    test('array equality', async () => {
      const source = '[1, 2, 3] == [1, 2, 3]';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });

    test('object equality', async () => {
      const source = 'a = { a: 1 }; b = { a: 1 }; a == b';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(BooleanValue);
      expect((result as BooleanValue).value).toBe(true);
    });
  });
});