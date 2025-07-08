import { createRuntime } from './runtime';
import { parse } from './parser';

describe('Function Argument Spread', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Spread in function calls', () => {
    it('should spread array elements as arguments', async () => {
      const program = parse(`
        numbers = [1, 2, 3, 4, 5]
        max(...numbers)
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(5);
    });

    it('should work with multiple spread arguments', async () => {
      const program = parse(`
        arr1 = [10, 20]
        arr2 = [30, 40]
        arr3 = [50]
        
        max(...arr1, ...arr2, ...arr3)
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(50); // Maximum value
    });

    it('should mix regular and spread arguments', async () => {
      const program = parse(`
        numbers = [20, 30]
        max(10, ...numbers, 40)
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(40);
    });

    it('should work with empty arrays', async () => {
      const program = parse(`
        empty = []
        arr = [1, 2, 3]
        max(...empty, ...arr)
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(3);
    });

    it('should spread array methods results', async () => {
      const program = parse(`
        numbers = [1, 2, 3, 4, 5]
        filtered = numbers.filter(x => x > 2)
        max(...filtered)
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(5);
    });

    it('should work with lambda functions', async () => {
      const program = parse(`
        add = (a, b, c) => a + b + c
        args = [10, 20, 30]
        add(...args)
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(60);
    });

    it('should preserve confidence values when spreading', async () => {
      const program = parse(`
        confident_nums = [10 ~> 0.9, 20 ~> 0.8, 30 ~> 0.7]
        max(...confident_nums)
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('30');
      expect(result.toString()).toContain('70.0%');
    });

    it('should throw error when spreading non-array', async () => {
      const program = parse(`
        notArray = 42
        max(...notArray)
      `);
      await expect(runtime.execute(program)).rejects.toThrow(/Cannot spread non-array value/);
    });

    it('should work with built-in array functions', async () => {
      const program = parse(`
        arr1 = [1, 2, 3]
        arr2 = [4, 5, 6]
        
        // Test with push (returns new array)
        result = arr1.push(...arr2)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('[1, 2, 3, 4, 5, 6]');
    });
  });

  describe('Integration with other features', () => {
    it('should work in ternary expressions', async () => {
      const program = parse(`
        useSpread = true
        nums = [10, 20, 30]
        result = useSpread ? max(...nums) : max(nums[0])
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(30);
    });

    it('should work in confident operations', async () => {
      const program = parse(`
        nums = [5, 10, 15]
        confidentMax = max(...nums) ~> 0.95
        confidentMax
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('15');
      expect(result.toString()).toContain('95.0%');
    });

    it('should work with optional chaining', async () => {
      const program = parse(`
        data = { values: [7, 14, 21] }
        result = data?.values && max(...data.values)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(21);
    });
  });
});