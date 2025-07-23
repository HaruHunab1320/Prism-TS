import { parse, createRuntime } from '../src';
import { PromiseValue, NumberValue, StringValue, ArrayValue, UndefinedValue } from '../src/runtime';

describe('Async/Await', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Async Functions', () => {
    it('should parse async function declaration', () => {
      const code = `
        async function fetchData() {
          return 42
        }
      `;
      
      const ast = parse(code);
      expect(ast.statements[0].type).toBe('FunctionDeclaration');
      expect((ast.statements[0] as any).isAsync).toBe(true);
    });

    it('should execute async function', async () => {
      const code = `
        async function getValue() {
          return 100
        }
        getValue()
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast);
      expect(result.value).toBe(100);
    });

    it('should handle async function with confidence', async () => {
      const code = `
        async function analyze() ~> 0.9 {
          return "result"
        }
        analyze()
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast);
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe('result');
      expect((result as any).confidence.value).toBe(0.9);
    });
  });

  describe('Await Expression', () => {
    it('should parse await expression', () => {
      const code = `
        async function test() {
          x = await getValue()
          return x
        }
      `;
      
      const ast = parse(code);
      const funcBody = (ast.statements[0] as any).body;
      const assignment = funcBody.statements[0];
      expect(assignment.value.type).toBe('AwaitExpression');
    });

    it('should await Promise values', async () => {
      const code = `
        async function delayedValue() {
          p = Promise.resolve(42)
          result = await p
          return result
        }
        delayedValue()
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast);
      expect(result.value).toBe(42);
    });

    it('should pass through non-promise values', async () => {
      const code = `
        async function test() {
          x = await 42
          return x
        }
        test()
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast);
      expect(result.value).toBe(42);
    });
  });

  describe('Promise Built-ins', () => {
    it('should create resolved promise with Promise.resolve', async () => {
      const code = `
        p = Promise.resolve(100)
        result = await p
        result
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast);
      expect(result.value).toBe(100);
    });

    it('should handle Promise.reject', async () => {
      const code = `
        async function testReject() {
          p = Promise.reject("error")
          // For now, we don't have try/catch, so this will throw
          return "should not reach"
        }
      `;
      
      const ast = parse(code);
      // Just parse it, don't execute (would need try/catch)
      expect(ast.statements[0].type).toBe('FunctionDeclaration');
    });

    it('should wait for all promises with Promise.all', async () => {
      const code = `
        async function waitAll() {
          p1 = Promise.resolve(1)
          p2 = Promise.resolve(2)
          p3 = Promise.resolve(3)
          results = await Promise.all([p1, p2, p3])
          return results
        }
        waitAll()
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast) as ArrayValue;
      expect(result.type).toBe('array');
      expect(result.value.length).toBe(3);
      expect((result.value[0] as NumberValue).value).toBe(1);
      expect((result.value[1] as NumberValue).value).toBe(2);
      expect((result.value[2] as NumberValue).value).toBe(3);
    });

    it('should handle mixed promise and non-promise values in Promise.all', async () => {
      const code = `
        async function mixedAll() {
          p1 = Promise.resolve(10)
          v2 = 20
          results = await Promise.all([p1, v2])
          return results
        }
        mixedAll()
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast) as ArrayValue;
      expect(result.type).toBe('array');
      expect((result.value[0] as NumberValue).value).toBe(10);
      expect((result.value[1] as NumberValue).value).toBe(20);
    });
  });

  describe('Delay/Sleep Function', () => {
    it('should delay execution with delay()', async () => {
      const code = `
        async function delayTest() {
          start = 1
          await delay(10)
          end = 2
          return end
        }
        delayTest()
      `;
      
      const ast = parse(code);
      const startTime = Date.now();
      const result = await runtime.execute(ast);
      const elapsed = Date.now() - startTime;
      
      expect(result.value).toBe(2);
      expect(elapsed).toBeGreaterThanOrEqual(10);
    });

    it('should work with sleep() alias', async () => {
      const code = `
        async function sleepTest() {
          await sleep(5)
          return "done"
        }
        sleepTest()
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast);
      expect(result.value).toBe('done');
    });
  });

  describe('Complex Async Patterns', () => {
    it('should handle nested async functions', async () => {
      const code = `
        async function outer() {
          async function inner() {
            return 42
          }
          result = await inner()
          return result
        }
        outer()
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast);
      expect(result.value).toBe(42);
    });

    it('should chain multiple awaits', async () => {
      const code = `
        async function chain() {
          p1 = Promise.resolve(10)
          v1 = await p1
          p2 = Promise.resolve(v1 + 20)
          v2 = await p2
          return v2
        }
        chain()
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast);
      expect(result.value).toBe(30);
    });

    it('should work with array methods', async () => {
      const code = `
        async function processArray() {
          values = [1, 2, 3]
          promises = values.map(v => Promise.resolve(v * 2))
          results = await Promise.all(promises)
          return results
        }
        processArray()
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast) as ArrayValue;
      expect(result.type).toBe('array');
      expect((result.value[0] as NumberValue).value).toBe(2);
      expect((result.value[1] as NumberValue).value).toBe(4);
      expect((result.value[2] as NumberValue).value).toBe(6);
    });

    it('should work with confidence values', async () => {
      const code = `
        async function confidentAsync() {
          value = 42 ~> 0.8
          p = Promise.resolve(value)
          result = await p
          return result
        }
        confidentAsync()
      `;
      
      const ast = parse(code);
      const result = await runtime.execute(ast);
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe(42);
      expect((result as any).confidence.value).toBe(0.8);
    });
  });

  describe('Error Cases', () => {
    it('should reject invalid async syntax', () => {
      const code = `async const x = 42`;
      expect(() => parse(code)).toThrow("Expected 'function' after 'async'");
    });

    it('should handle missing expression after await', () => {
      const code = `
        async function test() {
          x = await
        }
      `;
      expect(() => parse(code)).toThrow("Expected expression");
    });
  });
});