import { parse } from './parser';
import {
  IdentifierExpression,
  NumberLiteral,
  StringLiteral,
  BinaryExpression,
  CallExpression,
  ConfidenceExpression,
  AssignmentStatement,
  IfStatement,
  UncertainIfStatement,
  ContextStatement,
  AgentDeclaration,
  BlockStatement,
  ExpressionStatement,
} from './ast';

describe('Parser', () => {
  describe('Expressions', () => {
    it('should parse numbers', () => {
      const program = parse('42');
      expect(program.statements).toHaveLength(1);
      const stmt = program.statements[0] as ExpressionStatement;
      expect(stmt.expression).toBeInstanceOf(NumberLiteral);
      expect((stmt.expression as NumberLiteral).value).toBe(42);
    });

    it('should parse strings', () => {
      const program = parse('"hello world"');
      expect(program.statements).toHaveLength(1);
      const stmt = program.statements[0] as ExpressionStatement;
      expect(stmt.expression).toBeInstanceOf(StringLiteral);
      expect((stmt.expression as StringLiteral).value).toBe('hello world');
    });

    it('should parse identifiers', () => {
      const program = parse('myVariable');
      expect(program.statements).toHaveLength(1);
      const stmt = program.statements[0] as ExpressionStatement;
      expect(stmt.expression).toBeInstanceOf(IdentifierExpression);
      expect((stmt.expression as IdentifierExpression).name).toBe('myVariable');
    });

    it('should parse binary expressions', () => {
      const program = parse('x + y');
      expect(program.statements).toHaveLength(1);
      const stmt = program.statements[0] as ExpressionStatement;
      expect(stmt.expression).toBeInstanceOf(BinaryExpression);
      const binary = stmt.expression as BinaryExpression;
      expect(binary.operator).toBe('+');
      expect((binary.left as IdentifierExpression).name).toBe('x');
      expect((binary.right as IdentifierExpression).name).toBe('y');
    });

    it('should handle operator precedence', () => {
      const program = parse('2 + 3 * 4');
      const stmt = program.statements[0] as ExpressionStatement;
      const binary = stmt.expression as BinaryExpression;
      expect(binary.operator).toBe('+');
      expect((binary.left as NumberLiteral).value).toBe(2);
      expect((binary.right as BinaryExpression).operator).toBe('*');
    });

    it('should parse parenthesized expressions', () => {
      const program = parse('(2 + 3) * 4');
      const stmt = program.statements[0] as ExpressionStatement;
      const binary = stmt.expression as BinaryExpression;
      expect(binary.operator).toBe('*');
      expect((binary.left as BinaryExpression).operator).toBe('+');
      expect((binary.right as NumberLiteral).value).toBe(4);
    });

    it('should parse call expressions', () => {
      const program = parse('llm("What is AI?")');
      const stmt = program.statements[0] as ExpressionStatement;
      expect(stmt.expression).toBeInstanceOf(CallExpression);
      const call = stmt.expression as CallExpression;
      expect((call.callee as IdentifierExpression).name).toBe('llm');
      expect(call.args).toHaveLength(1);
      expect((call.args[0] as StringLiteral).value).toBe('What is AI?');
    });

    it('should parse confidence expressions', () => {
      const program = parse('result ~> 0.8');
      const stmt = program.statements[0] as ExpressionStatement;
      expect(stmt.expression).toBeInstanceOf(ConfidenceExpression);
      const conf = stmt.expression as ConfidenceExpression;
      expect((conf.expression as IdentifierExpression).name).toBe('result');
      expect(conf.confidence).toBe(0.8);
    });
  });

  describe('Statements', () => {
    it('should parse assignment statements', () => {
      const program = parse('x = 42');
      expect(program.statements).toHaveLength(1);
      expect(program.statements[0]).toBeInstanceOf(AssignmentStatement);
      const assignment = program.statements[0] as AssignmentStatement;
      expect(assignment.identifier).toBe('x');
      expect((assignment.value as NumberLiteral).value).toBe(42);
    });

    it('should parse if statements', () => {
      const program = parse(`
        if (x > 0) {
          y = 1
        } else {
          y = 0
        }
      `);
      expect(program.statements).toHaveLength(1);
      expect(program.statements[0]).toBeInstanceOf(IfStatement);
      const ifStmt = program.statements[0] as IfStatement;
      expect(ifStmt.condition).toBeInstanceOf(BinaryExpression);
      expect(ifStmt.thenStatement).toBeInstanceOf(BlockStatement);
      expect(ifStmt.elseStatement).toBeInstanceOf(BlockStatement);
    });

    it('should parse uncertain if statements', () => {
      const program = parse(`
        uncertain if (diagnosis ~> 0.8) {
          high { recommend_treatment() }
          medium { request_tests() }
          low { escalate() }
        }
      `);
      expect(program.statements).toHaveLength(1);
      expect(program.statements[0]).toBeInstanceOf(UncertainIfStatement);
      const uncertainIf = program.statements[0] as UncertainIfStatement;
      expect(uncertainIf.condition).toBeInstanceOf(ConfidenceExpression);
      expect(uncertainIf.threshold).toBe(0.8);
      expect(uncertainIf.branches.high).toBeInstanceOf(BlockStatement);
      expect(uncertainIf.branches.medium).toBeInstanceOf(BlockStatement);
      expect(uncertainIf.branches.low).toBeInstanceOf(BlockStatement);
    });

    it('should parse context statements', () => {
      const program = parse(`
        in context Medical {
          analyze_symptoms()
        } shifting to Treatment {
          recommend_therapy()
        }
      `);
      expect(program.statements).toHaveLength(1);
      expect(program.statements[0]).toBeInstanceOf(ContextStatement);
      const context = program.statements[0] as ContextStatement;
      expect(context.contextName).toBe('Medical');
      expect(context.body).toBeInstanceOf(BlockStatement);
      expect(context.shiftTo).toBe('Treatment');
    });

    it('should parse agent declarations', () => {
      const program = parse(`
        agents {
          researcher: Agent { confidence: 0.9, role: "research" }
          writer: Agent { confidence: 0.8 }
        }
      `);
      expect(program.statements).toHaveLength(1);
      expect(program.statements[0]).toBeInstanceOf(BlockStatement);
      const block = program.statements[0] as BlockStatement;
      expect(block.statements).toHaveLength(2);
      expect(block.statements[0]).toBeInstanceOf(AgentDeclaration);
      expect(block.statements[1]).toBeInstanceOf(AgentDeclaration);
    });
  });

  describe('Complex expressions', () => {
    it('should parse chained method calls', () => {
      const program = parse('obj.method().property');
      const stmt = program.statements[0] as ExpressionStatement;
      expect(stmt.expression).toBeInstanceOf(BinaryExpression);
    });

    it('should parse nested function calls', () => {
      const program = parse('outer(inner(x, y), z)');
      const stmt = program.statements[0] as ExpressionStatement;
      expect(stmt.expression).toBeInstanceOf(CallExpression);
      const call = stmt.expression as CallExpression;
      expect(call.args).toHaveLength(2);
      expect(call.args[0]).toBeInstanceOf(CallExpression);
    });
  });

  describe('Multiple statements', () => {
    it('should parse multiple statements', () => {
      const program = parse(`
        x = 10
        y = 20
        result = x + y
      `);
      expect(program.statements).toHaveLength(3);
      expect(program.statements[0]).toBeInstanceOf(AssignmentStatement);
      expect(program.statements[1]).toBeInstanceOf(AssignmentStatement);
      expect(program.statements[2]).toBeInstanceOf(AssignmentStatement);
    });
  });

  describe('Error handling', () => {
    it('should handle syntax errors gracefully', () => {
      expect(() => parse('x =')).toThrow();
      expect(() => parse('if (')).toThrow();
      expect(() => parse('{')).toThrow();
    });

    it('should provide meaningful error messages', () => {
      try {
        parse('x =');
        fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Expected expression');
      }
    });
  });
});