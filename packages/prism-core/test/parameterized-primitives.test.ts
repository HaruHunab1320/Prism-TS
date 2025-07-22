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
        confidenceWrapper = confidence(0.8)
        doubler = x => x * 2
        confidentDoubler = confidenceWrapper(doubler)
        result = confidentDoubler(5)
      `);
      
      await runtime.execute(program);
      
      const result = runtime.getVariable('result');
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe(10);
      expect((result as any).confidence.value).toBeCloseTo(0.8);
    });

    it('should validate threshold range', async () => {
      const program = parse(`
        invalid = confidence(1.5)
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('confidence() threshold must be between 0 and 1');
    });

    it('should require numeric threshold', async () => {
      const program = parse(`
        invalid = confidence("high")
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('confidence() threshold must be a number');
    });

    it('should work with existing confident values', async () => {
      const program = parse(`
        confidenceWrapper = confidence(0.9)
        processor = x => {
          return x + 10
        }
        confidentProcessor = confidenceWrapper(processor)
        input = 5 ~> 0.7
        result = confidentProcessor(input)
      `);
      
      await runtime.execute(program);
      
      const result = runtime.getVariable('result');
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe(15);
      expect((result as any).confidence.value).toBeCloseTo(0.9);
    });
  });

  describe('threshold() parameterized filter', () => {
    it('should filter array by confidence threshold', async () => {
      const program = parse(`
        highConfidenceFilter = threshold(0.8)
        data = [
          10 ~> 0.9,
          20 ~> 0.7,
          30 ~> 0.85,
          40 ~> 0.6
        ]
        filtered = highConfidenceFilter(data)
      `);
      
      await runtime.execute(program);
      
      const filtered = runtime.getVariable('filtered').value as any[];
      expect(filtered).toHaveLength(2);
      expect(filtered[0].value.value).toBe(10);
      expect(filtered[1].value.value).toBe(30);
    });

    it('should pass through non-confident values', async () => {
      const program = parse(`
        filter = threshold(0.8)
        data = [
          10 ~> 0.9,
          20,  // No confidence
          30 ~> 0.7
        ]
        filtered = filter(data)
      `);
      
      await runtime.execute(program);
      
      const filtered = runtime.getVariable('filtered').value as any[];
      expect(filtered).toHaveLength(2);
      expect(filtered[0].value.value).toBe(10);
      expect(filtered[1].value).toBe(20);
    });

    it('should require numeric threshold', async () => {
      const program = parse(`
        invalid = threshold("high")
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('threshold() requires a number');
    });
  });

  describe('sortBy() parameterized sorting', () => {
    it('should sort objects by property ascending', async () => {
      const program = parse(`
        scoreSorter = sortBy("score")
        users = [
          {name: "Alice", score: 85},
          {name: "Bob", score: 92},
          {name: "Carol", score: 78}
        ]
        sorted = scoreSorter(users)
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
        scoreSorter = sortBy("score", "desc")
        users = [
          {name: "Alice", score: 85},
          {name: "Bob", score: 92},
          {name: "Carol", score: 78}
        ]
        sorted = scoreSorter(users)
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
        nameSorter = sortBy("name")
        users = [
          {name: "Charlie"},
          {name: "Alice"},
          {name: "Bob"}
        ]
        sorted = nameSorter(users)
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
        scoreSorter = sortBy("score")
        users = [
          {name: "Alice", score: 85 ~> 0.9},
          {name: "Bob", score: 92 ~> 0.8},
          {name: "Carol", score: 78 ~> 0.95}
        ]
        sorted = scoreSorter(users)
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
        invalid = sortBy(123)
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('sortBy() key must be a string');
    });
  });

  describe('groupBy() parameterized grouping', () => {
    it('should group by property key', async () => {
      const program = parse(`
        categoryGrouper = groupBy("category")
        items = [
          {name: "Apple", category: "fruit"},
          {name: "Carrot", category: "vegetable"},
          {name: "Banana", category: "fruit"},
          {name: "Broccoli", category: "vegetable"}
        ]
        grouped = categoryGrouper(items)
      `);
      
      await runtime.execute(program);
      
      const grouped = runtime.getVariable('grouped').value as any;
      expect(grouped.properties.has('fruit')).toBe(true);
      expect(grouped.properties.has('vegetable')).toBe(true);
      
      const fruits = grouped.properties.get('fruit').elements;
      const vegetables = grouped.properties.get('vegetable').elements;
      expect(fruits).toHaveLength(2);
      expect(vegetables).toHaveLength(2);
    });

    it('should group by function result', async () => {
      const program = parse(`
        lengthGrouper = groupBy(x => x.length)
        words = ["cat", "dog", "elephant", "bee"]
        grouped = lengthGrouper(words)
      `);
      
      await runtime.execute(program);
      
      const grouped = runtime.getVariable('grouped').value as any;
      expect(grouped.properties.has('3')).toBe(true);
      expect(grouped.properties.has('8')).toBe(true);
      
      const threeLetters = grouped.properties.get('3').elements;
      const eightLetters = grouped.properties.get('8').elements;
      expect(threeLetters).toHaveLength(3); // cat, dog, bee
      expect(eightLetters).toHaveLength(1); // elephant
    });

    it('should handle objects without the property', async () => {
      const program = parse(`
        statusGrouper = groupBy("status")
        items = [
          {name: "Alice", status: "active"},
          {name: "Bob"},  // No status property
          {name: "Carol", status: "inactive"}
        ]
        grouped = statusGrouper(items)
      `);
      
      await runtime.execute(program);
      
      const grouped = runtime.getVariable('grouped').value as any;
      expect(grouped.properties.has('active')).toBe(true);
      expect(grouped.properties.has('inactive')).toBe(true);
      expect(grouped.properties.has('undefined')).toBe(true);
      
      const undefined_group = grouped.properties.get('undefined').elements;
      expect(undefined_group).toHaveLength(1);
    });
  });

  describe('debounce() parameterized timing', () => {
    it('should create debounced functions', async () => {
      const program = parse(`
        debouncer = debounce(100)
        counter = 0
        increment = () => {
          counter = counter + 1
          return counter
        }
        debouncedIncrement = debouncer(increment)
      `);
      
      await runtime.execute(program);
      
      // The debounced function should be created successfully
      const debouncedFn = runtime.getVariable('debouncedIncrement');
      expect(debouncedFn.type).toBe('function');
    });

    it('should require numeric delay', async () => {
      const program = parse(`
        invalid = debounce("fast")
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('debounce() delay must be a number');
    });

    it('should require function argument', async () => {
      const program = parse(`
        debouncer = debounce(100)
        invalid = debouncer("not a function")
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('debounce creator requires a function argument');
    });
  });

  describe('Complex usage scenarios', () => {
    it('should chain parameterized functions', async () => {
      const program = parse(`
        // Create parameterized functions
        highConfidenceFilter = threshold(0.8)
        scoreSorter = sortBy("score", "desc")
        confidenceWrapper = confidence(0.95)
        
        // Process data through chain
        users = [
          {name: "Alice", score: 85 ~> 0.9},
          {name: "Bob", score: 92 ~> 0.7},    // Will be filtered out
          {name: "Carol", score: 78 ~> 0.85}
        ]
        
        filtered = highConfidenceFilter(users)
        sorted = scoreSorter(filtered)
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
        scoreFilter = threshold(0.8)
        nameSorter = sortBy("name")
        
        users = [
          {name: "Charlie", score: 85 ~> 0.9},
          {name: "Alice", score: 75 ~> 0.7},
          {name: "Bob", score: 92 ~> 0.85}
        ]
        
        result = users
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
        confidenceProcessor = confidence(0.8)
        
        multiplier = confidenceProcessor(x => x * 3)
        adder = confidenceProcessor(x => x + 10)
        
        // Use in array processing
        numbers = [1, 2, 3, 4, 5]
        multiplied = numbers.map(multiplier)
        processed = multiplied.map(adder)
      `);
      
      await runtime.execute(program);
      
      const processed = runtime.getVariable('processed').value as any[];
      expect(processed).toHaveLength(5);
      expect(processed[0].type).toBe('confident');
      expect(processed[0].value.value).toBe(13); // (1 * 3) + 10
      expect(processed[0].confidence.value).toBeCloseTo(0.8);
    });

    it('should handle nested parameterization', async () => {
      const program = parse(`
        // Create factory for confidence wrappers
        createConfidenceWrapper = threshold => {
          return confidence(threshold)
        }
        
        highConfidence = createConfidenceWrapper(0.9)
        mediumConfidence = createConfidenceWrapper(0.7)
        
        processor = x => x * 2
        
        highConfidentProcessor = highConfidence(processor)
        mediumConfidentProcessor = mediumConfidence(processor)
        
        result1 = highConfidentProcessor(10)
        result2 = mediumConfidentProcessor(10)
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
        invalid1 = confidence()
        invalid2 = threshold(0.8, "extra")
        invalid3 = sortBy()
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow();
    });

    it('should validate argument types', async () => {
      const programs = [
        `sorter = sortBy(123)`,  // Non-string key
        `filter = threshold("high")`,  // Non-numeric threshold
        `debouncer = debounce("fast")`  // Non-numeric delay
      ];
      
      for (const code of programs) {
        const program = parse(code);
        await expect(runtime.execute(program)).rejects.toThrow();
      }
    });

    it('should handle missing properties in sortBy', async () => {
      const program = parse(`
        sorter = sortBy("missing")
        data = [{name: "Alice"}]  // No "missing" property
        result = sorter(data)
      `);
      
      await expect(runtime.execute(program)).rejects.toThrow('property \'missing\' not found');
    });
  });
});