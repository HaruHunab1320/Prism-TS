import { parse } from '../src/parser';
import { Runtime } from '../src/runtime';
import {
  FunctionDeclaration,
  ReturnStatement,
  BlockStatement,
  AssignmentStatement,
  ExpressionStatement,
  NumberLiteral,
  IdentifierExpression,
  BinaryExpression,
  CallExpression,
  ConfidenceExpression,
} from '../src/ast';

describe('Function Declarations', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  describe('Basic Function Declarations', () => {
    it('should parse simple function declaration', () => {
      const program = parse(`
        function add(a, b) {
          return a + b
        }
      `);
      
      expect(program.statements).toHaveLength(1);
      const stmt = program.statements[0] as FunctionDeclaration;
      expect(stmt).toBeInstanceOf(FunctionDeclaration);
      expect(stmt.name).toBe('add');
      expect(stmt.parameters).toHaveLength(2);
      expect(stmt.parameters[0]).toBe('a');
      expect(stmt.parameters[1]).toBe('b');
      expect(stmt.body).toBeInstanceOf(BlockStatement);
    });

    it('should parse function with no parameters', () => {
      const program = parse(`
        function getAnswer() {
          return 42
        }
      `);
      
      const stmt = program.statements[0] as FunctionDeclaration;
      expect(stmt.name).toBe('getAnswer');
      expect(stmt.parameters).toHaveLength(0);
    });

    it('should parse function with single parameter', () => {
      const program = parse(`
        function double(x) {
          return x * 2
        }
      `);
      
      const stmt = program.statements[0] as FunctionDeclaration;
      expect(stmt.name).toBe('double');
      expect(stmt.parameters).toHaveLength(1);
      expect(stmt.parameters[0]).toBe('x');
    });

    it('should parse function with multiple statements', () => {
      const program = parse(`
        function complex(x, y) {
          temp = x + y
          result = temp * 2
          return result
        }
      `);
      
      const stmt = program.statements[0] as FunctionDeclaration;
      expect(stmt.body.statements).toHaveLength(3);
      expect(stmt.body.statements[0]).toBeInstanceOf(AssignmentStatement);
      expect(stmt.body.statements[1]).toBeInstanceOf(AssignmentStatement);
      expect(stmt.body.statements[2]).toBeInstanceOf(ReturnStatement);
    });
  });

  describe('Function with Confidence Annotations', () => {
    it('should parse function with confidence annotation', () => {
      const program = parse(`
        function estimate(data) ~> 0.8 {
          return data * 1.1
        }
      `);
      
      const stmt = program.statements[0] as FunctionDeclaration;
      expect(stmt.confidenceAnnotation).toBeInstanceOf(NumberLiteral);
      expect((stmt.confidenceAnnotation as NumberLiteral).value).toBe(0.8);
    });

    it('should parse function with variable confidence annotation', () => {
      const program = parse(`
        function analyze(input) ~> threshold {
          return input.score
        }
      `);
      
      const stmt = program.statements[0] as FunctionDeclaration;
      expect(stmt.confidenceAnnotation).toBeInstanceOf(IdentifierExpression);
      expect((stmt.confidenceAnnotation as IdentifierExpression).name).toBe('threshold');
    });
  });

  describe('Return Statements', () => {
    it('should parse return with value', () => {
      const program = parse('return 42');
      
      const stmt = program.statements[0] as ReturnStatement;
      expect(stmt).toBeInstanceOf(ReturnStatement);
      expect(stmt.value).toBeInstanceOf(NumberLiteral);
      expect((stmt.value as NumberLiteral).value).toBe(42);
    });

    it('should parse return without value', () => {
      const program = parse('return');
      
      const stmt = program.statements[0] as ReturnStatement;
      expect(stmt.value).toBeUndefined();
    });

    it('should parse return with expression', () => {
      const program = parse('return x + y * 2');
      
      const stmt = program.statements[0] as ReturnStatement;
      expect(stmt.value).toBeInstanceOf(BinaryExpression);
    });

    it('should parse return with confidence expression', () => {
      const program = parse('return result ~> 0.9');
      
      const stmt = program.statements[0] as ReturnStatement;
      expect(stmt.value).toBeInstanceOf(ConfidenceExpression);
    });
  });

  describe('Rest Parameters', () => {
    it('should parse function with rest parameter', () => {
      const program = parse(`
        function sum(first, ...rest) {
          return first + rest.length
        }
      `);
      
      const stmt = program.statements[0] as FunctionDeclaration;
      expect(stmt.parameters).toHaveLength(1);
      expect(stmt.parameters[0]).toBe('first');
      expect(stmt.restParameter).toBe('rest');
    });

    it('should parse function with only rest parameter', () => {
      const program = parse(`
        function allArgs(...args) {
          return args.length
        }
      `);
      
      const stmt = program.statements[0] as FunctionDeclaration;
      expect(stmt.parameters).toHaveLength(0);
      expect(stmt.restParameter).toBe('args');
    });
  });

  describe('Runtime Execution', () => {
    it('should execute simple function', async () => {
      const program = parse(`
        function add(a, b) {
          return a + b
        }
        result = add(5, 3)
      `);
      
      const result = await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(8);
    });

    it('should execute function with no parameters', async () => {
      const program = parse(`
        function getAnswer() {
          return 42
        }
        answer = getAnswer()
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('answer').value).toBe(42);
    });

    it('should execute function with local variables', async () => {
      const program = parse(`
        function calculate(x) {
          temp = x * 2
          result = temp + 1
          return result
        }
        output = calculate(5)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('output').value).toBe(11);
      
      // Local variables should not be accessible outside function
      expect(() => runtime.getVariable('temp')).toThrow('Undefined variable: temp');
      expect(() => runtime.getVariable('result')).toThrow('Undefined variable: result');
    });

    it('should execute function without explicit return', async () => {
      const program = parse(`
        function withoutReturn(x) {
          y = x + 1
        }
        result = withoutReturn(5)
      `);
      
      await runtime.execute(program);
      // Should return the last expression value or 0
      expect(runtime.getVariable('result').value).toBe(6);
    });

    it('should execute function with early return', async () => {
      const program = parse(`
        function earlyReturn(x) {
          if (x < 0) {
            return -1
          }
          return x * 2
        }
        negative = earlyReturn(-5)
        positive = earlyReturn(5)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('negative').value).toBe(-1);
      expect(runtime.getVariable('positive').value).toBe(10);
    });

    it('should execute function with rest parameters', async () => {
      const program = parse(`
        function sum(first, ...rest) {
          total = first
          for item in rest {
            total = total + item
          }
          return total
        }
        result = sum(1, 2, 3, 4, 5)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(15);
    });

    it('should handle function with confidence annotation', async () => {
      const program = parse(`
        function estimate() ~> 0.8 {
          return 100
        }
        result = estimate()
      `);
      
      await runtime.execute(program);
      const result = runtime.getVariable('result');
      expect(result.value).toBe(100);
      // The function itself should have confidence, not necessarily the return value
    });

    it('should execute recursive function', async () => {
      const program = parse(`
        function factorial(n) {
          if (n <= 1) {
            return 1
          }
          return n * factorial(n - 1)
        }
        result = factorial(5)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(120);
    });

    it('should handle function closures', async () => {
      const program = parse(`
        outer = 10
        function addOuter(x) {
          return x + outer
        }
        result = addOuter(5)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(15);
    });

    it('should handle nested functions', async () => {
      const program = parse(`
        function outer(x) {
          function inner(y) {
            return y * 2
          }
          return inner(x) + 1
        }
        result = outer(5)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(11);
    });
  });

  describe('Error Cases', () => {
    it('should throw error for wrong number of arguments', async () => {
      const program = parse(`
        function add(a, b) {
          return a + b
        }
        result = add(5)
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('Function expects 2 arguments, got 1');
    });

    it('should throw error for too many arguments without rest parameter', async () => {
      const program = parse(`
        function add(a, b) {
          return a + b
        }
        result = add(1, 2, 3)
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('Function expects 2 arguments, got 3');
    });

    it('should handle return outside function gracefully', async () => {
      const program = parse('return 42');
      
      // Return outside function should throw ReturnException at top level
      await expect(runtime.execute(program)).rejects.toThrow('return');
    });

    it('should throw error for invalid function syntax', () => {
      expect(() => parse('function { return 42 }')).toThrow('Expected function name');
    });

    it('should throw error for missing parentheses', () => {
      expect(() => parse('function test { return 42 }')).toThrow("Expected '(' after function name");
    });

    it('should throw error for missing function body', () => {
      expect(() => parse('function test()')).toThrow("Expected '{' before function body");
    });
  });

  describe('Function Hoisting', () => {
    it('should allow function calls before declaration', async () => {
      const program = parse(`
        result = add(5, 3)
        function add(a, b) {
          return a + b
        }
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(8);
    });
  });

  describe('Function Overloading/Redefinition', () => {
    it('should allow function redefinition', async () => {
      const program = parse(`
        function test() {
          return 1
        }
        first = test()
        
        function test() {
          return 2
        }
        second = test()
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('first').value).toBe(1);
      expect(runtime.getVariable('second').value).toBe(2);
    });
  });

  describe('Integration with Existing Features', () => {
    it('should work with confidence expressions in function body', async () => {
      const program = parse(`function estimate(x) {
  value = x ~> 0.7
  return value
}
result = estimate(100)`);
      
      await runtime.execute(program);
      // The function should execute without error
      expect(runtime.getVariable('result')).toBeDefined();
    });

    it('should work with array methods', async () => {
      const program = parse(`
        function processArray(arr) {
          doubled = arr.map(x => x * 2)
          return doubled
        }
        result = processArray([1, 2, 3])
      `);
      
      await runtime.execute(program);
      const result = runtime.getVariable('result');
      expect(Array.isArray(result.value)).toBe(true);
      const resultArray = result.value as any[];
      expect(resultArray).toHaveLength(3);
      expect(resultArray[0].value).toBe(2);
      expect(resultArray[1].value).toBe(4);
      expect(resultArray[2].value).toBe(6);
    });

    it('should work with uncertain if statements', async () => {
      const program = parse(`
        function analyze(input) {
          confidentInput = input ~> 0.9
          uncertain if (confidentInput) {
            high { return "high confidence" }
            medium { return "medium confidence" }
            low { return "low confidence" }
          }
        }
        result = analyze(100)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe("high confidence");
    });
  });
});