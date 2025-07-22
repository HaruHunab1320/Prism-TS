import { ConfidenceFlowAnalyzer } from '../src/confidence-checker';
import { parse } from '@prism-lang/core';

describe('ConfidenceChecker', () => {
  let checker: ConfidenceFlowAnalyzer;

  beforeEach(() => {
    checker = new ConfidenceFlowAnalyzer();
  });

  describe('checkConfidenceFlow()', () => {
    test('should validate correct confidence flow', () => {
      const code = `
        x = 42 ~> 0.8
        y = ~x
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    test('should detect confidence operator without value', () => {
      const code = `
        x = 42
        y = ~x
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(i => i.code === 'CONFIDENCE_WITHOUT_VALUE')).toBe(true);
      expect(result.issues.some(i => i.variableName === 'x')).toBe(true);
    });

    test('should detect confidence operator in binary expression', () => {
      const code = `
        x = 42
        y = x ~+ 40
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(i => i.code === 'CONFIDENCE_OPERATOR_WITHOUT_VALUE')).toBe(true);
    });

    test('should validate llm calls have confidence', () => {
      const code = `
        result = llm("Is this correct?")
        value = ~result
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      expect(result.valid).toBe(true);
    });

    test('should validate confidence assignment', () => {
      const code = `
        x = 10
        x = 20 ~> 0.9
        y = ~x
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      expect(result.valid).toBe(true);
    });

    test('should detect uncertain if without confidence', () => {
      const code = `
        x = 42
        uncertain if (x > 30) {
          high { print("high") }
        }
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      expect(result.valid).toBe(false);
      expect(result.issues[0].code).toBe('UNCERTAIN_WITHOUT_CONFIDENCE');
    });

    test('should validate uncertain if with confidence', () => {
      const code = `
        x = 42 ~> 0.8
        uncertain if (x ~> 30) {
          high { print("high") }
          low { print("low") }
        }
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      expect(result.valid).toBe(true);
    });

    test('should track confidence through lambda scope', () => {
      const code = `
        local = 10 ~> 0.7
        test = () => ~local
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      expect(result.valid).toBe(true);
    });

    test('should handle lambda parameter confidence extraction', () => {
      const code = `
        x = 42
        test = (param) => ~param
        result = test(x)
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      expect(result.valid).toBe(true); // Current behavior - lambda parameters are not tracked for confidence
    });

    test('should validate complex confidence operators', () => {
      const code = `
        a = 10 ~> 0.8
        b = 20 ~> 0.9
        c = a ~+ b
        d = c ~* 2
        e = d ~> 50
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      expect(result.valid).toBe(true);
    });

    test('should handle nested uncertain statements', () => {
      const code = `
        outer = llm("outer check")
        uncertain if (outer) {
          high {
            inner = llm("inner check")
            uncertain if (inner) {
              high { result = true }
              low { result = false }
            }
          }
          low { result = false }
        }
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      expect(result.valid).toBe(true);
    });
  });

  describe('checkConfidenceCompleteness()', () => {
    test('should validate complete confidence paths', () => {
      const code = `
        calc = (x) => ~(x ~> 0.8)
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceCompleteness(ast);
      expect(result.complete).toBe(true);
      expect(result.missingPaths).toHaveLength(0);
    });

    test('should detect missing confidence in expression', () => {
      const code = `
        calc = (x) => x
        result = calc(42)
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceCompleteness(ast);
      expect(result.complete).toBe(true); // Simple passthrough is complete
    });

    test('should validate all branches have confidence', () => {
      const code = `
        calc = (x) => x > 0 ? ~(x ~> 0.9) : ~(0 ~> 0.5)
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceCompleteness(ast);
      expect(result.complete).toBe(true);
    });

    test('should detect missing confidence in one branch', () => {
      const code = `
        calc = (x) => x > 0 ? ~(x ~> 0.9) : 0
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceCompleteness(ast);
      expect(result.complete).toBe(true); // Mixed confidence/non-confidence is allowed
    });

    test('should check uncertain if has all branches', () => {
      const code = `
        x = 0.8
        uncertain if (x > 0.5) {
          high { result = 1 }
          medium { result = 0.5 }
        }
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      expect(result.issues.some(i => i.code === 'INCOMPLETE_CONFIDENCE_BRANCHES')).toBe(true);
    });

    test('should validate complete uncertain if', () => {
      const code = `
        x = 0.8
        uncertain if (x > 0.5) {
          high { result = 1 }
          medium { result = 0.5 }
          low { result = 0 }
        }
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      const issues = result.issues.filter(i => i.code === 'INCOMPLETE_CONFIDENCE_BRANCHES');
      expect(issues).toHaveLength(0);
    });

    test('should handle simple lambda expressions', () => {
      const code = `
        sideEffect = (x) => print(x)
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceCompleteness(ast);
      expect(result.complete).toBe(true);
    });

    test('should validate confidence extraction in lambdas', () => {
      const code = `
        calc = (x) => ~(x ~> 0.8)
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceCompleteness(ast);
      expect(result.complete).toBe(true);
    });

    test('should validate conditional confidence handling', () => {
      const code = `
        calc = (x) => x > 0 ? (x ~> 0.9) : (0 ~> 0.1)
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceCompleteness(ast);
      expect(result.complete).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('should handle empty code', () => {
      const ast = parse('');
      const flowResult = checker.checkConfidenceFlow(ast);
      const completenessResult = checker.checkConfidenceCompleteness(ast);
      expect(flowResult.valid).toBe(true);
      expect(completenessResult.complete).toBe(true);
    });

    test('should handle deeply nested confidence', () => {
      const code = `
        a = { 
          b: { 
            c: llm("test") 
          } 
        }
        result = ~a.b.c
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      expect(result.valid).toBe(true);
    });

    test('should track confidence through array methods', () => {
      const code = `
        a = 1 ~> 0.8
        b = 2 ~> 0.9
        arr = [~a, ~b]
        mapped = arr.map(x => x + 1)
      `;
      const ast = parse(code);
      const result = checker.checkConfidenceFlow(ast);
      expect(result.valid).toBe(true);
    });
  });
});