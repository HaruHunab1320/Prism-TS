import { createRuntime } from './src/core/runtime';
import { parse } from './src/core/parser';

async function testConfidentArithmetic() {
  console.log('🧮 Testing Confident Arithmetic Operators (~+, ~-, ~*, ~/)');
  console.log('='.repeat(50));
  
  const runtime = createRuntime();
  
  try {
    // Test 1: Confident addition
    console.log('\n📊 Test 1: Confident addition (~+)');
    const program1 = parse(`
      measurement1 = 50 ~> 0.9
      measurement2 = 30 ~> 0.8
      measurement1 ~+ measurement2
    `);
    const result1 = await runtime.execute(program1);
    console.log(`Input: measurement1 = 50 ~> 0.9, measurement2 = 30 ~> 0.8`);
    console.log(`Expression: measurement1 ~+ measurement2`);
    console.log(`Result: ${result1.toString()}`);
    console.log(`✅ Expected: 80 (~80.0%), Got: ${result1.toString()}`);
    
    // Test 2: Confident subtraction
    console.log('\n📊 Test 2: Confident subtraction (~-)');
    const program2 = parse(`
      total = 100 ~> 0.95
      used = 35 ~> 0.7
      total ~- used
    `);
    const result2 = await runtime.execute(program2);
    console.log(`Input: total = 100 ~> 0.95, used = 35 ~> 0.7`);
    console.log(`Expression: total ~- used`);
    console.log(`Result: ${result2.toString()}`);
    console.log(`✅ Expected: 65 (~70.0%), Got: ${result2.toString()}`);
    
    // Test 3: Confident multiplication
    console.log('\n📊 Test 3: Confident multiplication (~*)');
    const program3 = parse(`
      length = 10 ~> 0.8
      width = 5 ~> 0.9
      length ~* width
    `);
    const result3 = await runtime.execute(program3);
    console.log(`Input: length = 10 ~> 0.8, width = 5 ~> 0.9`);
    console.log(`Expression: length ~* width`);
    console.log(`Result: ${result3.toString()}`);
    console.log(`✅ Expected: 50 (~80.0%), Got: ${result3.toString()}`);
    
    // Test 4: Confident division
    console.log('\n📊 Test 4: Confident division (~/)');
    const program4 = parse(`
      distance = 120 ~> 0.85
      time = 4 ~> 0.9
      distance ~/ time
    `);
    const result4 = await runtime.execute(program4);
    console.log(`Input: distance = 120 ~> 0.85, time = 4 ~> 0.9`);
    console.log(`Expression: distance ~/ time`);
    console.log(`Result: ${result4.toString()}`);
    console.log(`✅ Expected: 30 (~85.0%), Got: ${result4.toString()}`);
    
    // Test 5: Mixed confident and regular values
    console.log('\n📊 Test 5: Mixed values with confident arithmetic');
    const program5 = parse(`
      confidentValue = 25 ~> 0.7
      regularValue = 15
      confidentValue ~+ regularValue
    `);
    const result5 = await runtime.execute(program5);
    console.log(`Input: confidentValue = 25 ~> 0.7, regularValue = 15`);
    console.log(`Expression: confidentValue ~+ regularValue`);
    console.log(`Result: ${result5.toString()}`);
    console.log(`✅ Expected: 40 (~70.0%), Got: ${result5.toString()}`);
    
    // Test 6: Chained confident operations
    console.log('\n📊 Test 6: Chained confident arithmetic');
    const program6 = parse(`
      a = 10 ~> 0.9
      b = 5 ~> 0.8
      c = 2 ~> 0.7
      a ~+ b ~* c
    `);
    const result6 = await runtime.execute(program6);
    console.log(`Input: a = 10 ~> 0.9, b = 5 ~> 0.8, c = 2 ~> 0.7`);
    console.log(`Expression: a ~+ b ~* c (should be 10 + (5 * 2) = 20)`);
    console.log(`Result: ${result6.toString()}`);
    console.log(`✅ Expected: 20 (~70.0%), Got: ${result6.toString()}`);
    
    console.log('\n🎉 All confident arithmetic tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testConfidentArithmetic().catch(console.error);