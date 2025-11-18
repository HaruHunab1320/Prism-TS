export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  INTERPOLATED_STRING = 'INTERPOLATED_STRING',
  IDENTIFIER = 'IDENTIFIER',

  // Keywords
  IF = 'IF',
  ELSE = 'ELSE',
  UNCERTAIN = 'UNCERTAIN',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  DEFAULT = 'DEFAULT',
  IN = 'IN',
  CONTEXT = 'CONTEXT',
  AGENTS = 'AGENTS',
  AGENT = 'AGENT',
  CONFIDENCE = 'CONFIDENCE',
  FUNCTION = 'FUNCTION',
  RETURN = 'RETURN',
  LET = 'LET',
  CONST = 'CONST',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  NULL = 'NULL',
  UNDEFINED = 'UNDEFINED',
  FOR = 'FOR',
  WHILE = 'WHILE',
  BREAK = 'BREAK',
  CONTINUE = 'CONTINUE',
  TYPEOF = 'TYPEOF',
  INSTANCEOF = 'INSTANCEOF',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  FROM = 'FROM',
  AS = 'AS',
  ASYNC = 'ASYNC',
  AWAIT = 'AWAIT',
  TRY = 'TRY',
  CATCH = 'CATCH',
  FINALLY = 'FINALLY',
  DO = 'DO',

  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  STAR_STAR = 'STAR_STAR',
  SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  EQUAL = 'EQUAL',
  EQUAL_EQUAL = 'EQUAL_EQUAL',
  EQUAL_EQUAL_EQUAL = 'EQUAL_EQUAL_EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  NOT_EQUAL_EQUAL = 'NOT_EQUAL_EQUAL',
  PLUS_EQUAL = 'PLUS_EQUAL',
  MINUS_EQUAL = 'MINUS_EQUAL',
  STAR_EQUAL = 'STAR_EQUAL',
  SLASH_EQUAL = 'SLASH_EQUAL',
  PERCENT_EQUAL = 'PERCENT_EQUAL',
  CONFIDENCE_PLUS_EQUAL = 'CONFIDENCE_PLUS_EQUAL',
  CONFIDENCE_MINUS_EQUAL = 'CONFIDENCE_MINUS_EQUAL',
  CONFIDENCE_STAR_EQUAL = 'CONFIDENCE_STAR_EQUAL',
  CONFIDENCE_SLASH_EQUAL = 'CONFIDENCE_SLASH_EQUAL',
  LESS = 'LESS',
  GREATER = 'GREATER',
  LESS_EQUAL = 'LESS_EQUAL',
  GREATER_EQUAL = 'GREATER_EQUAL',
  CONFIDENCE_ARROW = 'CONFIDENCE_ARROW',
  CONFIDENCE_EXTRACT = 'CONFIDENCE_EXTRACT',
  CONFIDENCE_CHAIN = 'CONFIDENCE_CHAIN',
  CONFIDENCE_COALESCE = 'CONFIDENCE_COALESCE',
  CONFIDENCE_AND = 'CONFIDENCE_AND',
  CONFIDENCE_OR = 'CONFIDENCE_OR',
  CONFIDENCE_PLUS = 'CONFIDENCE_PLUS',
  CONFIDENCE_MINUS = 'CONFIDENCE_MINUS',
  CONFIDENCE_STAR = 'CONFIDENCE_STAR',
  CONFIDENCE_SLASH = 'CONFIDENCE_SLASH',
  CONFIDENCE_EQUAL = 'CONFIDENCE_EQUAL',
  CONFIDENCE_NOT_EQUAL = 'CONFIDENCE_NOT_EQUAL',
  CONFIDENCE_GREATER = 'CONFIDENCE_GREATER',
  CONFIDENCE_LESS = 'CONFIDENCE_LESS',
  CONFIDENCE_GREATER_EQUAL = 'CONFIDENCE_GREATER_EQUAL',
  CONFIDENCE_LESS_EQUAL = 'CONFIDENCE_LESS_EQUAL',
  CONFIDENCE_DOT = 'CONFIDENCE_DOT',
  CONFIDENCE_QUESTION = 'CONFIDENCE_QUESTION',
  CONFIDENCE_IN = 'CONFIDENCE_IN',
  CONFIDENCE_INSTANCEOF = 'CONFIDENCE_INSTANCEOF',
  PARALLEL_CONFIDENCE = 'PARALLEL_CONFIDENCE',
  THRESHOLD_GATE = 'THRESHOLD_GATE',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  TILDE = 'TILDE',
  OPTIONAL_CHAIN = 'OPTIONAL_CHAIN',

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
  QUESTION = 'QUESTION',
  QUESTION_QUESTION = 'QUESTION_QUESTION',

  // Special
  ARROW = 'ARROW',
  SPREAD = 'SPREAD',
  PIPELINE = 'PIPELINE',
  CONFIDENCE_PIPELINE = 'CONFIDENCE_PIPELINE',
  CONFIDENCE_THRESHOLD_GATE = 'CONFIDENCE_THRESHOLD_GATE',
  CONTEXT_ARROW = 'CONTEXT_ARROW',
  PLACEHOLDER = 'PLACEHOLDER',
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
  'default': TokenType.DEFAULT,
  'in': TokenType.IN,
  'context': TokenType.CONTEXT,
  'agents': TokenType.AGENTS,
  'Agent': TokenType.AGENT,
  'function': TokenType.FUNCTION,
  'return': TokenType.RETURN,
  'let': TokenType.LET,
  'const': TokenType.CONST,
  'true': TokenType.TRUE,
  'false': TokenType.FALSE,
  'null': TokenType.NULL,
  'undefined': TokenType.UNDEFINED,
  'for': TokenType.FOR,
  'while': TokenType.WHILE,
  'break': TokenType.BREAK,
  'continue': TokenType.CONTINUE,
  'typeof': TokenType.TYPEOF,
  'instanceof': TokenType.INSTANCEOF,
  'import': TokenType.IMPORT,
  'export': TokenType.EXPORT,
  'from': TokenType.FROM,
  'as': TokenType.AS,
  'async': TokenType.ASYNC,
  'await': TokenType.AWAIT,
  'try': TokenType.TRY,
  'catch': TokenType.CATCH,
  'finally': TokenType.FINALLY,
  'do': TokenType.DO,
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

    // Single character tokens (with compound assignment checks)
    switch (char) {
      case '+': 
        if (this.peek() === '=') {
          this.advance();
          return this.makeToken(TokenType.PLUS_EQUAL, '+=', startColumn);
        }
        return this.makeToken(TokenType.PLUS, '+', startColumn);
      case '-': 
        if (this.peek() === '>') {
          this.advance();
          return this.makeToken(TokenType.CONTEXT_ARROW, '->', startColumn);
        }
        if (this.peek() === '=') {
          this.advance();
          return this.makeToken(TokenType.MINUS_EQUAL, '-=', startColumn);
        }
        return this.makeToken(TokenType.MINUS, '-', startColumn);
      case '*': 
        if (this.peek() === '=') {
          this.advance();
          return this.makeToken(TokenType.STAR_EQUAL, '*=', startColumn);
        }
        if (this.peek() === '*') {
          this.advance();
          return this.makeToken(TokenType.STAR_STAR, '**', startColumn);
        }
        return this.makeToken(TokenType.STAR, '*', startColumn);
      case '/': 
        if (this.peek() === '=') {
          this.advance();
          return this.makeToken(TokenType.SLASH_EQUAL, '/=', startColumn);
        }
        return this.makeToken(TokenType.SLASH, '/', startColumn);
      case '%': 
        if (this.peek() === '=') {
          this.advance();
          return this.makeToken(TokenType.PERCENT_EQUAL, '%=', startColumn);
        }
        return this.makeToken(TokenType.PERCENT, '%', startColumn);
      case '(': return this.makeToken(TokenType.LEFT_PAREN, '(', startColumn);
      case ')': return this.makeToken(TokenType.RIGHT_PAREN, ')', startColumn);
      case '{': return this.makeToken(TokenType.LEFT_BRACE, '{', startColumn);
      case '}': return this.makeToken(TokenType.RIGHT_BRACE, '}', startColumn);
      case '[': return this.makeToken(TokenType.LEFT_BRACKET, '[', startColumn);
      case ']': return this.makeToken(TokenType.RIGHT_BRACKET, ']', startColumn);
      case ',': return this.makeToken(TokenType.COMMA, ',', startColumn);
      case '.': 
        // Check for spread operator ...
        if (this.peek() === '.' && this.peekNext() === '.') {
          this.advance(); // consume second dot
          this.advance(); // consume third dot
          return this.makeToken(TokenType.SPREAD, '...', startColumn);
        }
        return this.makeToken(TokenType.DOT, '.', startColumn);
      case ':': return this.makeToken(TokenType.COLON, ':', startColumn);
      case ';': return this.makeToken(TokenType.SEMICOLON, ';', startColumn);
      case '?': 
        if (this.peek() === '.') {
          this.advance();
          return this.makeToken(TokenType.OPTIONAL_CHAIN, '?.', startColumn);
        }
        if (this.peek() === '?') {
          this.advance();
          return this.makeToken(TokenType.QUESTION_QUESTION, '??', startColumn);
        }
        return this.makeToken(TokenType.QUESTION, '?', startColumn);
    }

    // Two character tokens
    if (char === '=') {
      if (this.peek() === '=') {
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          return this.makeToken(TokenType.EQUAL_EQUAL_EQUAL, '===', startColumn);
        }
        return this.makeToken(TokenType.EQUAL_EQUAL, '==', startColumn);
      }
      if (this.peek() === '>') {
        this.advance();
        return this.makeToken(TokenType.ARROW, '=>', startColumn);
      }
      return this.makeToken(TokenType.EQUAL, '=', startColumn);
    }

    if (char === '!') {
      if (this.peek() === '=') {
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          return this.makeToken(TokenType.NOT_EQUAL_EQUAL, '!==', startColumn);
        }
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
      if (this.peek() === '>' && this.peekNext() === '=') {
        this.advance(); // consume >
        this.advance(); // consume =
        return this.makeToken(TokenType.CONFIDENCE_GREATER_EQUAL, '~>=', startColumn);
      }
      if (this.peek() === '>') {
        this.advance();
        return this.makeToken(TokenType.CONFIDENCE_ARROW, '~>', startColumn);
      }
      if (this.peek() === '?' && this.peekNext() === '?') {
        this.advance(); // consume first ?
        this.advance(); // consume second ?
        return this.makeToken(TokenType.CONFIDENCE_COALESCE, '~??', startColumn);
      }
      if (this.peek() === '?' && this.peekNext() === '>') {
        this.advance(); // consume ?
        this.advance(); // consume >
        return this.makeToken(TokenType.CONFIDENCE_THRESHOLD_GATE, '~?>', startColumn);
      }
      if (this.peek() === '?') {
        this.advance(); // consume ?
        return this.makeToken(TokenType.CONFIDENCE_QUESTION, '~?', startColumn);
      }
      if (this.peek() === '&' && this.peekNext() === '&') {
        this.advance(); // consume first &
        this.advance(); // consume second &
        return this.makeToken(TokenType.CONFIDENCE_AND, '~&&', startColumn);
      }
      if (this.peek() === '@' && this.peekNext() === '>') {
        this.advance(); // consume @
        this.advance(); // consume >
        return this.makeToken(TokenType.THRESHOLD_GATE, '~@>', startColumn);
      }
      if (this.peek() === '|' && this.peekNext() === '>') {
        this.advance(); // consume |
        this.advance(); // consume >
        return this.makeToken(TokenType.CONFIDENCE_PIPELINE, '~|>', startColumn);
      }
      if (this.peek() === '|' && this.peekNext() === '|' && this.peekThird() === '>') {
        this.advance(); // consume first |
        this.advance(); // consume second |
        this.advance(); // consume >
        return this.makeToken(TokenType.PARALLEL_CONFIDENCE, '~||>', startColumn);
      }
      if (this.peek() === '|' && this.peekNext() === '|') {
        this.advance(); // consume first |
        this.advance(); // consume second |
        return this.makeToken(TokenType.CONFIDENCE_OR, '~||', startColumn);
      }
      if (this.peek() === '+' && this.peekNext() === '=') {
        this.advance(); // consume +
        this.advance(); // consume =
        return this.makeToken(TokenType.CONFIDENCE_PLUS_EQUAL, '~+=', startColumn);
      }
      if (this.peek() === '+') {
        this.advance();
        return this.makeToken(TokenType.CONFIDENCE_PLUS, '~+', startColumn);
      }
      if (this.peek() === '-' && this.peekNext() === '=') {
        this.advance(); // consume -
        this.advance(); // consume =
        return this.makeToken(TokenType.CONFIDENCE_MINUS_EQUAL, '~-=', startColumn);
      }
      if (this.peek() === '-') {
        this.advance();
        return this.makeToken(TokenType.CONFIDENCE_MINUS, '~-', startColumn);
      }
      if (this.peek() === '*' && this.peekNext() === '=') {
        this.advance(); // consume *
        this.advance(); // consume =
        return this.makeToken(TokenType.CONFIDENCE_STAR_EQUAL, '~*=', startColumn);
      }
      if (this.peek() === '*') {
        this.advance();
        return this.makeToken(TokenType.CONFIDENCE_STAR, '~*', startColumn);
      }
      if (this.peek() === '/' && this.peekNext() === '=') {
        this.advance(); // consume /
        this.advance(); // consume =
        return this.makeToken(TokenType.CONFIDENCE_SLASH_EQUAL, '~/=', startColumn);
      }
      if (this.peek() === '/') {
        this.advance();
        return this.makeToken(TokenType.CONFIDENCE_SLASH, '~/', startColumn);
      }
      if (this.peek() === '=' && this.peekNext() === '=') {
        this.advance(); // consume first =
        this.advance(); // consume second =
        return this.makeToken(TokenType.CONFIDENCE_EQUAL, '~==', startColumn);
      }
      if (this.peek() === '!' && this.peekNext() === '=') {
        this.advance(); // consume !
        this.advance(); // consume =
        return this.makeToken(TokenType.CONFIDENCE_NOT_EQUAL, '~!=', startColumn);
      }
      if (this.peek() === '<' && this.peekNext() === '=') {
        this.advance(); // consume <
        this.advance(); // consume =
        return this.makeToken(TokenType.CONFIDENCE_LESS_EQUAL, '~<=', startColumn);
      }
      if (this.peek() === '<') {
        this.advance();
        return this.makeToken(TokenType.CONFIDENCE_LESS, '~<', startColumn);
      }
      if (this.peek() === '.') {
        this.advance();
        return this.makeToken(TokenType.CONFIDENCE_DOT, '~.', startColumn);
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

    if (char === '|') {
      if (this.peek() === '>') {
        this.advance(); // consume >
        return this.makeToken(TokenType.PIPELINE, '|>', startColumn);
      }
      if (this.peek() === '|') {
        this.advance(); // consume second |
        return this.makeToken(TokenType.OR, '||', startColumn);
      }
    }

    // String literals
    if (char === '"') {
      return this.string(startColumn);
    }
    
    // Multiline string literals
    if (char === '`' && this.peek() === '`' && this.peekNext() === '`') {
      this.advance(); // consume second `
      this.advance(); // consume third `
      return this.multilineString(startColumn);
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
    let hasInterpolation = false;
    let braceDepth = 0;
    
    while (!this.isAtEnd()) {
      const char = this.peek();
      
      // Check if we're at the closing quote (only when not inside interpolation)
      if (char === '"' && braceDepth === 0) {
        break;
      }
      
      // Handle escape sequences
      if (char === '\\') {
        this.advance(); // consume backslash
        if (this.isAtEnd()) {
          throw new Error(`Unterminated escape sequence at line ${this.line}`);
        }
        
        const escaped = this.advance();
        switch (escaped) {
          case 'n': value.push('\n'); break;
          case 't': value.push('\t'); break;
          case 'r': value.push('\r'); break;
          case '\\': value.push('\\'); break;
          case '"': value.push('"'); break;
          case '\'': value.push('\''); break;
          default:
            // For unknown escape sequences, just include the character
            value.push(escaped);
        }
      } else if (char === '$' && this.peekNext() === '{') {
        // String interpolation detected
        hasInterpolation = true;
        value.push(this.advance()); // $
        value.push(this.advance()); // {
        braceDepth++;
      } else if (char === '{' && braceDepth > 0) {
        // Track nested braces inside interpolation
        value.push(this.advance());
        braceDepth++;
      } else if (char === '}' && braceDepth > 0) {
        // Track closing braces
        value.push(this.advance());
        braceDepth--;
      } else if (char === '\n') {
        throw new Error(`Unexpected newline in string at line ${this.line}`);
      } else {
        value.push(this.advance());
      }
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at line ${this.line}, column ${startColumn}`);
    }

    // Consume closing quote
    this.advance();

    const tokenType = hasInterpolation ? TokenType.INTERPOLATED_STRING : TokenType.STRING;
    return this.makeToken(tokenType, value.join(''), startColumn);
  }
  
  private multilineString(startColumn: number): Token {
    const value: string[] = [];
    const startLine = this.line;
    let hasInterpolation = false;
    let braceDepth = 0;
    
    while (!this.isAtEnd()) {
      // Check for closing ``` (only when not inside interpolation)
      if (this.peek() === '`' && this.peekNext() === '`' && this.peekThird() === '`' && braceDepth === 0) {
        this.advance(); // consume first `
        this.advance(); // consume second `
        this.advance(); // consume third `
        break;
      }
      
      // Check for interpolation
      if (this.peek() === '$' && this.peekNext() === '{') {
        hasInterpolation = true;
        value.push(this.advance()); // $
        value.push(this.advance()); // {
        braceDepth++;
      } else if (this.peek() === '{' && braceDepth > 0) {
        // Track nested braces inside interpolation
        value.push(this.advance());
        braceDepth++;
      } else if (this.peek() === '}' && braceDepth > 0) {
        // Track closing braces
        value.push(this.advance());
        braceDepth--;
      } else {
        const char = this.advance();
        if (char === '\n') {
          this.line++;
          this.column = 0;
        }
        value.push(char);
      }
    }
    
    if (this.isAtEnd() && !(this.input[this.position - 3] === '`' && 
                            this.input[this.position - 2] === '`' && 
                            this.input[this.position - 1] === '`')) {
      throw new Error(`Unterminated multiline string starting at line ${startLine}, column ${startColumn}`);
    }
    
    const tokenType = hasInterpolation ? TokenType.INTERPOLATED_STRING : TokenType.STRING;
    return this.makeToken(tokenType, value.join(''), startColumn);
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
    
    // Special case: standalone underscore is a placeholder
    if (value === '_') {
      return this.makeToken(TokenType.PLACEHOLDER, value, startColumn);
    }
    
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
      } else if (char === '/' && this.peekNext() === '*') {
        // Skip multiline comment (including JSDoc)
        this.advance(); // consume '/'
        this.advance(); // consume '*'
        
        // Skip until we find */
        while (!this.isAtEnd()) {
          if (this.peek() === '*' && this.peekNext() === '/') {
            this.advance(); // consume '*'
            this.advance(); // consume '/'
            break;
          }
          
          if (this.peek() === '\n') {
            this.line++;
            this.column = 0;
          }
          
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

  private peekThird(): string {
    if (this.position + 2 >= this.input.length) return '\0';
    return this.input[this.position + 2];
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
