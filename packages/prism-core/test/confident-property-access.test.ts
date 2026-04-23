import { createRuntime } from '../src/runtime';
import { parse } from '../src/parser';

describe('Confident Property Access (~.)', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Basic confident property access', () => {
    it('should access object properties with confidence', async () => {
      const program = parse(`
        let obj = { name: "Alice", age: 30 } ~> 0.8
        let name = obj~.name
        name
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('Alice (~80.0%)');
    });

    it('should handle non-confident objects', async () => {
      const program = parse(`
        let obj = { value: 42 }
        let val = obj~.value
        val
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('42 (~100.0%)');
    });

    it('should return null for null/null objects', async () => {
      const program = parse(`
        let obj = null
        let val = obj~.prop
        val
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('null (~100.0%)');
    });

    it('should return null for missing properties', async () => {
      const program = parse(`
        let obj = { a: 1 } ~> 0.9
        let val = obj~.missing
        val
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('null (~90.0%)');
    });
  });

  describe('Array property access', () => {
    it('should access array length with confidence', async () => {
      const program = parse(`
        let arr = [1, 2, 3, 4, 5] ~> 0.85
        let len = arr~.length
        len
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('5 (~85.0%)');
    });
  });

  describe('Nested confident property access', () => {
    it('should handle nested confident access', async () => {
      const program = parse(`
        let data = {
          user: {
            profile: {
              name: "Bob"
            }
          }
        } ~> 0.7
        
        let name = data~.user~.profile~.name
        name
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('Bob (~70.0%)');
    });

    it('should handle null in chain', async () => {
      const program = parse(`
        let data = {
          user: null
        } ~> 0.9
        
        let name = data~.user~.profile~.name
        name
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('null (~90.0%)');
    });
  });

  describe('Comparison with regular property access', () => {
    it('should maintain confidence vs regular access', async () => {
      const program = parse(`
        let obj = { value: 100 } ~> 0.8
        let regular = obj.value     // Regular access loses confidence
        let confident = obj~.value  // Confident access preserves it
        confident
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('100 (~80.0%)');
    });
  });
});