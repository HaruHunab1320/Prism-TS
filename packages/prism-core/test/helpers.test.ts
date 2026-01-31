import { runPrism, createPrismRuntime, parse } from '../src';

describe('Helper Functions', () => {
  describe('runPrism', () => {
    it('should execute simple expressions', async () => {
      const result = await runPrism('2 + 3');
      expect(result.value).toBe(5);
    });

    it('should handle confidence values', async () => {
      const result = await runPrism('let x = 42 ~> 0.9; x');
      expect(result.value.value).toBe(42);
      expect(result.confidence.value).toBe(0.9);
    });

    it('should work with custom globals', async () => {
      const result = await runPrism('PI * 2', {
        globals: { PI: 3.14159 }
      });
      expect(result.value).toBeCloseTo(6.28318);
    });

    it('should handle complex programs', async () => {
      const code = `
        let x = 10
        let y = 20
        let result = x + y
        result * 2
      `;
      const result = await runPrism(code);
      expect(result.value).toBe(60);
    });

    it('should work with arrays and loops', async () => {
      const code = `
        let nums = [1, 2, 3, 4, 5]
        let sum = 0
        let i = 0
        while (i < nums.length) {
          sum = sum + nums[i]
          i = i + 1
        }
        sum
      `;
      const result = await runPrism(code);
      expect(result.value).toBe(15);
    });
  });

  describe('createPrismRuntime', () => {
    it('should create reusable runtime', async () => {
      const runtime = createPrismRuntime();

      // Initialize counter
      const initAst = parse('let counter = 0');
      await runtime.execute(initAst);

      // First execution
      const ast1 = parse('counter = counter + 1; counter');
      const result1 = await runtime.execute(ast1);
      expect(result1.value).toBe(1);

      // Second execution - state preserved
      const ast2 = parse('counter = counter + 1; counter');
      const result2 = await runtime.execute(ast2);
      expect(result2.value).toBe(2);
    });

    it('should set up LLM provider', async () => {
      const { LLMResponse, LLMRequest } = require('../src');
      const mockProvider = {
        name: 'test-provider',
        complete: jest.fn().mockImplementation(async (request: any) => {
          return new LLMResponse('Test response', 0.9, 10, 'test-model');
        })
      };

      const runtime = createPrismRuntime({
        llmProvider: mockProvider
      });

      const ast = parse('let result = llm("Test prompt"); result');
      const result = await runtime.execute(ast);
      expect(result.type).toBe('confident');
      expect(result.value.value).toBe('Test response');
      expect(result.confidence.value).toBe(0.9);
      expect(mockProvider.complete).toHaveBeenCalled();
    });
  });

  describe('backwards compatibility', () => {
    it('should work like old prism-uncertainty', async () => {
      // Old way
      const { runPrism } = require('../src');
      const result = await runPrism('let x = 5 ~> 0.9; x * 2');
      
      expect(result.value.value).toBe(10);
      expect(result.confidence.value).toBe(0.9);
    });
  });
});
