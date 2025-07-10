import { Tokenizer } from './tokenizer';
import { Parser } from './parser';
import { Runtime } from './runtime';
import { NumberValue, StringValue, ArrayValue } from './runtime';

describe('Loop Statements', () => {
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

  describe('C-style For Loops', () => {
    it('should execute basic for loop', async () => {
      const code = `
        sum = 0
        for i = 0; i < 5; i = i + 1 {
          sum = sum + i
        }
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(10); // 0 + 1 + 2 + 3 + 4
    });

    it('should handle for loop with array access', async () => {
      const code = `
        arr = [1, 2, 3, 4, 5]
        sum = 0
        for i = 0; i < arr.length; i = i + 1 {
          sum = sum + arr[i]
        }
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(15);
    });

    it('should handle empty for loop', async () => {
      const code = `
        count = 0
        for i = 0; i < 0; i = i + 1 {
          count = count + 1
        }
        count
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(0);
    });

    it('should handle for loop without init', async () => {
      const code = `
        i = 0
        sum = 0
        for ; i < 3; i = i + 1 {
          sum = sum + i
        }
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(3); // 0 + 1 + 2
    });

    it('should handle for loop without condition (infinite loop with break)', async () => {
      const code = `
        count = 0
        for i = 0; ; i = i + 1 {
          if (i >= 3) {
            break
          }
          count = count + 1
        }
        count
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(3);
    });

    it('should handle for loop without update', async () => {
      const code = `
        sum = 0
        for i = 0; i < 3; {
          sum = sum + i
          i = i + 1
        }
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(3);
    });

    it('should handle break statement', async () => {
      const code = `
        sum = 0
        for i = 0; i < 10; i = i + 1 {
          if (i == 5) {
            break
          }
          sum = sum + i
        }
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(10); // 0 + 1 + 2 + 3 + 4
    });

    it('should handle continue statement', async () => {
      const code = `
        sum = 0
        for i = 0; i < 5; i = i + 1 {
          if (i == 2) {
            continue
          }
          sum = sum + i
        }
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(8); // 0 + 1 + 3 + 4 (skips 2)
    });

    it('should use existing scope for loop variable', async () => {
      const code = `
        i = 100
        sum = 0
        for i = 0; i < 3; i = i + 1 {
          sum = sum + i
        }
        i // Will be 3 after loop
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(3);
    });
  });

  describe('For-In Loops', () => {
    it('should iterate over array elements', async () => {
      const code = `
        arr = [10, 20, 30]
        sum = 0
        for item in arr {
          sum = sum + item
        }
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(60);
    });

    it('should iterate with index', async () => {
      const code = `
        arr = ["a", "b", "c"]
        result = ""
        for item, idx in arr {
          result = result + item + idx
        }
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe("a0b1c2");
    });

    it('should handle empty array', async () => {
      const code = `
        arr = []
        count = 0
        for item in arr {
          count = count + 1
        }
        count
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(0);
    });

    it('should handle break in for-in loop', async () => {
      const code = `
        arr = [1, 2, 3, 4, 5]
        sum = 0
        for item in arr {
          if (item == 3) {
            break
          }
          sum = sum + item
        }
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(3); // 1 + 2
    });

    it('should handle continue in for-in loop', async () => {
      const code = `
        arr = [1, 2, 3, 4, 5]
        sum = 0
        for item in arr {
          if (item == 3) {
            continue
          }
          sum = sum + item
        }
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(12); // 1 + 2 + 4 + 5
    });

    it('should work with confident arrays', async () => {
      const code = `
        arr = [1, 2, 3] ~> 0.8
        sum = 0
        for item in arr {
          sum = sum + item
        }
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(6);
    });

    it('should create new scope for loop variables', async () => {
      const code = `
        item = "outer";
        idx = 999;
        arr = ["a", "b"];
        for item, idx in arr {
          // item and idx are local to loop
        };
        [item, idx]
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect((array[0] as StringValue).value).toBe("outer");
      expect((array[1] as NumberValue).value).toBe(999);
    });
  });

  describe('While Loops', () => {
    it('should execute basic while loop', async () => {
      const code = `
        i = 0
        sum = 0
        while i < 5 {
          sum = sum + i
          i = i + 1
        }
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(10);
    });

    it('should handle false condition', async () => {
      const code = `
        count = 0
        while false {
          count = count + 1
        }
        count
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(0);
    });

    it('should handle break statement', async () => {
      const code = `
        i = 0
        while true {
          if (i == 3) {
            break
          }
          i = i + 1
        }
        i
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(3);
    });

    it('should handle continue statement', async () => {
      const code = `
        i = 0
        sum = 0
        while i < 5 {
          i = i + 1
          if (i == 3) {
            continue
          }
          sum = sum + i
        }
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(12); // 1 + 2 + 4 + 5
    });
  });

  describe('Do-While Loops', () => {
    it('should execute at least once', async () => {
      const code = `
        count = 0
        do {
          count = count + 1
        } while false
        count
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(1);
    });

    it('should execute multiple times', async () => {
      const code = `
        i = 0
        sum = 0
        do {
          sum = sum + i
          i = i + 1
        } while i < 3
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(3); // 0 + 1 + 2
    });

    it('should handle break statement', async () => {
      const code = `
        i = 0
        do {
          if (i == 2) {
            break
          }
          i = i + 1
        } while i < 10
        i
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(2);
    });

    it('should handle continue statement', async () => {
      const code = `
        i = 0
        sum = 0
        do {
          i = i + 1
          if (i == 2) {
            continue
          }
          sum = sum + i
        } while i < 4
        sum
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(8); // 1 + 3 + 4
    });
  });

  describe('Nested Loops', () => {
    it('should handle nested for loops', async () => {
      const code = `
        result = ""
        for i = 0; i < 3; i = i + 1 {
          for j = 0; j < 2; j = j + 1 {
            result = result + i + "," + j + ";"
          }
        }
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe("0,0;0,1;1,0;1,1;2,0;2,1;");
    });

    it('should handle break in nested loops', async () => {
      const code = `
        outer = 0
        inner = 0
        for i = 0; i < 5; i = i + 1 {
          outer = outer + 1
          for j = 0; j < 5; j = j + 1 {
            if (j == 2) {
              break // Only breaks inner loop
            }
            inner = inner + 1
          }
        }
        [outer, inner]
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect((array[0] as NumberValue).value).toBe(5);
      expect((array[1] as NumberValue).value).toBe(10); // 2 iterations * 5 outer loops
    });
  });

  describe('Loop with Complex Expressions', () => {
    it('should work with array methods in loops', async () => {
      const code = `
        arrays = [[1, 2], [3, 4], [5, 6]]
        sums = []
        for arr in arrays {
          sum = reduce(arr, (a, b) => a + b, 0)
          sums = [...sums, sum]
        }
        sums
      `;
      const result = await execute(code);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(3);
      expect((array[0] as NumberValue).value).toBe(3);
      expect((array[1] as NumberValue).value).toBe(7);
      expect((array[2] as NumberValue).value).toBe(11);
    });

    it('should work with confidence in loop conditions', async () => {
      const code = `
        values = [1, 2, 3] ~> 0.8
        sum = 0
        i = 0
        while i < values.length {
          item = values[i]
          sum = sum + item
          i = i + 1
        }
        sum
      `;
      const result = await execute(code);
      // sum becomes confident because we're adding confident values
      expect((result as any).value.value).toBe(6);
    });
  });

  describe('Error Handling', () => {
    it('should error on non-array in for-in loop', async () => {
      const code = `
        notArray = 42
        for item in notArray {
          // Should not execute
        }
      `;
      await expect(execute(code)).rejects.toThrow('for...in loop requires an array');
    });

    it('should handle break outside of loop', async () => {
      const code = `
        break
      `;
      // Break outside loop should throw LoopControlError which is unhandled
      await expect(execute(code)).rejects.toThrow();
    });

    it('should handle continue outside of loop', async () => {
      const code = `
        continue
      `;
      // Continue outside loop should throw LoopControlError which is unhandled
      await expect(execute(code)).rejects.toThrow();
    });
  });
});