import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';

describe('Parser - Enhanced Error Messages', () => {
  it('should show context for parse errors', () => {
    const code = `let x = 10
let y = 20 ~>
let z = 30`;
    
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens, code);
    
    try {
      parser.parse();
    } catch (error: any) {
      expect(error.message).toContain('ERROR: [PARSER_ERROR]');
      expect(error.message).toContain('Expected expression');
      expect(error.message).toContain('3 | let z = 30');
    }
  });

  it('should show helpful message for missing branch keywords', () => {
    const code = `let result = llm("test")
uncertain if (result ~> 0.8) {
  wrong { x = 1 }
}`;
    
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens, code);
    
    try {
      parser.parse();
    } catch (error: any) {
      expect(error.message).toContain("Expected 'high', 'medium', 'low', or 'default' branch");
      expect(error.message).toContain('3 |   wrong { x = 1 }');
    }
  });

  it('should handle EOF errors gracefully', () => {
    const code = `let x = (10 + 20`;
    
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens, code);
    
    try {
      parser.parse();
    } catch (error: any) {
      expect(error.message).toContain("Expected ')' after expression");
      expect(error.message).toContain('1 | let x = (10 + 20');
    }
  });

  it('should show multiline context correctly', () => {
    const code = `// This is a comment
let x = 10
let y = 20
let z = x + 
let w = 40`;
    
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens, code);
    
    try {
      parser.parse();
    } catch (error: any) {
      expect(error.message).toContain('5 | let w = 40');
      expect(error.message).toContain('Expected expression');
    }
  });
});
