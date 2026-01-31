import { tokenize } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { createRuntime } from '../src/runtime';
import { ArrayValue, NumberValue } from '../src/runtime';

describe('Lambda Expressions', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Basic lambda syntax', () => {
    test('single parameter lambda without parentheses', async () => {
      const source = `
        let double = x => x * 2
        double(5)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(10);
    });

    test('single parameter lambda with parentheses', async () => {
      const source = `
        let increment = (x) => x + 1
        increment(9)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(10);
    });

    test('multiple parameter lambda', async () => {
      const source = `
        let add = (x, y) => x + y
        add(3, 7)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(10);
    });

    test('zero parameter lambda', async () => {
      const source = `
        let getAnswer = () => 42
        getAnswer()
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(42);
    });
  });

  describe('Lambda with array methods', () => {
    test('map with lambda', async () => {
      const source = `
        let numbers = [1, 2, 3, 4, 5]
        let doubled = map(numbers, x => x * 2)
        doubled
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ArrayValue);
      const array = result as ArrayValue;
      expect(array.elements).toHaveLength(5);
      expect((array.elements[0] as NumberValue).value).toBe(2);
      expect((array.elements[4] as NumberValue).value).toBe(10);
    });

    test('filter with lambda', async () => {
      const source = `
        let numbers = [1, 2, 3, 4, 5, 6]
        let evens = filter(numbers, x => x % 2 == 0)
        evens
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

    test('reduce with lambda', async () => {
      const source = `
        let numbers = [1, 2, 3, 4]
        let sum = reduce(numbers, (acc, x, idx) => acc + x, 0)
        sum
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(10);
    });
  });

  describe('Lambda closures', () => {
    test('lambda captures outer scope', async () => {
      const source = `
        let multiplier = 10
        let scale = x => x * multiplier
        scale(5)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(50);
    });

    test('nested lambdas', async () => {
      const source = `
        let makeAdder = x => (y => x + y)
        let add5 = makeAdder(5)
        add5(3)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(8);
    });
  });

  describe('Lambda with confidence', () => {
    test('lambda preserves confidence in map', async () => {
      const source = `
        let numbers = [1, 2, 3] ~> 0.9
        let doubled = map(numbers, x => x * 2)
        doubled
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
    });
  });

  describe('Complex lambda expressions', () => {
    test('lambda with ternary expression', async () => {
      const source = `
        let abs = x => x < 0 ? -x : x
        abs(-5)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(5);
    });

    test('chained array operations with lambdas', async () => {
      const source = `
        let numbers = [1, 2, 3, 4, 5, 6]
        let evens = filter(numbers, x => x % 2 == 0)
        let result = map(evens, x => x * x)
        result
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ArrayValue);
      const array = result as ArrayValue;
      expect(array.elements).toHaveLength(3);
      expect((array.elements[0] as NumberValue).value).toBe(4);
      expect((array.elements[1] as NumberValue).value).toBe(16);
      expect((array.elements[2] as NumberValue).value).toBe(36);
    });
  });

  describe('Multi-parameter lambda expressions', () => {
    test('three parameter lambda', async () => {
      const source = `
        let multiply3 = (a, b, c) => a * b * c
        multiply3(2, 3, 4)
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(24);
    });

    test('lambda with string parameters', async () => {
      const source = `
        let greet = (first, last, title) => title + " " + first + " " + last
        greet("John", "Doe", "Dr.")
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.value).toBe("Dr. John Doe");
    });

    test('array.filter with multi-param predicate', async () => {
      const source = `
        let pairs = [[1, 2], [3, 4], [5, 6]]
        let sumGreaterThan5 = filter(pairs, (pair) => {
          let sum = pair[0] + pair[1]
          sum > 5
        })
        sumGreaterThan5
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ArrayValue);
      const array = result as ArrayValue;
      expect(array.elements).toHaveLength(2);
    });

    test('reduce with accumulator and value', async () => {
      const source = `
        let numbers = [1, 2, 3, 4, 5]
        let product = reduce(numbers, (acc, val) => acc * val, 1)
        product
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(120);
    });

    test('nested multi-param lambdas', async () => {
      const source = `
        let makeCalculator = (op) => (a, b) => op == "+" ? a + b : a * b
        let adder = makeCalculator("+")
        let result = adder(3, 4)
        result
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(7);
    });

    test('multi-param lambda with confidence', async () => {
      const source = `
        let confidenceAdd = (a, b) => (a ~+ b) ~> 0.95
        let result = confidenceAdd(10 ~> 0.8, 20 ~> 0.9)
        result
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      const confResult = result as any;
      // The result is a ConfidenceValue containing another ConfidenceValue
      expect(confResult.value.type).toBe('confident');
      expect(confResult.value.value.type).toBe('number');
      expect(confResult.value.value.value).toBe(30);
      expect(confResult.confidence._value).toBeCloseTo(0.95);
    });
  });
});