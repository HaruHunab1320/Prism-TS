// Test imports
import { tokenize } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { createRuntime } from '../src/runtime';
import { NumberValue, StringValue, ConfidenceValue } from '../src/runtime';

describe('Compound Assignment Operators', () => {
  let runtime: any;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Basic compound assignments', () => {
    it('should support += operator', async () => {
      const source = `
        let x = 10
        x += 5
        x
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(15);
    });

    it('should support -= operator', async () => {
      const source = `
        let x = 20
        x -= 8
        x
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(12);
    });

    it('should support *= operator', async () => {
      const source = `
        let x = 5
        x *= 3
        x
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(15);
    });

    it('should support /= operator', async () => {
      const source = `
        let x = 20
        x /= 4
        x
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(5);
    });

    it('should support %= operator', async () => {
      const source = `
        let x = 17
        x %= 5
        x
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(2);
    });
  });

  describe('Compound assignments with strings', () => {
    it('should support += with strings', async () => {
      const source = `
        let message = "Hello"
        message += " World"
        message
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Hello World');
    });
  });

  describe('Compound assignments with confidence', () => {
    it('should preserve confidence with +=', async () => {
      const source = `
        let x = 10 ~> 0.8
        x += 5
        x
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ConfidenceValue);
      expect(((result as ConfidenceValue).value as NumberValue).value).toBe(15);
      expect((result as ConfidenceValue).confidence.value).toBe(0.8);
    });

    it('should use minimum confidence when both operands have confidence', async () => {
      const source = `
        let x = 10 ~> 0.9
        let y = 5 ~> 0.7
        x += y
        x
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(ConfidenceValue);
      expect(((result as ConfidenceValue).value as NumberValue).value).toBe(15);
      expect((result as ConfidenceValue).confidence.value).toBe(0.7);
    });
  });

  describe('Chain compound assignments', () => {
    it('should support multiple compound assignments', async () => {
      const source = `
        let x = 100
        x += 50
        x *= 2
        x -= 100
        x /= 2
        x
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(100);
    });
  });

  describe('Compound assignments in expressions', () => {
    it('should work in conditional statements', async () => {
      const source = `
        let count = 0
        if (true) {
          count += 10
        }
        count
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(10);
    });

    it('should work with array elements', async () => {
      const source = `
        let sum = 0
        let numbers = [1, 2, 3, 4, 5]
        sum += numbers[0]
        sum += numbers[1]
        sum += numbers[2]
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
});