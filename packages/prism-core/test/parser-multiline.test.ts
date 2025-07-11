import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { Runtime } from '../src/runtime';

describe('Parser - Multiline and Semicolon Support', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  test('should parse multiple statements on one line with semicolons', async () => {
    const code = 'x = 10; y = 20; z = x + y; z';
    
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    const result = await runtime.execute(ast);
    expect(result.toString()).toBe('30');
  });

  test('should parse confidence operations on one line', async () => {
    const code = 'temp = 22.5 ~> 0.85; conf = <~ temp; conf';
    
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    const result = await runtime.execute(ast);
    expect(result.toString()).toBe('0.85');
  });

  test('should parse mixed statements with and without semicolons', async () => {
    const code = `x = 5; y = 10
    z = x + y; z`;
    
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    const result = await runtime.execute(ast);
    expect(result.toString()).toBe('15');
  });

  test('should parse complex one-liner with confidence operators', async () => {
    const code = 'a = 10 ~> 0.9; b = 20 ~> 0.7; c = a ~+ b; c';
    
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    const result = await runtime.execute(ast);
    expect(result.toString()).toContain('30');
    expect(result.toString()).toContain('70.0%'); // Min confidence
  });

  test('should handle trailing semicolon', async () => {
    const code = '42 ~> 0.9;';
    
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    const result = await runtime.execute(ast);
    expect(result.toString()).toContain('42');
  });

  test('should parse parallel confidence on one line', async () => {
    const code = 'opt1 = "a" ~> 0.6; opt2 = "b" ~> 0.9; best = opt1 ~||> opt2; best';
    
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    const result = await runtime.execute(ast);
    expect(result.toString()).toContain('b'); // Higher confidence option
  });
});