import { createValidator, UnifiedValidator } from '../src/unified-validator';
import { LinterConfig } from '../src/types';

describe('UnifiedValidator', () => {
  let validator: UnifiedValidator;

  beforeEach(() => {
    validator = new UnifiedValidator();
  });

  describe('createValidator()', () => {
    test('should create validator with default config', () => {
      const v = createValidator();
      expect(v).toBeDefined();
      expect(v.validate).toBeDefined();
      expect(v.parse).toBeDefined();
      expect(v.checkConfidenceFlow).toBeDefined();
    });

    test('should create validator with custom config', () => {
      const config: LinterConfig = {
        rules: {
          'no-infinite-loops': false
        }
      };
      const v = createValidator(config);
      expect(v).toBeDefined();
    });
  });

  describe('validate()', () => {
    test('should validate syntax', () => {
      const code = `x = 42`;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });
  });

  describe('parse()', () => {
    test('should parse code to AST', () => {
      const code = `x = 42`;
      const result = validator.parse(code);
      expect(result.ast).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('checkConfidenceFlow()', () => {
    test('should check confidence flow', () => {
      const code = `
        x = 42 ~> 0.8
        y = ~x
      `;
      const result = validator.checkConfidenceFlow(code);
      expect(result.valid).toBe(true);
    });

    test('should handle parse errors', () => {
      const code = `x = `;
      const result = validator.checkConfidenceFlow(code);
      expect(result.valid).toBe(false);
      expect(result.issues[0].code).toBe('PARSE_ERROR');
    });
  });

  describe('checkConfidenceCompleteness()', () => {
    test('should check confidence completeness', () => {
      const code = `
        test = () => 42 ~> 0.8
      `;
      const result = validator.checkConfidenceCompleteness(code);
      expect(result.complete).toBe(true);
    });
  });

  describe('checkTypes()', () => {
    test('should check types', () => {
      const code = `
        x = 42
        y = x + 10
      `;
      const result = validator.checkTypes(code);
      expect(result.valid).toBe(true);
    });

    test('should handle parse errors', () => {
      const code = `x = `;
      const result = validator.checkTypes(code);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('PARSE_ERROR');
    });
  });

  describe('lint()', () => {
    test('should lint code', () => {
      const code = `
        unused = 42
        print("hello")
      `;
      const results = validator.lint(code);
      expect(results.some(r => r.ruleId === 'no-unused-variables')).toBe(true);
    });

    test('should use custom config', () => {
      const config: LinterConfig = {
        rules: {
          'no-unused-variables': false
        }
      };
      const code = `
        unused = 42
        print("hello")
      `;
      const results = validator.lint(code, config);
      expect(results.filter(r => r.ruleId === 'no-unused-variables')).toHaveLength(0);
    });
  });

  describe('validateAll()', () => {
    test('should perform comprehensive validation on valid code', () => {
      const code = `
        x = 42 ~> 0.8
        y = ~x
        print(y)
      `;
      const result = validator.validateAll(code);
      
      expect(result.valid).toBe(true);
      expect(result.syntax.valid).toBe(true);
      expect(result.confidence.flow.valid).toBe(true);
      expect(result.confidence.completeness.complete).toBe(true);
      expect(result.types.valid).toBe(true);
      expect(result.lint.filter(l => l.severity === 'error')).toHaveLength(0);
      expect(result.summary).toContain('no issues');
    });

    test('should detect all types of errors', () => {
      const code = `
        x = 
        y = ~z
        uncertain if (w) {
        }
        unused = 42
      `;
      const result = validator.validateAll(code);
      
      expect(result.valid).toBe(false);
      expect(result.syntax.valid).toBe(false); // Parse error
      expect(result.formattedErrors.length).toBeGreaterThan(0);
      expect(result.summary).toContain('syntax error');
    });

    test('should provide actionable summary', () => {
      const code = `
        x = 42
        y = ~x  // Confidence without value
        unused = 10
      `;
      const result = validator.validateAll(code);
      
      expect(result.valid).toBe(false);
      expect(result.summary).toContain('confidence flow issue');
      expect(result.summary).toContain('lint warning');
      expect(result.formattedErrors[0].fix).toBeDefined();
    });

    test('should handle complex validation scenarios', () => {
      const code = `
        confidence = llm("test")
        resultValue = null
        
        uncertain if (confidence) {
          high {
            result = 42 ~> 0.9
            resultValue = ~result
          }
          medium {
            result = 42 ~> 0.5
            resultValue = ~result
          }
          low {
            resultValue = null
          }
          default {
            resultValue = null
          }
        }
        
        print(resultValue)
      `;
      const result = validator.validateAll(code);
      
      expect(result.valid).toBe(true);
      expect(result.confidence.flow.valid).toBe(true);
      expect(result.confidence.completeness.complete).toBe(true);
    });

    test('should detect multiple issues in uncertain statements', () => {
      const code = `
        x = 42  // No confidence
        uncertain if (x > 30) {  // No confidence in test
          high { result = 1 }
          // Missing medium and low branches
        }
      `;
      const result = validator.validateAll(code);
      
      expect(result.valid).toBe(false);
      expect(result.confidence.flow.issues.some(i => i.code === 'UNCERTAIN_WITHOUT_CONFIDENCE')).toBe(true);
      expect(result.lint.some(l => l.ruleId === 'uncertain-completeness')).toBe(true);
    });

    test('should format errors for LLM consumption', () => {
      const code = `
        x = "hello"
        y = x * 2  // Type error
        print(y)   // Use y to avoid unused variable warning
      `;
      const result = validator.validateAll(code);
      
      expect(result.valid).toBe(false);
      expect(result.formattedErrors).toHaveLength(1);
      expect(result.formattedErrors[0].error).toBe('INVALID_BINARY_OPERAND');
      expect(result.formattedErrors[0].fix).toContain('Convert');
      expect(result.formattedErrors[0].example).toBeDefined();
    });
  });

  describe('streaming validation', () => {
    test('should validate streaming chunks', () => {
      const result1 = validator.validateStreaming('x = ');
      expect(result1.valid).toBe(true);
      expect(result1.isPartial).toBe(true);
      
      const result2 = validator.validateStreaming('42 ~> 0.8');
      expect(result2.valid).toBe(true);
    });

    test('should reset streaming state', () => {
      validator.validateStreaming('x = ');
      validator.resetStreaming();
      
      const result = validator.validateStreaming('x = ');
      expect(result.expectedNext).toContain('expression');
    });

    test('should get streaming completions', () => {
      validator.validateStreaming('uncertain ');
      const completions = validator.getStreamingCompletions();
      expect(completions).toContain('uncertain if (');
    });

    test('should check if streaming is complete', () => {
      validator.validateStreaming('x = 42');
      expect(validator.isStreamingComplete()).toBe(true);
      
      validator.validateStreaming(' ~> ');
      expect(validator.isStreamingComplete()).toBe(false);
    });
  });

  describe('formatErrors()', () => {
    test('should format various error types', () => {
      const errors = [
        {
          line: 1,
          column: 1,
          message: 'Syntax error',
          code: 'SYNTAX_ERROR',
          severity: 'error' as const
        },
        {
          line: 2,
          column: 5,
          message: 'Undefined variable',
          code: 'UNDEFINED_VARIABLE'
        }
      ];
      
      const formatted = validator.formatErrors(errors);
      expect(formatted).toHaveLength(2);
      expect(formatted[0].fix).toBeDefined();
      expect(formatted[1].fix).toBeDefined();
    });
  });

  describe('edge cases', () => {
    test('should handle empty code', () => {
      const result = validator.validateAll('');
      expect(result.valid).toBe(true);
      expect(result.summary).toContain('no issues');
    });

    test('should handle whitespace only', () => {
      const result = validator.validateAll('   \n\t  ');
      expect(result.valid).toBe(true);
    });

    test('should handle very complex nested code', () => {
      const code = `
        data = { items: [1, 2, 3] }
        result = null
        
        uncertain if (llm("Is valid?")) {
          high {
            result = data.items[0] ~> 0.9
          }
          medium {
            result = data.items[0] ~> 0.5
          }
          low {
            result = null
          }
          default {
            result = null
          }
        }
        
        print(result)
      `;
      
      const result = validator.validateAll(code);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('configuration', () => {
    test('should respect linter configuration in validateAll', () => {
      const config: LinterConfig = {
        rules: {
          'no-unused-variables': false,
          'no-infinite-loops': false
        },
        requireConfidenceInUncertain: false
      };
      
      const validator = new UnifiedValidator(config);
      const code = `
        unused = 42
        uncertain while (llm("continue?")) {
          high { count = count + 1 }
          low { count = 0 }
        }
        uncertain if (x > 0) {
          high { result = 1 }
          default { result = 0 }
        }
      `;
      
      const result = validator.validateAll(code);
      const lintErrors = result.lint.filter(l => 
        l.ruleId === 'no-unused-variables' || 
        l.ruleId === 'no-infinite-loops' ||
        l.ruleId === 'require-confidence-in-uncertain'
      );
      expect(lintErrors).toHaveLength(0);
    });
  });
});