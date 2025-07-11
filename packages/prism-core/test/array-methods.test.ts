import { tokenize } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { createRuntime } from '../src/runtime';
import { ArrayValue, NumberValue, BooleanValue, ConfidenceValue, FunctionValue } from '../src/runtime';

describe('Array Methods', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('map function', () => {
    test('map with identity function', async () => {
      // First define a simple function that doubles numbers
      await runtime.execute(new Parser(tokenize(`
        double = llm
      `), '').parse());
      
      // Override with a proper function
      const env = (runtime as any).interpreter.environment;
      env.define('double', new FunctionValue('double', async (args) => {
        const num = args[0] as NumberValue;
        return new NumberValue(num.value * 2);
      }));

      const source = `
        arr = [1, 2, 3]
        map(arr, double)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ArrayValue);
      const array = result as ArrayValue;
      expect(array.elements).toHaveLength(3);
      expect((array.elements[0] as NumberValue).value).toBe(2);
      expect((array.elements[1] as NumberValue).value).toBe(4);
      expect((array.elements[2] as NumberValue).value).toBe(6);
    });

    test('map preserves confidence', async () => {
      // Define increment function
      const env = (runtime as any).interpreter.environment;
      env.define('inc', new FunctionValue('inc', async (args) => {
        const num = args[0] as NumberValue;
        return new NumberValue(num.value + 1);
      }));

      const source = `
        arr = [1, 2, 3] ~> 0.8
        map(arr, inc)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect(conf.confidence.value).toBeCloseTo(0.8);
      
      const array = conf.value as ArrayValue;
      expect(array.elements).toHaveLength(3);
      expect((array.elements[0] as NumberValue).value).toBe(2);
    });

    test('map error on non-array', async () => {
      const source = 'map(42, llm)';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      
      await expect(runtime.execute(ast)).rejects.toThrow('First argument to map() must be an array');
    });
  });

  describe('filter function', () => {
    test('filter with predicate', async () => {
      // Define a predicate function
      const env = (runtime as any).interpreter.environment;
      env.define('isEven', new FunctionValue('isEven', async (args) => {
        const num = args[0] as NumberValue;
        return new BooleanValue(num.value % 2 === 0);
      }));

      const source = `
        arr = [1, 2, 3, 4, 5]
        filter(arr, isEven)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ArrayValue);
      const array = result as ArrayValue;
      expect(array.elements).toHaveLength(2);
      expect((array.elements[0] as NumberValue).value).toBe(2);
      expect((array.elements[1] as NumberValue).value).toBe(4);
    });

    test('filter preserves confidence', async () => {
      // Define greater than 2 predicate
      const env = (runtime as any).interpreter.environment;
      env.define('gt2', new FunctionValue('gt2', async (args) => {
        const num = args[0] as NumberValue;
        return new BooleanValue(num.value > 2);
      }));

      const source = `
        arr = [1, 2, 3, 4] ~> 0.7
        filter(arr, gt2)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect(conf.confidence.value).toBeCloseTo(0.7);
      
      const array = conf.value as ArrayValue;
      expect(array.elements).toHaveLength(2);
      expect((array.elements[0] as NumberValue).value).toBe(3);
      expect((array.elements[1] as NumberValue).value).toBe(4);
    });
  });

  describe('reduce function', () => {
    test('reduce with sum', async () => {
      // Define sum reducer
      const env = (runtime as any).interpreter.environment;
      env.define('sum', new FunctionValue('sum', async (args) => {
        const acc = args[0] as NumberValue;
        const curr = args[1] as NumberValue;
        return new NumberValue(acc.value + curr.value);
      }));

      const source = `
        arr = [1, 2, 3, 4]
        reduce(arr, sum, 0)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(10);
    });

    test('reduce without initial value', async () => {
      // Define max reducer
      const env = (runtime as any).interpreter.environment;
      env.define('max', new FunctionValue('max', async (args) => {
        const a = args[0] as NumberValue;
        const b = args[1] as NumberValue;
        return new NumberValue(Math.max(a.value, b.value));
      }));

      const source = `
        arr = [3, 1, 4, 1, 5]
        reduce(arr, max)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(5);
    });

    test('reduce on empty array with initial value', async () => {
      const env = (runtime as any).interpreter.environment;
      env.define('sum', new FunctionValue('sum', async (args) => {
        const acc = args[0] as NumberValue;
        const curr = args[1] as NumberValue;
        return new NumberValue(acc.value + curr.value);
      }));

      const source = `
        arr = []
        reduce(arr, sum, 42)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(42);
    });

    test('reduce on empty array without initial value throws', async () => {
      const source = `
        arr = []
        reduce(arr, llm)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      
      await expect(runtime.execute(ast)).rejects.toThrow('reduce() of empty array with no initial value');
    });

    test('reduce preserves confidence from array', async () => {
      const env = (runtime as any).interpreter.environment;
      env.define('sum', new FunctionValue('sum', async (args) => {
        const acc = args[0] as NumberValue;
        const curr = args[1] as NumberValue;
        return new NumberValue(acc.value + curr.value);
      }));

      const source = `
        arr = [1, 2, 3] ~> 0.9
        reduce(arr, sum, 0)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect(conf.confidence.value).toBeCloseTo(0.9);
      expect((conf.value as NumberValue).value).toBe(6);
    });
  });

  describe('Chaining array methods', () => {
    test('filter then map', async () => {
      const env = (runtime as any).interpreter.environment;
      
      // Define functions
      env.define('isOdd', new FunctionValue('isOdd', async (args) => {
        const num = args[0] as NumberValue;
        return new BooleanValue(num.value % 2 === 1);
      }));
      
      env.define('square', new FunctionValue('square', async (args) => {
        const num = args[0] as NumberValue;
        return new NumberValue(num.value * num.value);
      }));

      const source = `
        arr = [1, 2, 3, 4, 5]
        filtered = filter(arr, isOdd)
        map(filtered, square)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ArrayValue);
      const array = result as ArrayValue;
      expect(array.elements).toHaveLength(3);
      expect((array.elements[0] as NumberValue).value).toBe(1);
      expect((array.elements[1] as NumberValue).value).toBe(9);
      expect((array.elements[2] as NumberValue).value).toBe(25);
    });
  });
});