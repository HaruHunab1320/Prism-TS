import { parse } from '../src/parser';
import { Runtime } from '../src/runtime';

describe('Print and Console Functions', () => {
  let runtime: Runtime;
  let originalConsole: any;
  let mockConsole: any;

  beforeEach(() => {
    runtime = new Runtime();
    
    // Mock console functions to capture output
    originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };
    
    mockConsole = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
    
    console.log = mockConsole.log;
    console.warn = mockConsole.warn;
    console.error = mockConsole.error;
    console.debug = mockConsole.debug;
  });

  afterEach(() => {
    // Restore original console functions
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
  });

  describe('print() function', () => {
    it('should print simple values', async () => {
      const program = parse(`
        print("Hello World")
        print(42)
        print(true)
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.log).toHaveBeenCalledTimes(3);
      expect(mockConsole.log).toHaveBeenNthCalledWith(1, 'Hello World');
      expect(mockConsole.log).toHaveBeenNthCalledWith(2, '42');
      expect(mockConsole.log).toHaveBeenNthCalledWith(3, 'true');
    });

    it('should print multiple arguments separated by spaces', async () => {
      const program = parse(`
        print("Answer:", 42, "is", true)
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.log).toHaveBeenCalledWith('Answer: 42 is true');
    });

    it('should print confidence values with confidence level', async () => {
      const program = parse(`
        confident = 100 ~> 0.85
        print("Confident value:", confident)
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.log).toHaveBeenCalledWith('Confident value: 100 ~> 0.85');
    });

    it('should print arrays and objects', async () => {
      const program = parse(`
        arr = [1, 2, 3]
        obj = {name: "Alice", age: 30}
        print("Array:", arr)
        print("Object:", obj)
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.log).toHaveBeenCalledTimes(2);
      expect(mockConsole.log).toHaveBeenNthCalledWith(1, expect.stringContaining('Array:'));
      expect(mockConsole.log).toHaveBeenNthCalledWith(2, expect.stringContaining('Object:'));
    });

    it('should return undefined', async () => {
      const program = parse(`
        result = print("test")
      `);
      
      await runtime.execute(program);
      
      const result = runtime.getVariable('result');
      expect(result.type).toBe('undefined');
    });
  });

  describe('console.log() function', () => {
    it('should log simple values', async () => {
      const program = parse(`
        console.log("Logging test")
        console.log(123)
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.log).toHaveBeenCalledTimes(2);
      expect(mockConsole.log).toHaveBeenNthCalledWith(1, 'Logging test');
      expect(mockConsole.log).toHaveBeenNthCalledWith(2, '123');
    });

    it('should log confidence values', async () => {
      const program = parse(`
        value = 50 ~> 0.9
        console.log("High confidence:", value)
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.log).toHaveBeenCalledWith('High confidence: 50 ~> 0.90');
    });

    it('should log multiple arguments', async () => {
      const program = parse(`
        console.log("Multiple", "arguments", 42, true)
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.log).toHaveBeenCalledWith('Multiple arguments 42 true');
    });
  });

  describe('console.warn() function', () => {
    it('should warn with values', async () => {
      const program = parse(`
        console.warn("Warning message")
        console.warn("Low confidence:", 30 ~> 0.3)
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.warn).toHaveBeenCalledTimes(2);
      expect(mockConsole.warn).toHaveBeenNthCalledWith(1, 'Warning message');
      expect(mockConsole.warn).toHaveBeenNthCalledWith(2, 'Low confidence: 30 ~> 0.30');
    });
  });

  describe('console.error() function', () => {
    it('should error with values', async () => {
      const program = parse(`
        console.error("Error occurred")
        console.error("Failed with code:", 404)
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.error).toHaveBeenCalledTimes(2);
      expect(mockConsole.error).toHaveBeenNthCalledWith(1, 'Error occurred');
      expect(mockConsole.error).toHaveBeenNthCalledWith(2, 'Failed with code: 404');
    });
  });

  describe('console.debug() function', () => {
    it('should debug with [DEBUG] prefix', async () => {
      const program = parse(`
        console.debug("Debug information")
        console.debug("Value:", 42 ~> 0.7)
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.debug).toHaveBeenCalledTimes(2);
      expect(mockConsole.debug).toHaveBeenNthCalledWith(1, '[DEBUG] Debug information');
      expect(mockConsole.debug).toHaveBeenNthCalledWith(2, '[DEBUG] Value: 42 ~> 0.70');
    });
  });

  describe('Mixed usage scenarios', () => {
    it('should work with variables and expressions', async () => {
      const program = parse(`
        name = "Alice"
        age = 25
        score = 95 ~> 0.8
        
        print("User:", name, "Age:", age)
        console.log("Score:", score)
        console.warn("Check confidence level")
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.log).toHaveBeenCalledWith('User: Alice Age: 25');
      expect(mockConsole.log).toHaveBeenCalledWith('Score: 95 ~> 0.80');
      expect(mockConsole.warn).toHaveBeenCalledWith('Check confidence level');
    });

    it('should work in functions and lambdas', async () => {
      const program = parse(`
        function debug(value) {
          console.debug("Function debug:", value)
          return value
        }
        
        logger = x => {
          print("Lambda log:", x)
          return x * 2
        }
        
        result1 = debug(42)
        result2 = logger(10)
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.debug).toHaveBeenCalledWith('[DEBUG] Function debug: 42');
      expect(mockConsole.log).toHaveBeenCalledWith('Lambda log: 10');
      expect(runtime.getVariable('result1').value).toBe(42);
      expect(runtime.getVariable('result2').value).toBe(20);
    });

    it('should work with array processing', async () => {
      const program = parse(`
        numbers = [1, 2, 3, 4, 5]
        
        results = numbers.map(x => {
          print("Processing:", x)
          return x * 2
        })
        
        console.log("Results:", results)
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.log).toHaveBeenCalledWith('Processing: 1');
      expect(mockConsole.log).toHaveBeenCalledWith('Processing: 2');
      expect(mockConsole.log).toHaveBeenCalledWith('Processing: 3');
      expect(mockConsole.log).toHaveBeenCalledWith('Processing: 4');
      expect(mockConsole.log).toHaveBeenCalledWith('Processing: 5');
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('Results:'));
    });

    it('should work with uncertain control flow', async () => {
      const program = parse(`
        value = 75 ~> 0.8
        
        uncertain if (value > 50) {
          high { 
            console.log("High confidence: value is definitely > 50")
          }
          medium { 
            console.warn("Medium confidence: value might be > 50")
          }
          low { 
            console.error("Low confidence: uncertain if value > 50")
          }
        }
      `);
      
      await runtime.execute(program);
      
      // One of the console methods should have been called
      const totalCalls = mockConsole.log.mock.calls.length + 
                        mockConsole.warn.mock.calls.length + 
                        mockConsole.error.mock.calls.length;
      expect(totalCalls).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle null and undefined values', async () => {
      const program = parse(`
        print(null, undefined)
        console.log("Null:", null, "Undefined:", undefined)
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.log).toHaveBeenCalledWith('null undefined');
      expect(mockConsole.log).toHaveBeenCalledWith('Null: null Undefined: undefined');
    });

    it('should handle empty arguments', async () => {
      const program = parse(`
        print()
        console.log()
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.log).toHaveBeenCalledWith('');
      expect(mockConsole.log).toHaveBeenCalledWith('');
    });

    it('should handle complex nested structures', async () => {
      const program = parse(`
        complex = {
          users: ["Alice", "Bob"],
          scores: [95 ~> 0.9, 87 ~> 0.7],
          meta: {count: 2}
        }
        print("Complex:", complex)
      `);
      
      await runtime.execute(program);
      
      expect(mockConsole.log).toHaveBeenCalledWith(expect.stringContaining('Complex:'));
    });
  });
});