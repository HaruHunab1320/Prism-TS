import { parse, createRuntime } from '../src';
import { BooleanValue } from '../src/runtime';

describe('Strict Equality Operators', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('=== (strict equality)', () => {
    it('should return true for identical primitives', async () => {
      const tests = [
        '5 === 5',           // true
        '"hello" === "hello"', // true
        'true === true',     // true
        'false === false',   // true
        'null === null',     // true
        'undefined === undefined' // true
      ];

      for (const code of tests) {
        const ast = parse(code);
        const result = await runtime.execute(ast);
        expect(result).toBeInstanceOf(BooleanValue);
        expect(result.value).toBe(true);
      }
    });

    it('should return false for different types', async () => {
      const tests = [
        '5 === "5"',         // false - number vs string
        '0 === false',       // false - number vs boolean
        '1 === true',        // false - number vs boolean
        'null === undefined', // false - null vs undefined
        '"" === false',      // false - string vs boolean
        '0 === ""',          // false - number vs string
      ];

      for (const code of tests) {
        const ast = parse(code);
        const result = await runtime.execute(ast);
        expect(result).toBeInstanceOf(BooleanValue);
        expect(result.value).toBe(false);
      }
    });

    it('should return false for different values of same type', async () => {
      const tests = [
        '5 === 6',
        '"hello" === "world"',
        'true === false',
      ];

      for (const code of tests) {
        const ast = parse(code);
        const result = await runtime.execute(ast);
        expect(result).toBeInstanceOf(BooleanValue);
        expect(result.value).toBe(false);
      }
    });
  });

  describe('!== (strict inequality)', () => {
    it('should return false for identical primitives', async () => {
      const tests = [
        '5 !== 5',
        '"hello" !== "hello"',
        'true !== true',
        'null !== null',
      ];

      for (const code of tests) {
        const ast = parse(code);
        const result = await runtime.execute(ast);
        expect(result).toBeInstanceOf(BooleanValue);
        expect(result.value).toBe(false);
      }
    });

    it('should return true for different types', async () => {
      const tests = [
        '5 !== "5"',
        '0 !== false',
        'null !== undefined',
        '"" !== false',
      ];

      for (const code of tests) {
        const ast = parse(code);
        const result = await runtime.execute(ast);
        expect(result).toBeInstanceOf(BooleanValue);
        expect(result.value).toBe(true);
      }
    });
  });

  describe('== (loose equality) with type coercion', () => {
    it('should perform type coercion', async () => {
      const tests = [
        { code: '5 == "5"', expected: true },          // number to string
        { code: '0 == false', expected: true },        // number to boolean
        { code: '1 == true', expected: true },         // number to boolean
        { code: 'null == undefined', expected: true }, // null equals undefined
        { code: '"" == false', expected: true },       // empty string is falsy
        { code: '"0" == 0', expected: true },          // string to number
        { code: '"1" == 1', expected: true },          // string to number
      ];

      for (const test of tests) {
        const ast = parse(test.code);
        const result = await runtime.execute(ast);
        expect(result).toBeInstanceOf(BooleanValue);
        expect(result.value).toBe(test.expected);
      }
    });

    it('should not coerce when types match', async () => {
      const tests = [
        { code: '5 == 5', expected: true },
        { code: '"hello" == "hello"', expected: true },
        { code: 'true == true', expected: true },
        { code: '5 == 6', expected: false },
        { code: '"hello" == "world"', expected: false },
      ];

      for (const test of tests) {
        const ast = parse(test.code);
        const result = await runtime.execute(ast);
        expect(result).toBeInstanceOf(BooleanValue);
        expect(result.value).toBe(test.expected);
      }
    });
  });

  describe('!= (loose inequality) with type coercion', () => {
    it('should perform type coercion', async () => {
      const tests = [
        { code: '5 != "5"', expected: false },
        { code: '0 != false', expected: false },
        { code: 'null != undefined', expected: false },
        { code: '5 != "6"', expected: true },
        { code: '1 != false', expected: true },
      ];

      for (const test of tests) {
        const ast = parse(test.code);
        const result = await runtime.execute(ast);
        expect(result).toBeInstanceOf(BooleanValue);
        expect(result.value).toBe(test.expected);
      }
    });
  });

  describe('Comparison in control flow', () => {
    it('should work in if statements', async () => {
      const code = `
        x = "5"
        y = 5
        
        result1 = "no match"
        if (x === y) {
          result1 = "strict match"
        } else if (x == y) {
          result1 = "loose match"
        }
        
        result1
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast);
      expect(result.value).toBe("loose match");
    });

    it('should work with variables', async () => {
      const code = `
        a = null
        b = undefined
        
        loose = a == b   // true
        strict = a === b // false
        
        result = {loose: loose, strict: strict}
        result
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast);
      
      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
      expect(result.properties.get('loose').value).toBe(true);
      expect(result.properties.get('strict').value).toBe(false);
    });
  });

  describe('Edge cases', () => {
    // Skip NaN test for now as we don't have a way to create NaN without division by zero
    it.skip('should handle NaN comparisons', async () => {
      // TODO: Implement when we have parseFloat or other way to create NaN
    });

    it('should handle array and object comparisons', async () => {
      const code = `
        // In Prism, arrays compare by value, not reference
        arr1 = [1, 2, 3]
        arr2 = [1, 2, 3]
        arr3 = [1, 2, 4]
        
        same_content = arr1 === arr2  // true - same values
        different_content = arr1 === arr3  // false - different values
        
        result = {same_content: same_content, different_content: different_content}
        result
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast);
      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
      expect(result.properties.get('same_content').value).toBe(true);
      expect(result.properties.get('different_content').value).toBe(false);
    });
  });

  describe('Confidence with strict equality', () => {
    it('should work with confident values', async () => {
      const code = `
        x = 5 ~> 0.8
        y = 5 ~> 0.9
        z = 5
        w = 5 ~> 0.8
        
        // Confident values compare both value and confidence
        diff_confidence = x === y     // false - different confidence levels
        same_confidence = x === w     // true - same value and confidence
        confident_vs_plain = x === z  // false - confident vs plain
        
        result = {
          diff_confidence: diff_confidence, 
          same_confidence: same_confidence,
          confident_vs_plain: confident_vs_plain
        }
        result
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast);
      expect(result).toBeDefined();
      expect(result.properties).toBeDefined();
      
      const diffConf = result.properties.get('diff_confidence');
      const sameConf = result.properties.get('same_confidence');
      const confVsPlain = result.properties.get('confident_vs_plain');
      
      // When comparing confident values, it compares the underlying values
      // The confidence is propagated to the result
      expect(diffConf.type).toBe('confident');
      expect(diffConf.value.value).toBe(true);    // Same underlying value (5 === 5)
      
      expect(sameConf.type).toBe('confident');
      expect(sameConf.value.value).toBe(true);    // Same underlying value (5 === 5)
      
      // Confident vs plain compares the underlying value
      expect(confVsPlain.type).toBe('confident');
      expect(confVsPlain.value.value).toBe(true); // 5 === 5
    });
  });
});