import { createRuntime } from './src/core/runtime';
import { parse } from './src/core/parser';

async function testConfidentComparison() {
  console.log('⚖️ Testing Confident Comparison Operators (~==, ~!=, ~<, ~>=, ~<=)');
  console.log('='.repeat(60));
  
  const runtime = createRuntime();
  
  try {
    // Test 1: Confident equality with same values
    console.log('\n📊 Test 1: Confident equality (~==) - same values');
    const program1 = parse(`
      value1 = 42 ~> 0.9
      value2 = 42 ~> 0.8
      value1 ~== value2
    `);
    const result1 = await runtime.execute(program1);
    console.log(`Input: value1 = 42 ~> 0.9, value2 = 42 ~> 0.8`);
    console.log(`Expression: value1 ~== value2`);
    console.log(`Result: ${result1.toString()}`);
    console.log(`✅ Expected: true (~80.0%), Got: ${result1.toString()}`);
    
    // Test 2: Confident equality with different values
    console.log('\n📊 Test 2: Confident equality (~==) - different values');
    const program2 = parse(`
      value1 = 42 ~> 0.9
      value2 = 24 ~> 0.8
      value1 ~== value2
    `);
    const result2 = await runtime.execute(program2);
    console.log(`Input: value1 = 42 ~> 0.9, value2 = 24 ~> 0.8`);
    console.log(`Expression: value1 ~== value2`);
    console.log(`Result: ${result2.toString()}`);
    console.log(`✅ Expected: false (~80.0%), Got: ${result2.toString()}`);
    
    // Test 3: Confident not equal
    console.log('\n📊 Test 3: Confident not equal (~!=)');
    const program3 = parse(`
      value1 = "hello" ~> 0.95
      value2 = "world" ~> 0.7
      value1 ~!= value2
    `);
    const result3 = await runtime.execute(program3);
    console.log(`Input: value1 = "hello" ~> 0.95, value2 = "world" ~> 0.7`);
    console.log(`Expression: value1 ~!= value2`);
    console.log(`Result: ${result3.toString()}`);
    console.log(`✅ Expected: true (~70.0%), Got: ${result3.toString()}`);
    
    // Test 4: Confident less than
    console.log('\n📊 Test 4: Confident less than (~<)');
    const program4 = parse(`
      temp1 = 25 ~> 0.8
      temp2 = 30 ~> 0.9
      temp1 ~< temp2
    `);
    const result4 = await runtime.execute(program4);
    console.log(`Input: temp1 = 25 ~> 0.8, temp2 = 30 ~> 0.9`);
    console.log(`Expression: temp1 ~< temp2`);
    console.log(`Result: ${result4.toString()}`);
    console.log(`✅ Expected: true (~80.0%), Got: ${result4.toString()}`);
    
    // Test 5: Confident greater or equal
    console.log('\n📊 Test 5: Confident greater or equal (~>=)');
    const program5 = parse(`
      score = 85 ~> 0.75
      threshold = 80 ~> 0.9
      score ~>= threshold
    `);
    const result5 = await runtime.execute(program5);
    console.log(`Input: score = 85 ~> 0.75, threshold = 80 ~> 0.9`);
    console.log(`Expression: score ~>= threshold`);
    console.log(`Result: ${result5.toString()}`);
    console.log(`✅ Expected: true (~75.0%), Got: ${result5.toString()}`);
    
    // Test 6: Confident less or equal
    console.log('\n📊 Test 6: Confident less or equal (~<=)');
    const program6 = parse(`
      usage = 45 ~> 0.85
      limit = 50 ~> 0.8
      usage ~<= limit
    `);
    const result6 = await runtime.execute(program6);
    console.log(`Input: usage = 45 ~> 0.85, limit = 50 ~> 0.8`);
    console.log(`Expression: usage ~<= limit`);
    console.log(`Result: ${result6.toString()}`);
    console.log(`✅ Expected: true (~80.0%), Got: ${result6.toString()}`);
    
    // Test 7: Mixed confident and regular values
    console.log('\n📊 Test 7: Mixed values with confident comparison');
    const program7 = parse(`
      confidentValue = 100 ~> 0.7
      regularValue = 90
      confidentValue ~>= regularValue
    `);
    const result7 = await runtime.execute(program7);
    console.log(`Input: confidentValue = 100 ~> 0.7, regularValue = 90`);
    console.log(`Expression: confidentValue ~>= regularValue`);
    console.log(`Result: ${result7.toString()}`);
    console.log(`✅ Expected: true (~70.0%), Got: ${result7.toString()}`);
    
    console.log('\n🎉 All confident comparison tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testConfidentComparison().catch(console.error);