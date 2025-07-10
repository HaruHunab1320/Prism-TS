import { createRuntime } from './runtime';
import { parse } from './parser';

describe('Confidence-based Destructuring', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Global threshold (Option 1)', () => {
    describe('Array destructuring with global threshold', () => {
      it('should only destructure values above threshold', async () => {
        const program = parse(`
          data = [10 ~> 0.9, 20 ~> 0.6, 30 ~> 0.8];
          [a, b, c] ~> 0.7 = data;
          {a: a, b: b, c: c}
        `);
        const result = await runtime.execute(program);
        expect(result.toString()).toContain('a: 10');
        expect(result.toString()).not.toContain('b:'); // 0.6 < 0.7
        expect(result.toString()).toContain('c: 30');
      });

      it('should handle rest elements with threshold', async () => {
        const program = parse(`
          values = [1 ~> 0.9, 2 ~> 0.5, 3 ~> 0.8, 4 ~> 0.6, 5 ~> 0.95];
          [first, ...rest] ~> 0.7 = values;
          rest
        `);
        const result = await runtime.execute(program);
        expect(result.toString()).toBe('[3 (~80.0%), 5 (~95.0%)]');
      });

      it('should work with non-confident values', async () => {
        const program = parse(`
          mixed = [100, 200 ~> 0.5, 300];
          [x, y, z] ~> 0.8 = mixed;
          {x: x, y: y, z: z}
        `);
        const result = await runtime.execute(program);
        expect(result.toString()).toContain('x: 100'); // Non-confident = 1.0
        expect(result.toString()).not.toContain('y:'); // 0.5 < 0.8
        expect(result.toString()).toContain('z: 300'); // Non-confident = 1.0
      });
    });

    describe('Object destructuring with global threshold', () => {
      it('should only destructure properties above threshold', async () => {
        const program = parse(`
          user = {
            name: "Alice" ~> 0.95,
            age: 30 ~> 0.6,
            email: "alice@example.com" ~> 0.85
          };
          {name, age, email} ~> 0.8 = user;
          {name: name, age: age, email: email}
        `);
        const result = await runtime.execute(program);
        expect(result.toString()).toContain('name: Alice');
        expect(result.toString()).not.toContain('age:'); // 0.6 < 0.8
        expect(result.toString()).toContain('email: alice@example.com');
      });

      it('should handle rest properties with threshold', async () => {
        const program = parse(`
          data = {
            a: 1 ~> 0.9,
            b: 2 ~> 0.5,
            c: 3 ~> 0.85,
            d: 4 ~> 0.6
          };
          {a, ...rest} ~> 0.7 = data;
          rest
        `);
        const result = await runtime.execute(program);
        expect(result.toString()).toContain('c: 3');
        expect(result.toString()).not.toContain('b:'); // 0.5 < 0.7
        expect(result.toString()).not.toContain('d:'); // 0.6 < 0.7
      });
    });
  });

  describe('Per-element threshold (Option 3)', () => {
    describe('Array destructuring with per-element thresholds', () => {
      it('should apply individual thresholds to elements', async () => {
        const program = parse(`
          data = [10 ~> 0.6, 20 ~> 0.8, 30 ~> 0.5];
          [a ~> 0.7, b ~> 0.7, c ~> 0.4] = data;
          {a: a, b: b, c: c}
        `);
        const result = await runtime.execute(program);
        expect(result.toString()).not.toContain('a:'); // 0.6 < 0.7
        expect(result.toString()).toContain('b: 20'); // 0.8 > 0.7
        expect(result.toString()).toContain('c: 30'); // 0.5 > 0.4
      });

      it('should handle mixed threshold and non-threshold elements', async () => {
        const program = parse(`
          values = [1 ~> 0.9, 2 ~> 0.5, 3 ~> 0.8];
          [x ~> 0.8, y, z ~> 0.7] = values;
          {x: x, y: y, z: z}
        `);
        const result = await runtime.execute(program);
        expect(result.toString()).toContain('x: 1'); // 0.9 > 0.8
        expect(result.toString()).toContain('y: 2'); // No threshold
        expect(result.toString()).toContain('z: 3'); // 0.8 > 0.7
      });
    });

    describe('Object destructuring with per-property thresholds', () => {
      it('should apply individual thresholds to properties', async () => {
        const program = parse(`
          sensor = {
            temp: 25.5 ~> 0.95,
            humidity: 60 ~> 0.4,
            pressure: 1013 ~> 0.85
          };
          {temp ~> 0.9, humidity ~> 0.8, pressure ~> 0.8} = sensor;
          {temp: temp, humidity: humidity, pressure: pressure}
        `);
        const result = await runtime.execute(program);
        expect(result.toString()).toContain('temp: 25.5'); // 0.95 > 0.9
        expect(result.toString()).not.toContain('humidity:'); // 0.4 < 0.8
        expect(result.toString()).toContain('pressure: 1013'); // 0.85 > 0.8
      });

      it('should work with renamed properties and thresholds', async () => {
        const program = parse(`
          data = {
            a: 100 ~> 0.7,
            b: 200 ~> 0.9
          };
          {a: valueA ~> 0.8, b: valueB ~> 0.8} = data;
          {valueA: valueA, valueB: valueB}
        `);
        const result = await runtime.execute(program);
        expect(result.toString()).not.toContain('valueA:'); // 0.7 < 0.8
        expect(result.toString()).toContain('valueB: 200'); // 0.9 > 0.8
      });
    });
  });

  describe('Combined thresholds', () => {
    it('should prioritize per-element over global threshold', async () => {
      const program = parse(`
        data = [10 ~> 0.6, 20 ~> 0.8, 30 ~> 0.5];
        [a ~> 0.4, b, c] ~> 0.7 = data;
        {a: a, b: b, c: c}
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('a: 10'); // Uses 0.4 threshold
      expect(result.toString()).toContain('b: 20'); // Uses 0.7 global
      expect(result.toString()).not.toContain('c:'); // 0.5 < 0.7 global
    });

    it('should work with nested patterns and thresholds', async () => {
      const program = parse(`
        complex = {
          data: [100 ~> 0.9, 200 ~> 0.6, 300 ~> 0.8]
        };
        {data: [x, y, z] ~> 0.7} = complex;
        {x: x, y: y, z: z}
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('x: 100'); // 0.9 > 0.7
      expect(result.toString()).not.toContain('y:'); // 0.6 < 0.7
      expect(result.toString()).toContain('z: 300'); // 0.8 > 0.7
    });
  });

  describe('Edge cases', () => {
    it('should handle all values below threshold', async () => {
      const program = parse(`
        lowConf = [1 ~> 0.3, 2 ~> 0.4, 3 ~> 0.2];
        [a, b, c] ~> 0.5 = lowConf;
        {a: a, b: b, c: c}
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('{}'); // Empty object
    });

    it('should work with confidence threshold of 0', async () => {
      const program = parse(`
        data = [1 ~> 0.1, 2 ~> 0.0, 3 ~> 0.5];
        [x, y, z] ~> 0.0 = data;
        {x: x, y: y, z: z}
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('x: 1');
      expect(result.toString()).toContain('y: 2');
      expect(result.toString()).toContain('z: 3');
    });

    it('should work with confidence threshold of 1', async () => {
      const program = parse(`
        data = [1 ~> 0.99, 2, 3 ~> 0.95];
        [x, y, z] ~> 1.0 = data;
        {x: x, y: y, z: z}
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).not.toContain('x:'); // 0.99 < 1.0
      expect(result.toString()).toContain('y: 2'); // Non-confident = 1.0
      expect(result.toString()).not.toContain('z:'); // 0.95 < 1.0
    });

    it('should throw for non-numeric thresholds', async () => {
      const program = parse(`
        data = [1, 2, 3];
        [a, b, c] ~> "high" = data;
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Confidence threshold must be a number');
    });
  });

  describe('Real-world use cases', () => {
    it('should filter sensor readings by confidence', async () => {
      const program = parse(`
        readings = [
          {temp: 25.5 ~> 0.95, time: "10:00"},
          {temp: 26.1 ~> 0.4, time: "10:01"},
          {temp: 25.8 ~> 0.85, time: "10:02"}
        ];
        filtered = [];
        for reading in readings {
          {temp ~> 0.8} = reading;
          if (temp) {
            filtered = [...filtered, {temp: temp, time: reading.time}]
          }
        }
        filtered
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('25.5');
      expect(result.toString()).not.toContain('26.1');
      expect(result.toString()).toContain('25.8');
    });

    it('should extract high-confidence user data', async () => {
      const program = parse(`
        userData = {
          name: "John" ~> 0.99,
          email: "john@example.com" ~> 0.7,
          phone: "555-1234" ~> 0.3,
          verified: true ~> 0.95
        };
        {name ~> 0.9, email ~> 0.9, phone ~> 0.9, verified ~> 0.9} = userData;
        trustedData = {};
        if (name) trustedData = {...trustedData, name: name};
        if (email) trustedData = {...trustedData, email: email};
        if (phone) trustedData = {...trustedData, phone: phone};
        if (verified) trustedData = {...trustedData, verified: verified};
        trustedData
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('name: John');
      expect(result.toString()).not.toContain('email');
      expect(result.toString()).not.toContain('phone');
      expect(result.toString()).toContain('verified: true');
    });
  });
});