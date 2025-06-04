import {
  IdentifierExpression,
  NumberLiteral,
  StringLiteral,
  ConfidenceExpression,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  BlockStatement,
  IfStatement,
  UncertainIfStatement,
  ContextStatement,
  AgentDeclaration,
  AssignmentStatement,
  Program,
} from './ast';

describe('AST Nodes', () => {
  describe('Expressions', () => {
    it('should create identifier expressions', () => {
      const identifier = new IdentifierExpression('myVariable');
      expect(identifier.name).toBe('myVariable');
      expect(identifier.type).toBe('IdentifierExpression');
    });

    it('should create number literals', () => {
      const number = new NumberLiteral(42);
      expect(number.value).toBe(42);
      expect(number.type).toBe('NumberLiteral');
    });

    it('should create string literals', () => {
      const string = new StringLiteral('hello world');
      expect(string.value).toBe('hello world');
      expect(string.type).toBe('StringLiteral');
    });

    it('should create confidence expressions', () => {
      const expr = new NumberLiteral(42);
      const confident = new ConfidenceExpression(expr, 0.95);
      expect(confident.expression).toBe(expr);
      expect(confident.confidence).toBe(0.95);
      expect(confident.type).toBe('ConfidenceExpression');
    });

    it('should create binary expressions', () => {
      const left = new NumberLiteral(10);
      const right = new NumberLiteral(20);
      const binary = new BinaryExpression('+', left, right);
      expect(binary.operator).toBe('+');
      expect(binary.left).toBe(left);
      expect(binary.right).toBe(right);
      expect(binary.type).toBe('BinaryExpression');
    });

    it('should create unary expressions', () => {
      const operand = new IdentifierExpression('x');
      const unary = new UnaryExpression('-', operand);
      expect(unary.operator).toBe('-');
      expect(unary.operand).toBe(operand);
      expect(unary.type).toBe('UnaryExpression');
    });

    it('should create call expressions', () => {
      const callee = new IdentifierExpression('llm');
      const args = [new StringLiteral('What is the weather?')];
      const call = new CallExpression(callee, args);
      expect(call.callee).toBe(callee);
      expect(call.arguments).toEqual(args);
      expect(call.type).toBe('CallExpression');
    });
  });

  describe('Statements', () => {
    it('should create block statements', () => {
      const statements = [
        new AssignmentStatement('x', new NumberLiteral(10)),
        new AssignmentStatement('y', new NumberLiteral(20)),
      ];
      const block = new BlockStatement(statements);
      expect(block.statements).toEqual(statements);
      expect(block.type).toBe('BlockStatement');
    });

    it('should create if statements', () => {
      const condition = new BinaryExpression('>', 
        new IdentifierExpression('x'), 
        new NumberLiteral(0)
      );
      const thenBlock = new BlockStatement([]);
      const elseBlock = new BlockStatement([]);
      const ifStmt = new IfStatement(condition, thenBlock, elseBlock);
      expect(ifStmt.condition).toBe(condition);
      expect(ifStmt.thenStatement).toBe(thenBlock);
      expect(ifStmt.elseStatement).toBe(elseBlock);
      expect(ifStmt.type).toBe('IfStatement');
    });

    it('should create uncertain if statements', () => {
      const condition = new ConfidenceExpression(
        new CallExpression(new IdentifierExpression('analyze'), []),
        0.8
      );
      const branches = {
        high: new BlockStatement([]),
        medium: new BlockStatement([]),
        low: new BlockStatement([]),
      };
      const uncertainIf = new UncertainIfStatement(condition, 0.8, branches);
      expect(uncertainIf.condition).toBe(condition);
      expect(uncertainIf.threshold).toBe(0.8);
      expect(uncertainIf.branches).toBe(branches);
      expect(uncertainIf.type).toBe('UncertainIfStatement');
    });

    it('should create context statements', () => {
      const contextName = 'Medical';
      const body = new BlockStatement([]);
      const shiftTo = 'Treatment';
      const context = new ContextStatement(contextName, body, shiftTo);
      expect(context.contextName).toBe(contextName);
      expect(context.body).toBe(body);
      expect(context.shiftTo).toBe(shiftTo);
      expect(context.type).toBe('ContextStatement');
    });

    it('should create agent declarations', () => {
      const agent = new AgentDeclaration('researcher', {
        confidence: 0.9,
        role: 'research',
      });
      expect(agent.name).toBe('researcher');
      expect(agent.config.confidence).toBe(0.9);
      expect(agent.config.role).toBe('research');
      expect(agent.type).toBe('AgentDeclaration');
    });

    it('should create assignment statements', () => {
      const assignment = new AssignmentStatement(
        'result',
        new CallExpression(new IdentifierExpression('process'), [])
      );
      expect(assignment.identifier).toBe('result');
      expect(assignment.type).toBe('AssignmentStatement');
    });
  });

  describe('Program', () => {
    it('should create a program with statements', () => {
      const statements = [
        new AssignmentStatement('x', new NumberLiteral(10)),
        new IfStatement(
          new BinaryExpression('>', new IdentifierExpression('x'), new NumberLiteral(5)),
          new BlockStatement([]),
          undefined
        ),
      ];
      const program = new Program(statements);
      expect(program.statements).toEqual(statements);
      expect(program.type).toBe('Program');
    });
  });
});