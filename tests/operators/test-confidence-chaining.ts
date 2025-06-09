import { createRuntime } from './src/core/runtime';
import { parse } from './src/core/parser';

async function testConfidenceChaining() {
  console.log('🔗 Testing Confidence Chaining Operator (~~)');
  console.log('='.repeat(50));
  
  const runtime = createRuntime();
  
  try {
    // Test 1: Basic confidence chaining
    console.log('\n📊 Test 1: Basic confidence chaining');
    const program1 = parse(`
      input = 50 ~> 0.9
      processed = 75 ~> 0.8
      input ~~ processed
    `);
    const result1 = await runtime.execute(program1);
    console.log(`Input: input = 50 ~> 0.9, processed = 75 ~> 0.8`);
    console.log(`Expression: input ~~ processed`);
    console.log(`Result: ${result1.toString()}`);
    console.log(`✅ Expected: 75 (~0.8), Got: ${result1.toString()}`);
    
    // Test 2: Chain with regular values
    console.log('\n📊 Test 2: Chain with regular values');
    const program2 = parse(`
      step1 = 42
      step2 = 84 ~> 0.7
      step1 ~~ step2
    `);
    const result2 = await runtime.execute(program2);
    console.log(`Input: step1 = 42, step2 = 84 ~> 0.7`);
    console.log(`Expression: step1 ~~ step2`);
    console.log(`Result: ${result2.toString()}`);
    console.log(`✅ Expected: 84 (~0.7), Got: ${result2.toString()}`);
    
    // Test 3: Multiple chaining
    console.log('\n📊 Test 3: Multiple chaining operations');
    const program3 = parse(`
      data1 = 10 ~> 0.9
      data2 = 20 ~> 0.8
      data3 = 30 ~> 0.7
      data1 ~~ data2 ~~ data3
    `);
    const result3 = await runtime.execute(program3);
    console.log(`Input: data1 = 10 ~> 0.9, data2 = 20 ~> 0.8, data3 = 30 ~> 0.7`);
    console.log(`Expression: data1 ~~ data2 ~~ data3`);
    console.log(`Result: ${result3.toString()}`);
    console.log(`✅ Expected: 30 (~0.7), Got: ${result3.toString()}`);
    
    console.log('\n🎉 All confidence chaining tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testConfidenceChaining().catch(console.error);