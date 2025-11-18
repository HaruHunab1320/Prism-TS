import { Token, TokenType, tokenize } from '@prism-lang/core';
import { StreamingValidationResult, SyntaxError, Warning } from './types';

const fallbackKeywords: Record<string, TokenType> = {
  'uncertain': TokenType.UNCERTAIN,
  'if': TokenType.IF,
  'high': TokenType.HIGH,
  'medium': TokenType.MEDIUM,
  'low': TokenType.LOW,
  'default': TokenType.DEFAULT,
  'import': TokenType.IMPORT,
  'export': TokenType.EXPORT,
  'from': TokenType.FROM,
  'async': TokenType.ASYNC,
  'await': TokenType.AWAIT,
  'function': TokenType.FUNCTION,
  'return': TokenType.RETURN,
  'const': TokenType.CONST,
  'let': TokenType.LET,
  'for': TokenType.FOR,
  'while': TokenType.WHILE,
  'do': TokenType.DO,
  'true': TokenType.TRUE,
  'false': TokenType.FALSE,
  'null': TokenType.NULL,
  'undefined': TokenType.UNDEFINED,
};

export class StreamingValidator {
  private buffer: string = '';
  private tokens: Token[] = [];
  private errors: SyntaxError[] = [];
  private warnings: Warning[] = [];
  private parenDepth: number = 0;
  private braceDepth: number = 0;
  private bracketDepth: number = 0;
  private inString: boolean = false;
  private stringDelimiter: string = '';
  private expectingNext: string[] = [];
  private parenStack: Token[] = [];
  private braceStack: Token[] = [];
  private bracketStack: Token[] = [];
  private findLastToken(type: TokenType): Token | undefined {
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      if (this.tokens[i].type === type) {
        return this.tokens[i];
      }
    }
    return undefined;
  }

  validatePartial(chunk: string): StreamingValidationResult {
    this.buffer += chunk;
    this.errors = [];
    this.warnings = [];
    this.expectingNext = [];

    try {
      this.tokenizePartial();
      this.analyzePartialSyntax();
    } catch (error: any) {
      this.errors.push({
        line: 1,
        column: 1,
        message: error.message || 'Streaming parse error',
        code: 'STREAM_PARSE_ERROR',
        severity: 'error'
      });
    }




    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      isPartial: true,
      expectedNext: this.expectingNext
    };
  }

  reset(): void {
    this.buffer = '';
    this.tokens = [];
    this.errors = [];
    this.warnings = [];
    this.parenDepth = 0;
    this.braceDepth = 0;
    this.bracketDepth = 0;
    this.inString = false;
    this.stringDelimiter = '';
    this.expectingNext = [];
    this.parenStack = [];
    this.braceStack = [];
    this.bracketStack = [];
  }

  private tokenizePartial(): void {
    try {
      // First try to tokenize the complete buffer
      this.tokens = tokenize(this.buffer);
      
      // Update depth counters based on tokens
      this.parenDepth = 0;
      this.braceDepth = 0;
      this.bracketDepth = 0;
      this.inString = false;
      this.parenStack = [];
      this.braceStack = [];
      this.bracketStack = [];
      
      
      for (const token of this.tokens) {
        switch (token.type) {
          case TokenType.LEFT_PAREN:
            this.parenDepth++;
            this.parenStack.push(token);
            break;
          case TokenType.RIGHT_PAREN:
            this.parenDepth--;
             if (this.parenStack.length > 0) {
               this.parenStack.pop();
             }
            break;
          case TokenType.LEFT_BRACE:
            this.braceDepth++;
            this.braceStack.push(token);
            break;
          case TokenType.RIGHT_BRACE:
            this.braceDepth--;
            if (this.braceStack.length > 0) {
              this.braceStack.pop();
            }
            break;
          case TokenType.LEFT_BRACKET:
            this.bracketDepth++;
            this.bracketStack.push(token);
            break;
          case TokenType.RIGHT_BRACKET:
            this.bracketDepth--;
            if (this.bracketStack.length > 0) {
              this.bracketStack.pop();
            }
            break;
          case TokenType.STRING:
            // The prism-core tokenizer provides complete string tokens
            // If we got a STRING token, it means the string was properly closed
            // We don't need to set inString = true for complete strings
            break;
        }
      }
    } catch (error) {
      // If tokenization fails completely, fall back to partial tokenization
      this.tokens = this.fallbackTokenization();
    }
  }

  private fallbackTokenization(): Token[] {
    // Simple fallback tokenization for when the main tokenizer fails
    // This happens when the code is incomplete/malformed
    const tokens: Token[] = [];
    const lines = this.buffer.split('\n');
    
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      let pos = 0;
      
      while (pos < line.length) {
        const char = line[pos];
        
        if (this.inString) {
          const stringEnd = line.indexOf(this.stringDelimiter, pos);
          if (stringEnd === -1) {
            pos = line.length;
          } else {
            this.inString = false;
            this.stringDelimiter = '';
            pos = stringEnd + 1;
          }
          continue;
        }

        if (char === ' ' || char === '\t') {
          pos++;
          continue;
        }

        if (char === '/' && line[pos + 1] === '/') {
          break;
        }

        if (char === '"' || char === "'") {
          this.inString = true;
          this.stringDelimiter = char;
          pos++;
          continue;
        }

        const token = this.extractSimpleToken(line, pos, lineNum + 1);
        if (token) {
          tokens.push(token);
          pos += token.value.length;
        } else {
          pos++;
        }
      }
    }
    
    return tokens;
  }

  private extractSimpleToken(line: string, start: number, lineNum: number): Token | null {
    const remaining = line.substring(start);

    const keywordMatch = remaining.match(/^[a-zA-Z_]\w*/);
    if (keywordMatch) {
      const word = keywordMatch[0];
      if (word in fallbackKeywords) {
        return { type: fallbackKeywords[word], value: word, line: lineNum, column: start + 1 };
      }
    }

    // Operators
    if (remaining.startsWith('~>')) {
      return { type: TokenType.CONFIDENCE_ARROW, value: '~>', line: lineNum, column: start + 1 };
    }
    if (remaining[0] === '~') {
      return { type: TokenType.CONFIDENCE_EXTRACT, value: '~', line: lineNum, column: start + 1 };
    }
    if (remaining[0] === '@') {
      return { type: TokenType.CONFIDENCE, value: '@', line: lineNum, column: start + 1 };
    }
    if (remaining[0] === '=') {
      return { type: TokenType.EQUAL, value: '=', line: lineNum, column: start + 1 };
    }

    // Delimiters
    if (remaining[0] === '(') {
      this.parenDepth++;
      this.parenStack.push({ type: TokenType.LEFT_PAREN, value: '(', line: lineNum, column: start + 1 });
      return { type: TokenType.LEFT_PAREN, value: '(', line: lineNum, column: start + 1 };
    }
    if (remaining[0] === ')') {
      this.parenDepth--;
      if (this.parenStack.length > 0) {
        this.parenStack.pop();
      }
      return { type: TokenType.RIGHT_PAREN, value: ')', line: lineNum, column: start + 1 };
    }
    if (remaining[0] === '{') {
      this.braceDepth++;
      this.braceStack.push({ type: TokenType.LEFT_BRACE, value: '{', line: lineNum, column: start + 1 });
      return { type: TokenType.LEFT_BRACE, value: '{', line: lineNum, column: start + 1 };
    }
    if (remaining[0] === '}') {
      this.braceDepth--;
      if (this.braceStack.length > 0) {
        this.braceStack.pop();
      }
      return { type: TokenType.RIGHT_BRACE, value: '}', line: lineNum, column: start + 1 };
    }
    if (remaining[0] === '[') {
      this.bracketDepth++;
      this.bracketStack.push({ type: TokenType.LEFT_BRACKET, value: '[', line: lineNum, column: start + 1 });
      return { type: TokenType.LEFT_BRACKET, value: '[', line: lineNum, column: start + 1 };
    }
    if (remaining[0] === ']') {
      this.bracketDepth--;
      if (this.bracketStack.length > 0) {
        this.bracketStack.pop();
      }
      return { type: TokenType.RIGHT_BRACKET, value: ']', line: lineNum, column: start + 1 };
    }

    // Identifiers
    if (/^[a-zA-Z_]\w*/.test(remaining)) {
      const match = remaining.match(/^[a-zA-Z_]\w*/);
      if (match) {
        return { type: TokenType.IDENTIFIER, value: match[0], line: lineNum, column: start + 1 };
      }
    }

    if (/^\d+/.test(remaining)) {
      const match = remaining.match(/^\d+(\.\d+)?/);
      if (match) {
        return { type: TokenType.NUMBER, value: match[0], line: lineNum, column: start + 1 };
      }
    }

    return null;
  }

  private analyzePartialSyntax(): void {
    // Check for bracket mismatches
    if (this.parenDepth < 0) {
      this.errors.push({
        line: this.findLastToken(TokenType.RIGHT_PAREN)?.line ?? 1,
        column: this.findLastToken(TokenType.RIGHT_PAREN)?.column ?? 1,
        message: 'Unmatched closing parenthesis',
        code: 'UNMATCHED_PAREN',
        severity: 'error'
      });
    }

    if (this.braceDepth < 0) {
      this.errors.push({
        line: this.findLastToken(TokenType.RIGHT_BRACE)?.line ?? 1,
        column: this.findLastToken(TokenType.RIGHT_BRACE)?.column ?? 1,
        message: 'Unmatched closing brace',
        code: 'UNMATCHED_BRACE',
        severity: 'error'
      });
    }

    if (this.bracketDepth < 0) {
      this.errors.push({
        line: this.findLastToken(TokenType.RIGHT_BRACKET)?.line ?? 1,
        column: this.findLastToken(TokenType.RIGHT_BRACKET)?.column ?? 1,
        message: 'Unmatched closing bracket',
        code: 'UNMATCHED_BRACKET',
        severity: 'error'
      });
    }

    // Check for syntax errors like double equals
    for (let i = 0; i < this.tokens.length - 1; i++) {
      const token = this.tokens[i];
      const nextToken = this.tokens[i + 1];
      
      if (token.type === TokenType.EQUAL && nextToken.type === TokenType.EQUAL) {
        this.errors.push({
          line: token.line,
          column: token.column,
          message: 'Unexpected double equals',
          code: 'STREAM_PARSE_ERROR',
          severity: 'error'
        });
      }
    }

    // Analyze token sequences for expected next tokens
    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      const nextToken = this.tokens[i + 1];

      if (token.type === TokenType.UNCERTAIN) {
        if (!nextToken || nextToken.type !== TokenType.IF) {
          this.expectingNext.push('if');
          this.warnings.push({
            line: token.line,
            column: token.column,
            message: 'Uncertain keyword expects "if" to follow',
            code: 'INCOMPLETE_UNCERTAIN',
            severity: 'warning'
          });
        }
      }

      if (token.type === TokenType.IF) {
        if (!nextToken || nextToken.type !== TokenType.LEFT_PAREN) {
          this.expectingNext.push('(');
        }
      }

      if (token.type === TokenType.CONFIDENCE_EXTRACT || token.type === TokenType.TILDE) {
        if (!nextToken || (nextToken.type !== TokenType.IDENTIFIER && 
            nextToken.type !== TokenType.LEFT_PAREN)) {
          this.expectingNext.push('identifier or expression');
        }
      }

      if (token.type === TokenType.CONFIDENCE) {
        if (!nextToken || (nextToken.type !== TokenType.NUMBER && nextToken.type !== TokenType.IDENTIFIER)) {
          this.expectingNext.push('number or identifier');
        }
      }

      if (token.type === TokenType.HIGH || token.type === TokenType.MEDIUM || 
          token.type === TokenType.LOW || token.type === TokenType.DEFAULT) {
        if (!nextToken || nextToken.type !== TokenType.LEFT_BRACE) {
          this.expectingNext.push('{');
        }
      }
    }

    // Add completion expectations based on current state
    if (this.parenDepth > 0) {
      this.expectingNext.push(')');
      const lastOpen = this.parenStack[this.parenStack.length - 1];
      if (lastOpen) {
        this.warnings.push({
          line: lastOpen.line,
          column: lastOpen.column,
          message: 'Unclosed parenthesis',
          code: 'UNCLOSED_PAREN',
          severity: 'warning'
        });
      }
    }
    if (this.braceDepth > 0) {
      this.expectingNext.push('}');
      const lastOpen = this.braceStack[this.braceStack.length - 1];
      if (lastOpen) {
        this.warnings.push({
          line: lastOpen.line,
          column: lastOpen.column,
          message: 'Unclosed brace',
          code: 'UNCLOSED_BRACE',
          severity: 'warning'
        });
      }
    }
    if (this.bracketDepth > 0) {
      this.expectingNext.push(']');
      const lastOpen = this.bracketStack[this.bracketStack.length - 1];
      if (lastOpen) {
        this.warnings.push({
          line: lastOpen.line,
          column: lastOpen.column,
          message: 'Unclosed bracket',
          code: 'UNCLOSED_BRACKET',
          severity: 'warning'
        });
      }
    }
    if (this.inString) {
      this.expectingNext.push(this.stringDelimiter);
    }

    // Suggest what could come after the last meaningful token (ignore EOF)
    const meaningfulTokens = this.tokens.filter(token => token.type !== TokenType.EOF);
    const lastToken = meaningfulTokens[meaningfulTokens.length - 1];
    if (lastToken) {
      this.suggestNextTokens(lastToken);
    } else if (meaningfulTokens.length === 0) {
      // Empty buffer - suggest statement starters
      this.expectingNext.push('statement');
    }
  }

  private suggestNextTokens(lastToken: Token): void {
    switch (lastToken.type) {
      case TokenType.IDENTIFIER:
        this.expectingNext.push('=', '(', '.', '[', 'operator', ';');
        break;
      
      case TokenType.NUMBER:
        this.expectingNext.push('~>', 'operator', ';', ')', '}', ']');
        break;
      
      case TokenType.EQUAL:
        this.expectingNext.push('expression');
        break;
      
      case TokenType.LEFT_PAREN:
        this.expectingNext.push('expression', ')');
        break;
      
      case TokenType.LEFT_BRACE:
        this.expectingNext.push('statement', '}');
        break;
      
      case TokenType.IF:
        this.expectingNext.push('(');
        break;
        
      case TokenType.CONFIDENCE_EXTRACT:
        this.expectingNext.push('identifier or expression');
        break;
        
      case TokenType.CONFIDENCE_ARROW:
        this.expectingNext.push('number or identifier');
        break;
    }
  }

  getCompletions(): string[] {
    const completions: string[] = [];
    
    // Basic keyword completions
    if (this.expectingNext.includes('if')) {
      completions.push('if');
    }
    
    if (this.expectingNext.includes('identifier') || this.expectingNext.includes('identifier or expression')) {
      completions.push('myVariable', 'result', 'value');
    }
    
    if (this.expectingNext.includes('statement')) {
      completions.push('if', 'for', 'while', 'uncertain');
    }
    
    if (this.expectingNext.includes('expression')) {
      completions.push('llm("', 'true', 'false', '0', '"string"');
      // Identifiers are also valid expressions
      completions.push('myVariable', 'result', 'value');
    }
    
    if (this.expectingNext.includes('number or identifier')) {
      completions.push('0.5', '0.8', '1.0', 'confidence', 'value');
    }

    // Context-specific completions
    const meaningfulTokens = this.tokens.filter(token => token.type !== TokenType.EOF);
    if (meaningfulTokens.length > 0) {
      const lastToken = meaningfulTokens[meaningfulTokens.length - 1];
      if (lastToken.type === TokenType.UNCERTAIN) {
        completions.push('uncertain if (');
      }
      
      if (lastToken.value === 'llm') {
        completions.push('llm("');
      }
    }

    return [...new Set(completions)];
  }

  isComplete(): boolean {
    // Code is complete if:
    // 1. Not in the middle of a string
    // 2. All brackets are matched
    
    
    if (this.inString || this.parenDepth !== 0 || this.braceDepth !== 0 || this.bracketDepth !== 0) {
      return false;
    }
    
    // If we have tokens and the last one forms a complete statement, we're complete
    const meaningfulTokens = this.tokens.filter(token => token.type !== TokenType.EOF);
    if (meaningfulTokens.length === 0) {
      return false; // Empty code is not complete
    }
    
    const lastToken = meaningfulTokens[meaningfulTokens.length - 1];
    
    // Simple heuristic: code ending with an identifier, number, or closing bracket is likely complete
    return (
      lastToken.type === TokenType.IDENTIFIER ||
      lastToken.type === TokenType.NUMBER ||
      lastToken.type === TokenType.RIGHT_PAREN ||
      lastToken.type === TokenType.RIGHT_BRACE ||
      lastToken.type === TokenType.RIGHT_BRACKET ||
      lastToken.type === TokenType.STRING
    );
  }
}

export interface ValidateStreamOptions<T> {
  validator?: StreamingValidator;
  extractText?: (chunk: T) => string | null | undefined;
  stopOnError?: boolean;
  signal?: AbortSignal;
  onUpdate?: (result: StreamingValidationResult) => void;
}

export async function validateStream<T>(
  source: AsyncIterable<T>,
  options: ValidateStreamOptions<T> = {}
): Promise<StreamingValidationResult[]> {
  const validator = options.validator ?? new StreamingValidator();
  const extract = options.extractText ?? defaultChunkExtractor;
  const stopOnError = options.stopOnError ?? true;
  const results: StreamingValidationResult[] = [];

  for await (const chunk of source) {
    if (options.signal?.aborted) {
      throw new Error('Streaming validation aborted');
    }

    const text = extract(chunk);
    if (typeof text !== 'string' || text.length === 0) {
      continue;
    }

    const result = validator.validatePartial(text);
    results.push(result);
    options.onUpdate?.(result);

    if (!result.valid && stopOnError) {
      break;
    }
  }

  return results;
}

function defaultChunkExtractor(chunk: any): string | undefined {
  if (typeof chunk === 'string') {
    return chunk;
  }

  if (chunk && typeof chunk === 'object') {
    if (typeof chunk.text === 'string') {
      return chunk.text;
    }
    if (typeof chunk.content === 'string') {
      return chunk.content;
    }
  }

  return undefined;
}
