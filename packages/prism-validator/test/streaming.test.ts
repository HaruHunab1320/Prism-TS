import { StreamingValidator, validateStream } from '../src/streaming';
import { StreamingValidationResult } from '../src/types';

describe('StreamingValidator', () => {
  let validator: StreamingValidator;

  beforeEach(() => {
    validator = new StreamingValidator();
  });

  describe('validateStream helper', () => {
    it('validates an async iterable of strings', async () => {
      async function* chunks() {
        yield 'const total = ';
        yield '40 + 2';
      }

      const results = await validateStream(chunks());
      const final = results[results.length - 1];
      expect(final.valid).toBe(true);
      expect(final.errors).toHaveLength(0);
    });

    it('supports chunk objects using default extractor', async () => {
      async function* chunks() {
        yield { type: 'text', content: 'result = ' };
        yield { type: 'text', text: 'llm("hi")' };
      }

      const results = await validateStream(chunks());
      const final = results[results.length - 1];
      expect(final.valid).toBe(true);
    });

    it('invokes onUpdate for each chunk', async () => {
      const updates: StreamingValidationResult[] = [];
      async function* chunks() {
        yield 'let x = ';
        yield 'llm("hi")';
      }

      await validateStream(chunks(), {
        onUpdate: (result) => updates.push(result),
      });

      expect(updates).toHaveLength(2);
    });

    it('continues after errors when stopOnError is false', async () => {
      async function* chunks() {
        yield 'x = ';
        yield '= 42';
        yield ';';
      }

      const results = await validateStream(chunks(), { stopOnError: false });
      expect(results.some(r => !r.valid)).toBe(true);
      expect(results).toHaveLength(3);
    });

    it('aborts when signal is triggered', async () => {
      async function* chunks() {
        yield 'a = ';
        await new Promise(resolve => setTimeout(resolve, 5));
        yield 'b';
      }

      const controller = new AbortController();
      const promise = validateStream(chunks(), { signal: controller.signal });
      controller.abort();
      await expect(promise).rejects.toThrow('Streaming validation aborted');
    });
  });

  describe('validatePartial()', () => {
    test('should validate partial code chunks', () => {
      const result1 = validator.validatePartial('x = ');
      expect(result1.valid).toBe(true);
      expect(result1.isPartial).toBe(true);
      expect(result1.expectedNext?.length || 0).toBeGreaterThan(0); // Should suggest something

      const result2 = validator.validatePartial('42');
      expect(result2.valid).toBe(true);
    });

    test('should detect unmatched parentheses', () => {
      const result = validator.validatePartial('test = (');
      expect(result.valid).toBe(true);
      expect(result.expectedNext).toContain(')');
    });

    test('should detect unmatched braces', () => {
      const result = validator.validatePartial('uncertain if (x > 0.5) {');
      expect(result.valid).toBe(true);
      expect(result.expectedNext).toContain('}');
    });

    test('should detect unmatched brackets', () => {
      const result = validator.validatePartial('arr = [1, 2');
      expect(result.valid).toBe(true);
      expect(result.expectedNext).toContain(']');
    });

    test('should track string literals', () => {
      const result = validator.validatePartial('msg = "hello');
      expect(result.valid).toBe(true);
      expect(result.expectedNext).toContain('"');
    });

    test('should handle uncertain keyword', () => {
      const result = validator.validatePartial('uncertain');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('INCOMPLETE_UNCERTAIN');
      expect(result.expectedNext).toContain('if');
    });

    test('should expect opening parenthesis after if', () => {
      validator.validatePartial('uncertain ');
      const result = validator.validatePartial('if');
      expect(result.expectedNext).toContain('(');
    });

    test('should expect assignment after identifier', () => {
      const result = validator.validatePartial('x');
      expect(result.expectedNext).toContain('=');
    });

    test('should expect number after @', () => {
      validator.validatePartial('x = 42 ');
      const result = validator.validatePartial('@');
      expect(result.expectedNext).toContain('number or identifier');
    });

    test('should expect identifier after ~', () => {
      const result = validator.validatePartial('y = ~');
      expect(result.expectedNext).toContain('identifier or expression');
    });

    test('should expect brace after confidence level', () => {
      validator.validatePartial('uncertain if (x > 0.5) ');
      const result = validator.validatePartial('high');
      expect(result.expectedNext).toContain('{');
    });

    test('should handle multiple chunks building valid code', () => {
      validator.validatePartial('x ');
      validator.validatePartial('result ');
      validator.validatePartial('= ');
      validator.validatePartial('llm(');
      const result = validator.validatePartial('"test"');
      expect(result.expectedNext).toContain(')');
    });

    test('should detect syntax errors in partial code', () => {
      const result = validator.validatePartial('x = = 123');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('STREAM_PARSE_ERROR');
    });
  });

  describe('reset()', () => {
    test('should reset validator state', () => {
      validator.validatePartial('x = ');
      validator.reset();
      
      const result = validator.validatePartial('x = ');
      expect(result.expectedNext).toContain('expression');
      expect(result.expectedNext).not.toContain('identifier');
    });
  });

  describe('getCompletions()', () => {
    test('should suggest completions for uncertain', () => {
      validator.validatePartial('uncertain');
      const completions = validator.getCompletions();
      expect(completions).toContain('uncertain if (');
    });

    test('should suggest completions for llm', () => {
      validator.validatePartial('result = llm');
      const completions = validator.getCompletions();
      expect(completions).toContain('llm("');
    });

    test('should suggest statement keywords', () => {
      validator.validatePartial('');
      const completions = validator.getCompletions();
      expect(completions).toContain('if');
      expect(completions).toContain('uncertain');
      expect(completions).toContain('for');
      expect(completions).toContain('while');
    });

    test('should suggest expression completions', () => {
      validator.validatePartial('x = ');
      const completions = validator.getCompletions();
      expect(completions).toContain('llm("');
      expect(completions).toContain('true');
      expect(completions).toContain('false');
    });

    test('should suggest identifiers when expected', () => {
      validator.validatePartial('x = ');
      const completions = validator.getCompletions();
      expect(completions).toContain('myVariable');
      expect(completions).toContain('result');
      expect(completions).toContain('value');
    });
  });

  describe('isComplete()', () => {
    test('should detect complete statements', () => {
      validator.validatePartial('x = 42');
      expect(validator.isComplete()).toBe(true);
    });

    test('should detect incomplete parentheses', () => {
      validator.validatePartial('test = (a, b');
      expect(validator.isComplete()).toBe(false);
    });

    test('should detect incomplete braces', () => {
      validator.validatePartial('if (true) {');
      expect(validator.isComplete()).toBe(false);
    });

    test('should detect incomplete strings', () => {
      validator.validatePartial('msg = "hello');
      expect(validator.isComplete()).toBe(false);
    });

    test('should detect complete blocks', () => {
      validator.validatePartial('uncertain if (x > 0.5) { high { print("yes") } low { print("no") } }');
      expect(validator.isComplete()).toBe(true);
    });
  });

  describe('complex streaming scenarios', () => {
    test('should handle uncertain if streaming', () => {
      validator.validatePartial('uncertain ');
      validator.validatePartial('if ');
      validator.validatePartial('(');
      validator.validatePartial('llm("Is this valid?")');
      validator.validatePartial(') ');
      validator.validatePartial('{');
      validator.validatePartial('\n  high ');
      validator.validatePartial('{ ');
      validator.validatePartial('result = true');
      validator.validatePartial(' }');
      validator.validatePartial('\n  low ');
      validator.validatePartial('{ ');
      validator.validatePartial('result = false');
      validator.validatePartial(' }');
      validator.validatePartial('\n  default ');
      validator.validatePartial('{ ');
      validator.validatePartial('result = null');
      validator.validatePartial(' }');
      const result = validator.validatePartial('\n}');
      
      expect(result.valid).toBe(true);
      expect(validator.isComplete()).toBe(true);
    });

    test('should handle nested structures', () => {
      validator.validatePartial('obj = {');
      expect(validator.isComplete()).toBe(false);
      
      validator.validatePartial('\n  arr: [');
      expect(validator.isComplete()).toBe(false);
      
      validator.validatePartial('1, 2, 3');
      expect(validator.isComplete()).toBe(false);
      
      validator.validatePartial('],');
      expect(validator.isComplete()).toBe(false);
      
      validator.validatePartial('\n  fn: () => {');
      expect(validator.isComplete()).toBe(false);
      
      validator.validatePartial(' value = 42 ');
      expect(validator.isComplete()).toBe(false);
      
      validator.validatePartial('}');
      expect(validator.isComplete()).toBe(false);
      
      validator.validatePartial('\n}');
      expect(validator.isComplete()).toBe(true);
    });

    test('should handle comments', () => {
      const result1 = validator.validatePartial('// This is a comment\n');
      expect(result1.valid).toBe(true);
      
      const result2 = validator.validatePartial('x = 42');
      expect(result2.valid).toBe(true);
    });

    test('should track depth correctly', () => {
      validator.validatePartial('((');
      let result = validator.validatePartial('))');
      expect(result.valid).toBe(true);
      
      validator.reset();
      validator.validatePartial(')))');
      result = validator.validatePartial('');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('UNMATCHED_PAREN');
    });
  });

  describe('edge cases', () => {
    test('should handle empty chunks', () => {
      const result = validator.validatePartial('');
      expect(result.valid).toBe(true);
      expect(result.isPartial).toBe(true);
    });

    test('should handle whitespace-only chunks', () => {
      const result = validator.validatePartial('   \n\t  ');
      expect(result.valid).toBe(true);
    });

    test('should handle very long identifiers', () => {
      const longId = 'a'.repeat(100);
      const result = validator.validatePartial(`${longId} = 42`);
      expect(result.valid).toBe(true);
    });

    test('should handle multiple string delimiters', () => {
      validator.validatePartial('a = "test"');
      const result = validator.validatePartial(", b = 'another'");
      expect(result.valid).toBe(true);
    });
  });
});
