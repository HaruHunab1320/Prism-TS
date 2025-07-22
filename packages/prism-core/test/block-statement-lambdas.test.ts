import { parse } from '../src/parser';
import { Runtime } from '../src/runtime';
import {
  LambdaExpression,
  BlockStatement,
  NumberLiteral,
  IdentifierExpression,
  ReturnStatement,
  VariableDeclaration,
} from '../src/ast';

describe('Block-Statement Lambdas', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  describe('Basic block-statement lambda syntax', () => {
    it('should parse single-parameter lambda with block body', () => {
      const program = parse(`
        lambda = x => {
          return x * 2
        }
      `);
      
      expect(program.statements).toHaveLength(1);
      const assignment = program.statements[0];
      expect(assignment.type).toBe('AssignmentStatement');
      
      const lambda = (assignment as any).value as LambdaExpression;
      expect(lambda).toBeInstanceOf(LambdaExpression);
      expect(lambda.parameters).toEqual(['x']);
      expect(lambda.body.type).toBe('BlockStatement');
      
      const block = lambda.body as BlockStatement;
      expect(block.statements).toHaveLength(1);
      expect(block.statements[0].type).toBe('ReturnStatement');
    });

    it('should parse multi-parameter lambda with block body', () => {
      const program = parse(`
        lambda = (x, y) => {
          const sum = x + y
          return sum
        }
      `);
      
      const assignment = program.statements[0];
      const lambda = (assignment as any).value as LambdaExpression;
      expect(lambda.parameters).toEqual(['x', 'y']);
      expect(lambda.body.type).toBe('BlockStatement');
      
      const block = lambda.body as BlockStatement;
      expect(block.statements).toHaveLength(2);
      expect(block.statements[0].type).toBe('VariableDeclaration');
      expect(block.statements[1].type).toBe('ReturnStatement');
    });

    it('should parse lambda with zero parameters and block body', () => {
      const program = parse(`
        lambda = () => {
          const value = 42
          return value
        }
      `);
      
      const assignment = program.statements[0];
      const lambda = (assignment as any).value as LambdaExpression;
      expect(lambda.parameters).toEqual([]);
      expect(lambda.body.type).toBe('BlockStatement');
    });
  });

  describe('Block-statement lambda execution', () => {
    it('should execute simple block lambda with return', async () => {
      const program = parse(`
        double = x => {
          return x * 2
        }
        result = double(5)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(10);
    });

    it('should execute multi-statement block lambda', async () => {
      const program = parse(`
        process = x => {
          let doubled = x * 2
          let incremented = doubled + 1
          return incremented
        }
        result = process(10)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(21);
    });

    it('should execute lambda with variable declarations', async () => {
      const program = parse(`
        calculate = (a, b) => {
          const sum = a + b
          const product = a * b
          return sum + product
        }
        result = calculate(3, 4)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(19); // (3+4) + (3*4) = 7 + 12 = 19
    });

    it('should handle lambda without explicit return (default to 0)', async () => {
      const program = parse(`
        noReturn = x => {
          let temp = x * 2
        }
        result = noReturn(5)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(0);
    });

    it('should handle early return in lambda block', async () => {
      const program = parse(`
        earlyReturn = x => {
          if (x > 10) {
            return x * 2
          }
          let doubled = x * 3
          return doubled
        }
        result1 = earlyReturn(15)
        result2 = earlyReturn(5)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result1').value).toBe(30); // 15 * 2
      expect(runtime.getVariable('result2').value).toBe(15); // 5 * 3
    });
  });

  describe('Block lambda with array methods', () => {
    it('should work with map using block lambdas', async () => {
      const program = parse(`
        numbers = [1, 2, 3, 4, 5]
        doubled = numbers.map(x => {
          const result = x * 2
          return result
        })
      `);
      
      await runtime.execute(program);
      const result = runtime.getVariable('doubled').value as any[];
      expect(result.map(v => v.value)).toEqual([2, 4, 6, 8, 10]);
    });

    it('should work with filter using block lambdas', async () => {
      const program = parse(`
        numbers = [1, 2, 3, 4, 5, 6]
        evens = numbers.filter(x => {
          const remainder = x % 2
          return remainder == 0
        })
      `);
      
      await runtime.execute(program);
      const result = runtime.getVariable('evens').value as any[];
      expect(result.map(v => v.value)).toEqual([2, 4, 6]);
    });

    it('should work with reduce using block lambdas', async () => {
      const program = parse(`
        numbers = [1, 2, 3, 4]
        sum = numbers.reduce((acc, x) => {
          const newAcc = acc + x
          return newAcc
        }, 0)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('sum').value).toBe(10);
    });
  });

  describe('Nested block lambdas', () => {
    it('should handle nested block lambdas', async () => {
      const program = parse(`
        makeMultiplier = x => {
          return y => {
            const result = x * y
            return result
          }
        }
        triple = makeMultiplier(3)
        result = triple(4)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(12);
    });

    it('should handle complex nested scenarios', async () => {
      const program = parse(`
        processData = data => {
          const filtered = data.filter(x => {
            return x > 0
          })
          const doubled = filtered.map(x => {
            const result = x * 2
            return result
          })
          return doubled
        }
        input = [-1, 2, -3, 4, 5]
        result = processData(input)
      `);
      
      await runtime.execute(program);
      const result = runtime.getVariable('result').value as any[];
      expect(result.map(v => v.value)).toEqual([4, 8, 10]);
    });
  });

  describe('Block lambda scope and closures', () => {
    it('should properly capture closure variables', async () => {
      const program = parse(`
        outer = 10
        lambda = x => {
          const inner = x + outer
          return inner
        }
        result = lambda(5)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(15);
    });

    it('should isolate block lambda scope', async () => {
      const program = parse(`
        lambda = x => {
          const local = x * 2
          return local
        }
        result = lambda(5)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(10);
      expect(() => runtime.getVariable('local')).toThrow('Undefined variable: local');
    });

    it('should handle variable shadowing in block lambdas', async () => {
      const program = parse(`
        x = 100
        lambda = x => {
          const x = 42  // Shadows parameter
          return x
        }
        result = lambda(10)
        outer = x
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(42);
      expect(runtime.getVariable('outer').value).toBe(100);
    });
  });

  describe('Block lambda with confidence expressions', () => {
    it('should work with confidence values', async () => {
      const program = parse(`
        confident = x => {
          const result = x ~> 0.9
          return result
        }
        result = confident(100)
      `);
      
      await runtime.execute(program);
      const result = runtime.getVariable('result');
      expect(result.type).toBe('confident');
    });

    it('should propagate confidence through block lambda', async () => {
      const program = parse(`
        process = x => {
          const doubled = x * 2
          return doubled ~> 0.8
        }
        numbers = [10, 20, 30]
        results = numbers.map(process)
      `);
      
      await runtime.execute(program);
      const results = runtime.getVariable('results').value as any[];
      expect(results.every(r => r.type === 'confident')).toBe(true);
    });
  });

  describe('Mixed expression and block lambda syntax', () => {
    it('should support both expression and block lambdas in same program', async () => {
      const program = parse(`
        simple = x => x * 2
        complex = x => {
          const doubled = x * 2
          const incremented = doubled + 1
          return incremented
        }
        result1 = simple(5)
        result2 = complex(5)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result1').value).toBe(10);
      expect(runtime.getVariable('result2').value).toBe(11);
    });

    it('should handle arrays with mixed lambda types', async () => {
      const program = parse(`
        numbers = [1, 2, 3]
        simple = numbers.map(x => x * 2)
        complex = numbers.map(x => {
          const doubled = x * 2
          return doubled + 1
        })
      `);
      
      await runtime.execute(program);
      const simple = runtime.getVariable('simple').value as any[];
      const complex = runtime.getVariable('complex').value as any[];
      expect(simple.map(v => v.value)).toEqual([2, 4, 6]);
      expect(complex.map(v => v.value)).toEqual([3, 5, 7]);
    });
  });

  describe('Error cases', () => {
    it('should handle syntax errors in block lambda', () => {
      expect(() => parse(`
        lambda = x => {
          return x *
        }
      `)).toThrow();
    });

    it('should handle unclosed block in lambda', () => {
      expect(() => parse(`
        lambda = x => {
          return x * 2
      `)).toThrow();
    });

    it('should handle empty block lambda', async () => {
      const program = parse(`
        empty = x => {
        }
        result = empty(5)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(0);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle block lambda with loops', async () => {
      const program = parse(`
        factorial = n => {
          let result = 1
          for i = 1; i <= n; i = i + 1 {
            result = result * i
          }
          return result
        }
        result = factorial(5)
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(120);
    });

    it('should handle block lambda with uncertain control flow', async () => {
      const program = parse(`
        process = x => {
          confident = (x > 5) ~> 0.8
          uncertain if (confident) {
            high { return x * 2 }
            medium { return x * 1.5 }
            low { return x }
          }
          return 0
        }
        result = process(10)
      `);
      
      await runtime.execute(program);
      // Result should be one of the uncertain branches
      const result = runtime.getVariable('result').value;
      expect([20, 15, 10, 0]).toContain(result);
    });

    it('should handle destructuring parameters in block lambda', async () => {
      const program = parse(`
        extract = ([a, b]) => {
          const sum = a + b
          return sum
        }
        result = extract([10, 20])
      `);
      
      await runtime.execute(program);
      expect(runtime.getVariable('result').value).toBe(30);
    });
  });
});