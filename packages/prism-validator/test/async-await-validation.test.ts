import { Validator } from '../src/validator';

describe('Async/Await Validation', () => {
  const validator = new Validator();

  describe('Valid async/await usage', () => {
    it('should accept async function declarations', () => {
      const code = `
        async function fetchData() {
          return 42
        }
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept await inside async functions', () => {
      const code = `
        async function getData() {
          result = await Promise.resolve(100)
          return result
        }
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept nested async functions', () => {
      const code = `
        async function outer() {
          async function inner() {
            return await Promise.resolve(42)
          }
          return await inner()
        }
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept async functions with confidence', () => {
      const code = `
        async function analyze() ~> 0.9 {
          return await llm("analyze this")
        }
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid async/await usage', () => {
    it('should reject await outside async function', () => {
      const code = `
        function notAsync() {
          result = await Promise.resolve(100)
          return result
        }
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('AWAIT_OUTSIDE_ASYNC');
      expect(result.errors[0].message).toBe('await can only be used inside async functions');
    });

    it('should reject await at module level', () => {
      const code = `
        result = await Promise.resolve(100)
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('AWAIT_OUTSIDE_ASYNC');
    });

    it('should reject async with non-function', () => {
      const code = `
        async const x = 42
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PARSE_ERROR');
    });
  });

  describe('typeof operator validation', () => {
    it('should accept typeof with identifiers', () => {
      const code = `
        x = 42
        type = typeof x
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept typeof with expressions', () => {
      const code = `
        type1 = typeof (1 + 2)
        type2 = typeof "string"
        type3 = typeof true
        type4 = typeof null
        type5 = typeof null
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept typeof with function calls', () => {
      const code = `
        function getValue() { return 42 }
        type = typeof getValue()
      `;
      const result = validator.validate(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
