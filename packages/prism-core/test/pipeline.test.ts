import { createRuntime } from '../src/runtime';
import { parse } from '../src/parser';

describe('Pipeline Operators', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Basic Pipeline Operator |>', () => {
    it('should pipe value through single function', async () => {
      const program = parse(`
        double = x => x * 2
        result = 5 |> double(_)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(10);
    });

    it('should chain multiple pipeline operations', async () => {
      const program = parse(`
        double = x => x * 2
        addOne = x => x + 1
        result = 5 
          |> double(_)
          |> addOne(_)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(11); // (5 * 2) + 1
    });

    it('should work with array methods', async () => {
      const program = parse(`
        nums = [1, 2, 3, 4, 5]
        result = nums
          |> filter(_, x => x > 2)
          |> map(_, x => x * 2)
          |> reduce(_, (a, b) => a + b, 0)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(24); // (3*2 + 4*2 + 5*2) = 24
    });

    it('should work with property access', async () => {
      const program = parse(`
        data = { values: [1, 2, 3, 4, 5] }
        result = data.values
          |> filter(_, x => x % 2 == 0)
          |> map(_, x => x * x)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('[4, 16]');
    });

    it('should handle nested pipelines', async () => {
      const program = parse(`
        double = x => x * 2
        greaterThanTwo = x => x > 2
        
        data = [1, 2, 3, 4]
        filtered = filter(data, greaterThanTwo)
        result = map(filtered, double)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('[6, 8]');
    });
  });

  describe('Confidence Pipeline Operator ~|>', () => {
    it('should preserve confidence through pipeline', async () => {
      const program = parse(`
        double = x => x * 2
        addOne = x => x + 1
        
        confident_value = 5 ~> 0.8
        result = confident_value
          ~|> double(_)
          ~|> addOne(_)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('11');
      expect(result.toString()).toContain('80.0%');
    });

    it('should chain confidence operations', async () => {
      const program = parse(`
        process1 = x => x * 2
        process2 = x => x + 10
        
        data = 10 ~> 0.9
        result = data
          ~|> process1(_)
          ~|> process2(_) ~> 0.7  // Modify confidence mid-pipeline
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('30'); // (10 * 2) + 10
      expect(result.toString()).toContain('70.0%'); // New confidence from ~> 0.7
    });

    it('should work with confidence-aware functions', async () => {
      const program = parse(`
        nums = [1 ~> 0.9, 2 ~> 0.8, 3 ~> 0.7]
        filtered = filter(nums, x => (<~ x) > 0.75)
        result = filtered ~> 0.85
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('['); // Array result
      expect(result.toString()).toContain('85.0%'); // Confidence preserved
    });

    it('should handle llm calls in pipeline', async () => {
      const program = parse(`
        process = data => "processed: " + data
        analyze = prompt => "Analysis: " + prompt
        
        input_data = "important data" ~> 0.85
        result = input_data
          ~|> process(_)
          ~|> analyze(_)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain("Analysis: processed: important data");
      expect(result.toString()).toContain('85.0%');
    });
  });

  describe('Placeholder behavior', () => {
    it('should error if placeholder used outside pipeline', async () => {
      const program = parse(`
        result = _
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Placeholder (_) can only be used within pipeline expressions');
    });

    it('should handle multiple placeholders in same call', async () => {
      const program = parse(`
        add = (a, b) => a + b
        result = 10 |> add(_, 5)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(15);
    });

    it('should work with nested function calls', async () => {
      const program = parse(`
        double = x => x * 2
        add = (a, b) => a + b
        
        result = 5 |> add(double(_), 3)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(13); // double(5) + 3 = 10 + 3
    });
  });

  describe('Integration with existing features', () => {
    it('should work with spread operator', async () => {
      const program = parse(`
        sum = (...nums) => nums.reduce((a, b) => a + b, 0)
        nums = [1, 2, 3]
        result = nums |> sum(..._)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(6);
    });

    it('should work in ternary expressions', async () => {
      const program = parse(`
        process = x => x * 2
        value = 5
        useProcess = true
        result = useProcess ? (value |> process(_)) : value
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(10);
    });

    it('should work with uncertain control flow', async () => {
      const program = parse(`
        classify = score => score >= 80 ? "high" : "low"
        
        score = 85 ~> 0.9
        result = "none"
        uncertain if (score ~|> classify(_)) {
          high { result = "excellent" }
          medium { result = "good" }
          low { result = "needs improvement" }
        }
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("excellent");
    });
  });
});