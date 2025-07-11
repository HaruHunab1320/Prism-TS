import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { Runtime } from '../src/runtime';
import { NumberValue, StringValue, ArrayValue, ObjectValue } from '../src/runtime';

describe('Spread Operator', () => {
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

  describe('Array Spread', () => {
    it('should spread array elements', async () => {
      const code = `
        arr1 = [1, 2, 3]
        arr2 = [4, 5, 6]
        combined = [...arr1, ...arr2]
        combined
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(ArrayValue);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(6);
      expect((array[0] as NumberValue).value).toBe(1);
      expect((array[5] as NumberValue).value).toBe(6);
    });

    it('should spread in the middle of array', async () => {
      const code = `
        arr = [2, 3, 4]
        result = [1, ...arr, 5]
        result
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(5);
      expect((array[0] as NumberValue).value).toBe(1);
      expect((array[1] as NumberValue).value).toBe(2);
      expect((array[4] as NumberValue).value).toBe(5);
    });

    it('should handle multiple spreads', async () => {
      const code = `
        a = [1, 2]
        b = [3, 4]
        c = [5, 6]
        result = [...a, ...b, ...c]
        result
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(6);
      expect((array[0] as NumberValue).value).toBe(1);
      expect((array[5] as NumberValue).value).toBe(6);
    });

    it('should spread empty arrays', async () => {
      const code = `
        empty = []
        result = [1, ...empty, 2]
        result
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(2);
      expect((array[0] as NumberValue).value).toBe(1);
      expect((array[1] as NumberValue).value).toBe(2);
    });

    it('should handle confident arrays when spreading', async () => {
      const code = `
        confident = [1, 2, 3] ~> 0.8
        result = [...confident, 4]
        result
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(4);
      // When spreading a confident array, the elements themselves are extracted
      expect((array[0] as NumberValue).value).toBe(1);
      expect((array[1] as NumberValue).value).toBe(2);
      expect((array[2] as NumberValue).value).toBe(3);
      expect((array[3] as NumberValue).value).toBe(4);
    });
  });

  describe('Object Spread', () => {
    it('should spread object properties', async () => {
      const code = `
        obj1 = {a: 1, b: 2}
        obj2 = {c: 3, d: 4}
        combined = {...obj1, ...obj2}
        combined
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(ObjectValue);
      const obj = result as ObjectValue;
      expect(obj.value.get('a')).toEqual(new NumberValue(1));
      expect(obj.value.get('b')).toEqual(new NumberValue(2));
      expect(obj.value.get('c')).toEqual(new NumberValue(3));
      expect(obj.value.get('d')).toEqual(new NumberValue(4));
    });

    it('should override properties with spread', async () => {
      const code = `
        obj1 = {a: 1, b: 2}
        obj2 = {b: 3, c: 4}
        result = {...obj1, ...obj2}
        result
      `;
      const result = await execute(code);
      const obj = result as ObjectValue;
      expect(obj.value.get('a')).toEqual(new NumberValue(1));
      expect(obj.value.get('b')).toEqual(new NumberValue(3)); // Overridden
      expect(obj.value.get('c')).toEqual(new NumberValue(4));
    });

    it('should mix spread with regular properties', async () => {
      const code = `
        base = {a: 1, b: 2}
        result = {...base, b: 3, c: 4}
        result
      `;
      const result = await execute(code);
      const obj = result as ObjectValue;
      expect(obj.value.get('a')).toEqual(new NumberValue(1));
      expect(obj.value.get('b')).toEqual(new NumberValue(3)); // Overridden
      expect(obj.value.get('c')).toEqual(new NumberValue(4));
    });

    it('should handle empty object spread', async () => {
      const code = `
        empty = {}
        result = {a: 1, ...empty, b: 2}
        result
      `;
      const result = await execute(code);
      const obj = result as ObjectValue;
      expect(obj.value.get('a')).toEqual(new NumberValue(1));
      expect(obj.value.get('b')).toEqual(new NumberValue(2));
    });

    it('should handle confident objects when spreading', async () => {
      const code = `
        confident = {a: 1, b: 2} ~> 0.9
        result = {...confident, c: 3}
        result
      `;
      const result = await execute(code);
      const obj = result as ObjectValue;
      // When spreading a confident object, the properties themselves are extracted
      expect(obj.value.get('a')).toEqual(new NumberValue(1));
      expect(obj.value.get('b')).toEqual(new NumberValue(2));
      expect(obj.value.get('c')).toEqual(new NumberValue(3));
    });
  });

  describe('Complex Spread Scenarios', () => {
    it('should work with nested structures', async () => {
      const code = `
        nested = {
          data: [1, 2, 3],
          meta: {status: "ok"}
        }
        result = {
          ...nested,
          extra: "info"
        }
        result
      `;
      const result = await execute(code);
      const obj = result as ObjectValue;
      expect(obj.value.get('data')).toBeInstanceOf(ArrayValue);
      expect(obj.value.get('meta')).toBeInstanceOf(ObjectValue);
      expect(obj.value.get('extra')).toEqual(new StringValue("info"));
    });

    it('should work with expressions', async () => {
      const code = `
        getArray = () => [1, 2, 3]
        result = [...getArray(), 4, 5]
        result
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(5);
      expect((array[0] as NumberValue).value).toBe(1);
      expect((array[4] as NumberValue).value).toBe(5);
    });

    it('should work with computed property spread', async () => {
      const code = `
        getObj = () => {a: 1, b: 2}
        result = {...getObj(), c: 3}
        result
      `;
      const result = await execute(code);
      const obj = result as ObjectValue;
      expect(obj.value.get('a')).toEqual(new NumberValue(1));
      expect(obj.value.get('b')).toEqual(new NumberValue(2));
      expect(obj.value.get('c')).toEqual(new NumberValue(3));
    });
  });

  describe('Error Handling', () => {
    it('should error when spreading non-array in array literal', async () => {
      const code = `
        notArray = 42
        result = [...notArray]
      `;
      await expect(execute(code)).rejects.toThrow('Cannot spread non-array value');
    });

    it('should error when spreading non-object in object literal', async () => {
      const code = `
        notObject = 42
        result = {...notObject}
      `;
      await expect(execute(code)).rejects.toThrow('Cannot spread non-object value');
    });

    it('should error when spreading null', async () => {
      const code = `
        result = [...null]
      `;
      await expect(execute(code)).rejects.toThrow('Cannot spread non-array value');
    });

    it('should error when spreading undefined', async () => {
      const code = `
        result = [...undefined]
      `;
      await expect(execute(code)).rejects.toThrow('Cannot spread non-array value');
    });
  });
});