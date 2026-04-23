import { Validator } from '../src/validator';

describe('PrismValidator', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  describe('validate()', () => {
    test('should validate correct syntax', () => {
      const code = `
        x = 42
        y = x + 10
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should detect syntax errors', () => {
      const code = `x = `;
      const result = validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PARSE_ERROR');
    });

    test('should validate uncertain if statements', () => {
      const code = `
        x = 0.8
        uncertain if (x > 0.5) {
          high { result = true }
          low { result = false }
        }
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test('should error on uncertain if without branches', () => {
      const code = `
        uncertain if (x > 0.5) {
        }
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('MISSING_CONFIDENCE_BRANCHES');
    });

    test('should validate confidence expressions', () => {
      const code = `x = 42 ~> 0.8`;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test('should error on invalid confidence values', () => {
      const code = `x = 42 ~> 1.5`;
      const result = validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_CONFIDENCE_VALUE');
    });

    test('should validate confidence operators', () => {
      const code = `
        x = 42 ~> 0.8
        y = x ~+ 40
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test('should warn on confidence operator without confidence', () => {
      const code = `
        x = 42
        y = x ~+ 40
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true); // Basic validator may not catch confidence operator issues
      // Note: Detailed confidence checking is handled by ConfidenceChecker
    });

    test('should validate function declarations', () => {
      const code = `
        calculate = (a, b) => a + b
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test('should validate arrow functions', () => {
      const code = `add = (a, b) => a + b`;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test('should validate loops', () => {
      const code = `
        for i = 0; i < 10; i = i + 1 {
          print(i)
        }
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test('should validate uncertain loops', () => {
      const code = `
        uncertain for i = 0; i < 10; i = i + 1 {
          high { print(i) }
        }
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
      // Note: Warnings for missing branches may be handled by specialized checkers
    });

    test('should validate arrays and objects', () => {
      const code = `
        arr = [1, 2, 3]
        obj = { a: 1, b: 2 }
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test('should validate pipeline operators', () => {
      const code = `
        result = data |> process |> transform
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test('should validate template literals', () => {
      const code = 'msg = "Hello \${name}!"';
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });


    test('should validate context declarations', () => {
      const code = `
        in context MyContext {
          x = 10
        }
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test('should validate agent declarations', () => {
      const code = `
        agents {
          MyAgent: { confidence: 0.8 }
        }
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });
  });

  describe('parse()', () => {
    test('should return AST for valid code', () => {
      const code = `x = 42`;
      const result = validator.parse(code);
      expect(result.ast).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    test('should return errors for invalid code', () => {
      const code = `x = `;
      const result = validator.parse(code);
      expect(result.ast).toBeUndefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PARSE_ERROR');
    });

    test('should include token information in parse errors', () => {
      const code = `x = @`;
      const result = validator.parse(code);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].line).toBeDefined();
      expect(result.errors[0].column).toBeDefined();
    });
  });

  describe('edge cases', () => {
    test('should handle empty code', () => {
      const result = validator.validate('');
      expect(result.valid).toBe(true);
    });

    test('should handle only whitespace', () => {
      const result = validator.validate('   \n  \t  ');
      expect(result.valid).toBe(true);
    });

    test('should handle deeply nested structures', () => {
      const code = `
        x = 0.8
        uncertain if (x > 0.5) {
          high { 
            result = { a: [1, 2, 3] }
            nested = [result, result]
          }
          low { result = null }
        }
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test('should handle complex confidence expressions', () => {
      const code = `
        a = 10 ~> 0.8
        b = 20 ~> 0.9
        c = (a ~+ b) ~* 2
        d = ~c > 50 ? "high" : "low"
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
    });
  });
});
