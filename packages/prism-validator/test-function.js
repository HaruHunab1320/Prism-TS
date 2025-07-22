const { parse } = require('@prism-lang/core');

// Try different function syntaxes
const tests = [
  'test = () => x + 1',
  'test = (a, b) => a + b',
  'test = (param) => ~param',
  `test = () => {
    x = 10
    return x
  }`
];

tests.forEach(code => {
  console.log(`\nTrying: ${code}`);
  try {
    const ast = parse(code);
    console.log('Success! AST:', JSON.stringify(ast, null, 2));
  } catch (e) {
    console.log('Failed:', e.message);
  }
});