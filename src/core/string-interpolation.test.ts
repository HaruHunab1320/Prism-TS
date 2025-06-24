import { tokenize } from './tokenizer';
import { Parser } from './parser';
import { createRuntime } from './runtime';
import { StringValue } from './runtime';

describe('String Interpolation', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  describe('Basic interpolation', () => {
    test('single variable interpolation', async () => {
      const source = `
        name = "Alice"
        greeting = "Hello, \${name}!"
        greeting
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Hello, Alice!');
    });

    test('multiple interpolations', async () => {
      const source = `
        name = "Bob"
        age = 30
        message = "My name is \${name} and I am \${age} years old"
        message
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('My name is Bob and I am 30 years old');
    });

    test('interpolation with expressions', async () => {
      const source = `
        x = 10
        y = 20
        result = "The sum of \${x} and \${y} is \${x + y}"
        result
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('The sum of 10 and 20 is 30');
    });
  });

  describe('Complex interpolation', () => {
    test('nested object property access', async () => {
      const source = `
        user = { name: "Carol", details: { age: 25, city: "NYC" } }
        info = "\${user.name} is \${user.details.age} years old from \${user.details.city}"
        info
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Carol is 25 years old from NYC');
    });

    test('array index in interpolation', async () => {
      const source = `
        colors = ["red", "green", "blue"]
        message = "Primary colors: \${colors[0]}, \${colors[1]}, \${colors[2]}"
        message
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Primary colors: red, green, blue');
    });

    test('ternary in interpolation', async () => {
      const source = `
        score = 85
        grade = "Your grade is: \${score >= 90 ? "A" : (score >= 80 ? "B" : "C")}"
        grade
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Your grade is: B');
    });

    test('function calls in interpolation', async () => {
      const source = `
        nums = [1, 2, 3]
        message = "Array has \${nums.length} elements"
        message
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Array has 3 elements');
    });
  });

  describe('Confidence values in interpolation', () => {
    test('confident value interpolation', async () => {
      const source = `
        score = 95 ~> 0.8
        message = "The score is \${score}"
        message
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('The score is 95 (~80.0%)');
    });

    test('confidence extraction in interpolation', async () => {
      const source = `
        value = 100 ~> 0.7
        conf = <~ value
        message = "Value: \${value} with confidence: \${conf}"
        message
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Value: 100 (~70.0%) with confidence: 0.7');
    });
  });

  describe('Edge cases', () => {
    test('empty interpolation', async () => {
      const source = 'message = "Hello \${} world"';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      
      expect(() => parser.parse()).toThrow('Empty interpolation expression');
    });

    test('no interpolations', async () => {
      const source = 'message = "Just a regular string"';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Just a regular string');
    });

    test('dollar sign without interpolation', async () => {
      const source = 'price = "Price: $50"';
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Price: $50');
    });

    test('escaped characters in interpolation', async () => {
      const source = `
        name = "Test"
        message = "Line 1: \${name}\\nLine 2: Done"
        message
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Line 1: Test\nLine 2: Done');
    });

    test('nested braces in interpolation', async () => {
      const source = `
        obj = { a: { b: 5 } }
        message = "Nested: \${obj.a.b}"
        message
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('Nested: 5');
    });
  });

  describe('Multiline interpolated strings', () => {
    test('multiline with interpolation', async () => {
      const source = `
        name = "Alice"
        age = 30
        bio = \`\`\`
Name: \${name}
Age: \${age}
Status: Active\`\`\`
        bio
      `;
      const tokens = tokenize(source);
      const parser = new Parser(tokens, source);
      const ast = parser.parse();
      const result = await runtime.execute(ast);
      
      expect(result).toBeInstanceOf(StringValue);
      expect((result as StringValue).value).toBe('\nName: Alice\nAge: 30\nStatus: Active');
    });
  });
});