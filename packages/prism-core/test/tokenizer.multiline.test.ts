import { Tokenizer, TokenType } from '../src/tokenizer';

describe('Tokenizer - Multiline Strings and Escape Sequences', () => {
  describe('Multiline strings with ```', () => {
    it('should tokenize simple multiline string', () => {
      const input = `let code = \`\`\`
function hello() {
  return "world";
}\`\`\``;
      
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.LET);
      expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
      expect(tokens[1].value).toBe('code');
      expect(tokens[2].type).toBe(TokenType.EQUAL);
      expect(tokens[3].type).toBe(TokenType.STRING);
      expect(tokens[3].value).toBe(`
function hello() {
  return "world";
}`);
      expect(tokens[4].type).toBe(TokenType.EOF);
    });

    it('should preserve all whitespace in multiline strings', () => {
      const input = `let sql = \`\`\`
  SELECT *
    FROM users
      WHERE active = true
\`\`\``;
      
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      
      expect(tokens[3].value).toBe(`
  SELECT *
    FROM users
      WHERE active = true
`);
    });

    it('should handle nested quotes in multiline strings', () => {
      const input = `let code = \`\`\`
const msg = "Hello 'world'";
const query = 'SELECT * FROM "users"';
\`\`\``;
      
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      
      expect(tokens[3].value).toContain('"Hello \'world\'"');
      expect(tokens[3].value).toContain('\'SELECT * FROM "users"\'');
    });

    it('should throw error for unterminated multiline string', () => {
      const input = `let code = \`\`\`
This is never closed`;
      
      const tokenizer = new Tokenizer(input);
      expect(() => tokenizer.tokenize()).toThrow('Unterminated multiline string');
    });
  });

  describe('Escape sequences in regular strings', () => {
    it('should handle common escape sequences', () => {
      const input = `let msg = "Hello\\nWorld\\tTab\\r\\nWindows"`;
      
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      
      expect(tokens[3].value).toBe("Hello\nWorld\tTab\r\nWindows");
    });

    it('should handle escaped quotes', () => {
      const input = `let query = "SELECT * FROM users WHERE name = \\"John\\""`;
      
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      
      expect(tokens[3].value).toBe('SELECT * FROM users WHERE name = "John"');
    });

    it('should handle escaped backslashes', () => {
      const input = `let path = "C:\\\\Users\\\\Documents"`;
      
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      
      expect(tokens[3].value).toBe('C:\\Users\\Documents');
    });

    it('should throw error for newline in regular string', () => {
      const input = `let msg = "Hello
World"`;
      
      const tokenizer = new Tokenizer(input);
      expect(() => tokenizer.tokenize()).toThrow('Unexpected newline in string');
    });
  });

  describe('Integration with LLM calls', () => {
    it('should handle multiline code in LLM prompts', () => {
      const input = `let code = \`\`\`
function vulnerable(userId) {
  const query = "SELECT * FROM users WHERE id = " + userId;
  return db.execute(query);
}
\`\`\`
let analysis = llm("Analyze this code for security issues: " + code)`;
      
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      
      // Verify the structure
      expect(tokens[1].value).toBe('code');
      expect(tokens[3].type).toBe(TokenType.STRING);
      expect(tokens[3].value).toContain('function vulnerable');
      
      // Find the llm call
      const llmIndex = tokens.findIndex(t => t.value === 'llm');
      expect(llmIndex).toBeGreaterThan(0);
      expect(tokens[llmIndex + 2].value).toBe('Analyze this code for security issues: ');
    });
  });
});
