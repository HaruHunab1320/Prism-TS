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

  describe('Confident Logical Operators (~&&, ~||)', () => {
    it('should perform confident AND with both true values', async () => {
      const program = parse(`
        condition1 = true ~> 0.9
        condition2 = true ~> 0.8
        condition1 ~&& condition2
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('true');
      expect(result.toString()).toContain('80.0%'); // minimum confidence
    });

    it('should perform confident AND with one false value', async () => {
      const program = parse(`
        condition1 = true ~> 0.9
        condition2 = false ~> 0.8
        condition1 ~&& condition2
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('false');
      expect(result.toString()).toContain('80.0%');
    });

    it('should perform confident OR with both false values', async () => {
      const program = parse(`
        condition1 = false ~> 0.7
        condition2 = false ~> 0.9
        condition1 ~|| condition2
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('false');
      expect(result.toString()).toContain('90.0%'); // maximum confidence
    });

    it('should perform confident OR with one true value', async () => {
      const program = parse(`
        condition1 = false ~> 0.7
        condition2 = true ~> 0.6
        condition1 ~|| condition2
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('true');
      expect(result.toString()).toContain('70.0%');
    });

    it('should handle mixed confident and regular values', async () => {
      const program = parse(`
        regularTrue = true
        confidentFalse = false ~> 0.8
        regularTrue ~&& confidentFalse
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('false');
      expect(result.toString()).toContain('80.0%');
    });
  });

  describe('Confident Arithmetic Operators (~+, ~-, ~*, ~/)', () => {
    it('should perform confident addition', async () => {
      const program = parse(`
        measurement1 = 50 ~> 0.9
        measurement2 = 30 ~> 0.8
        measurement1 ~+ measurement2
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('80');
      expect(result.toString()).toContain('80.0%'); // minimum confidence
    });

    it('should perform confident subtraction', async () => {
      const program = parse(`
        total = 100 ~> 0.95
        used = 35 ~> 0.7
        total ~- used
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('65');
      expect(result.toString()).toContain('70.0%'); // minimum confidence
    });

    it('should perform confident multiplication', async () => {
      const program = parse(`
        length = 10 ~> 0.8
        width = 5 ~> 0.9
        length ~* width
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('50');
      expect(result.toString()).toContain('80.0%'); // minimum confidence
    });

    it('should perform confident division', async () => {
      const program = parse(`
        distance = 120 ~> 0.85
        time = 4 ~> 0.9
        distance ~/ time
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('30');
      expect(result.toString()).toContain('85.0%'); // minimum confidence
    });

    it('should handle mixed confident and regular values', async () => {
      const program = parse(`
        confidentValue = 25 ~> 0.7
        regularValue = 15
        confidentValue ~+ regularValue
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('40');
      expect(result.toString()).toContain('70.0%');
    });

    it('should support chained arithmetic operations', async () => {
      const program = parse(`
        a = 10 ~> 0.9
        b = 5 ~> 0.8
        c = 2 ~> 0.7
        a ~+ b ~* c
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('20'); // 10 + (5 * 2)
      expect(result.toString()).toContain('70.0%'); // minimum confidence
    });
  });

  describe('Confident Comparison Operators (~==, ~!=, ~<, ~>=, ~<=)', () => {
    it('should perform confident equality with same values', async () => {
      const program = parse(`
        value1 = 42 ~> 0.9
        value2 = 42 ~> 0.8
        value1 ~== value2
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('true');
      expect(result.toString()).toContain('80.0%'); // minimum confidence
    });

    it('should perform confident equality with different values', async () => {
      const program = parse(`
        value1 = 42 ~> 0.9
        value2 = 24 ~> 0.8
        value1 ~== value2
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('false');
      expect(result.toString()).toContain('80.0%'); // minimum confidence
    });

    it('should perform confident not equal', async () => {
      const program = parse(`
        value1 = "hello" ~> 0.95
        value2 = "world" ~> 0.7
        value1 ~!= value2
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('true');
      expect(result.toString()).toContain('70.0%'); // minimum confidence
    });

    it('should perform confident less than', async () => {
      const program = parse(`
        temp1 = 25 ~> 0.8
        temp2 = 30 ~> 0.9
        temp1 ~< temp2
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('true');
      expect(result.toString()).toContain('80.0%'); // minimum confidence
    });

    it('should perform confident greater or equal', async () => {
      const program = parse(`
        score = 85 ~> 0.75
        threshold = 80 ~> 0.9
        score ~>= threshold
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('true');
      expect(result.toString()).toContain('75.0%'); // minimum confidence
    });

    it('should perform confident less or equal', async () => {
      const program = parse(`
        usage = 45 ~> 0.85
        limit = 50 ~> 0.8
        usage ~<= limit
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('true');
      expect(result.toString()).toContain('80.0%'); // minimum confidence
    });

    it('should handle mixed confident and regular values', async () => {
      const program = parse(`
        confidentValue = 100 ~> 0.7
        regularValue = 90
        confidentValue ~>= regularValue
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('true');
      expect(result.toString()).toContain('70.0%');
    });
  });

  describe('Threshold Gate Operator (~@>)', () => {
    it('should execute right operand when threshold is met', async () => {
      const program = parse(`
        highConfidence = "condition met" ~> 0.9
        action = "perform action" ~> 0.8
        highConfidence ~@> action
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('perform action');
      expect(result.toString()).toContain('80.0%');
    });

    it('should not execute right operand when threshold is not met', async () => {
      const program = parse(`
        lowConfidence = "uncertain condition" ~> 0.5
        action = "risky action" ~> 0.9
        lowConfidence ~@> action
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('uncertain condition');
      expect(result.toString()).toContain('25.0%'); // reduced confidence (0.5 * 0.5)
    });

    it('should handle regular values as full confidence', async () => {
      const program = parse(`
        certainCondition = "definitely true"
        action = "safe action" ~> 0.8
        certainCondition ~@> action
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('safe action');
      expect(result.toString()).toContain('80.0%');
    });

    it('should work with exactly threshold confidence', async () => {
      const program = parse(`
        exactThreshold = "borderline case" ~> 0.7
        action = "threshold action" ~> 0.6
        exactThreshold ~@> action
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('threshold action');
      expect(result.toString()).toContain('60.0%');
    });

    it('should support chained threshold gates', async () => {
      const program = parse(`
        condition1 = "first check" ~> 0.9
        condition2 = "second check" ~> 0.8
        finalAction = "execute" ~> 0.7
        condition1 ~@> condition2 ~@> finalAction
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('execute');
      expect(result.toString()).toContain('70.0%');
    });

    it('should handle AI model threshold patterns', async () => {
      const program = parse(`
        modelConfidence = "AI prediction" ~> 0.85
        humanReview = "needs review" ~> 0.6
        autoApprove = "auto approved" ~> 0.95
        modelConfidence ~@> autoApprove
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('auto approved');
      expect(result.toString()).toContain('95.0%');
    });
  });
});