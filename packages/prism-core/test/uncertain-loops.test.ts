import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { Runtime } from '../src/runtime';
import { NumberValue, StringValue, ArrayValue, ObjectValue } from '../src/runtime';

describe('Uncertain Loop Statements', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  const execute = async (code: string) => {
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens, code);
    const ast = parser.parse();
    return runtime.execute(ast);
  };

  describe('Uncertain For Loops', () => {
    it('should execute high branch for high confidence', async () => {
      const code = `
        results = []
        uncertain for i = 0; i < 3; i = i + 1 {
          high {
            results = [...results, "high"]
          }
          medium {
            results = [...results, "medium"]
          }
          low {
            results = [...results, "low"]
          }
        }
        results
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(ArrayValue);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(3);
      expect((array[0] as StringValue).value).toBe("high");
      expect((array[1] as StringValue).value).toBe("high");
      expect((array[2] as StringValue).value).toBe("high");
    });

    it('should handle confident condition values', async () => {
      const code = `
        results = []
        confidences = [0.9, 0.6, 0.3]
        
        // Test with changing confidence - we'll use separate iterations
        // since confidence is evaluated at condition time
        i = 0
        uncertain for j = 0; (j < 1) ~> 0.9; j = j + 1 {
          high {
            results = [...results, "high"]
          }
        }
        
        uncertain for j = 0; (j < 1) ~> 0.6; j = j + 1 {
          medium {
            results = [...results, "medium"]
          }
        }
        
        uncertain for j = 0; (j < 1) ~> 0.3; j = j + 1 {
          low {
            results = [...results, "low"]
          }
        }
        results
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(ArrayValue);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(3);
      expect((array[0] as StringValue).value).toBe("high"); // 0.9 confidence
      expect((array[1] as StringValue).value).toBe("medium"); // 0.6 confidence
      expect((array[2] as StringValue).value).toBe("low"); // 0.3 confidence
    });

    it('should handle break in uncertain for loop', async () => {
      const code = `
        count = 0
        uncertain for i = 0; i < 10; i = i + 1 {
          high {
            count = count + 1
            if (i == 2) break
          }
          low {
            break
          }
        }
        count
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(3); // 0, 1, 2
    });

    it('should handle continue in uncertain for loop', async () => {
      const code = `
        results = []
        uncertain for i = 0; i < 5; i = i + 1 {
          high {
            if (i == 2) continue
            results = [...results, i]
          }
        }
        results
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(ArrayValue);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(4); // Skip 2
      expect((array[0] as NumberValue).value).toBe(0);
      expect((array[1] as NumberValue).value).toBe(1);
      expect((array[2] as NumberValue).value).toBe(3);
      expect((array[3] as NumberValue).value).toBe(4);
    });
  });

  describe('Uncertain While Loops', () => {
    it('should execute based on confident condition', async () => {
      const code = `
        results = []
        confidence = 0.9
        i = 0
        uncertain while (i < 3) ~> confidence {
          high {
            results = [...results, "high-" + i]
            i = i + 1
          }
          medium {
            results = [...results, "medium-" + i]
            i = i + 1
          }
          low {
            results = [...results, "low-" + i]
            break
          }
        }
        results
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(ArrayValue);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(3);
      expect((array[0] as StringValue).value).toBe("high-0");
      expect((array[1] as StringValue).value).toBe("high-1");
      expect((array[2] as StringValue).value).toBe("high-2");
    });

    it('should handle changing confidence levels', async () => {
      const code = `
        results = []
        confidences = [0.9, 0.7, 0.4, 0.2]
        i = 0
        
        // Test each confidence level separately
        // High confidence (0.9)
        i = 0
        uncertain while (i < 1) ~> 0.9 {
          high {
            results = [...results, "high"]
            i = i + 1
          }
        }
        
        // Medium confidence (0.7)
        i = 0
        uncertain while (i < 1) ~> 0.7 {
          medium {
            results = [...results, "medium"]
            i = i + 1
          }
        }
        
        // Low confidence (0.4 and 0.2)
        uncertain while (i < 1) ~> 0.4 {
          low {
            results = [...results, "low"]
            i = i + 1
          }
        }
        
        i = 0
        uncertain while (i < 1) ~> 0.2 {
          low {
            results = [...results, "low"]
            i = i + 1
          }
        }
        results
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(ArrayValue);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(4);
      expect((array[0] as StringValue).value).toBe("high");   // 0.9
      expect((array[1] as StringValue).value).toBe("medium"); // 0.7
      expect((array[2] as StringValue).value).toBe("low");    // 0.4
      expect((array[3] as StringValue).value).toBe("low");    // 0.2
    });

    it('should handle break in uncertain while loop', async () => {
      const code = `
        count = 0
        confidence = 0.3
        uncertain while true ~> confidence {
          high {
            count = count + 1
          }
          low {
            count = count + 100
            break
          }
        }
        count
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(100);
    });

    it('should handle continue in uncertain while loop', async () => {
      const code = `
        results = []
        i = 0
        uncertain while (i < 5) ~> 0.9 {
          high {
            i = i + 1
            if (i == 3) continue
            results = [...results, i]
          }
        }
        results
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(ArrayValue);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(4);
      expect((array[0] as NumberValue).value).toBe(1);
      expect((array[1] as NumberValue).value).toBe(2);
      expect((array[2] as NumberValue).value).toBe(4); // Skip 3
      expect((array[3] as NumberValue).value).toBe(5);
    });
  });

  describe('Uncertain Loops with Dynamic Confidence', () => {
    it('should adapt behavior based on sensor confidence', async () => {
      const code = `
        // Simulate sensor readings with varying confidence
        readings = []
        sensorConfidences = [0.95, 0.85, 0.7, 0.4, 0.2]
        
        for i = 0; i < sensorConfidences.length; i = i + 1 {
          confidence = sensorConfidences[i]
          uncertain for j = 0; (j < 1) ~> confidence; j = j + 1 {
            high {
              // High confidence - automated processing
              readings = [...readings, {action: "auto", confidence: confidence}]
            }
            medium {
              // Medium confidence - human review
              readings = [...readings, {action: "review", confidence: confidence}]
            }
            low {
              // Low confidence - skip or alert
              readings = [...readings, {action: "alert", confidence: confidence}]
            }
          }
        }
        
        // Count actions
        autoCount = 0
        reviewCount = 0
        alertCount = 0
        
        for reading in readings {
          if (reading.action == "auto") autoCount = autoCount + 1
          if (reading.action == "review") reviewCount = reviewCount + 1
          if (reading.action == "alert") alertCount = alertCount + 1
        }
        
        result = {auto: autoCount, review: reviewCount, alert: alertCount}
        result
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(ObjectValue);
      const obj = result as ObjectValue;
      
      // High: 0.95, 0.85, 0.7 (3) - threshold is 0.7
      // Medium: none (0) - would need 0.5 <= x < 0.7
      // Low: 0.4, 0.2 (2)
      expect((obj.value.get("auto") as NumberValue).value).toBe(3);
      expect((obj.value.get("review") as NumberValue).value).toBe(0);
      expect((obj.value.get("alert") as NumberValue).value).toBe(2);
    });

    it('should handle nested uncertain loops', async () => {
      const code = `
        results = []
        
        uncertain for i = 0; i < 2; i = i + 1 {
          high {
            uncertain for j = 0; j < 2; j = j + 1 {
              high {
                results = [...results, "HH"]
              }
              low {
                results = [...results, "HL"]
              }
            }
          }
          low {
            results = [...results, "L"]
          }
        }
        
        results
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(ArrayValue);
      const array = (result as ArrayValue).value;
      expect(array.length).toBe(4);
      // Both outer iterations are high confidence, each with 2 inner high confidence iterations
      expect((array[0] as StringValue).value).toBe("HH");
      expect((array[1] as StringValue).value).toBe("HH");
      expect((array[2] as StringValue).value).toBe("HH");
      expect((array[3] as StringValue).value).toBe("HH");
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing branches gracefully', async () => {
      const code = `
        count = 0
        uncertain for i = 0; i < 3; i = i + 1 {
          high {
            count = count + 1
          }
          // No medium or low branches
        }
        count
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(3);
    });

    it('should handle empty branches', async () => {
      const code = `
        uncertain while true ~> 0.5 {
          high {
            // Empty high branch
          }
          medium {
            break
          }
          low {
            // Empty low branch
          }
        }
        42
      `;
      const result = await execute(code);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBe(42);
    });
  });
});