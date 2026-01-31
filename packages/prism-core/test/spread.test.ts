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
        let arr1 = [1, 2, 3]
        let arr2 = [4, 5, 6]
        let combined = [...arr1, ...arr2]
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
        let arr = [2, 3, 4]
        let result = [1, ...arr, 5]
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
        let a = [1, 2]
        let b = [3, 4]
        let c = [5, 6]
        let result = [...a, ...b, ...c]
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
        let empty = []
        let result = [1, ...empty, 2]
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
        let confident = [1, 2, 3] ~> 0.8
        let result = [...confident, 4]
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
        let obj1 = {a: 1, b: 2}
        let obj2 = {c: 3, d: 4}
        let combined = {...obj1, ...obj2}
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
        let obj1 = {a: 1, b: 2}
        let obj2 = {b: 3, c: 4}
        let result = {...obj1, ...obj2}
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
        let base = {a: 1, b: 2}
        let result = {...base, b: 3, c: 4}
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
        let empty = {}
        let result = {a: 1, ...empty, b: 2}
        result
      `;
      const result = await execute(code);
      const obj = result as ObjectValue;
      expect(obj.value.get('a')).toEqual(new NumberValue(1));
      expect(obj.value.get('b')).toEqual(new NumberValue(2));
    });

    it('should handle confident objects when spreading', async () => {
      const code = `
        let confident = {a: 1, b: 2} ~> 0.9
        let result = {...confident, c: 3}
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
        let nested = {
          data: [1, 2, 3],
          meta: {status: "ok"}
        }
        let result = {
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
        let getArray = () => [1, 2, 3]
        let result = [...getArray(), 4, 5]
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
        let getObj = () => ({a: 1, b: 2})
        let result = {...getObj(), c: 3}
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
        let notArray = 42
        let result = [...notArray]
      `;
      await expect(execute(code)).rejects.toThrow('Cannot spread non-array value');
    });

    it('should error when spreading non-object in object literal', async () => {
      const code = `
        let notObject = 42
        let result = {...notObject}
      `;
      await expect(execute(code)).rejects.toThrow('Cannot spread non-object value');
    });

    it('should error when spreading null', async () => {
      const code = `
        let result = [...null]
      `;
      await expect(execute(code)).rejects.toThrow('Cannot spread non-array value');
    });

    it('should error when spreading null', async () => {
      const code = `
        let result = [...null]
      `;
      await expect(execute(code)).rejects.toThrow('Cannot spread non-array value');
    });
  });
});