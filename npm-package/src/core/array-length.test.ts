import { Tokenizer } from './tokenizer';
import { Parser } from './parser';
import { Runtime } from './runtime';
import { NumberValue, ArrayValue } from './runtime';

describe('Array Length Property', () => {
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

  describe('Basic .length usage', () => {
    it('should get length of array literal', async () => {
      const code = `
        arr = [1, 2, 3, 4, 5]
        len = arr.length
        len
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(5);
    });

    it('should get length of empty array', async () => {
      const code = `
        arr = []
        arr.length
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(0);
    });

    it('should get length of single element array', async () => {
      const code = `
        arr = ["hello"]
        arr.length
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(1);
    });

    it('should work with array expressions', async () => {
      const code = `
        [1, 2, 3].length
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(3);
    });

    it('should work after array modifications', async () => {
      const code = `
        arr = [1, 2]
        // Using spread to add elements (since push isn't implemented as method)
        arr = [...arr, 3, 4]
        arr.length
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(4);
    });
  });

  describe('Length in control flow', () => {
    it('should work in if conditions', async () => {
      const code = `
        arr = [1, 2, 3]
        result = "not empty"
        if (arr.length == 0) {
          result = "empty"
        }
        result
      `;
      const result = await execute(code);
      expect(result.toString()).toBe('not empty');
    });

    it('should work with logical NOT for empty check', async () => {
      const code = `
        arr = []
        isEmpty = !arr.length
        isEmpty
      `;
      const result = await execute(code);
      expect(result.value).toBe(true);
    });

    it('should work in loops (map as workaround)', async () => {
      const code = `
        arrays = [[1], [1, 2], [1, 2, 3]]
        lengths = map(arrays, arr => arr.length)
        lengths
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(ArrayValue);
      const lengthArray = (result as ArrayValue).value;
      expect((lengthArray[0] as NumberValue).value).toBe(1);
      expect((lengthArray[1] as NumberValue).value).toBe(2);
      expect((lengthArray[2] as NumberValue).value).toBe(3);
    });
  });

  describe('Length with confidence', () => {
    it('should work with confident arrays', async () => {
      const code = `
        arr = [1, 2, 3] ~> 0.8
        len = arr.length
        len
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(3);
    });

    it('should propagate confidence through length access', async () => {
      const code = `
        arr = [1, 2, 3] ~> 0.8
        hasItems = arr.length > 0
        hasItems
      `;
      const result = await execute(code);
      expect(result.value).toBe(true);
    });
  });

  describe('Common patterns', () => {
    it('should check array has items', async () => {
      const code = `
        items = ["apple", "banana", "orange"]
        hasItems = items.length > 0
        hasItems
      `;
      const result = await execute(code);
      expect(result.value).toBe(true);
    });

    it('should get last index', async () => {
      const code = `
        arr = [10, 20, 30, 40]
        lastIndex = arr.length - 1
        lastItem = arr[lastIndex]
        lastItem
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(40);
    });

    it('should validate array size', async () => {
      const code = `
        data = [1, 2, 3, 4, 5]
        isValid = data.length >= 3 && data.length <= 10
        isValid
      `;
      const result = await execute(code);
      expect(result.value).toBe(true);
    });

    it('should work with ternary for size check', async () => {
      const code = `
        items = []
        message = items.length == 0 ? "No items" : "Has \${items.length} items"
        message
      `;
      const result = await execute(code);
      expect(result.toString()).toBe('No items');
    });
  });
});