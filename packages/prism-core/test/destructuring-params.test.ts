import { createRuntime } from '../src/runtime';
import { parse } from '../src/parser';

describe('Destructuring in Function Parameters', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Array destructuring in parameters', () => {
    it('should destructure array parameters', async () => {
      const program = parse(`
        sum = ([a, b]) => a + b;
        sum([3, 4])
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(7);
    });

    it('should handle rest elements in array parameters', async () => {
      const program = parse(`
        headAndTail = ([head, ...tail]) => {a: head, b: tail};
        headAndTail([1, 2, 3, 4])
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('a: 1');
      expect(result.toString()).toContain('2, 3, 4');
    });

    it('should handle nested array destructuring', async () => {
      const program = parse(`
        processMatrix = ([[a, b], [c, d]]) => a + b + c + d;
        processMatrix([[1, 2], [3, 4]])
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(10);
    });

    it('should handle array holes in parameters', async () => {
      const program = parse(`
        skipSecond = ([first, , third]) => first + third;
        skipSecond([10, 20, 30])
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(40);
    });
  });

  describe('Object destructuring in parameters', () => {
    it('should destructure object parameters', async () => {
      const program = parse(`
        greet = ({name, age}) => name + " is " + age;
        greet({name: "Alice", age: 30})
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("Alice is 30");
    });

    it('should handle renamed properties', async () => {
      const program = parse(`
        processUser = ({name: userName, id: userId}) => userName + "-" + userId;
        processUser({name: "Bob", id: 123})
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("Bob-123");
    });

    it('should handle default values', async () => {
      const program = parse(`
        withDefaults = ({x = 10, y = 20}) => x + y;
        withDefaults({x: 5})
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(25);
    });

    it('should handle rest properties', async () => {
      const program = parse(`
        extractRest = ({a, ...rest}) => rest;
        result = extractRest({a: 1, b: 2, c: 3});
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('b: 2');
      expect(result.toString()).toContain('c: 3');
    });
  });

  describe('Mixed destructuring', () => {
    it('should handle multiple destructured parameters', async () => {
      const program = parse(`
        combine = ([x, y], {scale}) => (x + y) * scale;
        combine([2, 3], {scale: 10})
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(50);
    });

    it('should handle mixed regular and destructured parameters', async () => {
      const program = parse(`
        process = (multiplier, [a, b], {add}) => (a + b) * multiplier + add;
        process(2, [3, 4], {add: 10})
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(24); // (3 + 4) * 2 + 10
    });

    it('should handle nested mixed destructuring', async () => {
      const program = parse(`
        complex = ({data: [first, second]}) => first + second;
        complex({data: [100, 200]})
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(300);
    });
  });

  describe('Rest parameters with destructuring', () => {
    it('should handle rest parameter with array destructuring', async () => {
      const program = parse(`
        firstAndRest = (first, ...[second, third]) => first + second + third;
        firstAndRest(1, 2, 3)
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(6);
    });

    it('should handle rest parameter collecting into array', async () => {
      const program = parse(`
        processMany = (prefix, ...items) => prefix + ": " + items[0] + ", " + items[1] + " (total: " + items.length + ")";
        processMany("Items", "a", "b", "c")
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("Items: a, b (total: 3)");
    });
  });

  describe('Edge cases', () => {
    it('should handle empty destructuring patterns', async () => {
      const program = parse(`
        emptyArray = ([]) => "empty";
        emptyObject = ({}) => "empty";
        emptyArray([1, 2, 3]) + " " + emptyObject({a: 1})
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("empty empty");
    });

    it('should throw on non-destructurable values', async () => {
      const program = parse(`
        badArray = ([a, b]) => a + b;
        badArray(123)
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Cannot destructure non-array value');
    });

    it('should work with confidence values', async () => {
      const program = parse(`
        processConfident = ([x, y]) => x + y;
        processConfident([10 ~> 0.9, 20 ~> 0.8])
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('30');
      expect(result.toString()).toContain('80.0%'); // min confidence
    });
  });

  describe('Real-world patterns', () => {
    it('should handle options object pattern', async () => {
      const program = parse(`
        createUser = ({name, email, role = "user"}) => name + " (" + email + ") - " + role;
        createUser({name: "Test", email: "test@example.com"})
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("Test (test@example.com) - user");
    });

    it('should handle array swapping function', async () => {
      const program = parse(`
        swap = ([a, b]) => [b, a];
        swap([1, 2])
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('[2, 1]');
    });

    it('should handle point manipulation', async () => {
      const program = parse(`
        distance = ([x1, y1], [x2, y2]) => ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5;
        distance([0, 0], [3, 4])
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(5);
    });
  });
});