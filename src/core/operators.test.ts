import { createRuntime } from './runtime';
import { parse } from './parser';

describe('Confidence Operators', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Confidence Extraction (~)', () => {
    it('should extract confidence from confident values', async () => {
      const program = parse(`
        measurement = 100 ~> 0.85
        <~ measurement
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(0.85);
      expect(result.type).toBe('number');
    });

    it('should return 1.0 for regular values', async () => {
      const program = parse(`
        value = 42
        <~ value
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(1.0);
      expect(result.type).toBe('number');
    });
  });

  describe('Confidence Chaining (~~)', () => {
    it('should chain confident values', async () => {
      const program = parse(`
        input = 50 ~> 0.9
        processed = 75 ~> 0.8
        input ~~ processed
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('75');
      expect(result.toString()).toContain('80.0%');
    });

    it('should handle chaining with regular values', async () => {
      const program = parse(`
        step1 = 42
        step2 = 84 ~> 0.7
        step1 ~~ step2
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('84');
      expect(result.toString()).toContain('70.0%');
    });

    it('should support multiple chaining operations', async () => {
      const program = parse(`
        data1 = 10 ~> 0.9
        data2 = 20 ~> 0.8
        data3 = 30 ~> 0.7
        data1 ~~ data2 ~~ data3
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('30');
      expect(result.toString()).toContain('70.0%');
    });
  });

  describe('Confidence Coalesce (~??)', () => {
    it('should not coalesce high confidence values', async () => {
      const program = parse(`
        primary = "good result" ~> 0.9
        fallback = "backup" ~> 0.8
        primary ~?? fallback
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('good result');
      expect(result.toString()).toContain('90.0%');
    });

    it('should coalesce low confidence values', async () => {
      const program = parse(`
        lowConf = "uncertain result" ~> 0.3
        fallback = "reliable backup" ~> 0.8
        lowConf ~?? fallback
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('reliable backup');
      expect(result.toString()).toContain('80.0%');
    });

    it('should support multiple coalesce operations', async () => {
      const program = parse(`
        first = "low conf" ~> 0.2
        second = "also low" ~> 0.3
        third = "reliable" ~> 0.9
        first ~?? second ~?? third
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('reliable');
      expect(result.toString()).toContain('90.0%');
    });

    it('should handle regular values with full confidence', async () => {
      const program = parse(`
        regularValue = 42
        backup = "fallback" ~> 0.7
        regularValue ~?? backup
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe(42);
      expect(result.type).toBe('number');
    });
  });
});