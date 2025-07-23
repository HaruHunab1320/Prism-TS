import { Validator } from '../src/validator';
import { Linter } from '../src/linter';

describe('New Features Validation Infrastructure', () => {
  let validator: Validator;
  let linter: Linter;

  beforeEach(() => {
    validator = new Validator();
    linter = new Linter();
  });

  describe('Validator Extensions', () => {
    it('should have methods for validating const declarations', () => {
      expect(typeof (validator as any).validateConstDeclaration).toBe('function');
    });

    it('should have methods for validating let declarations', () => {
      expect(typeof (validator as any).validateLetDeclaration).toBe('function');
    });

    it('should have methods for validating function declarations', () => {
      expect(typeof (validator as any).validateFunctionDeclaration).toBe('function');
    });

    it('should have methods for validating import/export statements', () => {
      expect(typeof (validator as any).validateImportStatement).toBe('function');
      expect(typeof (validator as any).validateExportStatement).toBe('function');
    });
  });

  describe('Linter Rule Extensions', () => {
    it('should include new rules in default configuration', () => {
      const config = (linter as any).mergeWithDefaults();
      expect(config.rules['const-requires-initializer']).toBe(true);
      expect(config.rules['function-requires-name']).toBe(true);
      expect(config.rules['function-requires-body']).toBe(true);
      expect(config.rules['lambda-block-return-consistency']).toBe(true);
      expect(config.rules['import-requires-source']).toBe(true);
      expect(config.rules['empty-import']).toBe(true);
      expect(config.rules['empty-export']).toBe(true);
    });

    it('should have methods for checking new language features', () => {
      expect(typeof (linter as any).checkConstDeclaration).toBe('function');
      expect(typeof (linter as any).checkFunctionDeclaration).toBe('function');
      expect(typeof (linter as any).checkBlockStatementLambda).toBe('function');
      expect(typeof (linter as any).checkImportDeclaration).toBe('function');
      expect(typeof (linter as any).checkExportDeclaration).toBe('function');
    });
  });

  describe('Built-in Functions Recognition', () => {
    it('should recognize new built-in functions in linter', () => {
      const code = `
        print("Hello, World!")
        result1 = map([1,2,3], x => x * 2)
        result2 = filter([1,2,3,4], x => x % 2 == 0)
        result3 = reduce([1,2,3], (a, b) => a + b, 0)
        result4 = max(1, 2, 3)
        result5 = min(1, 2, 3)
        wrapper = confidence(0.8)
        filter = threshold(0.9)
        sorter = sortBy("score", "desc")
        grouper = groupBy("category")
        debounced = debounce(risky, 300)
      `;

      const lintResults = linter.lint(code);
      const undeclaredErrors = lintResults.filter(r => 
        r.ruleId === 'variable-declared-before-use' && 
        ['print', 'map', 'filter', 'reduce', 'max', 'min', 'confidence', 'threshold', 'sortBy', 'groupBy', 'debounce'].includes(r.message.match(/Variable '(.+)' used/)?.[1] || '')
      );
      expect(undeclaredErrors).toHaveLength(0);
    });

    it('should recognize console functions', () => {
      const code = `
        console.log("test")
        console.warn("warning")  
        console.error("error")
        console.debug("debug")
      `;

      const lintResults = linter.lint(code);
      const undeclaredErrors = lintResults.filter(r => 
        r.ruleId === 'variable-declared-before-use' && 
        r.message.includes("'console'")
      );
      expect(undeclaredErrors).toHaveLength(0);
    });
  });

  describe('Validation Infrastructure', () => {
    it('should handle parse errors gracefully', () => {
      // Test with invalid syntax that would cause parse errors
      const code = 'invalid syntax here {{{';
      const result = validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide meaningful error messages', () => {
      const code = 'x = 10 ~> 1.5';  // Invalid confidence range
      const result = validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_CONFIDENCE_VALUE')).toBe(true);
    });

    it('should validate confidence expressions', () => {
      const code = 'x = 10 ~> 0.95';
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });

    it('should handle lambda expressions', () => {
      const code = 'double = x => x * 2';
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });

    it('should validate uncertain if statements', () => {
      const code = `
        uncertain if (value ~> 0.8) {
          high { result = "confident" }
          medium { result = "moderate" }
          low { result = "uncertain" }
        }
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });
  });
});