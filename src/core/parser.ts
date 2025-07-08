import { Token, TokenType, tokenize } from './tokenizer';
import {
  Expression,
  Statement,
  Program,
  IdentifierExpression,
  NumberLiteral,
  StringLiteral,
  InterpolatedString,
  BooleanLiteral,
  NullLiteral,
  UndefinedLiteral,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  TernaryExpression,
  ArrayLiteral,
  ObjectLiteral,
  PropertyAccess,
  OptionalChainAccess,
  IndexAccess,
  ConfidenceExpression,
  AssignmentStatement,
  IfStatement,
  UncertainIfStatement,
  ContextStatement,
  AgentDeclaration,
  BlockStatement,
  ExpressionStatement,
  UncertainBranches,
  AgentConfig,
  BinaryOperator,
  UnaryOperator,
  LambdaExpression,
  SpreadElement,
} from './ast';

export class ParseError extends Error {
  constructor(message: string, public token: Token, public sourceCode?: string) {
    const errorMessage = ParseError.formatError(message, token, sourceCode);
    super(errorMessage);
    this.name = 'ParseError';
  }
  
  private static formatError(message: string, token: Token, sourceCode?: string): string {
    let errorMsg = `ParseError at line ${token.line}, column ${token.column}: ${message}`;
    
    if (sourceCode) {
      const lines = sourceCode.split('\n');
      const errorLine = lines[token.line - 1];
      
      if (errorLine) {
        errorMsg += '\n\n';
        errorMsg += `  ${token.line} | ${errorLine}\n`;
        errorMsg += `      ${' '.repeat(token.column)}^`;
        
        // Add some context - show the token that caused the error
        if (token.type !== TokenType.EOF) {
          errorMsg += `\n\nFound: '${token.value}' (${TokenType[token.type]})`;
        }
      }
    }
    
    return errorMsg;
  }
}

export class Parser {
  private tokens: Token[];
  private current: number = 0;
  private sourceCode?: string;

  constructor(tokens: Token[], sourceCode?: string) {
    this.tokens = tokens;
    this.sourceCode = sourceCode;
  }

  parse(): Program {
    const statements: Statement[] = [];
    
    while (!this.isAtEnd()) {
      const stmt = this.statement();
      if (stmt) {
        statements.push(stmt);
      }
    }

    return new Program(statements);
  }

  private statement(): Statement | null {
    try {
      if (this.match(TokenType.AGENTS)) {
        return this.agentsStatement();
      }
      
      if (this.match(TokenType.UNCERTAIN)) {
        return this.uncertainIfStatement();
      }
      
      if (this.match(TokenType.IF)) {
        return this.ifStatement();
      }
      
      if (this.match(TokenType.IN)) {
        return this.contextStatement();
      }
      
      if (this.match(TokenType.LEFT_BRACE)) {
        return this.blockStatement();
      }
      
      return this.expressionStatement();
    } catch (error) {
      this.synchronize();
      throw error;
    }
  }

  private agentsStatement(): Statement {
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after 'agents'");
    
    const statements: Statement[] = [];
    
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const agentDecl = this.agentDeclaration();
      statements.push(agentDecl);
    }
    
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after agents block");
    
    return new BlockStatement(statements);
  }

  private agentDeclaration(): AgentDeclaration {
    const name = this.consume(TokenType.IDENTIFIER, "Expected agent name").value;
    this.consume(TokenType.COLON, "Expected ':' after agent name");
    this.consume(TokenType.AGENT, "Expected 'Agent' keyword");
    
    const config: AgentConfig = {};
    
    if (this.match(TokenType.LEFT_BRACE)) {
      while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
        const key = this.consume(TokenType.IDENTIFIER, "Expected config key").value;
        this.consume(TokenType.COLON, "Expected ':' after config key");
        
        if (key === 'confidence') {
          const value = this.consume(TokenType.NUMBER, "Expected number for confidence").value;
          config.confidence = parseFloat(value);
        } else if (key === 'role') {
          const value = this.consume(TokenType.STRING, "Expected string for role").value;
          config.role = value;
        }
        
        if (this.check(TokenType.COMMA)) {
          this.advance();
        }
      }
      
      this.consume(TokenType.RIGHT_BRACE, "Expected '}' after agent config");
    }
    
    return new AgentDeclaration(name, config);
  }

  private uncertainIfStatement(): UncertainIfStatement {
    this.consume(TokenType.IF, "Expected 'if' after 'uncertain'");
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'uncertain if'");
    
    const condition = this.expression();
    const threshold = 0.5; // default threshold, actual evaluation happens at runtime
    
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after condition");
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after condition");
    
    const branches: UncertainBranches = {
      high: new BlockStatement([]),
      low: new BlockStatement([]),
    };
    
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.HIGH)) {
        this.consume(TokenType.LEFT_BRACE, "Expected '{' after 'high'");
        const statements = this.blockContents();
        branches.high = new BlockStatement(statements);
        this.consume(TokenType.RIGHT_BRACE, "Expected '}' after high branch");
      } else if (this.match(TokenType.MEDIUM)) {
        this.consume(TokenType.LEFT_BRACE, "Expected '{' after 'medium'");
        const statements = this.blockContents();
        branches.medium = new BlockStatement(statements);
        this.consume(TokenType.RIGHT_BRACE, "Expected '}' after medium branch");
      } else if (this.match(TokenType.LOW)) {
        this.consume(TokenType.LEFT_BRACE, "Expected '{' after 'low'");
        const statements = this.blockContents();
        branches.low = new BlockStatement(statements);
        this.consume(TokenType.RIGHT_BRACE, "Expected '}' after low branch");
      } else {
        throw new ParseError("Expected 'high', 'medium', or 'low' branch", this.peek(), this.sourceCode);
      }
    }
    
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after uncertain if branches");
    
    return new UncertainIfStatement(condition!, threshold, branches);
  }

  private ifStatement(): IfStatement {
    this.consume(TokenType.LEFT_PAREN, "Expected '(' after 'if'");
    const condition = this.expression();
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after if condition");
    
    const thenStatement = this.statement();
    let elseStatement: Statement | undefined = undefined;
    
    if (this.match(TokenType.ELSE)) {
      elseStatement = this.statement() || undefined;
    }
    
    return new IfStatement(condition!, thenStatement!, elseStatement);
  }

  private contextStatement(): ContextStatement {
    this.consume(TokenType.CONTEXT, "Expected 'context' after 'in'");
    const contextName = this.consume(TokenType.IDENTIFIER, "Expected context name").value;
    
    const body = this.statement();
    let shiftTo: string | undefined = undefined;
    
    if (this.match(TokenType.SHIFTING)) {
      this.consume(TokenType.TO, "Expected 'to' after 'shifting'");
      shiftTo = this.consume(TokenType.IDENTIFIER, "Expected context name after 'to'").value;
      // Parse the shifting target block
      this.statement(); // consume the shifting target block
    }
    
    return new ContextStatement(contextName, body!, shiftTo);
  }

  private blockStatement(): BlockStatement {
    const statements = this.blockContents();
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after block");
    return new BlockStatement(statements);
  }

  private blockContents(): Statement[] {
    const statements: Statement[] = [];
    
    while (!this.check(TokenType.RIGHT_BRACE) && !this.isAtEnd()) {
      const stmt = this.statement();
      if (stmt) {
        statements.push(stmt);
      }
    }
    
    return statements;
  }

  private expressionStatement(): Statement {
    const expr = this.expression();
    
    // Check if this is an assignment or compound assignment
    if (expr instanceof IdentifierExpression) {
      if (this.match(TokenType.EQUAL)) {
        const value = this.expression();
        // Consume optional semicolon
        this.match(TokenType.SEMICOLON);
        return new AssignmentStatement(expr.name, value!);
      } else if (this.match(TokenType.PLUS_EQUAL)) {
        // x += y becomes x = x + y
        const right = this.expression();
        const value = new BinaryExpression('+', expr, right!);
        this.match(TokenType.SEMICOLON);
        return new AssignmentStatement(expr.name, value);
      } else if (this.match(TokenType.MINUS_EQUAL)) {
        // x -= y becomes x = x - y
        const right = this.expression();
        const value = new BinaryExpression('-', expr, right!);
        this.match(TokenType.SEMICOLON);
        return new AssignmentStatement(expr.name, value);
      } else if (this.match(TokenType.STAR_EQUAL)) {
        // x *= y becomes x = x * y
        const right = this.expression();
        const value = new BinaryExpression('*', expr, right!);
        this.match(TokenType.SEMICOLON);
        return new AssignmentStatement(expr.name, value);
      } else if (this.match(TokenType.SLASH_EQUAL)) {
        // x /= y becomes x = x / y
        const right = this.expression();
        const value = new BinaryExpression('/', expr, right!);
        this.match(TokenType.SEMICOLON);
        return new AssignmentStatement(expr.name, value);
      } else if (this.match(TokenType.PERCENT_EQUAL)) {
        // x %= y becomes x = x % y
        const right = this.expression();
        const value = new BinaryExpression('%', expr, right!);
        this.match(TokenType.SEMICOLON);
        return new AssignmentStatement(expr.name, value);
      }
    }
    
    // Consume optional semicolon
    this.match(TokenType.SEMICOLON);
    
    // Wrap expression in an ExpressionStatement
    return new ExpressionStatement(expr!);
  }

  private expression(): Expression | null {
    return this.ternary();
  }

  private ternary(): Expression | null {
    let expr = this.confidenceExpression();
    
    if (this.match(TokenType.QUESTION)) {
      const trueBranch = this.expression();
      if (!trueBranch) {
        throw new ParseError("Expected expression after '?'", this.previous(), this.sourceCode);
      }
      
      if (!this.match(TokenType.COLON)) {
        throw new ParseError("Expected ':' after true branch of ternary operator", this.peek(), this.sourceCode);
      }
      
      const falseBranch = this.expression();
      if (!falseBranch) {
        throw new ParseError("Expected expression after ':'", this.previous(), this.sourceCode);
      }
      
      return new TernaryExpression(expr!, trueBranch, falseBranch);
    }
    
    return expr;
  }

  private confidenceExpression(): Expression | null {
    let expr = this.logicalOr();
    
    if (this.match(TokenType.CONFIDENCE_ARROW)) {
      const confidence = this.primary();
      if (confidence) {
        return new ConfidenceExpression(expr!, confidence);
      }
      throw new ParseError("Expected expression after '~>'", this.previous(), this.sourceCode);
    }
    
    // Handle confidence chaining operator (~~)
    while (this.match(TokenType.CONFIDENCE_CHAIN)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.logicalOr();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private logicalOr(): Expression | null {
    let expr = this.nullishCoalesce();
    
    while (this.match(TokenType.OR, TokenType.CONFIDENCE_OR, TokenType.PARALLEL_CONFIDENCE, TokenType.THRESHOLD_GATE)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.nullishCoalesce();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private nullishCoalesce(): Expression | null {
    let expr = this.confidenceCoalesce();
    
    while (this.match(TokenType.QUESTION_QUESTION)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.confidenceCoalesce();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private confidenceCoalesce(): Expression | null {
    let expr = this.logicalAnd();
    
    while (this.match(TokenType.CONFIDENCE_COALESCE)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.logicalAnd();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private logicalAnd(): Expression | null {
    let expr = this.equality();
    
    while (this.match(TokenType.AND, TokenType.CONFIDENCE_AND)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.equality();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private equality(): Expression | null {
    let expr = this.comparison();
    
    while (this.match(TokenType.NOT_EQUAL, TokenType.EQUAL_EQUAL, TokenType.CONFIDENCE_EQUAL, TokenType.CONFIDENCE_NOT_EQUAL)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.comparison();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private comparison(): Expression | null {
    let expr = this.term();
    
    while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL, 
                      TokenType.CONFIDENCE_GREATER_EQUAL, TokenType.CONFIDENCE_LESS, TokenType.CONFIDENCE_LESS_EQUAL)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.term();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private term(): Expression | null {
    let expr = this.factor();
    
    while (this.match(TokenType.MINUS, TokenType.PLUS, TokenType.CONFIDENCE_MINUS, TokenType.CONFIDENCE_PLUS)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.factor();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private factor(): Expression | null {
    let expr = this.exponent();
    
    while (this.match(TokenType.SLASH, TokenType.STAR, TokenType.PERCENT, TokenType.CONFIDENCE_SLASH, TokenType.CONFIDENCE_STAR)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.exponent();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private exponent(): Expression | null {
    let expr = this.unary();
    
    // Right-associative: parse from right to left
    if (this.match(TokenType.STAR_STAR)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.exponent(); // Recursive for right-associativity
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private unary(): Expression | null {
    if (this.match(TokenType.NOT, TokenType.MINUS, TokenType.TILDE, TokenType.CONFIDENCE_EXTRACT)) {
      const operator = this.previous().value as UnaryOperator;
      const right = this.unary();
      return new UnaryExpression(operator, right!);
    }
    
    return this.call();
  }

  private call(): Expression | null {
    const expr = this.primary();
    
    let current = expr;
    while (current) {
      if (this.match(TokenType.LEFT_PAREN)) {
        current = this.finishCall(current);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, "Expected property name after '.'").value;
        current = new PropertyAccess(current, name);
      } else if (this.match(TokenType.OPTIONAL_CHAIN)) {
        const name = this.consume(TokenType.IDENTIFIER, "Expected property name after '?.'").value;
        current = new OptionalChainAccess(current, name);
      } else if (this.match(TokenType.CONFIDENCE_DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, "Expected property name after '~.'").value;
        current = new BinaryExpression('~.', current, new IdentifierExpression(name));
      } else if (this.match(TokenType.LEFT_BRACKET)) {
        const index = this.expression();
        if (!index) {
          throw new ParseError("Expected expression in brackets", this.peek(), this.sourceCode);
        }
        this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after index");
        current = new IndexAccess(current, index);
      } else {
        break;
      }
    }
    
    return current;
  }

  private finishCall(callee: Expression): Expression {
    const args: Expression[] = [];
    
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        const arg = this.expression();
        if (arg) args.push(arg);
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RIGHT_PAREN, "Expected ')' after arguments");
    return new CallExpression(callee, args);
  }

  private primary(): Expression | null {
    if (this.match(TokenType.NUMBER)) {
      return new NumberLiteral(parseFloat(this.previous().value));
    }
    
    if (this.match(TokenType.STRING)) {
      return new StringLiteral(this.previous().value);
    }
    
    if (this.match(TokenType.INTERPOLATED_STRING)) {
      return this.parseInterpolatedString(this.previous());
    }
    
    if (this.match(TokenType.TRUE)) {
      return new BooleanLiteral(true);
    }
    
    if (this.match(TokenType.FALSE)) {
      return new BooleanLiteral(false);
    }
    
    if (this.match(TokenType.NULL)) {
      return new NullLiteral();
    }
    
    if (this.match(TokenType.UNDEFINED)) {
      return new UndefinedLiteral();
    }
    
    if (this.match(TokenType.IDENTIFIER)) {
      const identifier = this.previous().value;
      
      // Check for single-parameter lambda without parentheses
      if (this.check(TokenType.ARROW)) {
        this.advance(); // consume =>
        const body = this.ternary();
        if (!body) {
          throw new ParseError("Expected expression after '=>'", this.previous(), this.sourceCode);
        }
        return new LambdaExpression([identifier], body);
      }
      
      return new IdentifierExpression(identifier);
    }
    
    if (this.match(TokenType.LEFT_PAREN)) {
      // Check if this could be a lambda expression
      const savedPosition = this.current;
      
      // Try to parse as lambda parameters
      const params: string[] = [];
      let isLambda = false;
      
      // Empty params () =>
      if (this.check(TokenType.RIGHT_PAREN)) {
        this.advance();
        if (this.check(TokenType.ARROW)) {
          isLambda = true;
        }
      } else if (this.check(TokenType.IDENTIFIER)) {
        // Single param (x) => or multiple (x, y) =>
        do {
          if (this.match(TokenType.IDENTIFIER)) {
            params.push(this.previous().value);
          } else {
            break;
          }
        } while (this.match(TokenType.COMMA));
        
        if (this.match(TokenType.RIGHT_PAREN) && this.check(TokenType.ARROW)) {
          isLambda = true;
        }
      }
      
      if (isLambda) {
        this.consume(TokenType.ARROW, "Expected '=>' after lambda parameters");
        const body = this.ternary(); // Parse lambda body
        if (!body) {
          throw new ParseError("Expected expression after '=>'", this.previous(), this.sourceCode);
        }
        return new LambdaExpression(params, body);
      }
      
      // Not a lambda, restore position and parse as grouped expression
      this.current = savedPosition;
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression");
      return expr;
    }
    
    if (this.match(TokenType.LEFT_BRACKET)) {
      return this.arrayLiteral();
    }
    
    // Check for object literal by looking ahead for object-like pattern
    if (this.check(TokenType.LEFT_BRACE)) {
      // Save current position
      const savedPosition = this.current;
      this.advance(); // consume {
      
      // Check if it's an object literal or block statement
      let isObject = false;
      if (this.check(TokenType.RIGHT_BRACE)) {
        // Empty braces - could be either, treat as object
        isObject = true;
      } else if (this.check(TokenType.SPREAD)) {
        // Spread syntax indicates object literal
        isObject = true;
      } else if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.STRING)) {
        // Save position and check for colon after identifier/string
        const checkPos = this.current;
        this.advance();
        if (this.check(TokenType.COLON)) {
          isObject = true;
        }
        this.current = checkPos;
      }
      
      // Restore position
      this.current = savedPosition;
      
      if (isObject) {
        this.advance(); // consume {
        return this.objectLiteral();
      }
    }
    
    throw new ParseError("Expected expression", this.peek(), this.sourceCode);
  }
  
  private arrayLiteral(): ArrayLiteral {
    const elements: (Expression | SpreadElement)[] = [];
    
    if (!this.check(TokenType.RIGHT_BRACKET)) {
      do {
        // Check for spread syntax
        if (this.match(TokenType.SPREAD)) {
          const argument = this.expression();
          if (!argument) {
            throw new ParseError("Expected expression after '...'", this.previous(), this.sourceCode);
          }
          elements.push(new SpreadElement(argument));
        } else {
          const elem = this.expression();
          if (elem) {
            elements.push(elem);
          }
        }
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RIGHT_BRACKET, "Expected ']' after array elements");
    return new ArrayLiteral(elements);
  }
  
  private objectLiteral(): ObjectLiteral {
    const properties: Array<{ key?: string; value: Expression | SpreadElement }> = [];
    
    if (!this.check(TokenType.RIGHT_BRACE)) {
      do {
        // Check for spread syntax
        if (this.match(TokenType.SPREAD)) {
          const argument = this.expression();
          if (!argument) {
            throw new ParseError("Expected expression after '...'", this.previous(), this.sourceCode);
          }
          properties.push({ value: new SpreadElement(argument) });
        } else {
          // Regular property
          let key: string;
          
          if (this.match(TokenType.IDENTIFIER)) {
            key = this.previous().value;
          } else if (this.match(TokenType.STRING)) {
            key = this.previous().value;
          } else {
            throw new ParseError("Expected property name", this.peek(), this.sourceCode);
          }
          
          this.consume(TokenType.COLON, "Expected ':' after property name");
          
          const value = this.expression();
          if (!value) {
            throw new ParseError("Expected expression after ':'", this.previous(), this.sourceCode);
          }
          
          properties.push({ key, value });
        }
      } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after object properties");
    return new ObjectLiteral(properties);
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParseError(message, this.peek(), this.sourceCode);
  }

  private synchronize(): void {
    this.advance();
    
    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;
      
      switch (this.peek().type) {
        case TokenType.IF:
        case TokenType.UNCERTAIN:
        case TokenType.IN:
        case TokenType.AGENTS:
          return;
      }
      
      this.advance();
    }
  }
  
  private parseInterpolatedString(token: Token): InterpolatedString {
    const value = token.value;
    const parts: string[] = [];
    const expressions: Expression[] = [];
    
    let current = 0;
    let partStart = 0;
    
    while (current < value.length) {
      if (value[current] === '$' && value[current + 1] === '{') {
        // Found interpolation start
        // Save the string part before interpolation
        parts.push(value.substring(partStart, current));
        
        // Find the end of interpolation
        current += 2; // Skip ${
        let braceCount = 1;
        let exprStart = current;
        
        let inString = false;
        let stringDelimiter = '';
        
        while (current < value.length && braceCount > 0) {
          const ch = value[current];
          
          // Handle string literals to ignore braces inside strings
          if ((ch === '"' || ch === "'") && (current === 0 || value[current - 1] !== '\\')) {
            if (!inString) {
              inString = true;
              stringDelimiter = ch;
            } else if (ch === stringDelimiter) {
              inString = false;
            }
          }
          
          // Only count braces when not inside a string
          if (!inString) {
            if (ch === '{') braceCount++;
            else if (ch === '}') braceCount--;
          }
          
          if (braceCount > 0) current++;
        }
        
        if (braceCount !== 0) {
          throw new ParseError('Unclosed interpolation in string', token, this.sourceCode);
        }
        
        // Parse the expression inside ${}
        const exprCode = value.substring(exprStart, current);
        
        // Check for empty expression
        if (exprCode.trim() === '') {
          throw new ParseError('Empty interpolation expression', token, this.sourceCode);
        }
        
        const exprTokens = tokenize(exprCode);
        const exprParser = new Parser(exprTokens, exprCode);
        const expr = exprParser.expression();
        
        if (!expr) {
          throw new ParseError('Invalid interpolation expression', token, this.sourceCode);
        }
        
        expressions.push(expr);
        current++; // Skip closing }
        partStart = current;
      } else {
        current++;
      }
    }
    
    // Add the final part after the last interpolation
    parts.push(value.substring(partStart));
    
    return new InterpolatedString(parts, expressions);
  }
}

export function parse(source: string): Program {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  return parser.parse();
}