import { tokenize } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { createRuntime } from '../src/runtime';
import { NumberValue } from '../src/runtime';

describe('Confident Assignment Operators', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Confident addition assignment (~+=)', () => {
    test('basic confident addition assignment', async () => {
      const source = `
        let total = 100 ~> 0.9
        let increment = 20 ~> 0.8
        total ~+= increment
        total
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe(120);
      // Confidence should be min(0.9, 0.8) = 0.8
      expect((result as any).confidence._value).toBeCloseTo(0.8);
    });

    test('accumulating with confidence', async () => {
      const source = `
        let sum = 0 ~> 1.0
        sum ~+= 10 ~> 0.9
        sum ~+= 20 ~> 0.8
        sum ~+= 30 ~> 0.7
        sum
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe(60);
      // Final confidence should be 0.7 (lowest)
      expect((result as any).confidence._value).toBeCloseTo(0.7);
    });
  });

  describe('Confident subtraction assignment (~-=)', () => {
    test('basic confident subtraction assignment', async () => {
      const source = `
        let balance = 1000 ~> 0.95
        let withdrawal = 250 ~> 0.85
        balance ~-= withdrawal
        balance
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe(750);
      expect((result as any).confidence._value).toBeCloseTo(0.85);
    });
  });

  describe('Confident multiplication assignment (~*=)', () => {
    test('basic confident multiplication assignment', async () => {
      const source = `
        let price = 100 ~> 0.9
        let taxRate = 1.2 ~> 0.99
        price ~*= taxRate
        price
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe(120);
      expect((result as any).confidence._value).toBeCloseTo(0.9);
    });

    test('compound interest calculation', async () => {
      const source = `
        let principal = 1000 ~> 1.0
        let rate = 1.05 ~> 0.95
        
        // Year 1
        principal ~*= rate
        // Year 2
        principal ~*= rate
        // Year 3
        principal ~*= rate
        
        principal
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBeCloseTo(1157.625);
      expect((result as any).confidence._value).toBeCloseTo(0.95);
    });
  });

  describe('Confident division assignment (~/=)', () => {
    test('basic confident division assignment', async () => {
      const source = `
        let total = 1000 ~> 0.9
        let divisor = 4 ~> 0.95
        total ~/= divisor
        total
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe(250);
      expect((result as any).confidence._value).toBeCloseTo(0.9);
    });
  });

  describe('Mixed confident assignment operators', () => {
    test('combining different confident assignments', async () => {
      const source = `
        let value = 100 ~> 0.9
        
        value ~+= 50 ~> 0.95   // 150
        value ~*= 2 ~> 0.85    // 300
        value ~-= 100 ~> 0.8   // 200
        value ~/= 4 ~> 0.9     // 50
        
        value
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe(50);
      // Confidence should be minimum: 0.8
      expect((result as any).confidence._value).toBeCloseTo(0.8);
    });

    test('confident assignment vs regular assignment', async () => {
      const source = `
        // Regular assignment with confident value
        let regular = 100 ~> 0.9
        regular += 50  // Regular addition - adds plain 50 to confident 100
        regular
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const regularResult = await runtime.execute(ast);
      
      const source2 = `
        // Confident assignment preserves and propagates confidence
        let confident = 100 ~> 0.9
        confident ~+= 50 ~> 0.8
        confident
      `;
      const tokens2 = tokenize(source2);
      const parser2 = new Parser(tokens2, source2);
      const ast2 = parser2.parse();
      const confidentResult = await runtime.execute(ast2);
      
      // Regular assignment still has confidence from the original value (0.9)
      expect(regularResult.type).toBe('confident');
      expect((regularResult as any).value.value).toBe(150);
      expect((regularResult as any).confidence._value).toBeCloseTo(0.9);
      
      // Confident assignment combines confidences (min of 0.9 and 0.8 = 0.8)  
      expect(confidentResult.type).toBe('confident');
      expect((confidentResult as any).value.value).toBe(150);
      expect((confidentResult as any).confidence._value).toBeCloseTo(0.8);
    });
  });
});