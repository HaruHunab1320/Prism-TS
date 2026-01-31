import { tokenize } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { createRuntime } from '../src/runtime';
import { NumberValue, StringValue, BooleanValue } from '../src/runtime';

describe('Confident Ternary Operator', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Basic confident ternary', () => {
    test('confident ternary with confident condition', async () => {
      const source = `
        let condition = true ~> 0.8
        let result = condition ~? "yes" : "no"
        result
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe("yes");
      expect((result as any).confidence._value).toBeCloseTo(0.8);
    });

    test('confident ternary with confident branches', async () => {
      const source = `
        let condition = true
        let yes = "YES" ~> 0.9
        let no = "NO" ~> 0.7
        let result = condition ~? yes : no
        result
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe("YES");
      expect((result as any).confidence._value).toBeCloseTo(0.9);
    });

    test('confident ternary combines confidences', async () => {
      const source = `
        let condition = true ~> 0.8
        let yes = "YES" ~> 0.9
        let no = "NO" ~> 0.7
        let result = condition ~? yes : no
        result
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe("YES");
      expect((result as any).confidence._value).toBeCloseTo(0.72); // 0.8 * 0.9
    });

    test('confident ternary with false condition', async () => {
      const source = `
        let condition = false ~> 0.8
        let yes = "YES" ~> 0.9
        let no = "NO" ~> 0.7
        let result = condition ~? yes : no
        result
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe("NO");
      expect((result as any).confidence._value).toBeCloseTo(0.56); // 0.8 * 0.7
    });

    test('nested confident ternary', async () => {
      const source = `
        let a = true ~> 0.9
        let b = false ~> 0.8
        let result = a ~? (b ~? "A&B" : "A only") : "neither"
        result
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe("A only");
      expect((result as any).confidence._value).toBeCloseTo(0.72); // 0.9 * 0.8
    });

    test('confident ternary vs regular ternary', async () => {
      const source = `
        let condition = true ~> 0.5
        
        // Regular ternary ignores confidence
        let regular = condition ? "yes" : "no"
        
        // Confident ternary propagates confidence
        let confident = condition ~? "yes" : "no"
        
        regular
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const regular = await runtime.execute(ast);
      
      runtime = createRuntime();
      const source2 = `
        let condition = true ~> 0.5
        let confident = condition ~? "yes" : "no"
        confident
      `;
      const tokens2 = tokenize(source2);
      const parser2 = new Parser(tokens2, source2);
      const ast2 = parser2.parse();
      const confident = await runtime.execute(ast2);
      
      // Regular ternary result has no confidence
      expect(regular.type).toBe('string');
      expect((regular as any).value).toBe("yes");
      
      // Confident ternary result has confidence
      expect(confident.type).toBe('confident');
      expect((confident as any).value.value).toBe("yes");
      expect((confident as any).confidence._value).toBeCloseTo(0.5);
    });
  });

  describe('Confident ternary with complex expressions', () => {
    test('confident ternary with expression branches', async () => {
      const source = `
        let x = 10 ~> 0.8
        let y = 20 ~> 0.9
        let condition = x < y
        let result = condition ~? x + y : x - y
        result
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe(30);
      // Confidence should be minimum of x and y: min(0.8, 0.9) = 0.8
      expect((result as any).confidence._value).toBeLessThan(1);
    });

    test('confident ternary in function', async () => {
      const source = `
        let getGrade = (score) => {
          score ~? (score >= 90 ~? "A" : "B") : "F"
        }
        
        let result = getGrade(85 ~> 0.95)
        result
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result.type).toBe('confident');
      expect((result as any).value.value).toBe("B");
      // Confidence is multiplied: 0.95 * 0.95 = 0.9025
      expect((result as any).confidence._value).toBeCloseTo(0.9025);
    });
  });
});
