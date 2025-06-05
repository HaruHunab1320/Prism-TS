export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  IDENTIFIER = 'IDENTIFIER',

  // Keywords
  IF = 'IF',
  ELSE = 'ELSE',
  UNCERTAIN = 'UNCERTAIN',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  IN = 'IN',
  CONTEXT = 'CONTEXT',
  SHIFTING = 'SHIFTING',
  TO = 'TO',
  AGENTS = 'AGENTS',
  AGENT = 'AGENT',
  CONFIDENCE = 'CONFIDENCE',
  FUNCTION = 'FUNCTION',
  RETURN = 'RETURN',
  LET = 'LET',
  CONST = 'CONST',
  TRUE = 'TRUE',
  FALSE = 'FALSE',

  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  EQUAL = 'EQUAL',
  EQUAL_EQUAL = 'EQUAL_EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  LESS = 'LESS',
  GREATER = 'GREATER',
  LESS_EQUAL = 'LESS_EQUAL',
  GREATER_EQUAL = 'GREATER_EQUAL',
  CONFIDENCE_ARROW = 'CONFIDENCE_ARROW',
  CONFIDENCE_EXTRACT = 'CONFIDENCE_EXTRACT',
  CONFIDENCE_CHAIN = 'CONFIDENCE_CHAIN',
  CONFIDENCE_COALESCE = 'CONFIDENCE_COALESCE',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  TILDE = 'TILDE',

  // Delimiters
  LEFT_PAREN = 'LEFT_PAREN',
  RIGHT_PAREN = 'RIGHT_PAREN',
  LEFT_BRACE = 'LEFT_BRACE',
  RIGHT_BRACE = 'RIGHT_BRACE',
  LEFT_BRACKET = 'LEFT_BRACKET',
  RIGHT_BRACKET = 'RIGHT_BRACKET',
  COMMA = 'COMMA',
  DOT = 'DOT',
  COLON = 'COLON',
  SEMICOLON = 'SEMICOLON',

  // Special
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const keywords: { [key: string]: TokenType } = {
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'uncertain': TokenType.UNCERTAIN,
  'high': TokenType.HIGH,
  'medium': TokenType.MEDIUM,
  'low': TokenType.LOW,
  'in': TokenType.IN,
  'context': TokenType.CONTEXT,
  'shifting': TokenType.SHIFTING,
  'to': TokenType.TO,
  'agents': TokenType.AGENTS,
  'agent': TokenType.AGENT,
  'Agent': TokenType.AGENT,
  'function': TokenType.FUNCTION,
  'return': TokenType.RETURN,
  'let': TokenType.LET,
  'const': TokenType.CONST,
  'true': TokenType.TRUE,
  'false': TokenType.FALSE,
};

export class Tokenizer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 0;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.skipWhitespaceAndComments();
      if (this.isAtEnd()) break;

      const token = this.nextToken();
      if (token) {
        this.tokens.push(token);
      }
    }

    this.tokens.push({
      type: TokenType.EOF,
      value: '',
      line: this.line,
      column: this.column,
    });

    return this.tokens;
  }

  private nextToken(): Token | null {
    const startColumn = this.column;
    const char = this.advance();

    // Single character tokens
    switch (char) {
      case '+': return this.makeToken(TokenType.PLUS, '+', startColumn);
      case '-': return this.makeToken(TokenType.MINUS, '-', startColumn);
      case '*': return this.makeToken(TokenType.STAR, '*', startColumn);
      case '/': return this.makeToken(TokenType.SLASH, '/', startColumn);
      case '(': return this.makeToken(TokenType.LEFT_PAREN, '(', startColumn);
      case ')': return this.makeToken(TokenType.RIGHT_PAREN, ')', startColumn);
      case '{': return this.makeToken(TokenType.LEFT_BRACE, '{', startColumn);
      case '}': return this.makeToken(TokenType.RIGHT_BRACE, '}', startColumn);
      case '[': return this.makeToken(TokenType.LEFT_BRACKET, '[', startColumn);
      case ']': return this.makeToken(TokenType.RIGHT_BRACKET, ']', startColumn);
      case ',': return this.makeToken(TokenType.COMMA, ',', startColumn);
      case '.': return this.makeToken(TokenType.DOT, '.', startColumn);
      case ':': return this.makeToken(TokenType.COLON, ':', startColumn);
      case ';': return this.makeToken(TokenType.SEMICOLON, ';', startColumn);
    }

    // Two character tokens
    if (char === '=') {
      if (this.peek() === '=') {
        this.advance();
        return this.makeToken(TokenType.EQUAL_EQUAL, '==', startColumn);
      }
      return this.makeToken(TokenType.EQUAL, '=', startColumn);
    }

    if (char === '!') {
      if (this.peek() === '=') {
        this.advance();
        return this.makeToken(TokenType.NOT_EQUAL, '!=', startColumn);
      }
      return this.makeToken(TokenType.NOT, '!', startColumn);
    }

    if (char === '<') {
      if (this.peek() === '=') {
        this.advance();
        return this.makeToken(TokenType.LESS_EQUAL, '<=', startColumn);
      }
      if (this.peek() === '~') {
        this.advance();
        return this.makeToken(TokenType.CONFIDENCE_EXTRACT, '<~', startColumn);
      }
      return this.makeToken(TokenType.LESS, '<', startColumn);
    }

    if (char === '>') {
      if (this.peek() === '=') {
        this.advance();
        return this.makeToken(TokenType.GREATER_EQUAL, '>=', startColumn);
      }
      return this.makeToken(TokenType.GREATER, '>', startColumn);
    }

    if (char === '~') {
      if (this.peek() === '>') {
        this.advance();
        return this.makeToken(TokenType.CONFIDENCE_ARROW, '~>', startColumn);
      }
      if (this.peek() === '?' && this.peekNext() === '?') {
        this.advance(); // consume first ?
        this.advance(); // consume second ?
        return this.makeToken(TokenType.CONFIDENCE_COALESCE, '~??', startColumn);
      }
      if (this.peek() === '~') {
        this.advance();
        return this.makeToken(TokenType.CONFIDENCE_CHAIN, '~~', startColumn);
      }
      return this.makeToken(TokenType.TILDE, '~', startColumn);
    }

    if (char === '&' && this.peek() === '&') {
      this.advance();
      return this.makeToken(TokenType.AND, '&&', startColumn);
    }

    if (char === '|' && this.peek() === '|') {
      this.advance();
      return this.makeToken(TokenType.OR, '||', startColumn);
    }

    // String literals
    if (char === '"') {
      return this.string(startColumn);
    }

    // Number literals
    if (this.isDigit(char)) {
      return this.number(startColumn);
    }

    // Identifiers and keywords
    if (this.isAlpha(char)) {
      return this.identifier(startColumn);
    }

    throw new Error(`Unexpected character '${char}' at line ${this.line}, column ${startColumn}`);
  }

  private string(startColumn: number): Token {
    const value: string[] = [];
    
    while (!this.isAtEnd() && this.peek() !== '"') {
      const char = this.peek();
      if (char === '\n') {
        this.line++;
        this.advance();
        this.column = 0;
      } else {
        value.push(this.advance());
      }
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at line ${this.line}, column ${startColumn}`);
    }

    // Consume closing quote
    this.advance();

    return this.makeToken(TokenType.STRING, value.join(''), startColumn);
  }

  private number(startColumn: number): Token {
    const start = this.position - 1;

    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // Look for decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance(); // consume '.'
      
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const value = this.input.substring(start, this.position);
    return this.makeToken(TokenType.NUMBER, value, startColumn);
  }

  private identifier(startColumn: number): Token {
    const start = this.position - 1;

    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const value = this.input.substring(start, this.position);
    const type = keywords[value] || TokenType.IDENTIFIER;

    return this.makeToken(type, value, startColumn);
  }

  private skipWhitespaceAndComments(): void {
    let continueLoop = true;
    while (continueLoop) {
      const char = this.peek();

      if (char === ' ' || char === '\r' || char === '\t') {
        this.advance();
      } else if (char === '\n') {
        this.line++;
        this.advance();
        this.column = 0;
      } else if (char === '/' && this.peekNext() === '/') {
        // Skip single-line comment
        while (this.peek() !== '\n' && !this.isAtEnd()) {
          this.advance();
        }
      } else {
        continueLoop = false;
      }
    }
  }

  private makeToken(type: TokenType, value: string, column: number): Token {
    return {
      type,
      value,
      line: this.line,
      column,
    };
  }

  private isAtEnd(): boolean {
    return this.position >= this.input.length;
  }

  private advance(): string {
    const char = this.input[this.position];
    this.position++;
    this.column++;
    return char;
  }

  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.input[this.position];
  }

  private peekNext(): string {
    if (this.position + 1 >= this.input.length) return '\0';
    return this.input[this.position + 1];
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z') ||
           char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }
}

export function tokenize(input: string): Token[] {
  const tokenizer = new Tokenizer(input);
  return tokenizer.tokenize();
}