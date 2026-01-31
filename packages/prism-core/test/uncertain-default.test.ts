import { parse, createRuntime } from '../src';
import { NumberValue, StringValue, ArrayValue } from '../src/runtime';

describe('Uncertain Default Branch', () => {
  describe('Uncertain If with Default', () => {
    it('should execute default branch when no confidence matches', async () => {
      const code = `
        // Only has high branch, but confidence is medium
        let result = ""
        uncertain if (true ~> 0.6) {
          high {
            result = "high"
          }
          default {
            result = "default"
          }
        }
        result
      `;
      
      const ast = parse(code);
      const runtime = createRuntime();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('string');
      expect(result.value).toBe('default');
    });

    it('should not execute default when a branch matches', async () => {
      const code = `
        let result = ""
        uncertain if (true ~> 0.8) {
          high {
            result = "high"
          }
          default {
            result = "default"
          }
        }
        result
      `;
      
      const ast = parse(code);
      const runtime = createRuntime();
      const result = await runtime.execute(ast);
      
      expect(result.value).toBe('high');
    });
  });

  describe('Uncertain While with Default', () => {
    it('should execute default branch for confidence recalibration', async () => {
      const code = `
        let confidence = 0.6  // Medium confidence
        let attempts = 0
        let results = []
        
        uncertain while attempts < 5 ~> confidence {
          high {
            results = [...results, "processed-high"]
            attempts = attempts + 1
          }
          low {
            results = [...results, "skipped-low"]
            attempts = attempts + 1
          }
          default {
            // Confidence is medium - try to improve it
            results = [...results, "recalibrating"]
            confidence = confidence + 0.2
            attempts = attempts + 1
          }
        }
        
        results
      `;
      
      const ast = parse(code);
      const runtime = createRuntime();
      const result = await runtime.execute(ast) as ArrayValue;
      
      expect(result.type).toBe('array');
      const values = result.value.map((v: StringValue) => v.value);
      
      // First iteration: confidence 0.6 (medium) -> default
      expect(values[0]).toBe('recalibrating');
      // Second iteration: confidence 0.8 (high) -> high branch
      expect(values[1]).toBe('processed-high');
      // Rest should be high branch
      expect(values.slice(2)).toEqual(['processed-high', 'processed-high', 'processed-high']);
    });

    it('should handle break in default branch', async () => {
      const code = `
        let iterations = 0
        uncertain while true ~> 0.55 {
          high {
            iterations = iterations + 100
          }
          low {
            iterations = iterations + 1
          }
          default {
            iterations = iterations + 10
            break
          }
        }
        iterations
      `;
      
      const ast = parse(code);
      const runtime = createRuntime();
      const result = await runtime.execute(ast);
      
      expect(result.value).toBe(10);
    });

    it('should handle continue in default branch', async () => {
      const code = `
        let results = []
        let i = 0
        let skipNext = true
        
        uncertain while i < 3 ~> 0.6 {
          high {
            results = [...results, "high-" + i]
            i = i + 1
          }
          default {
            if (skipNext) {
              skipNext = false
              i = i + 1
              continue
            }
            results = [...results, "default-" + i]
            i = i + 1
          }
        }
        results
      `;
      
      const ast = parse(code);
      const runtime = createRuntime();
      const result = await runtime.execute(ast) as ArrayValue;
      
      const values = result.value.map((v: StringValue) => v.value);
      expect(values).toEqual(['default-1', 'default-2']);
    });
  });

  describe('Uncertain For with Default', () => {
    it('should use default for adaptive threshold adjustment', async () => {
      const code = `
        let results = []
        let threshold = 0.7
        
        uncertain for let i = 0; i < 5; i = i + 1 {
          high {
            results = [...results, "high"]
          }
          low {
            results = [...results, "low"]
          }
          default {
            // Medium confidence - adjust threshold
            results = [...results, "adjusting"]
            threshold = threshold - 0.1
          }
        }
        
        results
      `;
      
      const ast = parse(code);
      const runtime = createRuntime();
      const result = await runtime.execute(ast) as ArrayValue;
      
      // All iterations should have high confidence (default 1.0 for non-confident conditions)
      // So they should all execute high branch
      const values = result.value.map((v: StringValue) => v.value);
      expect(values).toEqual(['high', 'high', 'high', 'high', 'high']);
    });

    it('should gather more data in default branch', async () => {
      const code = `
        let data = []
        let confidences = [0.3, 0.6, 0.4, 0.8, 0.2]
        let conf = 0
        
        for let j = 0; j < confidences.length; j = j + 1 {
          conf = confidences[j]
          uncertain for let i = 0; (i < 1) ~> conf; i = i + 1 {
            high {
              data = [...data, {action: "auto", conf: conf}]
            }
            low {
              data = [...data, {action: "skip", conf: conf}]
            }
            default {
              // Medium confidence - gather more info
              data = [...data, {action: "review", conf: conf}]
            }
          }
        }
        
        // Count actions
        let auto = 0
        let skip = 0 
        let review = 0
        for item in data {
          if (item.action == "auto") auto = auto + 1
          if (item.action == "skip") skip = skip + 1
          if (item.action == "review") review = review + 1
        }
        
        {auto: auto, skip: skip, review: review}
      `;
      
      const ast = parse(code);
      const runtime = createRuntime();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('object');
      expect((result as any).value.get('auto').value).toBe(1);  // 0.8
      expect((result as any).value.get('skip').value).toBe(3);  // 0.3, 0.4, 0.2
      expect((result as any).value.get('review').value).toBe(1); // 0.6
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty default branch', async () => {
      const code = `
        let count = 0
        let iterations = 0
        let maxIterations = 5
        
        uncertain while count < 3 ~> 0.6 {
          high {
            count = count + 10
          }
          low {
            count = count + 1
          }
          default {
            // Empty default - increment iterations for safety
            iterations = iterations + 1
            if (iterations >= maxIterations) {
              count = 999  // Signal we hit max iterations
              break
            }
          }
        }
        count
      `;
      
      const ast = parse(code);
      const runtime = createRuntime();
      const result = await runtime.execute(ast);
      
      // Default branch increments iterations and breaks after max
      expect(result.value).toBe(999);
    });

    it('should allow default as the only branch', async () => {
      const code = `
        let executions = 0
        uncertain while executions < 3 ~> 0.5 {
          default {
            executions = executions + 1
          }
        }
        executions
      `;
      
      const ast = parse(code);
      const runtime = createRuntime();
      const result = await runtime.execute(ast);
      
      expect(result.value).toBe(3);
    });

    it('should handle nested uncertain statements with defaults', async () => {
      const code = `
        let results = []
        
        uncertain if (true ~> 0.6) {
          high {
            results = [...results, "outer-high"]
          }
          default {
            uncertain if (true ~> 0.4) {
              high {
                results = [...results, "inner-high"]
              }
              default {
                results = [...results, "inner-default"]
              }
            }
            results = [...results, "outer-default"]
          }
        }
        
        results
      `;
      
      const ast = parse(code);
      const runtime = createRuntime();
      const result = await runtime.execute(ast) as ArrayValue;
      
      const values = result.value.map((v: StringValue) => v.value);
      expect(values).toEqual(['inner-default', 'outer-default']);
    });
  });
});
