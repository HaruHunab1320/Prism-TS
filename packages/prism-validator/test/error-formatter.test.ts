import { ErrorFormatter } from '../src/error-formatter';
import { 
  SyntaxError, 
  ConfidenceIssue, 
  TypeError, 
  LintResult 
} from '../src/types';

describe('ErrorFormatter', () => {
  describe('formatForLLM()', () => {
    test('should format syntax errors', () => {
      const error: SyntaxError = {
        line: 1,
        column: 10,
        message: 'Unexpected token',
        code: 'SYNTAX_ERROR',
        severity: 'error'
      };
      
      const formatted = ErrorFormatter.formatForLLM(error);
      expect(formatted.error).toBe('SYNTAX_ERROR');
      expect(formatted.fix).toBeDefined();
      expect(formatted.example).toBeDefined();
    });

    test('should format missing confidence branches error', () => {
      const error: SyntaxError = {
        line: 5,
        column: 1,
        message: 'Uncertain if statement missing branches',
        code: 'MISSING_CONFIDENCE_BRANCHES',
        severity: 'error'
      };
      
      const formatted = ErrorFormatter.formatForLLM(error);
      expect(formatted.fix).toContain('low');
      expect(formatted.example).toContain('uncertain if');
      expect(formatted.example).toContain('high');
      expect(formatted.example).toContain('medium');
      expect(formatted.example).toContain('low');
    });

    test('should format confidence without value error', () => {
      const error: ConfidenceIssue = {
        line: 3,
        column: 10,
        message: 'Variable uses ~ but has no confidence',
        code: 'CONFIDENCE_WITHOUT_VALUE',
        variableName: 'result'
      };
      
      const formatted = ErrorFormatter.formatForLLM(error);
      expect(formatted.fix).toContain('result');
      expect(formatted.fix).toContain('@');
      expect(formatted.example).toContain('@ 0.9');
    });

    test('should format undefined variable error', () => {
      const error: TypeError = {
        line: 2,
        column: 5,
        message: 'Undefined variable: myVar',
        code: 'UNDEFINED_VARIABLE'
      };
      
      const formatted = ErrorFormatter.formatForLLM(error);
      expect(formatted.fix).toContain('myVar');
      expect(formatted.example).toContain('myVar');
    });

    test('should format type mismatch error', () => {
      const error: TypeError = {
        line: 4,
        column: 8,
        message: 'Cannot multiply string',
        code: 'INVALID_BINARY_OPERAND',
        expectedType: 'number',
        actualType: 'string'
      };
      
      const formatted = ErrorFormatter.formatForLLM(error);
      expect(formatted.fix).toContain('Convert string to number');
      expect(formatted.example).toContain('parseInt');
    });

    test('should format wrong argument count error', () => {
      const error: TypeError = {
        line: 6,
        column: 1,
        message: 'Function expects 2 arguments, got 1',
        code: 'WRONG_ARGUMENT_COUNT'
      };
      
      const formatted = ErrorFormatter.formatForLLM(error);
      expect(formatted.fix).toContain('2 arguments');
      expect(formatted.example).toContain('arg1, arg2');
    });

    test('should format lint rule violations', () => {
      const error: LintResult = {
        line: 10,
        column: 1,
        message: 'Potentially infinite loop',
        ruleId: 'no-infinite-loops',
        severity: 'warning'
      };
      
      const formatted = ErrorFormatter.formatForLLM(error);
      expect(formatted.error).toBe('no-infinite-loops');
      expect(formatted.fix).toContain('break condition');
      expect(formatted.example).toContain('while');
    });

    test('should format confidence range error with fix', () => {
      const error: LintResult = {
        line: 1,
        column: 15,
        message: 'Confidence value 1.5 is outside range',
        ruleId: 'confidence-range',
        severity: 'error'
      };
      
      const formatted = ErrorFormatter.formatForLLM(error);
      expect(formatted.fix).toContain('between 0 and 1');
      expect(formatted.example).toContain('@ 0.99');
    });

    test('should format unused variable warning', () => {
      const error: LintResult = {
        line: 3,
        column: 7,
        message: "Variable 'unused' is declared but never used",
        ruleId: 'no-unused-variables',
        severity: 'warning'
      };
      
      const formatted = ErrorFormatter.formatForLLM(error);
      expect(formatted.fix).toContain('prefix with underscore');
      expect(formatted.example).toContain('_unused');
    });

    test('should handle unknown error codes', () => {
      const error: SyntaxError = {
        line: 1,
        column: 1,
        message: 'Unknown error',
        code: 'UNKNOWN_CODE',
        severity: 'error'
      };
      
      const formatted = ErrorFormatter.formatForLLM(error);
      expect(formatted.error).toBe('UNKNOWN_CODE');
      expect(formatted.suggestion).toContain('documentation');
    });
  });

  describe('formatMultipleErrors()', () => {
    test('should format multiple errors', () => {
      const errors = [
        {
          line: 1,
          column: 1,
          message: 'Error 1',
          code: 'SYNTAX_ERROR',
          severity: 'error' as const
        },
        {
          line: 2,
          column: 1,
          message: 'Error 2',
          code: 'UNDEFINED_VARIABLE',
          severity: 'error' as const
        }
      ];
      
      const formatted = ErrorFormatter.formatMultipleErrors(errors);
      expect(formatted).toHaveLength(2);
      expect(formatted[0].line).toBe(1);
      expect(formatted[1].line).toBe(2);
    });

    test('should group similar errors', () => {
      const errors = [
        {
          line: 1,
          column: 1,
          message: 'Undefined variable: x',
          code: 'UNDEFINED_VARIABLE',
          severity: 'error' as const
        },
        {
          line: 3,
          column: 1,
          message: 'Undefined variable: y',
          code: 'UNDEFINED_VARIABLE',
          severity: 'error' as const
        },
        {
          line: 5,
          column: 1,
          message: 'Undefined variable: z',
          code: 'UNDEFINED_VARIABLE',
          severity: 'error' as const
        }
      ];
      
      const formatted = ErrorFormatter.formatMultipleErrors(errors);
      expect(formatted).toHaveLength(1);
      expect(formatted[0].message).toContain('Multiple');
      expect(formatted[0].message).toContain('3 instances');
    });

    test('should sort errors by line number', () => {
      const errors = [
        {
          line: 10,
          column: 1,
          message: 'Error 3',
          code: 'ERROR_3',
          severity: 'error' as const
        },
        {
          line: 1,
          column: 1,
          message: 'Error 1',
          code: 'ERROR_1',
          severity: 'error' as const
        },
        {
          line: 5,
          column: 1,
          message: 'Error 2',
          code: 'ERROR_2',
          severity: 'error' as const
        }
      ];
      
      const formatted = ErrorFormatter.formatMultipleErrors(errors);
      expect(formatted[0].line).toBe(1);
      expect(formatted[1].line).toBe(5);
      expect(formatted[2].line).toBe(10);
    });
  });

  describe('generateFixSuggestion()', () => {
    test('should generate fix for single error', () => {
      const errors = [{
        error: 'SYNTAX_ERROR',
        line: 1,
        column: 1,
        message: 'Syntax error',
        fix: 'Check your syntax'
      }];
      
      const suggestion = ErrorFormatter.generateFixSuggestion(errors);
      expect(suggestion).toContain('line 1');
      expect(suggestion).toContain('Check your syntax');
    });

    test('should prioritize syntax errors', () => {
      const errors = [
        {
          error: 'UNDEFINED_VARIABLE',
          line: 5,
          column: 1,
          message: 'Undefined variable',
          fix: 'Define the variable'
        },
        {
          error: 'SYNTAX_ERROR',
          line: 10,
          column: 1,
          message: 'Syntax error',
          fix: 'Fix syntax'
        }
      ];
      
      const suggestion = ErrorFormatter.generateFixSuggestion(errors);
      expect(suggestion).toContain('SYNTAX_ERROR');
      expect(suggestion).toContain('line 10');
    });

    test('should handle empty error list', () => {
      const suggestion = ErrorFormatter.generateFixSuggestion([]);
      expect(suggestion).toBe('No errors found');
    });

    test('should prioritize by error type then line', () => {
      const errors = [
        {
          error: 'CONFIDENCE_WITHOUT_VALUE',
          line: 1,
          column: 1,
          message: 'Missing confidence',
          fix: 'Add confidence'
        },
        {
          error: 'UNDEFINED_VARIABLE',
          line: 2,
          column: 1,
          message: 'Undefined var',
          fix: 'Define var'
        },
        {
          error: 'UNDEFINED_VARIABLE',
          line: 1,
          column: 10,
          message: 'Another undefined',
          fix: 'Define it'
        }
      ];
      
      const suggestion = ErrorFormatter.generateFixSuggestion(errors);
      expect(suggestion).toContain('UNDEFINED_VARIABLE');
      expect(suggestion).toContain('line 1'); // First undefined variable by line
    });
  });

  describe('syntax error examples', () => {
    test('should provide parentheses example', () => {
      const error: SyntaxError = {
        line: 1,
        column: 1,
        message: 'Unmatched parenthesis',
        code: 'SYNTAX_ERROR',
        severity: 'error'
      };
      
      const formatted = ErrorFormatter.formatForLLM(error);
      expect(formatted.example).toContain('(a + b)');
    });

    test('should provide bracket example', () => {
      const error: SyntaxError = {
        line: 1,
        column: 1,
        message: 'Missing closing bracket',
        code: 'SYNTAX_ERROR',
        severity: 'error'
      };
      
      const formatted = ErrorFormatter.formatForLLM(error);
      expect(formatted.example).toContain('[1, 2, 3]');
    });

    test('should provide brace example', () => {
      const error: SyntaxError = {
        line: 1,
        column: 1,
        message: 'Expected }',
        code: 'SYNTAX_ERROR',
        severity: 'error'
      };
      
      const formatted = ErrorFormatter.formatForLLM(error);
      expect(formatted.example).toContain('if (condition) {');
    });

    test('should provide general syntax example', () => {
      const error: SyntaxError = {
        line: 1,
        column: 1,
        message: 'Unexpected token',
        code: 'SYNTAX_ERROR',
        severity: 'error'
      };
      
      const formatted = ErrorFormatter.formatForLLM(error);
      expect(formatted.example).toContain('const value = 42 @ 0.9');
      expect(formatted.example).toContain('uncertain if');
    });
  });
});