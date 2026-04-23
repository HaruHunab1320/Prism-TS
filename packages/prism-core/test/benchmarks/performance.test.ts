import { createRuntime } from '../../src/runtime';
import { parse } from '../../src/parser';
import { tokenize } from '../../src/tokenizer';

describe('Performance Benchmarks', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('tokenizer performance', () => {
    it('should tokenize large programs efficiently', () => {
      const largeProgram = Array(1000).fill('x = 42 + 3.14 * (2 - 1)').join('\n');
      
      const start = performance.now();
      const tokens = tokenize(largeProgram);
      const end = performance.now();
      
      expect(tokens.length).toBeGreaterThan(10000);
      expect(end - start).toBeLessThan(500); // Should tokenize in under 500ms
    });

    it('should handle deeply nested expressions', () => {
      let nestedExpr = '1';
      for (let i = 0; i < 50; i++) {
        nestedExpr = `(${nestedExpr} + 1)`;
      }
      
      const start = performance.now();
      const tokens = tokenize(nestedExpr);
      const end = performance.now();
      
      expect(tokens.length).toBeGreaterThan(100);
      expect(end - start).toBeLessThan(200); // Should be fast even with deep nesting
    });
  });

  describe('parser performance', () => {
    it('should parse complex programs efficiently', () => {
      const complexProgram = `
        // Variables with confidence
        ${Array(100).fill('let x = 42 ~> 0.8').map((v, i) => v.replace('x', `var${i}`)).join('\n')}
        
        // Calculations
        let result = 0
        ${Array(50).fill('result = var0 + var1 * var2').join('\n')}
        
        // Conditional logic
        ${Array(20).fill(`
          if (var0 > 10) {
            result = var1 + var2
          } else {
            result = var3 - var4
          }
        `).join('\n')}
      `;
      
      const start = performance.now();
      const ast = parse(complexProgram);
      const end = performance.now();
      
      expect(ast.statements.length).toBeGreaterThan(150);
      expect(end - start).toBeLessThan(1000); // Should parse in under 1000ms
    });
  });

  describe('runtime performance', () => {
    it('should execute arithmetic operations efficiently', async () => {
      const program = parse(`
        let result = 0
        ${Array(1000).fill('result = result + 1').join('\n')}
      `);
      
      const start = performance.now();
      const result = await runtime.execute(program);
      const end = performance.now();
      
      expect(result.value).toBe(1000);
      expect(end - start).toBeLessThan(500); // Should execute in under 500ms
    });

    it('should handle confidence propagation efficiently', async () => {
      const program = parse(`
        let a = 10 ~> 0.9
        let b = 20 ~> 0.8
        let c = 30 ~> 0.7
        let result = 0
        
        ${Array(100).fill('result = a ~+ b ~* c').join('\n')}
      `);
      
      const start = performance.now();
      await runtime.execute(program);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(300); // Confidence operations should be fast
    });

    it('should handle variable lookups efficiently', async () => {
      const program = parse(`
        // Create many variables
        ${Array(500).fill('let x = 42').map((v, i) => v.replace('x', `var${i}`)).join('\n')}
        
        // Access them
        let sum = 0
        ${Array(500).fill('sum = sum + var').map((v, i) => v + i).join('\n')}
      `);
      
      const start = performance.now();
      const result = await runtime.execute(program);
      const end = performance.now();
      
      expect(result.value).toBe(21000); // 42 * 500
      expect(end - start).toBeLessThan(1000); // Should handle many variables efficiently
    });
  });

  describe('memory efficiency', () => {
    it('should not leak memory with repeated executions', async () => {
      const program = parse('x = 42 + 58');
      
      // Get initial memory usage
      await runtime.execute(parse('let x = 0'));
      if (global.gc) global.gc();
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Execute many times
      for (let i = 0; i < 1000; i++) {
        await runtime.execute(program);
      }
      
      // Force garbage collection if available
      if (global.gc) global.gc();
      const finalMemory = process.memoryUsage().heapUsed;
      
      // Memory increase should be minimal (less than 10MB)
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('operator performance comparison', () => {
    it.skip('should show minimal overhead for confidence operators', async () => {
      // Regular operators
      const regularProgram = parse(`
        let a = 10
        let b = 20
        ${Array(100).fill('result = a + b * 2 - 5').join('\n')}
      `);
      
      const regularStart = performance.now();
      await runtime.execute(regularProgram);
      const regularEnd = performance.now();
      const regularTime = regularEnd - regularStart;
      
      // Confidence operators
      const confidentProgram = parse(`
        let a = 10 ~> 0.9
        let b = 20 ~> 0.8
        ${Array(100).fill('result = a ~+ b ~* 2 ~- 5').join('\n')}
      `);
      
      const confidentStart = performance.now();
      await runtime.execute(confidentProgram);
      const confidentEnd = performance.now();
      const confidentTime = confidentEnd - confidentStart;
      
      // Confidence operators should have minimal overhead (less than 15x)
      expect(confidentTime).toBeLessThan(regularTime * 15);
    });
  });
});
