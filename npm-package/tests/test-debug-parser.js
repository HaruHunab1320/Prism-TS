const { Tokenizer } = require('./dist/core/tokenizer.js');

// Test tokenization first
const code = 'x = 10; y = 20; z = x + y; z';
console.log('Code:', code);
console.log('\nTokens:');

const tokenizer = new Tokenizer(code);
const tokens = tokenizer.tokenize();

tokens.forEach((token, i) => {
  console.log(`${i}: ${token.type} = "${token.value}"`);
});