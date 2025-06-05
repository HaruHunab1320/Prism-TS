import { createRuntime } from './src/core/runtime';
import { parse } from './src/core/parser';

async function testConfidenceCoalesce() {
  console.log('🤔 Testing Confidence Coalesce Operator (~??)');
  console.log('='.repeat(50));
  
  const runtime = createRuntime();
  
  try {
    // Test 1: High confidence should be returned (no coalesce)
    console.log('\n📊 Test 1: High confidence value (should not coalesce)');
    const program1 = parse(`
      primary = "good result" ~> 0.9
      fallback = "backup" ~> 0.8
      primary ~?? fallback
    `);
    const result1 = await runtime.execute(program1);
    console.log(`Input: primary = "good result" ~> 0.9, fallback = "backup" ~> 0.8`);
    console.log(`Expression: primary ~?? fallback`);
    console.log(`Result: ${result1.toString()}`);
    console.log(`✅ Expected: "good result" (~90.0%), Got: ${result1.toString()}`);
    
    // Test 2: Low confidence should coalesce to second value
    console.log('\n📊 Test 2: Low confidence value (should coalesce)');
    const program2 = parse(`
      lowConf = "uncertain result" ~> 0.3
      fallback = "reliable backup" ~> 0.8
      lowConf ~?? fallback
    `);
    const result2 = await runtime.execute(program2);
    console.log(`Input: lowConf = "uncertain result" ~> 0.3, fallback = "reliable backup" ~> 0.8`);
    console.log(`Expression: lowConf ~?? fallback`);
    console.log(`Result: ${result2.toString()}`);
    console.log(`✅ Expected: "reliable backup" (~80.0%), Got: ${result2.toString()}`);
    
    // Test 3: Multiple coalesce chain
    console.log('\n📊 Test 3: Multiple coalesce operations');
    const program3 = parse(`
      first = "low conf" ~> 0.2
      second = "also low" ~> 0.3
      third = "reliable" ~> 0.9
      first ~?? second ~?? third
    `);
    const result3 = await runtime.execute(program3);
    console.log(`Input: first = "low conf" ~> 0.2, second = "also low" ~> 0.3, third = "reliable" ~> 0.9`);
    console.log(`Expression: first ~?? second ~?? third`);
    console.log(`Result: ${result3.toString()}`);
    console.log(`✅ Expected: "reliable" (~90.0%), Got: ${result3.toString()}`);
    
    // Test 4: Regular values (should have full confidence)
    console.log('\n📊 Test 4: Regular values with coalesce');
    const program4 = parse(`
      regularValue = 42
      backup = "fallback" ~> 0.7
      regularValue ~?? backup
    `);
    const result4 = await runtime.execute(program4);
    console.log(`Input: regularValue = 42, backup = "fallback" ~> 0.7`);
    console.log(`Expression: regularValue ~?? backup`);
    console.log(`Result: ${result4.toString()}`);
    console.log(`✅ Expected: 42 (regular value), Got: ${result4.toString()}`);
    
    console.log('\n🎉 All confidence coalesce tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testConfidenceCoalesce().catch(console.error);