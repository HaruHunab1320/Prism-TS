import { tokenize, TokenType } from './tokenizer';

describe('Tokenizer', () => {
  describe('Basic tokens', () => {
    it('should tokenize identifiers', () => {
      const tokens = tokenize('myVariable anotherOne');
      expect(tokens).toEqual([
        { type: TokenType.IDENTIFIER, value: 'myVariable', line: 1, column: 0 },
        { type: TokenType.IDENTIFIER, value: 'anotherOne', line: 1, column: 11 },
        { type: TokenType.EOF, value: '', line: 1, column: 21 },
      ]);
    });

    it('should tokenize numbers', () => {
      const tokens = tokenize('42 3.14 0.5');
      expect(tokens).toEqual([
        { type: TokenType.NUMBER, value: '42', line: 1, column: 0 },
        { type: TokenType.NUMBER, value: '3.14', line: 1, column: 3 },
        { type: TokenType.NUMBER, value: '0.5', line: 1, column: 8 },
        { type: TokenType.EOF, value: '', line: 1, column: 11 },
      ]);
    });

    it('should tokenize strings', () => {
      const tokens = tokenize('"hello world" "another string"');
      expect(tokens).toEqual([
        { type: TokenType.STRING, value: 'hello world', line: 1, column: 0 },
        { type: TokenType.STRING, value: 'another string', line: 1, column: 14 },
        { type: TokenType.EOF, value: '', line: 1, column: 30 },
      ]);
    });
  });

  describe('Operators', () => {
    it('should tokenize arithmetic operators', () => {
      const tokens = tokenize('+ - * /');
      expect(tokens).toEqual([
        { type: TokenType.PLUS, value: '+', line: 1, column: 0 },
        { type: TokenType.MINUS, value: '-', line: 1, column: 2 },
        { type: TokenType.STAR, value: '*', line: 1, column: 4 },
        { type: TokenType.SLASH, value: '/', line: 1, column: 6 },
        { type: TokenType.EOF, value: '', line: 1, column: 7 },
      ]);
    });

    it('should tokenize comparison operators', () => {
      const tokens = tokenize('> < >= <= == !=');
      expect(tokens).toEqual([
        { type: TokenType.GREATER, value: '>', line: 1, column: 0 },
        { type: TokenType.LESS, value: '<', line: 1, column: 2 },
        { type: TokenType.GREATER_EQUAL, value: '>=', line: 1, column: 4 },
        { type: TokenType.LESS_EQUAL, value: '<=', line: 1, column: 7 },
        { type: TokenType.EQUAL_EQUAL, value: '==', line: 1, column: 10 },
        { type: TokenType.NOT_EQUAL, value: '!=', line: 1, column: 13 },
        { type: TokenType.EOF, value: '', line: 1, column: 15 },
      ]);
    });

    it('should tokenize confidence operator', () => {
      const tokens = tokenize('~>');
      expect(tokens).toEqual([
        { type: TokenType.CONFIDENCE_ARROW, value: '~>', line: 1, column: 0 },
        { type: TokenType.EOF, value: '', line: 1, column: 2 },
      ]);
    });

    it('should tokenize confidence extraction operator', () => {
      const tokens = tokenize('<~');
      expect(tokens).toEqual([
        { type: TokenType.CONFIDENCE_EXTRACT, value: '<~', line: 1, column: 0 },
        { type: TokenType.EOF, value: '', line: 1, column: 2 },
      ]);
    });
  });

  describe('Keywords', () => {
    it('should tokenize control flow keywords', () => {
      const tokens = tokenize('if else uncertain high medium low');
      expect(tokens).toEqual([
        { type: TokenType.IF, value: 'if', line: 1, column: 0 },
        { type: TokenType.ELSE, value: 'else', line: 1, column: 3 },
        { type: TokenType.UNCERTAIN, value: 'uncertain', line: 1, column: 8 },
        { type: TokenType.HIGH, value: 'high', line: 1, column: 18 },
        { type: TokenType.MEDIUM, value: 'medium', line: 1, column: 23 },
        { type: TokenType.LOW, value: 'low', line: 1, column: 30 },
        { type: TokenType.EOF, value: '', line: 1, column: 33 },
      ]);
    });

    it('should tokenize context keywords', () => {
      const tokens = tokenize('in context shifting to');
      expect(tokens).toEqual([
        { type: TokenType.IN, value: 'in', line: 1, column: 0 },
        { type: TokenType.CONTEXT, value: 'context', line: 1, column: 3 },
        { type: TokenType.SHIFTING, value: 'shifting', line: 1, column: 11 },
        { type: TokenType.TO, value: 'to', line: 1, column: 20 },
        { type: TokenType.EOF, value: '', line: 1, column: 22 },
      ]);
    });

    it('should tokenize agent keywords', () => {
      const tokens = tokenize('agents agent');
      expect(tokens).toEqual([
        { type: TokenType.AGENTS, value: 'agents', line: 1, column: 0 },
        { type: TokenType.AGENT, value: 'agent', line: 1, column: 7 },
        { type: TokenType.EOF, value: '', line: 1, column: 12 },
      ]);
    });
  });

  describe('Delimiters', () => {
    it('should tokenize parentheses and braces', () => {
      const tokens = tokenize('(){}');
      expect(tokens).toEqual([
        { type: TokenType.LEFT_PAREN, value: '(', line: 1, column: 0 },
        { type: TokenType.RIGHT_PAREN, value: ')', line: 1, column: 1 },
        { type: TokenType.LEFT_BRACE, value: '{', line: 1, column: 2 },
        { type: TokenType.RIGHT_BRACE, value: '}', line: 1, column: 3 },
        { type: TokenType.EOF, value: '', line: 1, column: 4 },
      ]);
    });

    it('should tokenize other delimiters', () => {
      const tokens = tokenize(': , ;');
      expect(tokens).toEqual([
        { type: TokenType.COLON, value: ':', line: 1, column: 0 },
        { type: TokenType.COMMA, value: ',', line: 1, column: 2 },
        { type: TokenType.SEMICOLON, value: ';', line: 1, column: 4 },
        { type: TokenType.EOF, value: '', line: 1, column: 5 },
      ]);
    });
  });

  describe('Complex expressions', () => {
    it('should tokenize a confidence expression', () => {
      const tokens = tokenize('diagnosis.confidence ~> 0.8');
      expect(tokens).toEqual([
        { type: TokenType.IDENTIFIER, value: 'diagnosis', line: 1, column: 0 },
        { type: TokenType.DOT, value: '.', line: 1, column: 9 },
        { type: TokenType.IDENTIFIER, value: 'confidence', line: 1, column: 10 },
        { type: TokenType.CONFIDENCE_ARROW, value: '~>', line: 1, column: 21 },
        { type: TokenType.NUMBER, value: '0.8', line: 1, column: 24 },
        { type: TokenType.EOF, value: '', line: 1, column: 27 },
      ]);
    });

    it('should tokenize an uncertain if statement', () => {
      const code = `uncertain if (result ~> 0.9) {
        high { process() }
      }`;
      const tokens = tokenize(code);
      expect(tokens[0]).toEqual({ type: TokenType.UNCERTAIN, value: 'uncertain', line: 1, column: 0 });
      expect(tokens[1]).toEqual({ type: TokenType.IF, value: 'if', line: 1, column: 10 });
      expect(tokens[2]).toEqual({ type: TokenType.LEFT_PAREN, value: '(', line: 1, column: 13 });
    });
  });

  describe('Comments and whitespace', () => {
    it('should skip single-line comments', () => {
      const tokens = tokenize('x = 42 // this is a comment\ny = 10');
      expect(tokens).toEqual([
        { type: TokenType.IDENTIFIER, value: 'x', line: 1, column: 0 },
        { type: TokenType.EQUAL, value: '=', line: 1, column: 2 },
        { type: TokenType.NUMBER, value: '42', line: 1, column: 4 },
        { type: TokenType.IDENTIFIER, value: 'y', line: 2, column: 0 },
        { type: TokenType.EQUAL, value: '=', line: 2, column: 2 },
        { type: TokenType.NUMBER, value: '10', line: 2, column: 4 },
        { type: TokenType.EOF, value: '', line: 2, column: 6 },
      ]);
    });

    it('should handle multi-line input', () => {
      const code = `x = 10
y = 20`;
      const tokens = tokenize(code);
      expect(tokens[0].line).toBe(1);
      expect(tokens[3].line).toBe(2);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid characters', () => {
      expect(() => tokenize('@#$')).toThrow();
    });

    it('should handle unterminated strings', () => {
      expect(() => tokenize('"unterminated')).toThrow();
    });
  });
});