import { tokenize, TokenType } from '../src/tokenizer';
import { parse } from '../src/parser';
import { createRuntime } from '../src/runtime';

describe('Comments', () => {
  describe('Single-line comments', () => {
    it('should skip single-line comments', () => {
      const tokens = tokenize(`
        // This is a comment
        let x = 5
      `);
      
      // Should not include comment tokens
      const identifierToken = tokens.find(t => t.type === TokenType.IDENTIFIER && t.value === 'x');
      expect(identifierToken).toBeDefined();
      
      // Comments should not appear in tokens
      const commentContent = tokens.find(t => t.value.includes('This is a comment'));
      expect(commentContent).toBeUndefined();
    });

    it('should handle multiple single-line comments', () => {
      const tokens = tokenize(`
        // First comment
        let x = 5
        // Second comment
        let y = 10
        // Third comment
      `);
      
      const xToken = tokens.find(t => t.type === TokenType.IDENTIFIER && t.value === 'x');
      const yToken = tokens.find(t => t.type === TokenType.IDENTIFIER && t.value === 'y');
      expect(xToken).toBeDefined();
      expect(yToken).toBeDefined();
    });

    it('should handle comments at end of line', () => {
      const tokens = tokenize(`
        let x = 5 // inline comment
        let y = 10 // another inline comment
      `);
      
      const numbers = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(numbers.length).toBe(2);
      expect(numbers[0].value).toBe('5');
      expect(numbers[1].value).toBe('10');
    });
  });

  describe('Multiline comments', () => {
    it('should skip basic multiline comments', () => {
      const tokens = tokenize(`
        /* This is a
           multiline comment */
        let x = 5
      `);
      
      const identifierToken = tokens.find(t => t.type === TokenType.IDENTIFIER && t.value === 'x');
      expect(identifierToken).toBeDefined();
      
      // Comments should not appear in tokens
      const commentContent = tokens.find(t => t.value.includes('multiline comment'));
      expect(commentContent).toBeUndefined();
    });

    it('should handle nested asterisks in multiline comments', () => {
      const tokens = tokenize(`
        /* This comment has * asterisks * in it */
        let x = 5
      `);
      
      const identifierToken = tokens.find(t => t.type === TokenType.IDENTIFIER && t.value === 'x');
      expect(identifierToken).toBeDefined();
    });

    it('should handle multiline comments spanning many lines', () => {
      const tokens = tokenize(`
        /*
         * This is a longer comment
         * that spans multiple lines
         * with asterisks on each line
         */
        let x = 5
      `);
      
      const identifierToken = tokens.find(t => t.type === TokenType.IDENTIFIER && t.value === 'x');
      expect(identifierToken).toBeDefined();
      expect(identifierToken.line).toBeGreaterThan(1); // Should be on a line after the comment
    });

    it('should handle inline multiline comments', () => {
      const tokens = tokenize(`
        let x = /* inline */ 5
        let y = 10 /* another */ + /* and another */ 20
      `);
      
      const numbers = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(numbers.length).toBe(3);
      expect(numbers[0].value).toBe('5');
      expect(numbers[1].value).toBe('10');
      expect(numbers[2].value).toBe('20');
    });
  });

  describe('JSDoc comments', () => {
    it('should skip JSDoc comments', () => {
      const tokens = tokenize(`
        /**
         * This is a JSDoc comment
         * @param {number} x - The x value
         * @returns {number} The result
         */
        function double(x) {
          return x * 2
        }
      `);
      
      const functionToken = tokens.find(t => t.type === TokenType.FUNCTION);
      expect(functionToken).toBeDefined();
      
      // JSDoc content should not appear in tokens
      const jsdocContent = tokens.find(t => t.value.includes('@param'));
      expect(jsdocContent).toBeUndefined();
    });

    it('should handle JSDoc with special characters', () => {
      const tokens = tokenize(`
        /**
         * @example
         * const result = calculate(5, 10);
         * console.log(result); // Output: 15
         */
        let x = 5
      `);
      
      const identifierToken = tokens.find(t => t.type === TokenType.IDENTIFIER && t.value === 'x');
      expect(identifierToken).toBeDefined();
    });

    it('should distinguish between JSDoc and regular multiline comments', () => {
      const code = `
        /** JSDoc comment */
        let x = 5
        
        /* Regular multiline comment */
        let y = 10
        
        /*** Another JSDoc style ***/
        let z = 15
      `;
      
      const tokens = tokenize(code);
      const identifiers = tokens.filter(t => t.type === TokenType.IDENTIFIER && ['x', 'y', 'z'].includes(t.value));
      expect(identifiers.length).toBe(3);
    });
  });

  describe('Comment edge cases', () => {
    it('should handle comments with special characters', () => {
      const tokens = tokenize(`
        // Comment with ~!@#$%^&*()_+-={}[]|\\:";'<>?,./
        /* Multiline with ~!@#$%^&*()_+-={}[]|\\:";'<>?,./ */
        let x = 5
      `);
      
      const identifierToken = tokens.find(t => t.type === TokenType.IDENTIFIER && t.value === 'x');
      expect(identifierToken).toBeDefined();
    });

    it('should handle empty comments', () => {
      const tokens = tokenize(`
        //
        /**/
        /***/
        let x = 5
      `);
      
      const identifierToken = tokens.find(t => t.type === TokenType.IDENTIFIER && t.value === 'x');
      expect(identifierToken).toBeDefined();
    });

    it('should handle comment-like content in strings', () => {
      const tokens = tokenize(`
        let message = "This is not // a comment"
        let url = "https://example.com"
        let regex = "/* not a comment */"
      `);
      
      const strings = tokens.filter(t => t.type === TokenType.STRING);
      expect(strings.length).toBe(3);
      expect(strings[0].value).toBe('This is not // a comment');
      expect(strings[1].value).toBe('https://example.com');
      expect(strings[2].value).toBe('/* not a comment */');
    });

    it('should handle division operator vs comment start', () => {
      const tokens = tokenize(`
        let x = 10 / 5
        let y = 20 /= 2
        let z = a / b / c
      `);
      
      const divisionTokens = tokens.filter(t => t.type === TokenType.SLASH || t.type === TokenType.SLASH_EQUAL);
      expect(divisionTokens.length).toBe(4); // Three / and one /=
    });
  });

  describe('Comments in runtime', () => {
    it('should not affect program execution', async () => {
      const runtime = createRuntime();
      const program = parse(`
        // Initialize variables
        let x = 5 // First variable
        
        /* Calculate result
           using multiplication */
        let y = x * 2
        
        /**
         * Return the final result
         * @returns {number}
         */
        y // This should be 10
      `);
      
      const result = await runtime.execute(program);
      expect(result.value).toBe(10);
    });

    it('should preserve line numbers correctly with comments', async () => {
      const runtime = createRuntime();
      try {
        await runtime.execute(parse(`
          // Line 1
          /* Line 2
             Line 3
             Line 4 */
          // Line 5
          undefinedVariable // Line 6 - This should error
        `));
      } catch (error: any) {
        expect(error.message).toContain('Undefined variable');
        // The error should report line 6 or 7 depending on how we count
        expect(error.line).toBeGreaterThanOrEqual(6);
      }
    });
  });
});
