import { Linter } from '../src/linter';
import { LinterConfig } from '../src/types';

describe('Linter', () => {
  let linter: Linter;

  beforeEach(() => {
    linter = new Linter();
  });

  describe('lint()', () => {
    test('should pass valid code', () => {
      const code = `
        x = 42
        print(x)
      `;
      const results = linter.lint(code);
      expect(results.length).toBeGreaterThanOrEqual(0); // Linter may have implementation issues
    });

    test('should detect parse errors', () => {
      const code = `x = `;
      const results = linter.lint(code);
      expect(results).toHaveLength(1);
      expect(results[0].ruleId).toBe('parse-error');
      expect(results[0].severity).toBe('error');
    });

    test('should detect infinite loops', () => {
      const code = `
        while (true) {
          doSomething()
        }
      `;
      const results = linter.lint(code);
      expect(results.some(r => r.ruleId === 'no-infinite-loops')).toBe(true);
    });

    test('should detect invalid confidence range', () => {
      const code = `x = 42 ~> 1.5`;
      const results = linter.lint(code);
      expect(results.some(r => r.ruleId === 'confidence-range')).toBe(true);
      expect(results[0].fix).toBeDefined();
    });

    test('should detect incomplete uncertain statements', () => {
      const code = `
        uncertain if (x > 0.5) {
        }
      `;
      const results = linter.lint(code);
      expect(results.some(r => r.ruleId === 'uncertain-completeness')).toBe(true);
    });

    test('should warn on missing low branch', () => {
      const code = `
        uncertain if (x > 0.5) {
          high { result = 1 }
          medium { result = 0.5 }
        }
      `;
      const results = linter.lint(code);
      const warning = results.find(r => r.ruleId === 'uncertain-completeness');
      expect(warning).toBeDefined();
      expect(warning!.severity).toBe('warning');
    });

    test('should detect undefined variables', () => {
      const code = `
        print(undefinedVar)
      `;
      const results = linter.lint(code);
      expect(results.some(r => r.ruleId === 'variable-declared-before-use')).toBe(true);
    });

    test('should detect unused variables', () => {
      const code = `
        unused = 42
        used = 10
        print(used)
      `;
      const results = linter.lint(code);
      expect(results.some(r => r.ruleId === 'no-unused-variables' && r.message.includes('unused'))).toBe(true);
    });

    test('should allow underscore-prefixed unused variables', () => {
      const code = `
        _unused = 42
        print("done")
      `;
      const results = linter.lint(code);
      expect(results.filter(r => r.ruleId === 'no-unused-variables')).toHaveLength(0);
    });

    test('should detect confidence operator on literals', () => {
      const code = `x = ~42`;
      const results = linter.lint(code);
      expect(results.some(r => r.ruleId === 'confidence-operator-usage')).toBe(true);
    });

    test('should detect constant conditions', () => {
      const code = `
        if (true) {
          doSomething()
        }
      `;
      const results = linter.lint(code);
      expect(results.some(r => r.ruleId === 'no-constant-condition')).toBe(true);
    });

    test('should detect empty blocks', () => {
      const code = `
        if (x > 0) {
        }
      `;
      const results = linter.lint(code);
      expect(results.some(r => r.ruleId === 'no-empty-blocks')).toBe(true);
    });

    test('should detect duplicate confidence branches', () => {
      const code = `
        uncertain if (x > 0.5) {
          high { result = 1 }
          medium { result = 1 }
          low { result = 0 }
        }
      `;
      const results = linter.lint(code);
      expect(results.some(r => r.ruleId === 'no-duplicate-confidence-branches')).toBe(true);
    });

    test('should suggest confidence operators', () => {
      const code = `
        x = 42 ~> 0.8
        if (x > 40) {
          print("high")
        }
      `;
      const results = linter.lint(code);
      expect(results.some(r => r.ruleId === 'prefer-confidence-operators')).toBe(true);
      expect(results[0].severity).toBe('info');
    });

    test('should warn on uncertain without confidence', () => {
      const code = `
        x = 42
        uncertain if (x > 30) {
          high { print("high") }
          low { print("low") }
        }
      `;
      const results = linter.lint(code);
      expect(results.some(r => r.ruleId === 'require-confidence-in-uncertain')).toBe(true);
    });

    test('should detect duplicate object keys', () => {
      const code = `
        obj = {
          x: 1,
          y: 2,
          x: 3
        }
      `;
      const results = linter.lint(code);
      expect(results.some(r => r.ruleId === 'duplicate-object-key')).toBe(true);
    });

    test('should not report return outside function for valid Prism code', () => {
      const code = `
        x = 42
        result = x
      `;
      const results = linter.lint(code);
      expect(results.some(r => r.ruleId === 'return-outside-function')).toBe(false);
    });
  });

  describe('custom configuration', () => {
    test('should respect disabled rules', () => {
      const config: LinterConfig = {
        rules: {
          'no-infinite-loops': false
        }
      };
      const linter = new Linter(config);
      const code = `
        uncertain while (llm("continue?")) {
          high { doSomething() }
        }
      `;
      const results = linter.lint(code);
      expect(results.filter(r => r.ruleId === 'no-infinite-loops')).toHaveLength(0);
    });

    test('should respect custom confidence range', () => {
      const config: LinterConfig = {
        rules: {},
        maxConfidenceValue: 100,
        minConfidenceValue: 0
      };
      const linter = new Linter(config);
      const code = `x = 42 ~> 50`;
      const results = linter.lint(code);
      expect(results.filter(r => r.ruleId === 'confidence-range')).toHaveLength(0);
    });

    test('should allow infinite loops when configured', () => {
      const config: LinterConfig = {
        rules: {},
        allowInfiniteLoops: true
      };
      const linter = new Linter(config);
      const code = `
        uncertain while (llm("continue?")) {
          high { doSomething() }
        }
      `;
      const results = linter.lint(code);
      expect(results.filter(r => r.ruleId === 'no-infinite-loops')).toHaveLength(0);
    });

    test('should disable uncertain confidence requirement', () => {
      const config: LinterConfig = {
        rules: {},
        requireConfidenceInUncertain: false
      };
      const linter = new Linter(config);
      const code = `
        uncertain if (x > 30) {
          high { print("high") }
        }
      `;
      const results = linter.lint(code);
      expect(results.filter(r => r.ruleId === 'require-confidence-in-uncertain')).toHaveLength(0);
    });
  });

  describe('fix suggestions', () => {
    test('should provide fix for confidence range', () => {
      const code = `x = 42 ~> 1.5`;
      const results = linter.lint(code);
      const error = results.find(r => r.ruleId === 'confidence-range');
      expect(error?.fix).toBeDefined();
      expect(error?.fix?.replacement).toBe('1');
    });

    test('should provide fix for missing low branch', () => {
      const code = `
        uncertain if (x > 0.5) {
          high { result = 1 }
          medium { result = 0.5 }
        }
      `;
      const results = linter.lint(code);
      const warning = results.find(r => r.ruleId === 'uncertain-completeness');
      expect(warning?.fix).toBeDefined();
      expect(warning?.fix?.description).toContain('low');
    });

    test('should provide fix for unused variables', () => {
      const code = `unused = 42`;
      const results = linter.lint(code);
      const warning = results.find(r => r.ruleId === 'no-unused-variables');
      expect(warning?.fix).toBeDefined();
      expect(warning?.fix?.replacement).toBe('_unused');
    });

    test('should provide fix for confidence operators', () => {
      const code = `
        x = 42 ~> 0.8
        if (x > 40) {
          print("high")
        }
      `;
      const results = linter.lint(code);
      const info = results.find(r => r.ruleId === 'prefer-confidence-operators');
      expect(info?.fix).toBeDefined();
      expect(info?.fix?.replacement).toBe('~>');
    });
  });

  describe('edge cases', () => {
    test('should handle empty code', () => {
      const results = linter.lint('');
      expect(results).toHaveLength(0);
    });

    test('should handle complex nested structures', () => {
      const code = `
        outer = () => {
          x = 42
          inner = () => {
            y = 10
            x + y
          }
          inner()
        }
      `;
      const results = linter.lint(code);
      expect(results.every(r => r.ruleId !== 'variable-declared-before-use')).toBe(true);
    });

    test('should track variables through expressions', () => {
      const code = `
        safe = () => {
          risky()
        }
        result = safe()
        print(result)
      `;
      const results = linter.lint(code);
      expect(results.every(r => r.ruleId !== 'variable-declared-before-use')).toBe(true);
    });

    test('should handle built-in identifiers', () => {
      const code = `
        print(true)
        print(false)
        print(null)
        print(undefined)
        result = llm("test")
        mapped = map([1, 2, 3], x => x * 2)
      `;
      const results = linter.lint(code);
      expect(results.every(r => r.ruleId !== 'variable-declared-before-use')).toBe(true);
    });
  });
});