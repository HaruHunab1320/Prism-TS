import { ModuleSystem } from '../src/module-system';
import { createRuntime } from '../src/runtime';
import { tokenize } from '../src/tokenizer';
import { Parser } from '../src/parser';

describe('Module System', () => {
  let moduleSystem: ModuleSystem;
  let fileContents: Map<string, string>;
  
  beforeEach(() => {
    fileContents = new Map();
    
    // Create module system with custom file reader
    moduleSystem = new ModuleSystem((path: string) => {
      const content = fileContents.get(path);
      if (!content) {
        throw new Error(`Module not found: ${path}`);
      }
      return content;
    });
    
    // Clear cache before each test
    moduleSystem.clearCache();
  });
  
  describe('Basic imports and exports', () => {
    test('default export and import', async () => {
      // Set up module files
      fileContents.set('/math.prism', `
        PI = 3.14159
        export default PI
      `);
      
      fileContents.set('/main.prism', `
        import pi from "./math.prism"
        result = pi * 2
        export default result
      `);
      
      // Create runtime for main module
      const runtime = createRuntime();
      const interpreter = (runtime as any).interpreter;
      (interpreter as any).__moduleSystem = moduleSystem;
      
      // Load main module
      const mainModule = await moduleSystem.loadModule('/main.prism', runtime);
      
      // Check the default export
      expect(mainModule.exports.default).toBeDefined();
      expect((mainModule.exports.default as any).value).toBeCloseTo(6.28318);
    });
    
    test('named exports and imports', async () => {
      fileContents.set('/utils.prism', `
        export double = x => x * 2
        export triple = x => x * 3
        export const PI = 3.14159
      `);
      
      fileContents.set('/main.prism', `
        import {double, triple, PI} from "./utils.prism"
        result1 = double(5)
        result2 = triple(5)
        result3 = PI
        export {result1, result2, result3}
      `);
      
      const runtime = createRuntime();
      const interpreter = (runtime as any).interpreter;
      (interpreter as any).__moduleSystem = moduleSystem;
      
      const mainModule = await moduleSystem.loadModule('/main.prism', runtime);
      
      expect(mainModule.exports.named.get('result1')).toBeDefined();
      expect((mainModule.exports.named.get('result1') as any).value).toBe(10);
      expect((mainModule.exports.named.get('result2') as any).value).toBe(15);
      expect((mainModule.exports.named.get('result3') as any).value).toBeCloseTo(3.14159);
    });
    
    test('namespace import', async () => {
      fileContents.set('/math.prism', `
        export add = (a, b) => a + b
        export subtract = (a, b) => a - b
        export multiply = (a, b) => a * b
        export const E = 2.71828
      `);
      
      fileContents.set('/main.prism', `
        import * as math from "./math.prism"
        sum = math.add(10, 5)
        diff = math.subtract(10, 5)
        prod = math.multiply(10, 5)
        euler = math.E
        export {sum, diff, prod, euler}
      `);
      
      const runtime = createRuntime();
      const interpreter = (runtime as any).interpreter;
      (interpreter as any).__moduleSystem = moduleSystem;
      
      const mainModule = await moduleSystem.loadModule('/main.prism', runtime);
      
      expect((mainModule.exports.named.get('sum') as any).value).toBe(15);
      expect((mainModule.exports.named.get('diff') as any).value).toBe(5);
      expect((mainModule.exports.named.get('prod') as any).value).toBe(50);
      expect((mainModule.exports.named.get('euler') as any).value).toBeCloseTo(2.71828);
    });
    
    test('re-exports', async () => {
      fileContents.set('/core.prism', `
        export const VERSION = "1.0.0"
        export greet = name => "Hello, " + name
      `);
      
      fileContents.set('/index.prism', `
        // Re-export everything from core
        export * from "./core.prism"
        
        // Add additional export
        export const BUILD = "production"
      `);
      
      const runtime = createRuntime();
      const interpreter = (runtime as any).interpreter;
      (interpreter as any).__moduleSystem = moduleSystem;
      
      const indexModule = await moduleSystem.loadModule('/index.prism', runtime);
      
      expect((indexModule.exports.named.get('VERSION') as any).value).toBe("1.0.0");
      expect(indexModule.exports.named.get('greet')).toBeDefined();
      expect((indexModule.exports.named.get('BUILD') as any).value).toBe("production");
    });
    
    test('circular dependency handling - functions only', async () => {
      // Circular dependency with functions that reference each other
      // Note: This only works with functions, not values
      fileContents.set('/a.prism', `
        import {getB} from "./b.prism"
        export getA = () => "A"
        export callB = () => "A calls " + getB()
      `);
      
      fileContents.set('/b.prism', `
        import {getA} from "./a.prism"
        export getB = () => "B"
        export callA = () => "B calls " + getA()
      `);
      
      const runtime = createRuntime();
      const interpreter = (runtime as any).interpreter;
      (interpreter as any).__moduleSystem = moduleSystem;
      
      // Should not throw with circular dependency
      const moduleA = await moduleSystem.loadModule('/a.prism', runtime);
      
      // Both modules should be loaded
      expect(moduleA.exports.named.get('getA')).toBeDefined();
      expect(moduleA.exports.named.get('callB')).toBeDefined();
      
      // Test that the circular reference works at runtime
      const callB = moduleA.exports.named.get('callB') as any;
      const result = await callB.value([]);
      expect(result.value).toBe("A calls B");
    });
  });
  
  describe('Error handling', () => {
    test('module not found', async () => {
      fileContents.set('/main.prism', `
        import {missing} from "./nonexistent.prism"
      `);
      
      const runtime = createRuntime();
      const interpreter = (runtime as any).interpreter;
      (interpreter as any).__moduleSystem = moduleSystem;
      
      await expect(moduleSystem.loadModule('/main.prism', runtime))
        .rejects.toThrow('Module not found: /nonexistent.prism');
    });
    
    test('export not found', async () => {
      fileContents.set('/utils.prism', `
        export const foo = "bar"
      `);
      
      fileContents.set('/main.prism', `
        import {missing} from "./utils.prism"
      `);
      
      const runtime = createRuntime();
      const interpreter = (runtime as any).interpreter;
      (interpreter as any).__moduleSystem = moduleSystem;
      
      await expect(moduleSystem.loadModule('/main.prism', runtime))
        .rejects.toThrow("Module /utils.prism has no export named 'missing'");
    });
    
    test('no default export', async () => {
      fileContents.set('/utils.prism', `
        export const foo = "bar"
      `);
      
      fileContents.set('/main.prism', `
        import defaultExport from "./utils.prism"
      `);
      
      const runtime = createRuntime();
      const interpreter = (runtime as any).interpreter;
      (interpreter as any).__moduleSystem = moduleSystem;
      
      await expect(moduleSystem.loadModule('/main.prism', runtime))
        .rejects.toThrow('Module /utils.prism has no default export');
    });
  });
  
  describe('Confidence propagation', () => {
    test('exports preserve confidence', async () => {
      fileContents.set('/confident.prism', `
        export confidentValue = 100 ~> 0.85
        export confidentFunc = x => (x * 2) ~> 0.9
      `);
      
      fileContents.set('/main.prism', `
        import {confidentValue, confidentFunc} from "./confident.prism"
        result1 = confidentValue
        result2 = confidentFunc(10)
        export {result1, result2}
      `);
      
      const runtime = createRuntime();
      const interpreter = (runtime as any).interpreter;
      (interpreter as any).__moduleSystem = moduleSystem;
      
      const mainModule = await moduleSystem.loadModule('/main.prism', runtime);
      
      const result1 = mainModule.exports.named.get('result1') as any;
      expect(result1.type).toBe('confident');
      expect(result1.value.value).toBe(100);
      expect(result1.confidence._value).toBeCloseTo(0.85);
      
      const result2 = mainModule.exports.named.get('result2') as any;
      expect(result2.type).toBe('confident');
      expect(result2.value.value).toBe(20);
      expect(result2.confidence._value).toBeCloseTo(0.9);
    });
  });
});