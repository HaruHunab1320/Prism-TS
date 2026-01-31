import { parse } from '../src/parser';
import { Runtime } from '../src/runtime';

describe('Parameterized Primitives', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  describe('confidence() parameterized function', () => {
    it('should create confidence-wrapped functions', async () => {
      const program = parse(`
        let confidenceWrapper = confidence(0.8)
        let doubler = x => x * 2
        let confidentDoubler = confidenceWrapper(doubler)
        let result = confidentDoubler(5)
      `);
      
      await runtime.execute(program);
      
      const result = runtime.getVariable('result');
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe(10);
      expect((result as any).confidence.value).toBeCloseTo(0.8);
    });

    it('should validate threshold range', async () => {
      const program = parse(`
        let invalid = confidence(1.5)
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('confidence() threshold must be between 0 and 1');
    });

    it('should require numeric threshold', async () => {
      const program = parse(`
        let invalid = confidence("high")
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('confidence() threshold must be a number');
    });

    it('should work with existing confident values', async () => {
      const program = parse(`
        let confidenceWrapper = confidence(0.9)
        let processor = x => {
          return x + 10
        }
        let confidentProcessor = confidenceWrapper(processor)
        let input = 5 ~> 0.7
        let result = confidentProcessor(input)
      `);
      
      await runtime.execute(program);
      
      const result = runtime.getVariable('result');
      expect(result.type).toBe('confident');
      expect((result as any).value.value.value).toBe(15);
      expect((result as any).confidence.value).toBeCloseTo(0.9);
    });
  });

  describe('threshold() parameterized filter', () => {
    it('should filter array by confidence threshold', async () => {
      const program = parse(`
        let highConfidenceFilter = threshold(0.8)
        let data = [
          10 ~> 0.9,
          20 ~> 0.7,
          30 ~> 0.85,
          40 ~> 0.6
        ]
        let filtered = highConfidenceFilter(data)
      `);
      
      await runtime.execute(program);
      
      const filtered = runtime.getVariable('filtered').value as any[];
      expect(filtered).toHaveLength(2);
      expect(filtered[0].value.value).toBe(10);
      expect(filtered[1].value.value).toBe(30);
    });

    it('should pass through non-confident values', async () => {
      const program = parse(`
        let filter = threshold(0.8)
        let data = [
          10 ~> 0.9,
          20,  // No confidence
          30 ~> 0.7
        ]
        let filtered = filter(data)
      `);
      
      await runtime.execute(program);
      
      const filtered = runtime.getVariable('filtered').value as any[];
      expect(filtered).toHaveLength(2);
      expect(filtered[0].value.value).toBe(10);
      expect(filtered[1].value).toBe(20);
    });

    it('should require numeric threshold', async () => {
      const program = parse(`
        let invalid = threshold("high")
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('threshold() requires a number');
    });
  });

  describe('sortBy() parameterized sorting', () => {
    it('should sort objects by property ascending', async () => {
      const program = parse(`
        let scoreSorter = sortBy("score")
        let users = [
          {name: "Alice", score: 85},
          {name: "Bob", score: 92},
          {name: "Carol", score: 78}
        ]
        let sorted = scoreSorter(users)
      `);
      
      await runtime.execute(program);
      
      const sorted = runtime.getVariable('sorted');
      expect(sorted.type).toBe('confident');
      
      const array = (sorted as any).value.value as any[];
      expect(array).toHaveLength(3);
      expect(array[0].properties.get('name').value).toBe('Carol');
      expect(array[1].properties.get('name').value).toBe('Alice');
      expect(array[2].properties.get('name').value).toBe('Bob');
    });

    it('should sort objects by property descending', async () => {
      const program = parse(`
        let scoreSorter = sortBy("score", "desc")
        let users = [
          {name: "Alice", score: 85},
          {name: "Bob", score: 92},
          {name: "Carol", score: 78}
        ]
        let sorted = scoreSorter(users)
      `);
      
      await runtime.execute(program);
      
      const sorted = runtime.getVariable('sorted');
      const array = (sorted as any).value.value as any[];
      expect(array[0].properties.get('name').value).toBe('Bob');
      expect(array[1].properties.get('name').value).toBe('Alice');
      expect(array[2].properties.get('name').value).toBe('Carol');
    });

    it('should sort strings alphabetically', async () => {
      const program = parse(`
        let nameSorter = sortBy("name")
        let users = [
          {name: "Charlie"},
          {name: "Alice"},
          {name: "Bob"}
        ]
        let sorted = nameSorter(users)
      `);
      
      await runtime.execute(program);
      
      const sorted = runtime.getVariable('sorted');
      const array = (sorted as any).value.value as any[];
      expect(array[0].properties.get('name').value).toBe('Alice');
      expect(array[1].properties.get('name').value).toBe('Bob');
      expect(array[2].properties.get('name').value).toBe('Charlie');
    });

    it('should work with confident values', async () => {
      const program = parse(`
        let scoreSorter = sortBy("score")
        let users = [
          {name: "Alice", score: 85 ~> 0.9},
          {name: "Bob", score: 92 ~> 0.8},
          {name: "Carol", score: 78 ~> 0.95}
        ]
        let sorted = scoreSorter(users)
      `);
      
      await runtime.execute(program);
      
      const sorted = runtime.getVariable('sorted');
      const array = (sorted as any).value.value as any[];
      expect(array[0].properties.get('name').value).toBe('Carol');
      expect(array[1].properties.get('name').value).toBe('Alice');
      expect(array[2].properties.get('name').value).toBe('Bob');
    });

    it('should require string key', async () => {
      const program = parse(`
        let invalid = sortBy(123)
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('sortBy() key must be a string');
    });
  });

  describe('groupBy() parameterized grouping', () => {
    it('should group by property key', async () => {
      const program = parse(`
        let categoryGrouper = groupBy("category")
        let items = [
          {name: "Apple", category: "fruit"},
          {name: "Carrot", category: "vegetable"},
          {name: "Banana", category: "fruit"},
          {name: "Broccoli", category: "vegetable"}
        ]
        let grouped = categoryGrouper(items)
      `);
      
      await runtime.execute(program);
      
      const groupedVar = runtime.getVariable('grouped');
      expect(groupedVar).toBeDefined();
      expect(groupedVar.type).toBe('object');
      
      const grouped = groupedVar as any;
      expect(grouped.properties).toBeDefined();
      expect(grouped.properties.has('fruit')).toBe(true);
      expect(grouped.properties.has('vegetable')).toBe(true);
      
      const fruits = grouped.properties.get('fruit').elements;
      const vegetables = grouped.properties.get('vegetable').elements;
      expect(fruits).toHaveLength(2);
      expect(vegetables).toHaveLength(2);
    });

    it('should group by function result', async () => {
      const program = parse(`
        let lengthGrouper = groupBy(x => x.length)
        let words = ["cat", "dog", "elephant", "bee"]
        let grouped = lengthGrouper(words)
      `);
      
      await runtime.execute(program);
      
      const groupedVar = runtime.getVariable('grouped');
      expect(groupedVar).toBeDefined();
      expect(groupedVar.type).toBe('object');
      
      const grouped = groupedVar as any;
      expect(grouped.properties.has('3')).toBe(true);
      expect(grouped.properties.has('8')).toBe(true);
      
      const threeLetters = grouped.properties.get('3').elements;
      const eightLetters = grouped.properties.get('8').elements;
      expect(threeLetters).toHaveLength(3); // cat, dog, bee
      expect(eightLetters).toHaveLength(1); // elephant
    });

    it('should handle objects without the property', async () => {
      const program = parse(`
        let statusGrouper = groupBy("status")
        let items = [
          {name: "Alice", status: "active"},
          {name: "Bob"},  // No status property
          {name: "Carol", status: "inactive"}
        ]
        let grouped = statusGrouper(items)
      `);
      
      await runtime.execute(program);
      
      const groupedVar = runtime.getVariable('grouped');
      expect(groupedVar).toBeDefined();
      expect(groupedVar.type).toBe('object');
      
      const grouped = groupedVar as any;
      expect(grouped.properties.has('active')).toBe(true);
      expect(grouped.properties.has('inactive')).toBe(true);
      expect(grouped.properties.has('null')).toBe(true);
      
      const null_group = grouped.properties.get('null').elements;
      expect(null_group).toHaveLength(1);
    });
  });

  describe('debounce() parameterized timing', () => {
    it('should create debounced functions', async () => {
      const program = parse(`
        let debouncer = debounce(100)
        let counter = 0
        let increment = () => {
          counter = counter + 1
          return counter
        }
        let debouncedIncrement = debouncer(increment)
      `);
      
      await runtime.execute(program);
      
      // The debounced function should be created successfully
      const debouncedFn = runtime.getVariable('debouncedIncrement');
      expect(debouncedFn.type).toBe('function');
    });

    it('should require numeric delay', async () => {
      const program = parse(`
        let invalid = debounce("fast")
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('debounce() delay must be a number');
    });

    it('should require function argument', async () => {
      const program = parse(`
        let debouncer = debounce(100)
        let invalid = debouncer("not a function")
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('debounce creator requires a function argument');
    });
  });

  describe('Complex usage scenarios', () => {
    it('should chain parameterized functions', async () => {
      const program = parse(`
        // Create parameterized functions
        let highConfidenceFilter = threshold(0.8)
        let scoreSorter = sortBy("score", "desc")
        let confidenceWrapper = confidence(0.95)
        
        // Process data through chain
        let users = [
          {name: "Alice", score: 85 ~> 0.9},
          {name: "Bob", score: 92 ~> 0.7},    // Will be filtered out
          {name: "Carol", score: 78 ~> 0.85}
        ]
        
        let filtered = highConfidenceFilter(users)
        let sorted = scoreSorter(filtered)
      `);
      
      await runtime.execute(program);
      
      const filtered = runtime.getVariable('filtered').value as any[];
      expect(filtered).toHaveLength(2); // Bob filtered out due to low confidence
      
      const sorted = runtime.getVariable('sorted');
      const array = (sorted as any).value.value as any[];
      expect(array[0].properties.get('name').value).toBe('Alice'); // Higher score
      expect(array[1].properties.get('name').value).toBe('Carol');
    });

    it('should work with array pipeline operations', async () => {
      const program = parse(`
        let scoreFilter = threshold(0.8)
        let nameSorter = sortBy("name")
        
        let users = [
          {name: "Charlie", score: 85 ~> 0.9},
          {name: "Alice", score: 75 ~> 0.7},
          {name: "Bob", score: 92 ~> 0.85}
        ]
        
        let result = users
          |> scoreFilter(_)
          |> nameSorter(_)
      `);
      
      await runtime.execute(program);
      
      const result = runtime.getVariable('result');
      const array = (result as any).value.value as any[];
      expect(array).toHaveLength(2); // Alice filtered out
      expect(array[0].properties.get('name').value).toBe('Bob');
      expect(array[1].properties.get('name').value).toBe('Charlie');
    });

    it('should work with lambda functions', async () => {
      const program = parse(`
        // Create custom processors
        let confidenceProcessor = confidence(0.8)
        
        let multiplier = confidenceProcessor(x => x * 3)
        let adder = confidenceProcessor(x => x + 10)
        
        // Use in array processing
        let numbers = [1, 2, 3, 4, 5]
        let multiplied = numbers.map(multiplier)
        let processed = multiplied.map(adder)
      `);
      
      await runtime.execute(program);
      
      const processed = runtime.getVariable('processed').value as any[];
      expect(processed).toHaveLength(5);
      expect(processed[0].type).toBe('confident');
      expect(processed[0].value.value.value).toBe(13); // (1 * 3) + 10
      expect(processed[0].confidence.value).toBeCloseTo(0.8);
    });

    it('should handle nested parameterization', async () => {
      const program = parse(`
        // Create factory for confidence wrappers
        let createConfidenceWrapper = threshold => {
          return confidence(threshold)
        }
        
        let highConfidence = createConfidenceWrapper(0.9)
        let mediumConfidence = createConfidenceWrapper(0.7)
        
        let processor = x => x * 2
        
        let highConfidentProcessor = highConfidence(processor)
        let mediumConfidentProcessor = mediumConfidence(processor)
        
        let result1 = highConfidentProcessor(10)
        let result2 = mediumConfidentProcessor(10)
      `);
      
      await runtime.execute(program);
      
      const result1 = runtime.getVariable('result1');
      const result2 = runtime.getVariable('result2');
      
      expect(result1.type).toBe('confident');
      expect((result1 as any).confidence.value).toBeCloseTo(0.9);
      expect(result2.type).toBe('confident');
      expect((result2 as any).confidence.value).toBeCloseTo(0.7);
    });
  });

  describe('Error handling', () => {
    it('should validate argument counts', async () => {
      const program = parse(`
        let invalid1 = confidence()
        let invalid2 = threshold(0.8, "extra")
        let invalid3 = sortBy()
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow();
    });

    it('should validate argument types', async () => {
      const programs = [
        `let sorter = sortBy(123)`,  // Non-string key
        `let filter = threshold("high")`,  // Non-numeric threshold
        `let debouncer = debounce("fast")`  // Non-numeric delay
      ];
      
      for (const code of programs) {
        const program = parse(code);
        await expect(runtime.execute(program)).rejects.toThrow();
      }
    });

    it('should handle missing properties in sortBy', async () => {
      const program = parse(`
        let sorter = sortBy("missing")
        let data = [{name: "Alice"}, {name: "Bob", missing: "value"}]  // One has missing property, one doesn't
        let result = sorter(data)
      `);
      
      await runtime.execute(program);
      
      const result = runtime.getVariable('result');
      expect(result.type).toBe('confident');
      expect(result.value.elements).toHaveLength(2);
      // Should sort with null treated as lower value
    });
  });
});
