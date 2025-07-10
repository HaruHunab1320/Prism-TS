import { createRuntime } from './runtime';
import { parse } from './parser';

describe('Destructuring Assignment', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Array Destructuring', () => {
    it('should destructure basic array', async () => {
      const program = parse(`
        [a, b, c] = [1, 2, 3]
        a + b + c
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(6);
    });

    it('should handle array with fewer elements', async () => {
      const program = parse(`
        [x, y, z] = [10, 20]
        x
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(10);
      
      // Check that z is undefined
      const program2 = parse(`
        [x, y, z] = [10, 20]
        z
      `);
      const result2 = await runtime.execute(program2);
      expect(result2.toString()).toBe('undefined');
    });

    it('should skip elements with holes', async () => {
      const program = parse(`
        [first, , third] = [1, 2, 3]
        first + third
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(4);
    });

    it('should handle rest elements', async () => {
      const program = parse(`
        [head, ...tail] = [1, 2, 3, 4, 5]
        tail
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('[2, 3, 4, 5]');
    });

    it('should handle rest with no remaining elements', async () => {
      const program = parse(`
        [a, b, ...rest] = [1, 2]
        rest
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('[]');
    });

    it('should handle nested array destructuring', async () => {
      const program = parse(`
        [a, [b, c]] = [1, [2, 3]]
        a + b + c
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(6);
    });

    it('should work with confidence values', async () => {
      const program = parse(`
        [x, y] = [10 ~> 0.9, 20 ~> 0.8]
        x
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('10');
      expect(result.toString()).toContain('90.0%');
    });
  });

  describe('Object Destructuring', () => {
    it('should destructure basic object', async () => {
      const program = parse(`
        {name, age} = {name: "Alice", age: 30}
        name + " is " + age
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("Alice is 30");
    });

    it('should handle renamed properties', async () => {
      const program = parse(`
        user = {name: "Bob", age: 25}
        {name: userName, age: userAge} = user
        userName + " is " + userAge
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("Bob is 25");
    });

    it('should handle default values', async () => {
      const program = parse(`
        {name = "Anonymous", role = "user"} = {name: "Charlie"}
        name + " - " + role
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("Charlie - user");
    });

    it('should handle missing properties', async () => {
      const program = parse(`
        {x, y} = {x: 10}
        y
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('undefined');
    });

    it('should handle nested object destructuring', async () => {
      const program = parse(`
        data = {user: {name: "Dave", email: "dave@example.com"}}
        {user: {name, email}} = data
        email
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("dave@example.com");
    });

    it('should handle rest properties', async () => {
      const program = parse(`
        {a, b, ...rest} = {a: 1, b: 2, c: 3, d: 4}
        rest
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('c: 3');
      expect(result.toString()).toContain('d: 4');
    });
  });

  describe('Mixed Destructuring', () => {
    it('should handle array in object', async () => {
      const program = parse(`
        {coords: [x, y]} = {coords: [10, 20]}
        x + y
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(30);
    });

    it('should handle object in array', async () => {
      const program = parse(`
        [{name}, {age}] = [{name: "Eve"}, {age: 28}]
        name + " is " + age
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("Eve is 28");
    });

    it('should handle complex nested destructuring', async () => {
      const program = parse(`
        data = {
          users: [
            {name: "User1", scores: [90, 85]},
            {name: "User2", scores: [88, 92]}
          ]
        }
        {users: [{name: firstName, scores: [score1]}, ...rest]} = data
        firstName + " scored " + score1
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("User1 scored 90");
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty patterns', async () => {
      const program = parse(`
        [] = [1, 2, 3]
        {} = {a: 1, b: 2}
        "ok"
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("ok");
    });

    it('should throw on non-array destructuring', async () => {
      const program = parse(`
        [a, b] = 123
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Cannot destructure non-array value');
    });

    it('should throw on non-object destructuring', async () => {
      const program = parse(`
        {x, y} = "not an object"
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Cannot destructure non-object value');
    });

    it('should work with computed values', async () => {
      const program = parse(`
        nums = [1, 2, 3, 4, 5];
        [first, second] = nums.map(x => x * 2);
        first + second
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(6); // 2 + 4
    });

    it('should preserve confidence through destructuring', async () => {
      const program = parse(`
        data = {value: 100 ~> 0.85, status: "active"}
        {value, status} = data
        value
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('100');
      expect(result.toString()).toContain('85.0%');
    });
  });

  describe('Real-world Use Cases', () => {
    it('should swap variables', async () => {
      const program = parse(`
        a = 10;
        b = 20;
        [a, b] = [b, a];
        a
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(20);
    });

    it('should extract function return values', async () => {
      const program = parse(`
        getCoords = () => [100, 200];
        [x, y] = getCoords();
        x + y
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(300);
    });

    it('should parse structured data', async () => {
      const program = parse(`
        response = {
          data: {
            user: {id: 123, name: "Test User"},
            timestamp: "2024-01-01"
          },
          status: 200
        }
        {data: {user: {id, name}}, status} = response
        name + " (ID: " + id + ") - Status: " + status
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("Test User (ID: 123) - Status: 200");
    });

    it('should work with array methods', async () => {
      const program = parse(`
        users = [
          {name: "Alice", age: 30},
          {name: "Bob", age: 25},
          {name: "Charlie", age: 35}
        ];
        [firstUser, ...otherUsers] = users;
        {name} = firstUser;
        name
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("Alice");
    });
  });
});