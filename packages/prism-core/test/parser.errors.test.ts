import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';

describe('Parser - Enhanced Error Messages', () => {
  it('should show context for parse errors', () => {
    const code = `x = 10
y = 20 ~>
z = 30`;
    
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens, code);
    
    try {
      parser.parse();
    } catch (error: any) {
      // The parser sees 'z' on line 3 as the confidence value, but then finds '=' which is invalid
      expect(error.message).toContain('ParseError at line 3');
      expect(error.message).toContain('Expected expression');
      expect(error.message).toContain('3 | z = 30');
      expect(error.message).toContain("Found: '=' (EQUAL)");
    }
  });

  it('should show helpful message for missing branch keywords', () => {
    const code = `result = llm("test")
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
      expect(error.message).toContain("Found: 'wrong' (IDENTIFIER)");
    }
  });

  it('should handle EOF errors gracefully', () => {
    const code = `x = (10 + 20`;
    
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens, code);
    
    try {
      parser.parse();
    } catch (error: any) {
      expect(error.message).toContain("Expected ')' after expression");
      expect(error.message).toContain('1 | x = (10 + 20');
    }
  });

  it('should show multiline context correctly', () => {
    const code = `// This is a comment
x = 10
y = 20
z = x + 
w = 40`;
    
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens, code);
    
    try {
      parser.parse();
    } catch (error: any) {
      expect(error.message).toContain('5 | w = 40');
      expect(error.message).toContain('Expected expression');
    }
  });
});