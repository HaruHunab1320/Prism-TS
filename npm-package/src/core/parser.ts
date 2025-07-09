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
  AssignmentExpression,
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
  PlaceholderExpression,
  ForLoop,
  ForInLoop,
  WhileLoop,
  DoWhileLoop,
  BreakStatement,
  ContinueStatement,
  UncertainForLoop,
  UncertainWhileLoop,
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
        // Check what follows 'uncertain'
        if (this.check(TokenType.IF)) {
          return this.uncertainIfStatement();
        } else if (this.check(TokenType.FOR)) {
          return this.uncertainForStatement();
        } else if (this.check(TokenType.WHILE)) {
          return this.uncertainWhileStatement();
        } else {
          throw new ParseError("Expected 'if', 'for', or 'while' after 'uncertain'", this.peek(), this.sourceCode);
        }
      }
      
      if (this.match(TokenType.IF)) {
        return this.ifStatement();
      }
      
      if (this.match(TokenType.FOR)) {
        return this.forStatement();
      }
      
      if (this.match(TokenType.WHILE)) {
        return this.whileStatement();
      }
      
      if (this.match(TokenType.DO)) {
        return this.doWhileStatement();
      }
      
      if (this.match(TokenType.BREAK)) {
        return this.breakStatement();
      }
      
      if (this.match(TokenType.CONTINUE)) {
        return this.continueStatement();
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

  private forStatement(): Statement {
    // for statement can be either:
    // 1. C-style: for i = 0; i < 10; i++ { ... }
    // 2. For-in: for item in array { ... }
    // 3. For-in with index: for item, index in array { ... }
    
    // Check if this is a for-in loop by looking ahead
    const checkPoint = this.current;
    
    // Try to parse as for-in first
    if (this.check(TokenType.IDENTIFIER)) {
      this.advance();
      
      if (this.check(TokenType.COMMA)) {
        // for item, index in array
        this.advance(); // consume comma
        if (this.check(TokenType.IDENTIFIER)) {
          this.advance();
          if (this.check(TokenType.IN)) {
            // Reset and parse as for-in with index
            this.current = checkPoint;
            return this.forInStatement();
          }
        }
      } else if (this.check(TokenType.IN)) {
        // for item in array
        this.current = checkPoint;
        return this.forInStatement();
      }
    }
    
    // Reset position and parse as C-style for loop
    this.current = checkPoint;
    
    // C-style for loop: for init; condition; update { body }
    let init: Statement | null = null;
    let condition: Expression | null = null;
    let update: Expression | null = null;
    
    // Parse init
    if (!this.check(TokenType.SEMICOLON)) {
      if (this.check(TokenType.IDENTIFIER) && this.peekNext().type === TokenType.EQUAL) {
        // Variable assignment
        const identifier = this.advance().value;
        this.consume(TokenType.EQUAL, "Expected '=' in assignment");
        const value = this.expression();
        if (!value) {
          throw new ParseError("Expected expression after '='", this.previous(), this.sourceCode);
        }
        init = new AssignmentStatement(identifier, value);
      } else {
        // Expression
        const expr = this.expression();
        if (expr) {
          init = new ExpressionStatement(expr);
        }
      }
    }
    
    if (!this.match(TokenType.SEMICOLON)) {
      throw new ParseError("Expected ';' after for loop initializer", this.peek(), this.sourceCode);
    }
    
    // Parse condition
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }
    
    if (!this.match(TokenType.SEMICOLON)) {
      throw new ParseError("Expected ';' after for loop condition", this.peek(), this.sourceCode);
    }
    
    // Parse update
    if (!this.check(TokenType.LEFT_BRACE)) {
      // Check if this is an assignment
      if (this.check(TokenType.IDENTIFIER)) {
        const checkPoint = this.current;
        const identifier = this.advance();
        
        if (this.match(TokenType.EQUAL)) {
          // It's an assignment expression
          const value = this.expression();
          if (!value) {
            throw new ParseError("Expected expression after '='", this.previous(), this.sourceCode);
          }
          update = new AssignmentExpression(identifier.value, value);
        } else {
          // Not an assignment, reset and parse as regular expression
          this.current = checkPoint;
          update = this.expression();
        }
      } else {
        update = this.expression();
      }
    }
    
    // Parse body
    const body = this.statement();
    if (!body) {
      throw new ParseError("Expected body for for loop", this.peek(), this.sourceCode);
    }
    
    return new ForLoop(init, condition, update, body);
  }
  
  private forInStatement(): Statement {
    // Parse variable name
    if (!this.check(TokenType.IDENTIFIER)) {
      throw new ParseError("Expected identifier in for-in loop", this.peek(), this.sourceCode);
    }
    const variable = this.advance().value;
    
    // Check for optional index variable
    let index: string | null = null;
    if (this.match(TokenType.COMMA)) {
      if (!this.check(TokenType.IDENTIFIER)) {
        throw new ParseError("Expected identifier after comma in for-in loop", this.peek(), this.sourceCode);
      }
      index = this.advance().value;
    }
    
    // Expect 'in'
    if (!this.match(TokenType.IN)) {
      throw new ParseError("Expected 'in' in for-in loop", this.peek(), this.sourceCode);
    }
    
    // Parse iterable expression
    const iterable = this.expression();
    if (!iterable) {
      throw new ParseError("Expected expression after 'in'", this.peek(), this.sourceCode);
    }
    
    // Parse body
    const body = this.statement();
    if (!body) {
      throw new ParseError("Expected body for for-in loop", this.peek(), this.sourceCode);
    }
    
    return new ForInLoop(variable, index, iterable, body);
  }
  
  private whileStatement(): Statement {
    // Parse condition
    const condition = this.expression();
    if (!condition) {
      throw new ParseError("Expected condition in while loop", this.peek(), this.sourceCode);
    }
    
    // Parse body
    const body = this.statement();
    if (!body) {
      throw new ParseError("Expected body for while loop", this.peek(), this.sourceCode);
    }
    
    return new WhileLoop(condition, body);
  }
  
  private doWhileStatement(): Statement {
    // Parse body
    const body = this.statement();
    if (!body) {
      throw new ParseError("Expected body for do-while loop", this.peek(), this.sourceCode);
    }
    
    // Expect 'while'
    if (!this.match(TokenType.WHILE)) {
      throw new ParseError("Expected 'while' after do-while body", this.peek(), this.sourceCode);
    }
    
    // Parse condition
    const condition = this.expression();
    if (!condition) {
      throw new ParseError("Expected condition in do-while loop", this.peek(), this.sourceCode);
    }
    
    return new DoWhileLoop(body, condition);
  }
  
  private breakStatement(): Statement {
    return new BreakStatement();
  }
  
  private continueStatement(): Statement {
    return new ContinueStatement();
  }
  
  private uncertainForStatement(): Statement {
    this.consume(TokenType.FOR, "Expected 'for' after 'uncertain'");
    
    // Parse init, condition, update like regular for loop
    let init: Statement | null = null;
    let condition: Expression | null = null;
    let update: Expression | null = null;
    
    // Parse init
    if (!this.check(TokenType.SEMICOLON)) {
      if (this.check(TokenType.IDENTIFIER) && this.peekNext().type === TokenType.EQUAL) {
        const identifier = this.advance().value;
        this.consume(TokenType.EQUAL, "Expected '=' in assignment");
        const value = this.expression();
        if (!value) {
          throw new ParseError("Expected expression after '='", this.previous(), this.sourceCode);
        }
        init = new AssignmentStatement(identifier, value);
      } else {
        const expr = this.expression();
        if (expr) {
          init = new ExpressionStatement(expr);
        }
      }
    }
    
    if (!this.match(TokenType.SEMICOLON)) {
      throw new ParseError("Expected ';' after for loop initializer", this.peek(), this.sourceCode);
    }
    
    // Parse condition
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }
    
    if (!this.match(TokenType.SEMICOLON)) {
      throw new ParseError("Expected ';' after for loop condition", this.peek(), this.sourceCode);
    }
    
    // Parse update
    if (!this.check(TokenType.LEFT_BRACE)) {
      if (this.check(TokenType.IDENTIFIER)) {
        const checkPoint = this.current;
        const identifier = this.advance();
        
        if (this.match(TokenType.EQUAL)) {
          const value = this.expression();
          if (!value) {
            throw new ParseError("Expected expression after '='", this.previous(), this.sourceCode);
          }
          update = new AssignmentExpression(identifier.value, value);
        } else {
          this.current = checkPoint;
          update = this.expression();
        }
      } else {
        update = this.expression();
      }
    }
    
    // Parse uncertain branches
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after uncertain for loop header");
    const branches = this.parseUncertainBranches();
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after uncertain for branches");
    
    return new UncertainForLoop(init, condition, update, branches);
  }
  
  private uncertainWhileStatement(): Statement {
    this.consume(TokenType.WHILE, "Expected 'while' after 'uncertain'");
    
    // Parse condition - must be a confident expression
    const condition = this.expression();
    if (!condition) {
      throw new ParseError("Expected condition in uncertain while loop", this.peek(), this.sourceCode);
    }
    
    // Parse uncertain branches
    this.consume(TokenType.LEFT_BRACE, "Expected '{' after uncertain while condition");
    const branches = this.parseUncertainBranches();
    this.consume(TokenType.RIGHT_BRACE, "Expected '}' after uncertain while branches");
    
    return new UncertainWhileLoop(condition, branches);
  }
  
  private parseUncertainBranches(): UncertainBranches {
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
        throw new ParseError("Expected 'high', 'medium', or 'low' branch in uncertain loop", this.peek(), this.sourceCode);
      }
    }
    
    return branches;
  }

  private expression(): Expression | null {
    return this.pipeline();
  }
  
  private pipeline(): Expression | null {
    let expr = this.ternary();
    
    while (this.match(TokenType.PIPELINE, TokenType.CONFIDENCE_PIPELINE, TokenType.CONFIDENCE_THRESHOLD_GATE)) {
      const operator = this.previous();
      
      if (operator.type === TokenType.CONFIDENCE_THRESHOLD_GATE) {
        // Handle threshold gate operator ~?>
        const threshold = this.ternary();
        if (!threshold) {
          throw new ParseError("Expected threshold expression after '~?>'", this.previous(), this.sourceCode);
        }
        
        // Create threshold gate expression
        expr = new BinaryExpression('~?>' as BinaryOperator, expr!, threshold);
      } else {
        // Handle regular and confidence pipeline operators
        const isConfidencePipeline = operator.type === TokenType.CONFIDENCE_PIPELINE;
        const right = this.ternary();
        
        if (!right) {
          throw new ParseError("Expected expression after pipeline operator", this.previous(), this.sourceCode);
        }
        
        // Replace placeholders in the right expression with the left expression
        const pipelineExpr = this.replacePlaceholders(right, expr!);
        
        // For confidence pipeline, wrap in a binary expression to preserve confidence
        if (isConfidencePipeline) {
          expr = new BinaryExpression('~|>' as BinaryOperator, expr!, pipelineExpr);
        } else {
          expr = pipelineExpr;
        }
      }
    }
    
    return expr;
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
      const operatorToken = this.previous();
      const operator = operatorToken.value as BinaryOperator;
      const right = this.equality();
      expr = new BinaryExpression(operator, expr!, right!).setLocation(operatorToken.line, operatorToken.column);
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
    const args: (Expression | SpreadElement)[] = [];
    
    if (!this.check(TokenType.RIGHT_PAREN)) {
      do {
        // Check for spread syntax
        if (this.match(TokenType.SPREAD)) {
          const argument = this.expression();
          if (!argument) {
            throw new ParseError("Expected expression after '...'", this.previous(), this.sourceCode);
          }
          args.push(new SpreadElement(argument));
        } else {
          const arg = this.expression();
          if (arg) args.push(arg);
        }
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
    
    if (this.match(TokenType.PLACEHOLDER)) {
      return new PlaceholderExpression();
    }
    
    if (this.match(TokenType.IDENTIFIER)) {
      const identToken = this.previous();
      const identifier = identToken.value;
      
      // Check for single-parameter lambda without parentheses
      if (this.check(TokenType.ARROW)) {
        this.advance(); // consume =>
        const body = this.ternary();
        if (!body) {
          throw new ParseError("Expected expression after '=>'", this.previous(), this.sourceCode);
        }
        return new LambdaExpression([identifier], body);
      }
      
      return new IdentifierExpression(identifier).setLocation(identToken.line, identToken.column);
    }
    
    if (this.match(TokenType.LEFT_PAREN)) {
      // Check if this could be a lambda expression
      const savedPosition = this.current;
      
      // Try to parse as lambda parameters
      const params: string[] = [];
      let restParam: string | undefined = undefined;
      let isLambda = false;
      
      // Empty params () =>
      if (this.check(TokenType.RIGHT_PAREN)) {
        this.advance();
        if (this.check(TokenType.ARROW)) {
          isLambda = true;
        }
      } else if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.SPREAD)) {
        // Parse parameters, including potential rest parameter
        do {
          if (this.match(TokenType.SPREAD)) {
            // Rest parameter
            if (!this.check(TokenType.IDENTIFIER)) {
              throw new ParseError("Expected parameter name after '...'", this.peek(), this.sourceCode);
            }
            restParam = this.advance().value;
            
            // Rest parameter must be last
            if (this.match(TokenType.COMMA)) {
              throw new ParseError("Rest parameter must be last formal parameter", this.previous(), this.sourceCode);
            }
          } else if (this.match(TokenType.IDENTIFIER)) {
            if (restParam) {
              throw new ParseError("Rest parameter must be last formal parameter", this.previous(), this.sourceCode);
            }
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
        return new LambdaExpression(params, body, restParam);
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

  private peekNext(): Token {
    if (this.current + 1 >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1]; // Return EOF token
    }
    return this.tokens[this.current + 1];
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
  
  private replacePlaceholders(expr: Expression, replacement: Expression): Expression {
    // Base case: if this is a placeholder, replace it
    if (expr instanceof PlaceholderExpression) {
      return replacement;
    }
    
    // Recursive cases: traverse the AST and replace placeholders
    if (expr instanceof BinaryExpression) {
      return new BinaryExpression(
        expr.operator,
        this.replacePlaceholders(expr.left, replacement),
        this.replacePlaceholders(expr.right, replacement)
      );
    }
    
    if (expr instanceof UnaryExpression) {
      return new UnaryExpression(
        expr.operator,
        this.replacePlaceholders(expr.operand, replacement)
      );
    }
    
    if (expr instanceof CallExpression) {
      const newArgs = expr.args.map(arg => {
        if (arg instanceof SpreadElement) {
          return new SpreadElement(this.replacePlaceholders(arg.argument, replacement));
        }
        return this.replacePlaceholders(arg, replacement);
      });
      return new CallExpression(
        this.replacePlaceholders(expr.callee, replacement),
        newArgs
      );
    }
    
    if (expr instanceof TernaryExpression) {
      return new TernaryExpression(
        this.replacePlaceholders(expr.condition, replacement),
        this.replacePlaceholders(expr.trueBranch, replacement),
        this.replacePlaceholders(expr.falseBranch, replacement)
      );
    }
    
    if (expr instanceof ArrayLiteral) {
      const newElements = expr.elements.map(el => {
        if (el instanceof SpreadElement) {
          return new SpreadElement(this.replacePlaceholders(el.argument, replacement));
        }
        return this.replacePlaceholders(el, replacement);
      });
      return new ArrayLiteral(newElements);
    }
    
    if (expr instanceof ObjectLiteral) {
      const newProps = expr.properties.map(prop => ({
        key: prop.key,
        value: prop.value instanceof SpreadElement 
          ? new SpreadElement(this.replacePlaceholders(prop.value.argument, replacement))
          : this.replacePlaceholders(prop.value, replacement)
      }));
      return new ObjectLiteral(newProps);
    }
    
    if (expr instanceof PropertyAccess) {
      return new PropertyAccess(
        this.replacePlaceholders(expr.object, replacement),
        expr.property
      );
    }
    
    if (expr instanceof IndexAccess) {
      return new IndexAccess(
        this.replacePlaceholders(expr.object, replacement),
        this.replacePlaceholders(expr.index, replacement)
      );
    }
    
    if (expr instanceof ConfidenceExpression) {
      return new ConfidenceExpression(
        this.replacePlaceholders(expr.expression, replacement),
        this.replacePlaceholders(expr.confidence, replacement)
      );
    }
    
    if (expr instanceof LambdaExpression) {
      // Don't replace placeholders in lambda body - they have their own scope
      return expr;
    }
    
    // For literals and identifiers, return as-is
    return expr;
  }
}

export function parse(source: string): Program {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  return parser.parse();
}