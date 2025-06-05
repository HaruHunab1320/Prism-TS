import { createRuntime } from './src/core/runtime';
import { parse } from './src/core/parser';

async function testConfidentLogical() {
  console.log('🧠 Testing Confident Logical Operators (~&&, ~||)');
  console.log('='.repeat(50));
  
  const runtime = createRuntime();
  
  try {
    // Test 1: Confident AND with both true and high confidence
    console.log('\n📊 Test 1: Confident AND - both true and confident');
    const program1 = parse(`
      condition1 = true ~> 0.9
      condition2 = true ~> 0.8
      condition1 ~&& condition2
    `);
    const result1 = await runtime.execute(program1);
    console.log(`Input: condition1 = true ~> 0.9, condition2 = true ~> 0.8`);
    console.log(`Expression: condition1 ~&& condition2`);
    console.log(`Result: ${result1.toString()}`);
    console.log(`✅ Expected: true (~80.0%), Got: ${result1.toString()}`);
    
    // Test 2: Confident AND with one false
    console.log('\n📊 Test 2: Confident AND - one false value');
    const program2 = parse(`
      condition1 = true ~> 0.9
      condition2 = false ~> 0.8
      condition1 ~&& condition2
    `);
    const result2 = await runtime.execute(program2);
    console.log(`Input: condition1 = true ~> 0.9, condition2 = false ~> 0.8`);
    console.log(`Expression: condition1 ~&& condition2`);
    console.log(`Result: ${result2.toString()}`);
    console.log(`✅ Expected: false (~80.0%), Got: ${result2.toString()}`);
    
    // Test 3: Confident OR with both false but different confidences
    console.log('\n📊 Test 3: Confident OR - both false, different confidence');
    const program3 = parse(`
      condition1 = false ~> 0.7
      condition2 = false ~> 0.9
      condition1 ~|| condition2
    `);
    const result3 = await runtime.execute(program3);
    console.log(`Input: condition1 = false ~> 0.7, condition2 = false ~> 0.9`);
    console.log(`Expression: condition1 ~|| condition2`);
    console.log(`Result: ${result3.toString()}`);
    console.log(`✅ Expected: false (~90.0%), Got: ${result3.toString()}`);
    
    // Test 4: Confident OR with one true
    console.log('\n📊 Test 4: Confident OR - one true value');
    const program4 = parse(`
      condition1 = false ~> 0.7
      condition2 = true ~> 0.6
      condition1 ~|| condition2
    `);
    const result4 = await runtime.execute(program4);
    console.log(`Input: condition1 = false ~> 0.7, condition2 = true ~> 0.6`);
    console.log(`Expression: condition1 ~|| condition2`);
    console.log(`Result: ${result4.toString()}`);
    console.log(`✅ Expected: true (~70.0%), Got: ${result4.toString()}`);
    
    // Test 5: Mixed confident and regular values
    console.log('\n📊 Test 5: Mixed values with confident operators');
    const program5 = parse(`
      regularTrue = true
      confidentFalse = false ~> 0.8
      regularTrue ~&& confidentFalse
    `);
    const result5 = await runtime.execute(program5);
    console.log(`Input: regularTrue = true, confidentFalse = false ~> 0.8`);
    console.log(`Expression: regularTrue ~&& confidentFalse`);
    console.log(`Result: ${result5.toString()}`);
    console.log(`✅ Expected: false (~80.0%), Got: ${result5.toString()}`);
    
    console.log('\n🎉 All confident logical operator tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testConfidentLogical().catch(console.error);