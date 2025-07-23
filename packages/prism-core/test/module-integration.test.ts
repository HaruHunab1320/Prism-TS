import { ModuleSystem } from '../src/module-system';
import { createRuntime } from '../src/runtime';

describe('Module System Integration', () => {
  let moduleSystem: ModuleSystem;
  let fileContents: Map<string, string>;
  
  beforeEach(() => {
    fileContents = new Map();
    moduleSystem = new ModuleSystem((path: string) => {
      const content = fileContents.get(path);
      if (!content) {
        throw new Error(`Module not found: ${path}`);
      }
      return content;
    });
    moduleSystem.clearCache();
  });
  
  test('real-world module usage', async () => {
    // Math utilities module
    fileContents.set('/utils/math.prism', `
      export const PI = 3.14159
      export const E = 2.71828
      
      export square = x => x * x
      export cube = x => x * x * x
      
      export function circleArea(radius) {
        return PI * square(radius)
      }
      
      export default {
        PI,
        E,
        square,
        cube,
        circleArea
      }
    `);
    
    // Statistics module that uses math
    fileContents.set('/utils/stats.prism', `
      import {square} from "./math.prism"
      
      export mean = values => {
        sum = values.reduce((a, b) => a + b, 0)
        return sum / values.length
      }
      
      export variance = values => {
        m = mean(values)
        squaredDiffs = values.map(x => square(x - m))
        return mean(squaredDiffs)
      }
      
      export standardDeviation = values => {
        v = variance(values)
        // Simple square root approximation for testing
        return (v ** 0.5) ~> 0.95
      }
    `);
    
    // Main application
    fileContents.set('/app.prism', `
      import math from "./utils/math.prism"
      import {mean, standardDeviation} from "./utils/stats.prism"
      import * as stats from "./utils/stats.prism"
      
      // Use default import
      area = math.circleArea(5)
      
      // Use named imports
      data = [1, 2, 3, 4, 5]
      avg = mean(data)
      sd = standardDeviation(data)
      
      // Use namespace import
      v = stats.variance(data)
      
      export {area, avg, sd, v}
    `);
    
    const runtime = createRuntime();
    const interpreter = (runtime as any).interpreter;
    (interpreter as any).__moduleSystem = moduleSystem;
    
    const app = await moduleSystem.loadModule('/app.prism', runtime);
    
    // Test the exports
    expect((app.exports.named.get('area') as any).value).toBeCloseTo(78.54);
    expect((app.exports.named.get('avg') as any).value).toBe(3);
    expect((app.exports.named.get('v') as any).value).toBe(2);
    
    // Test confidence propagation
    const sd = app.exports.named.get('sd') as any;
    expect(sd.type).toBe('confident');
    expect(sd.value.value).toBeCloseTo(1.4142);
    expect(sd.confidence._value).toBeCloseTo(0.95);
  });
  
  test('module with async operations', async () => {
    fileContents.set('/api.prism', `
      export async function fetchData(id) {
        // Simulate API call
        await delay(10)
        return {id: id, name: "Item " + id}
      }
      
      export async function processData(items) {
        results = await Promise.all(
          items.map(id => fetchData(id))
        )
        return results
      }
    `);
    
    fileContents.set('/main.prism', `
      import {processData} from "./api.prism"
      
      ids = [1, 2, 3]
      data = await processData(ids)
      
      export default data
    `);
    
    const runtime = createRuntime();
    const interpreter = (runtime as any).interpreter;
    (interpreter as any).__moduleSystem = moduleSystem;
    
    const main = await moduleSystem.loadModule('/main.prism', runtime);
    const data = main.exports.default as any;
    
    expect(data.type).toBe('array');
    expect(data.elements).toHaveLength(3);
    expect(data.elements[0].value.get('name').value).toBe('Item 1');
    expect(data.elements[1].value.get('name').value).toBe('Item 2');
    expect(data.elements[2].value.get('name').value).toBe('Item 3');
  });
});