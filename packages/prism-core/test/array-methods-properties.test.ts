import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { Runtime } from '../src/runtime';
import { NumberValue, StringValue, ArrayValue, BooleanValue, NullValue, ConfidenceValue } from '../src/runtime';

describe('Array Methods as Properties', () => {
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

  describe('Array.map()', () => {
    it('should transform array elements', async () => {
      const code = `
        let arr = [1, 2, 3]
        let doubled = arr.map(x => x * 2)
        doubled
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(ArrayValue);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(3);
      expect((array[0] as NumberValue).value).toBe(2);
      expect((array[1] as NumberValue).value).toBe(4);
      expect((array[2] as NumberValue).value).toBe(6);
    });

    it('should work with string transformations', async () => {
      const code = `
        let names = ["alice", "bob", "charlie"]
        let upper = names.map(name => name + "!")
        upper
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(3);
      expect((array[0] as StringValue).value).toBe("alice!");
      expect((array[1] as StringValue).value).toBe("bob!");
      expect((array[2] as StringValue).value).toBe("charlie!");
    });

    it('should work with confident arrays', async () => {
      const code = `
        let confident = [1, 2, 3] ~> 0.8
        let result = confident.map(x => x + 10)
        result
      `;
      const result = await execute(code);
      expect(result.type).toBe('confident');
      const innerArray = (result as any).value as ArrayValue;
      const array = innerArray.value;
      expect(array.length).toBe(3);
      expect((array[0] as NumberValue).value).toBe(11);
      expect((array[1] as NumberValue).value).toBe(12);
      expect((array[2] as NumberValue).value).toBe(13);
    });

    it('should chain with other methods', async () => {
      const code = `
        let result = [1, 2, 3, 4, 5]
          .map(x => x * 2)
          .filter(x => x > 5)
        result
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(3);
      expect((array[0] as NumberValue).value).toBe(6);
      expect((array[1] as NumberValue).value).toBe(8);
      expect((array[2] as NumberValue).value).toBe(10);
    });
  });

  describe('Array.filter()', () => {
    it('should filter array elements', async () => {
      const code = `
        let arr = [1, 2, 3, 4, 5]
        let evens = arr.filter(x => x % 2 == 0)
        evens
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(2);
      expect((array[0] as NumberValue).value).toBe(2);
      expect((array[1] as NumberValue).value).toBe(4);
    });

    it('should work with boolean predicates', async () => {
      const code = `
        let arr = [true, false, true, false, true]
        let truthy = arr.filter(x => x)
        truthy
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(3);
      expect((array[0] as BooleanValue).value).toBe(true);
      expect((array[1] as BooleanValue).value).toBe(true);
      expect((array[2] as BooleanValue).value).toBe(true);
    });

    it('should preserve confidence', async () => {
      const code = `
        let confident = [1, 2, 3, 4, 5] ~> 0.7
        let result = confident.filter(x => x > 2)
        result
      `;
      const result = await execute(code);
      expect(result.type).toBe('confident');
      const innerArray = (result as any).value as ArrayValue;
      const array = innerArray.value;
      expect(array.length).toBe(3);
      expect((array[0] as NumberValue).value).toBe(3);
      expect((array[1] as NumberValue).value).toBe(4);
      expect((array[2] as NumberValue).value).toBe(5);
    });

    it('should return empty array when nothing matches', async () => {
      const code = `
        let arr = [1, 2, 3]
        let result = arr.filter(x => x > 10)
        result
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(0);
    });
  });

  describe('Array.reduce()', () => {
    it('should reduce array to single value', async () => {
      const code = `
        let arr = [1, 2, 3, 4, 5]
        let sum = arr.reduce((acc, x) => acc + x)
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(15);
    });

    it('should work with initial value', async () => {
      const code = `
        let arr = [1, 2, 3]
        let sum = arr.reduce((acc, x) => acc + x, 10)
        sum
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(16);
    });

    it('should work with string concatenation', async () => {
      const code = `
        let words = ["hello", "world", "!"]
        let sentence = words.reduce((acc, word) => acc + " " + word)
        sentence
      `;
      const result = await execute(code);
      expect((result as StringValue).value).toBe("hello world !");
    });

    it('should preserve confidence from input array', async () => {
      const code = `
        let confident = [1, 2, 3] ~> 0.9
        let result = confident.reduce((acc, x) => acc + x)
        result
      `;
      const result = await execute(code);
      expect(result.type).toBe('confident');
      const value = (result as any).value as NumberValue;
      expect(value.value).toBe(6);
    });

    it('should pass index as third argument', async () => {
      const code = `
        let arr = [10, 20, 30]
        let result = arr.reduce((acc, val, idx) => acc + val * idx, 0)
        result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(80); // 0*10 + 1*20 + 2*30 = 80
    });

    it('should error on empty array without initial value', async () => {
      const code = `
        let empty = []
        let result = empty.reduce((a, b) => a + b)
      `;
      await expect(execute(code)).rejects.toThrow('reduce() of empty array with no initial value');
    });
  });

  describe('Array.push()', () => {
    it('should add elements to array', async () => {
      const code = `
        let arr = [1, 2, 3]
        let newArr = arr.push(4)
        newArr
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(4);
      expect((array[3] as NumberValue).value).toBe(4);
    });

    it('should add multiple elements', async () => {
      const code = `
        let arr = [1]
        let newArr = arr.push(2, 3, 4)
        newArr
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(4);
      expect((array[1] as NumberValue).value).toBe(2);
      expect((array[2] as NumberValue).value).toBe(3);
      expect((array[3] as NumberValue).value).toBe(4);
    });

    it('should preserve confidence', async () => {
      const code = `
        let confident = [1, 2] ~> 0.8
        let result = confident.push(3)
        result
      `;
      const result = await execute(code);
      expect(result.type).toBe('confident');
      const innerArray = (result as any).value as ArrayValue;
      expect(innerArray.value.length).toBe(3);
    });

    it('should not mutate original array', async () => {
      const code = `
        let original = [1, 2, 3]
        let newArr = original.push(4)
        let originalLength = original.length
        let newLength = newArr.length
        let result = {original: originalLength, new: newLength}
        result
      `;
      const result = await execute(code);
      const obj = result as any;
      expect(obj.value.get('original').value).toBe(3); // Original unchanged
      expect(obj.value.get('new').value).toBe(4); // New has extra element
    });
  });

  describe('Array.forEach()', () => {
    it('should return null', async () => {
      const code = `
        let arr = [1, 2, 3]
        let result = arr.forEach(x => x * 2)
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NullValue);
    });

    it('should work with confident arrays', async () => {
      const code = `
        let confident = [1, 2, 3] ~> 0.9
        let result = confident.forEach(x => x * 2)
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(ConfidenceValue);
      expect((result as any).value).toBeInstanceOf(NullValue);
    });

    it('should accept functions with different arities', async () => {
      const code = `
        let arr = [1, 2, 3]
        // Single parameter function
        let r1 = arr.forEach(x => x)
        // Two parameter function (with index)
        let r2 = arr.forEach((x, i) => x + i)
        let result = {first: r1, second: r2}
        result
      `;
      const result = await execute(code);
      const obj = result as any;
      expect(obj.value.get('first')).toBeInstanceOf(NullValue);
      expect(obj.value.get('second')).toBeInstanceOf(NullValue);
    });
  });

  describe('Method chaining', () => {
    it('should chain multiple array methods', async () => {
      const code = `
        let result = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
          .filter(x => x % 2 == 0)
          .map(x => x * x)
          .reduce((a, b) => a + b, 0)
        result
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(220); // 4 + 16 + 36 + 64 + 100
    });

    it('should work with complex transformations', async () => {
      const code = `
        let people = [
          {name: "Alice", age: 25},
          {name: "Bob", age: 30},
          {name: "Charlie", age: 35}
        ]
        
        let totalAge = people
          .filter(p => p.age > 25)
          .map(p => p.age)
          .reduce((sum, age) => sum + age, 0)
        
        totalAge
      `;
      const result = await execute(code);
      expect((result as NumberValue).value).toBe(65); // 30 + 35
    });
  });

  describe('Compatibility with global functions', () => {
    it('should still work with global map function', async () => {
      const code = `
        let arr = [1, 2, 3]
        // Both should work
        let method = arr.map(x => x * 2)
        let func = map(arr, x => x * 2)
        let result = {method: method, func: func}
        result
      `;
      const result = await execute(code);
      const obj = result as any;
      
      const method = obj.value.get('method') as ArrayValue;
      const func = obj.value.get('func') as ArrayValue;
      
      expect(method.value.length).toBe(3);
      expect(func.value.length).toBe(3);
      expect((method.value[0] as NumberValue).value).toBe(2);
      expect((func.value[0] as NumberValue).value).toBe(2);
    });
  });

  describe('Error handling', () => {
    it('should error when map is called without function', async () => {
      const code = `
        let arr = [1, 2, 3]
        let result = arr.map(42)
      `;
      await expect(execute(code)).rejects.toThrow('Argument to map() must be a function');
    });

    it('should error when filter is called without function', async () => {
      const code = `
        let arr = [1, 2, 3]
        let result = arr.filter("not a function")
      `;
      await expect(execute(code)).rejects.toThrow('Argument to filter() must be a function');
    });

    it('should error when reduce is called without function', async () => {
      const code = `
        let arr = [1, 2, 3]
        let result = arr.reduce(123)
      `;
      await expect(execute(code)).rejects.toThrow('First argument to reduce() must be a function');
    });

    it('should error when forEach is called without function', async () => {
      const code = `
        let arr = [1, 2, 3]
        arr.forEach(null)
      `;
      await expect(execute(code)).rejects.toThrow('Argument to forEach() must be a function');
    });

    it('should error when push is called without arguments', async () => {
      const code = `
        let arr = [1, 2, 3]
        let result = arr.push()
      `;
      await expect(execute(code)).rejects.toThrow('Array.push() requires at least 1 argument');
    });
  });
});
