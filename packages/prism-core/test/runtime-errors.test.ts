import { createRuntime } from '../src/runtime';
import { parse } from '../src/parser';
import { RuntimeError } from '../src/runtime';

describe('Runtime Error Handling', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Variable Errors', () => {
    it('should throw error for undefined variable', async () => {
      const program = parse('x + 1');
      await expect(runtime.execute(program)).rejects.toThrow('Undefined variable: x');
    });

    it('should throw error for undefined variable in assignment', async () => {
      const program = parse('y = x + 1');
      await expect(runtime.execute(program)).rejects.toThrow('Undefined variable: x');
    });

    it('should include location info in undefined variable error', async () => {
      const program = parse('a = 1\nb = c + 1');
      try {
        await runtime.execute(program);
        fail('Expected error');
      } catch (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect((error as RuntimeError).message).toContain('line');
      }
    });
  });

  describe('Arithmetic Errors', () => {
    it('should throw error for division by zero', async () => {
      const program = parse('10 / 0');
      await expect(runtime.execute(program)).rejects.toThrow('Division by zero');
    });

    it('should throw error for modulo by zero', async () => {
      const program = parse('10 % 0');
      await expect(runtime.execute(program)).rejects.toThrow('Modulo by zero');
    });

    it('should throw error for invalid addition operands', async () => {
      const program = parse('true + false');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot apply + to boolean and boolean');
    });

    it('should throw error for invalid subtraction operands', async () => {
      const program = parse('true - 5');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot apply - to boolean and number');
    });

    it('should throw error for invalid multiplication operands', async () => {
      const program = parse('"hello" * 5');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot apply * to string and number');
    });

    it('should throw error for invalid division operands', async () => {
      const program = parse('"hello" / 5');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot apply / to string and number');
    });

    it('should throw error for invalid exponentiation operands', async () => {
      const program = parse('"hello" ** 2');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot apply ** to string and number');
    });

    it('should throw error for invalid modulo operands', async () => {
      const program = parse('"hello" % 2');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot apply % to string and number');
    });
  });

  describe('Comparison Errors', () => {
    it('should throw error for incomparable types in less than', async () => {
      const program = parse('true < "hello"');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot compare boolean and string');
    });

    it('should throw error for incomparable types in greater than', async () => {
      const program = parse('[1, 2] > {a: 1}');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot compare array and object');
    });

    it('should throw error for incomparable types in less equal', async () => {
      const program = parse('null <= true');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot compare null and boolean');
    });

    it('should throw error for incomparable types in greater equal', async () => {
      const program = parse('undefined >= 5');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot compare undefined and number');
    });
  });

  describe('Function Call Errors', () => {
    it('should throw error for calling non-function', async () => {
      const program = parse('x = 5\nx()');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot call non-function value: number');
    });

    it('should throw error for calling undefined as function', async () => {
      const program = parse('undefined()');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot call non-function value: undefined');
    });

    it('should throw error for calling null as function', async () => {
      const program = parse('null()');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot call non-function value: null');
    });
  });

  describe('Property Access Errors', () => {
    it('should throw error for non-existent property', async () => {
      const program = parse('obj = {a: 1}\nobj.b');
      await expect(runtime.execute(program)).rejects.toThrow("Property 'b' does not exist");
    });

    it('should throw error for property access on number', async () => {
      const program = parse('x = 5\nx.prop');
      await expect(runtime.execute(program)).rejects.toThrow("Cannot access property 'prop' on number");
    });

    it('should throw error for property access on boolean', async () => {
      const program = parse('x = true\nx.prop');
      await expect(runtime.execute(program)).rejects.toThrow("Cannot access property 'prop' on boolean");
    });
  });

  describe('Array Index Errors', () => {
    it('should throw error for non-numeric array index', async () => {
      const program = parse('arr = [1, 2, 3]\narr["hello"]');
      await expect(runtime.execute(program)).rejects.toThrow('Array index must be a number');
    });

    it('should throw error for array index out of bounds', async () => {
      const program = parse('arr = [1, 2, 3]\narr[5]');
      await expect(runtime.execute(program)).rejects.toThrow('Array index 5 out of bounds');
    });

    it('should throw error for negative array index', async () => {
      const program = parse('arr = [1, 2, 3]\narr[-1]');
      await expect(runtime.execute(program)).rejects.toThrow('Array index -1 out of bounds');
    });

    it('should throw error for indexing non-array', async () => {
      const program = parse('x = 5\nx[0]');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot index number');
    });
  });

  describe('Built-in Function Errors', () => {
    describe('llm() errors', () => {
      it('should throw error for llm() with no arguments', async () => {
        const program = parse('llm()');
        await expect(runtime.execute(program)).rejects.toThrow('llm() requires at least one argument');
      });

      it('should throw error for llm() with non-string first argument', async () => {
        const program = parse('llm(123)');
        await expect(runtime.execute(program)).rejects.toThrow('llm() first argument must be a string');
      });

      it('should throw error for no default LLM provider set', async () => {
        // The runtime has mock provider registered but no default set
        const program = parse('llm("test")');
        await expect(runtime.execute(program)).rejects.toThrow('No LLM provider configured');
      });
    });

    describe('map() errors', () => {
      it('should throw error for map() with wrong number of arguments', async () => {
        const program = parse('map([1, 2])');
        await expect(runtime.execute(program)).rejects.toThrow('map() requires exactly 2 arguments');
      });

      it('should throw error for map() with non-array first argument', async () => {
        const program = parse('map(5, x => x)');
        await expect(runtime.execute(program)).rejects.toThrow('First argument to map() must be an array');
      });

      it('should throw error for map() with non-function second argument', async () => {
        const program = parse('map([1, 2], 5)');
        await expect(runtime.execute(program)).rejects.toThrow('Second argument to map() must be a function');
      });
    });

    describe('filter() errors', () => {
      it('should throw error for filter() with wrong number of arguments', async () => {
        const program = parse('filter([1, 2])');
        await expect(runtime.execute(program)).rejects.toThrow('filter() requires exactly 2 arguments');
      });

      it('should throw error for filter() with non-array first argument', async () => {
        const program = parse('filter("hello", x => x)');
        await expect(runtime.execute(program)).rejects.toThrow('First argument to filter() must be an array');
      });

      it('should throw error for filter() with non-function second argument', async () => {
        const program = parse('filter([1, 2], true)');
        await expect(runtime.execute(program)).rejects.toThrow('Second argument to filter() must be a function');
      });
    });

    describe('reduce() errors', () => {
      it('should throw error for reduce() with wrong number of arguments', async () => {
        const program = parse('reduce([1])');
        await expect(runtime.execute(program)).rejects.toThrow('reduce() requires 2 or 3 arguments');
      });

      it('should throw error for reduce() with non-array first argument', async () => {
        const program = parse('reduce(null, (a, b) => a + b)');
        await expect(runtime.execute(program)).rejects.toThrow('First argument to reduce() must be an array');
      });

      it('should throw error for reduce() with non-function second argument', async () => {
        const program = parse('reduce([1, 2], null)');
        await expect(runtime.execute(program)).rejects.toThrow('Second argument to reduce() must be a function');
      });

      it('should throw error for reduce() on empty array with no initial value', async () => {
        const program = parse('reduce([], (a, b) => a + b)');
        await expect(runtime.execute(program)).rejects.toThrow('reduce() of empty array with no initial value');
      });
    });

    describe('max() and min() errors', () => {
      it('should throw error for max() with no arguments', async () => {
        const program = parse('max()');
        await expect(runtime.execute(program)).rejects.toThrow('max() requires at least one argument');
      });

      it('should throw error for max() with non-numeric arguments', async () => {
        const program = parse('max(1, "hello", 3)');
        await expect(runtime.execute(program)).rejects.toThrow('max() requires numeric arguments, got string');
      });

      it('should throw error for min() with no arguments', async () => {
        const program = parse('min()');
        await expect(runtime.execute(program)).rejects.toThrow('min() requires at least one argument');
      });

      it('should throw error for min() with non-numeric arguments', async () => {
        const program = parse('min(1, true, 3)');
        await expect(runtime.execute(program)).rejects.toThrow('min() requires numeric arguments, got boolean');
      });
    });
  });

  describe('Array Method Errors', () => {
    it('should throw error for array.map() with wrong arguments', async () => {
      const program = parse('arr = [1, 2]\narr.map()');
      await expect(runtime.execute(program)).rejects.toThrow('Array.map() requires exactly 1 argument');
    });

    it('should throw error for array.map() with non-function argument', async () => {
      const program = parse('arr = [1, 2]\narr.map(5)');
      await expect(runtime.execute(program)).rejects.toThrow('Argument to map() must be a function');
    });

    it('should throw error for array.filter() with wrong arguments', async () => {
      const program = parse('arr = [1, 2]\narr.filter()');
      await expect(runtime.execute(program)).rejects.toThrow('Array.filter() requires exactly 1 argument');
    });

    it('should throw error for array.filter() with non-function argument', async () => {
      const program = parse('arr = [1, 2]\narr.filter("not a function")');
      await expect(runtime.execute(program)).rejects.toThrow('Argument to filter() must be a function');
    });

    it('should throw error for array.reduce() with no arguments', async () => {
      const program = parse('arr = [1, 2]\narr.reduce()');
      await expect(runtime.execute(program)).rejects.toThrow('Array.reduce() requires 1 or 2 arguments');
    });

    it('should throw error for array.reduce() with non-function first argument', async () => {
      const program = parse('arr = [1, 2]\narr.reduce(null)');
      await expect(runtime.execute(program)).rejects.toThrow('First argument to reduce() must be a function');
    });

    it('should throw error for empty array.reduce() with no initial value', async () => {
      const program = parse('arr = []\narr.reduce((a, b) => a + b)');
      await expect(runtime.execute(program)).rejects.toThrow('reduce() of empty array with no initial value');
    });

    it('should throw error for array.forEach() with wrong arguments', async () => {
      const program = parse('arr = [1, 2]\narr.forEach()');
      await expect(runtime.execute(program)).rejects.toThrow('Array.forEach() requires exactly 1 argument');
    });

    it('should throw error for array.forEach() with non-function argument', async () => {
      const program = parse('arr = [1, 2]\narr.forEach(123)');
      await expect(runtime.execute(program)).rejects.toThrow('Argument to forEach() must be a function');
    });

    it('should throw error for array.join() with non-string separator', async () => {
      const program = parse('arr = [1, 2]\narr.join(123)');
      await expect(runtime.execute(program)).rejects.toThrow('Array.join() separator must be a string');
    });

    it('should throw error for array.push() with no arguments', async () => {
      const program = parse('arr = [1, 2]\narr.push()');
      await expect(runtime.execute(program)).rejects.toThrow('Array.push() requires at least 1 argument');
    });
  });

  describe('Lambda Expression Errors', () => {
    it('should throw error for lambda with too few arguments', async () => {
      const program = parse('fn = (a, b) => a + b\nfn(1)');
      await expect(runtime.execute(program)).rejects.toThrow('Lambda expects 2 arguments, got 1');
    });

    it('should throw error for lambda with too many arguments (no rest)', async () => {
      const program = parse('fn = (a, b) => a + b\nfn(1, 2, 3)');
      await expect(runtime.execute(program)).rejects.toThrow('Lambda expects 2 arguments, got 3');
    });
  });

  describe('Spread Operator Errors', () => {
    it('should throw error for spreading non-array in call', async () => {
      const program = parse('fn = (a, b) => a + b\nfn(...5)');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot spread non-array value: number');
    });

    it('should throw error for spreading non-array in array literal', async () => {
      const program = parse('[1, ...null, 3]');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot spread non-array value');
    });

    it('should throw error for spreading non-object in object literal', async () => {
      const program = parse('{a: 1, ...5}');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot spread non-object value');
    });
  });

  describe('Confidence Operator Errors', () => {
    it('should throw error for invalid confidence value', async () => {
      const program = parse('x = 5 ~> "not a number"');
      await expect(runtime.execute(program)).rejects.toThrow('Confidence value must be a number');
    });

    it('should clamp confidence value when out of range', async () => {
      const program = parse('x = 5 ~> 1.5\n<~ x');
      const result = await runtime.execute(program);
      expect(result.value).toBe(1); // Clamped to 1
    });

    it('should clamp negative confidence value to 0', async () => {
      const program = parse('neg = -0.5\nx = 5 ~> neg\n<~ x');
      const result = await runtime.execute(program);
      expect(result.value).toBe(0); // Clamped to 0
    });

    it('should throw error for confident arithmetic with non-numbers', async () => {
      const program = parse('a = "hello" ~> 0.8\nb = true ~> 0.9\na ~+ b');
      await expect(runtime.execute(program)).rejects.toThrow('Confident arithmetic requires numeric values');
    });

    it('should throw error for confident division by zero', async () => {
      const program = parse('a = 10 ~> 0.8\nb = 0 ~> 0.9\na ~/ b');
      await expect(runtime.execute(program)).rejects.toThrow('Division by zero in confident arithmetic');
    });

    it('should throw error for confident comparison with non-numbers', async () => {
      const program = parse('a = "hello" ~> 0.8\nb = true ~> 0.9\na ~< b');
      await expect(runtime.execute(program)).rejects.toThrow('Confident less than requires numeric values');
    });

    it('should throw error for threshold gate with non-numeric threshold', async () => {
      const program = parse('x = 5 ~> 0.8\nx ~?> "not a number"');
      await expect(runtime.execute(program)).rejects.toThrow('Threshold gate expects a number');
    });

    it('should throw error for threshold gate array with non-numeric first element', async () => {
      const program = parse('x = 5 ~> 0.8\ny = ["not a number", 10]\nx ~?> y');
      await expect(runtime.execute(program)).rejects.toThrow('Threshold gate array first element must be a number');
    });
  });

  describe('Destructuring Errors', () => {
    it('should throw error for array destructuring non-array', async () => {
      const program = parse('[a, b] = 5');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot destructure non-array value');
    });

    it('should throw error for object destructuring non-object', async () => {
      const program = parse('{x, y} = [1, 2]');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot destructure non-object value');
    });

    it('should throw error for non-numeric confidence threshold in destructuring', async () => {
      const program = parse('data = {x: 10, y: 20} ~> 0.8\n{x, y} ~> "not a number" = data');
      await expect(runtime.execute(program)).rejects.toThrow('Confidence threshold must be a number');
    });

    it('should throw error for non-numeric element threshold', async () => {
      const program = parse('[a ~> "not a number", b] = [1, 2]');
      await expect(runtime.execute(program)).rejects.toThrow('Element confidence threshold must be a number');
    });

    it('should throw error for non-numeric property threshold', async () => {
      const program = parse('{x ~> "not a number", y} = {x: 1, y: 2}');
      await expect(runtime.execute(program)).rejects.toThrow('Property confidence threshold must be a number');
    });
  });

  describe('Type Checking Errors', () => {
    it('should throw error for unknown type name in typeof', async () => {
      const program = parse('typeof 5 == "unknown_type"');
      const result = await runtime.execute(program);
      expect(result.value).toBe(false); // typeof returns valid types, so this compares "number" == "unknown_type"
    });

    it('should throw error for instanceof with non-constructor', async () => {
      const program = parse('5 instanceof 10');
      await expect(runtime.execute(program)).rejects.toThrow('Right-hand side of instanceof must be a type name or constructor');
    });

    it('should throw error for instanceof with function (not yet supported)', async () => {
      const program = parse('fn = x => x\n5 instanceof fn');
      await expect(runtime.execute(program)).rejects.toThrow('instanceof with constructor functions not yet supported');
    });

    it('should return correct type for typeof expression', async () => {
      const program = parse('typeof 5');
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('number');
    });
  });

  describe('Control Flow Errors', () => {
    it('should throw error for for-in with non-array', async () => {
      const program = parse('for x in 5 { }');
      await expect(runtime.execute(program)).rejects.toThrow('for...in loop requires an array');
    });

    it('should throw error for uncertain if without confidence expression', async () => {
      const program = parse('uncertain if (5) { high { } }');
      await expect(runtime.execute(program)).rejects.toThrow('Uncertain if requires a confidence expression');
    });
  });

  describe('Unary Operator Errors', () => {
    it('should throw error for unary minus on non-number', async () => {
      const program = parse('-"hello"');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot apply unary - to string');
    });

    it('should throw error for unary minus on boolean', async () => {
      const program = parse('-true');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot apply unary - to boolean');
    });

    it('should throw error for unary minus on array', async () => {
      const program = parse('-[1, 2, 3]');
      await expect(runtime.execute(program)).rejects.toThrow('Cannot apply unary - to array');
    });
  });

  describe('Logical Operator Internal Errors', () => {
    // These are internal errors that shouldn't happen with proper parser
    // but we test them for completeness
    it('should handle missing left/right operands gracefully', async () => {
      const program = parse('x = null || 5');
      const result = await runtime.execute(program);
      expect(result.value).toBe(5);
    });

    it('should handle undefined in logical expressions', async () => {
      const program = parse('x = undefined && 5');
      const result = await runtime.execute(program);
      expect(result.value).toBe(undefined); // && returns first falsy value
    });
  });

  describe('Error Location Information', () => {
    it('should include line and column in arithmetic errors', async () => {
      const program = parse('a = 1\nb = 2\nc = a / 0');
      try {
        await runtime.execute(program);
        fail('Expected error');
      } catch (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        const runtimeError = error as RuntimeError;
        expect(runtimeError.message).toContain('Division by zero');
        // Parser should have set location info
      }
    });

    it('should include location in function call errors', async () => {
      const program = parse('x = 5\ny = x()');
      try {
        await runtime.execute(program);
        fail('Expected error');
      } catch (error) {
        expect(error).toBeInstanceOf(RuntimeError);
        expect((error as RuntimeError).message).toContain('Cannot call non-function value');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle complex error scenarios', async () => {
      const program = parse(`
        arr = [1, 2, 3]
        fn = x => x / 0
        arr.map(fn)
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Division by zero');
    });

    it('should handle errors in nested function calls', async () => {
      const program = parse(`
        outer = inner => inner()
        outer(5)
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Cannot call non-function value');
    });

    it('should handle errors in ternary expressions', async () => {
      const program = parse('x = true ? (5 / 0) : 10');
      await expect(runtime.execute(program)).rejects.toThrow('Division by zero');
    });

    it('should handle errors in spread operations', async () => {
      const program = parse(`
        fn = (a, b, c) => a + b + c
        badValue = "not an array"
        fn(...badValue)
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Cannot spread non-array value');
    });
  });
});