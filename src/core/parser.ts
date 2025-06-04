import { Token, TokenType, tokenize } from './tokenizer';
import {
  Expression,
  Statement,
  Program,
  IdentifierExpression,
  NumberLiteral,
  StringLiteral,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
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
} from './ast';

export class ParseError extends Error {
  constructor(message: string, public token: Token) {
    super(message);
    this.name = 'ParseError';
  }
}

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
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
    let threshold = 0.5; // default
    
    if (condition instanceof ConfidenceExpression) {
      threshold = condition.confidence;
    }
    
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
        throw new ParseError("Expected 'high', 'medium', or 'low' branch", this.peek());
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
    
    // Check if this is an assignment
    if (expr instanceof IdentifierExpression && this.match(TokenType.EQUAL)) {
      const value = this.expression();
      return new AssignmentStatement(expr.name, value!);
    }
    
    // Wrap expression in an ExpressionStatement
    return new ExpressionStatement(expr!);
  }

  private expression(): Expression | null {
    return this.confidenceExpression();
  }

  private confidenceExpression(): Expression | null {
    const expr = this.logicalOr();
    
    if (this.match(TokenType.CONFIDENCE_ARROW)) {
      const confidence = this.primary();
      if (confidence instanceof NumberLiteral) {
        return new ConfidenceExpression(expr!, confidence.value);
      }
      throw new ParseError("Expected number after '~>'", this.previous());
    }
    
    return expr;
  }

  private logicalOr(): Expression | null {
    let expr = this.logicalAnd();
    
    while (this.match(TokenType.OR)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.logicalAnd();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private logicalAnd(): Expression | null {
    let expr = this.equality();
    
    while (this.match(TokenType.AND)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.equality();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private equality(): Expression | null {
    let expr = this.comparison();
    
    while (this.match(TokenType.NOT_EQUAL, TokenType.EQUAL_EQUAL)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.comparison();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private comparison(): Expression | null {
    let expr = this.term();
    
    while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.term();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private term(): Expression | null {
    let expr = this.factor();
    
    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.factor();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private factor(): Expression | null {
    let expr = this.unary();
    
    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      const operator = this.previous().value as BinaryOperator;
      const right = this.unary();
      expr = new BinaryExpression(operator, expr!, right!);
    }
    
    return expr;
  }

  private unary(): Expression | null {
    if (this.match(TokenType.NOT, TokenType.MINUS, TokenType.TILDE)) {
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
        current = new BinaryExpression('.', current, new IdentifierExpression(name));
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
    
    if (this.match(TokenType.IDENTIFIER)) {
      return new IdentifierExpression(this.previous().value);
    }
    
    if (this.match(TokenType.LEFT_PAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RIGHT_PAREN, "Expected ')' after expression");
      return expr;
    }
    
    throw new ParseError("Expected expression", this.peek());
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
    throw new ParseError(message, this.peek());
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
}

export function parse(source: string): Program {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  return parser.parse();
}