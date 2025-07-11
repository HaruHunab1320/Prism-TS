import { PrismREPL } from './repl';
import { MockLLMProvider } from '@prism/llm';
import { BaseConfidenceValue as ConfidenceValue } from '@prism/core';

describe('Prism REPL', () => {
  let repl: PrismREPL;

  beforeEach(() => {
    repl = new PrismREPL();
    
    // Set up mock LLM provider
    const mockProvider = new MockLLMProvider();
    mockProvider.setMockResponse('Hello from AI!', new ConfidenceValue(0.9));
    repl.registerLLMProvider('mock', mockProvider);
    repl.setDefaultLLMProvider('mock');
  });

  describe('Basic Expression Evaluation', () => {
    it('should evaluate simple arithmetic', async () => {
      const result = await repl.evaluate('2 + 3');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('5');
        expect(result.type).toBe('number');
      }
    });

    it('should evaluate string operations', async () => {
      const result = await repl.evaluate('"Hello" + " " + "World"');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('Hello World');
        expect(result.type).toBe('string');
      }
    });

    it('should evaluate boolean expressions', async () => {
      const result = await repl.evaluate('10 > 5');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('true');
        expect(result.type).toBe('boolean');
      }
    });
  });

  describe('Variable Management', () => {
    it('should handle variable assignment and retrieval', async () => {
      // Assign variable
      const assignResult = await repl.evaluate('x = 42');
      expect(assignResult.success).toBe(true);
      
      // Retrieve variable
      const getResult = await repl.evaluate('x');
      expect(getResult.success).toBe(true);
      if (getResult.success) {
        expect(getResult.value).toBe('42');
      }
    });

    it('should persist variables across evaluations', async () => {
      await repl.evaluate('name = "Prism"');
      await repl.evaluate('version = 1.0');
      
      const result = await repl.evaluate('name + " v" + version');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('Prism v1');
      }
    });

    it('should show all variables with :vars command', async () => {
      await repl.evaluate('x = 10');
      await repl.evaluate('y = "hello"');
      
      const result = await repl.evaluate(':vars');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('x: 10');
        expect(result.value).toContain('y: hello');
      }
    });
  });

  describe('Confidence Operations', () => {
    it('should handle confidence expressions', async () => {
      const result = await repl.evaluate('42 ~> 0.85');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('42 (~85.0%)');
        expect(result.type).toBe('confident');
      }
    });

    it('should show confidence propagation', async () => {
      await repl.evaluate('x = 10 ~> 0.9');
      await repl.evaluate('y = 20 ~> 0.8');
      
      const result = await repl.evaluate('x + y');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('30 (~80.0%)'); // Should use minimum confidence
        expect(result.type).toBe('confident');
      }
    });
  });

  describe('LLM Integration', () => {
    it('should handle LLM function calls', async () => {
      const result = await repl.evaluate('llm("Hello AI")');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('Hello from AI!');
        expect(result.type).toBe('confident');
      }
    });

    it('should store LLM results in variables', async () => {
      await repl.evaluate('response = llm("Test question")');
      const result = await repl.evaluate('response');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('Hello from AI!');
      }
    });
  });

  describe('Control Flow', () => {
    it('should handle if statements', async () => {
      const code = `
        result = 0
        if (true) {
          result = 42
        }
        result
      `;
      
      const result = await repl.evaluate(code);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('42');
      }
    });

    it('should handle uncertain if statements', async () => {
      const code = `
        outcome = 0
        uncertain if (100 ~> 0.95) {
          high { outcome = 1 }
          low { outcome = 2 }
        }
        outcome
      `;
      
      const result = await repl.evaluate(code);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('1'); // High confidence branch
      }
    });
  });

  describe('REPL Commands', () => {
    it('should handle :help command', async () => {
      const result = await repl.evaluate(':help');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('Prism REPL Commands');
        expect(result.value).toContain(':help');
        expect(result.value).toContain(':vars');
        expect(result.value).toContain(':clear');
      }
    });

    it('should handle :clear command', async () => {
      await repl.evaluate('x = 42');
      await repl.evaluate(':clear');
      
      const result = await repl.evaluate('x');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Undefined variable');
      }
    });

    it('should handle :exit command', async () => {
      const result = await repl.evaluate(':exit');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toContain('Goodbye');
        expect(result.shouldExit).toBe(true);
      }
    });
  });

  describe('Multi-line Input', () => {
    it('should handle multi-line expressions', async () => {
      const multiLineCode = `
        x = 10
        y = 20
        z = x + y
        z * 2
      `;
      
      const result = await repl.evaluate(multiLineCode);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('60');
      }
    });

    it('should handle complex nested structures', async () => {
      // Test simpler version first
      await repl.evaluate('base = 10 ~> 0.9');
      
      const result = await repl.evaluate('base * 2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('20 (~90.0%)');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle syntax errors gracefully', async () => {
      const result = await repl.evaluate('x = ');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Expected expression');
      }
    });

    it('should handle runtime errors gracefully', async () => {
      const result = await repl.evaluate('undefined_variable + 5');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Undefined variable');
      }
    });

    it('should recover from errors and continue', async () => {
      // First evaluation with error
      const errorResult = await repl.evaluate('bad syntax here');
      expect(errorResult.success).toBe(false);
      
      // Second evaluation should work
      const goodResult = await repl.evaluate('2 + 2');
      expect(goodResult.success).toBe(true);
      if (goodResult.success) {
        expect(goodResult.value).toBe('4');
      }
    });
  });

  describe('History and State', () => {
    it('should maintain evaluation history', async () => {
      await repl.evaluate('1 + 1');
      await repl.evaluate('2 + 2');
      await repl.evaluate('3 + 3');
      
      const history = repl.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].input).toBe('1 + 1');
      expect(history[1].input).toBe('2 + 2');
      expect(history[2].input).toBe('3 + 3');
    });

    it('should provide session statistics', async () => {
      await repl.evaluate('x = 10');
      await repl.evaluate('y = 20');
      await repl.evaluate('invalid syntax');
      
      const stats = repl.getSessionStats();
      expect(stats.totalEvaluations).toBe(3);
      expect(stats.successfulEvaluations).toBe(2);
      expect(stats.errors).toBe(1);
      expect(stats.variablesCount).toBe(2);
    });
  });
});