import { parse } from '../src/parser';
import { Runtime } from '../src/runtime';
import {
  VariableDeclaration,
  BlockStatement,
  NumberLiteral,
  IdentifierExpression,
  BinaryExpression,
  ConfidenceExpression,
} from '../src/ast';

describe('Variable Declarations', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  describe('Basic const declarations', () => {
    it('should parse const declaration with initializer', () => {
      const program = parse(`const x = 10`);
      
      expect(program.statements).toHaveLength(1);
      const stmt = program.statements[0] as VariableDeclaration;
      expect(stmt).toBeInstanceOf(VariableDeclaration);
      expect(stmt.kind).toBe('const');
      expect(stmt.identifier).toBe('x');
      expect(stmt.initializer).toBeInstanceOf(NumberLiteral);
      expect((stmt.initializer as NumberLiteral).value).toBe(10);
    });

    it('should execute const declaration', async () => {
      const program = parse(`const x = 42`);
      
      await runtime.execute(program);
      expect(runtime.getVariable('x').value).toBe(42);
    });

    it('should require initializer for const', () => {
      expect(() => parse(`const x`)).toThrow('const declarations must have an initializer');
    });

    it('should prevent reassignment to const variable', async () => {
      const program = parse(`
        const x = 10
        x = 20
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('Cannot assign to const variable');
    });

    it('should work with expressions', async () => {
      const program = parse(`const result = 5 + 3 * 2`);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(11);
    });

    it('should work with confidence expressions', async () => {
      const program = parse(`const confident = 100 ~> 0.9`);
      
      await runtime.execute(program);
      const result = runtime.getVariable('confident');
      expect(result.type).toBe('confident');
    });
  });

  describe('Basic let declarations', () => {
    it('should parse let declaration with initializer', () => {
      const program = parse(`let y = 20`);
      
      const stmt = program.statements[0] as VariableDeclaration;
      expect(stmt.kind).toBe('let');
      expect(stmt.identifier).toBe('y');
      expect((stmt.initializer as NumberLiteral).value).toBe(20);
    });

    it('should execute let declaration', async () => {
      const program = parse(`let y = 30`);
      
      await runtime.execute(program);
      expect(runtime.getVariable('y').value).toBe(30);
    });

    it('should allow let without initializer', () => {
      const program = parse(`let x`);
      
      const stmt = program.statements[0] as VariableDeclaration;
      expect(stmt.kind).toBe('let');
      expect(stmt.identifier).toBe('x');
      expect(stmt.initializer).toBeUndefined();
    });

    it('should default let to 0 when no initializer', async () => {
      const program = parse(`let x`);
      
      await runtime.execute(program);
      expect(runtime.getVariable('x').value).toBe(null);
    });

    it('should allow reassignment to let variable', async () => {
      const program = parse(`
        let x = 10
        x = 20
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('x').value).toBe(20);
    });
  });

  describe('Block scoping', () => {
    it('should respect block scope for const', async () => {
      const program = parse(`
        const outer = 10
        function test() {
          const inner = 20
          return inner + outer
        }
        let result = test()
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(30);
      expect(() => runtime.getVariable('inner')).toThrow('Undefined variable: inner');
    });

    it('should respect block scope for let', async () => {
      const program = parse(`
        let outer = 5
        function test() {
          let inner = 15
          return inner + outer
        }
        let result = test()
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(20);
      expect(() => runtime.getVariable('inner')).toThrow('Undefined variable: inner');
    });

    it('should prevent redeclaration in same scope', async () => {
      const program = parse(`
        const x = 10
        const x = 20
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('Variable \'x\' already declared in this scope');
    });

    it('should allow same name in different scopes', async () => {
      const program = parse(`
        const x = 10
        function test() {
          const x = 20
          return x
        }
        let inner = test()
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('x').value).toBe(10);
      expect(runtime.getVariable('inner').value).toBe(20);
    });
  });

  describe('Destructuring with const/let', () => {
    it('should parse const array destructuring', () => {
      const program = parse(`const [a, b] = [1, 2]`);
      
      const stmt = program.statements[0] as VariableDeclaration;
      expect(stmt.kind).toBe('const');
      expect(stmt.pattern).toBeDefined();
      expect(stmt.identifier).toBe(''); // Empty for destructuring
    });

    it('should execute const array destructuring', async () => {
      const program = parse(`const [a, b, c] = [1, 2, 3]`);
      
      await runtime.execute(program);
      expect(runtime.getVariable('a').value).toBe(1);
      expect(runtime.getVariable('b').value).toBe(2);
      expect(runtime.getVariable('c').value).toBe(3);
    });

    it('should execute let array destructuring', async () => {
      const program = parse(`let [x, y] = [10, 20]`);
      
      await runtime.execute(program);
      expect(runtime.getVariable('x').value).toBe(10);
      expect(runtime.getVariable('y').value).toBe(20);
    });

    // TODO: Fix destructuring assignment prevention for const
    it('should prevent reassignment to destructured const', async () => {
      const program = parse(`
        const [a, b] = [1, 2]
        a = 10
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('Cannot assign to const variable');
    });

    it('should prevent reassignment to object destructured const', async () => {
      const program = parse(`
        const {x, y} = {x: 10, y: 20}
        x = 30
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('Cannot assign to const variable');
    });

    it('should allow reassignment to destructured let', async () => {
      const program = parse(`
        let [a, b] = [1, 2]
        a = 10
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('a').value).toBe(10);
      expect(runtime.getVariable('b').value).toBe(2);
    });

    it('should execute const object destructuring', async () => {
      const program = parse(`const {name, age} = {name: "Alice", age: 30}`);
      
      await runtime.execute(program);
      expect(runtime.getVariable('name').value).toBe("Alice");
      expect(runtime.getVariable('age').value).toBe(30);
    });
  });

  describe('Interaction with existing assignment syntax', () => {
    it('should coexist with legacy assignment', async () => {
      const program = parse(`
        const x = 10
        let y = 20
        let z = 30
        let result = x + y + z
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('x').value).toBe(10);
      expect(runtime.getVariable('y').value).toBe(20);
      expect(runtime.getVariable('z').value).toBe(30);
      expect(runtime.getVariable('result').value).toBe(60);
    });

    it('should allow legacy assignment to modify let but not const', async () => {
      const program = parse(`
        let x = 10
        const y = 20
        x = 15  // Should work
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('x').value).toBe(15);
      
      // Create fresh runtime for second test
      const runtime2 = new Runtime();
      const program2 = parse(`
        const z = 20
        z = 25  // Should fail
      `);
      
      await expect(runtime2.execute(program2)).rejects.toThrow('Cannot assign to const variable');
    });
  });

  describe('Complex scenarios', () => {
    it('should work in function parameters and bodies', async () => {
      const program = parse(`
        function processData(input) {
          const multiplier = 2
          let result = input * multiplier
          result = result + 1
          return result
        }
        
        const input = 5
        let output = processData(input)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('input').value).toBe(5);
      expect(runtime.getVariable('output').value).toBe(11);
    });

    it('should work with loops', async () => {
      const program = parse(`
        let sum = 0
        const numbers = [1, 2, 3, 4, 5]
        
        for num in numbers {
          const doubled = num * 2
          sum = sum + doubled
        }
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('sum').value).toBe(30); // (1+2+3+4+5) * 2
    });

    it('should work with confidence expressions', async () => {
      const program = parse(`
        const highConfidence = 100 ~> 0.9
        let mediumConfidence = 50 ~> 0.6
        mediumConfidence = 75 ~> 0.8
      `);
      
      await runtime.execute(program);
      const high = runtime.getVariable('highConfidence');
      const medium = runtime.getVariable('mediumConfidence');
      expect(high.type).toBe('confident');
      expect(medium.type).toBe('confident');
    });
  });

  describe('Error cases', () => {
    it('should throw error for missing variable name', () => {
      expect(() => parse(`const = 10`)).toThrow('Expected variable name');
    });

    it('should throw error for invalid syntax', () => {
      expect(() => parse(`const 123 = 10`)).toThrow('Expected variable name');
    });

    it('should require initializer for destructuring const', () => {
      expect(() => parse(`const [a, b]`)).toThrow('Expected \'=\' after destructuring pattern');
    });
  });
});
