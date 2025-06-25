import { tokenize } from './tokenizer';
import { Parser } from './parser';
import { createRuntime } from './runtime';
import { ArrayValue, NumberValue } from './runtime';

describe('Lambda Expressions', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Basic lambda syntax', () => {
    test('single parameter lambda without parentheses', async () => {
      const source = `
        double = x => x * 2
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
        increment = (x) => x + 1
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
        add = (x, y) => x + y
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
        getAnswer = () => 42
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
        numbers = [1, 2, 3, 4, 5]
        doubled = map(numbers, x => x * 2)
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
        numbers = [1, 2, 3, 4, 5, 6]
        evens = filter(numbers, x => x % 2 == 0)
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
        numbers = [1, 2, 3, 4]
        sum = reduce(numbers, (acc, x, idx) => acc + x, 0)
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
        multiplier = 10
        scale = x => x * multiplier
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
        makeAdder = x => (y => x + y)
        add5 = makeAdder(5)
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
        numbers = [1, 2, 3] ~> 0.9
        doubled = map(numbers, x => x * 2)
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
        abs = x => x < 0 ? -x : x
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
        numbers = [1, 2, 3, 4, 5, 6]
        evens = filter(numbers, x => x % 2 == 0)
        result = map(evens, x => x * x)
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
});