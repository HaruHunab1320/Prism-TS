import { createRuntime } from './runtime';
import { parse } from './parser';

describe('Threshold Gate Operator ~?>', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Basic threshold gate', () => {
    it('should continue pipeline when confidence meets threshold', async () => {
      const program = parse(`
        double = x => x * 2
        value = 10 ~> 0.9
        result = value ~?> 0.8 ~|> double(_)
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('20'); // Value doubled
      expect(result.toString()).toContain('90.0%'); // Confidence preserved
    });

    it('should return undefined when confidence below threshold', async () => {
      const program = parse(`
        double = x => x * 2
        value = 10 ~> 0.5
        result = value ~?> 0.8
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toBe('undefined');
    });

    it('should work with exact threshold match', async () => {
      const program = parse(`
        value = 42 ~> 0.7
        result = value ~?> 0.7
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('42');
      expect(result.toString()).toContain('70.0%');
    });

    it('should work with non-confident values (confidence = 1.0)', async () => {
      const program = parse(`
        value = 100
        result = value ~?> 0.5
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('100');
      expect(result.toString()).toContain('100.0%');
    });
  });

  describe('Threshold gate with default value', () => {
    it('should return default value when below threshold', async () => {
      const program = parse(`
        value = 10 ~> 0.3
        result = value ~?> [0.5, "low_confidence"]
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("low_confidence");
    });

    it('should continue with value when above threshold with array syntax', async () => {
      const program = parse(`
        value = 10 ~> 0.8
        result = value ~?> [0.5, "low_confidence"]
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('10');
      expect(result.toString()).toContain('80.0%');
    });

    it('should handle complex default values', async () => {
      const program = parse(`
        value = 10 ~> 0.3
        defaultObj = {status: "uncertain", fallback: true}
        result = value ~?> [0.7, defaultObj]
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('status');
      expect(result.toString()).toContain('uncertain');
    });
  });

  describe('Chaining with pipeline operators', () => {
    it('should chain multiple threshold gates', async () => {
      const program = parse(`
        process1 = x => x * 2
        process2 = x => x + 10
        
        value = 5 ~> 0.9
        result = value 
          ~?> 0.5           // Passes (0.9 >= 0.5)
          ~|> process1(_)   // 10
          ~?> 0.8           // Passes (0.9 >= 0.8)
          ~|> process2(_)   // 20
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('20'); // (5 * 2) + 10
      expect(result.toString()).toContain('90.0%');
    });

    it('should stop pipeline at failed threshold', async () => {
      const program = parse(`
        process1 = x => x * 2
        process2 = x => x + 10
        
        value = 5 ~> 0.6
        temp = value 
          ~?> 0.5           // Passes
          ~|> process1(_)   // 10
          ~?> 0.8           // Fails, returns undefined
        
        // Check if threshold failed before continuing
        result = temp || "stopped"
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("stopped");
    });

    it('should use default and continue pipeline', async () => {
      const program = parse(`
        enhance = x => x + " enhanced"
        
        value = "data" ~> 0.4
        result = value 
          ~?> [0.7, "fallback"]  // Below threshold, use fallback
          |> enhance(_)          // Regular pipeline continues with fallback
        result
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("fallback enhanced");
    });
  });

  describe('Integration with confidence operations', () => {
    it('should work with confidence modification mid-pipeline', async () => {
      const program = parse(`
        value = 100 ~> 0.8
        result = value
          ~?> 0.7                    // Passes
          ~|> (_ * 2) ~> 0.9        // Modify confidence
          ~?> 0.85                   // Passes with new confidence
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('200');
      expect(result.toString()).toContain('90.0%');
    });

    it('should work with parallel confidence operator', async () => {
      const program = parse(`
        option1 = 10 ~> 0.4
        option2 = 20 ~> 0.8
        
        result = (option1 ~||> option2) ~?> 0.7
        result
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain('20'); // Higher confidence option
      expect(result.toString()).toContain('80.0%');
    });
  });

  describe('Error handling', () => {
    it('should error on invalid threshold value', async () => {
      const program = parse(`
        value = 10 ~> 0.5
        result = value ~?> 1.5
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Confidence threshold must be between 0 and 1');
    });

    it('should error on negative threshold', async () => {
      const program = parse(`
        value = 10 ~> 0.5
        result = value ~?> -0.1
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Confidence threshold must be between 0 and 1');
    });

    it('should error on non-numeric threshold', async () => {
      const program = parse(`
        value = 10 ~> 0.5
        result = value ~?> "high"
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Threshold gate expects a number or [threshold, default] array');
    });

    it('should error on invalid array format', async () => {
      const program = parse(`
        value = 10 ~> 0.5
        result = value ~?> ["high", "default"]
      `);
      await expect(runtime.execute(program)).rejects.toThrow('Threshold gate array first element must be a number');
    });
  });

  describe('Real-world use cases', () => {
    it('should implement quality gate for AI responses', async () => {
      const program = parse(`
        // Simulate AI response with varying confidence
        aiResponse = "Generated content" ~> 0.85
        
        // Quality gate pipeline
        finalResponse = aiResponse
          ~?> [0.9, "Please try again - low confidence"]  // High quality gate
        
        finalResponse
      `);
      const result = await runtime.execute(program);
      expect(result.value).toBe("Please try again - low confidence");
    });

    it('should implement adaptive processing based on confidence', async () => {
      const program = parse(`
        simpleProcess = x => "Simple: " + x
        complexProcess = x => "Complex: " + x
        
        data = "sensor reading" ~> 0.75
        
        // Try complex processing first, fall back to simple if not confident enough
        result = data
          ~?> [0.8, data]        // If < 80%, keep original
          ~|> complexProcess(_)  // Only runs if >= 80%
        
        // Always run simple process as fallback
        finalResult = result ~?> [0.8, data |> simpleProcess(_)]
        finalResult
      `);
      const result = await runtime.execute(program);
      expect(result.toString()).toContain("Simple: sensor reading");
    });

    it('should implement progressive enhancement pipeline', async () => {
      const program = parse(`
        basicAnalysis = x => {result: x, level: "basic"}
        advancedAnalysis = data => {result: data.result * 2, level: "advanced"}
        expertAnalysis = data => {result: data.result * 3, level: "expert"}
        
        measurement = 100 ~> 0.95
        
        analysis = measurement
          ~|> basicAnalysis(_)     // Always run basic
          ~?> 0.7                   // Continue if confident
          ~|> advancedAnalysis(_)   // Enhance with advanced
          ~?> 0.9                   // Continue if very confident
          ~|> expertAnalysis(_)     // Final enhancement
        
        analysis
      `);
      const result = await runtime.execute(program);
      // Should reach expert level with 95% confidence
      expect(result.toString()).toContain('result');
      expect(result.toString()).toContain('600'); // 100 * 2 * 3
      expect(result.toString()).toContain('expert');
    });
  });
});