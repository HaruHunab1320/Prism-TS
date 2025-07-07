import { tokenize } from './src/core/tokenizer';
import { Parser } from './src/core/parser';
import { createRuntime } from './src/core/runtime';

async function testNullSupport() {
  console.log('Testing null support in Prism...\n');

  const tests = [
    'value = null',
    'obj = { name: "test", empty: null }',
    'isNull = value == null',
    'result = null + 5',
  ];

  for (const code of tests) {
    console.log(`Test: ${code}`);
    try {
      const tokens = tokenize(code);
      console.log('Tokens:', tokens.map(t => `${t.type}:${t.value}`).join(' '));
      
      const parser = new Parser(tokens, code);
      const ast = parser.parse();
      console.log('Parsing: SUCCESS');
      
      const runtime = createRuntime();
      const result = await runtime.execute(ast);
      console.log('Execution:', result.toString());
    } catch (error) {
      console.log('ERROR:', (error as Error).message);
    }
    console.log('---\n');
  }
}

testNullSupport().catch(console.error);