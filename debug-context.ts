import { PrismREPL } from './src/repl';

async function debugContext() {
  console.log('🔍 Debugging Context Scoping Issue\n');
  
  const repl = new PrismREPL();
  
  // Simple test - what happens?
  console.log('Test 1: Simple variable assignment');
  let result = await repl.evaluate('x = 42');
  console.log('Result:', result);
  
  result = await repl.evaluate('x');
  console.log('Access x:', result);
  
  console.log('\nTest 2: Simple context with assignment');
  result = await repl.evaluate('in context Test { y = 99 }');
  console.log('Context result:', result);
  
  result = await repl.evaluate('y');
  console.log('Access y:', result);
  
  console.log('\nTest 3: Context with block contents');
  result = await repl.evaluate(`in context DataTest {
    data = "hello"
    processed = data + " world"
  }`);
  console.log('Block context result:', result);
  
  result = await repl.evaluate('data');
  console.log('Access data:', result);
  
  result = await repl.evaluate('processed');
  console.log('Access processed:', result);
}

debugContext().catch(console.error);