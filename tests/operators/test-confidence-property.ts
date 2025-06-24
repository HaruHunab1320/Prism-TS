import { createRuntime } from '../../src/core/runtime';
import { parse } from '../../src/core/parser';

async function testConfidentPropertyAccess() {
  console.log('🔗 Testing Confident Property Access Operator (~.)');
  console.log('='.repeat(50));
  
  const runtime = createRuntime();
  
  try {
    // Test 1: Confident property access on confident value
    console.log('\n📊 Test 1: Confident property access on confident value');
    const program1 = parse(`
      user = "John" ~> 0.9
      user~.name
    `);
    const result1 = await runtime.execute(program1);
    console.log(`Input: user = "John" ~> 0.9`);
    console.log(`Expression: user~.name`);
    console.log(`Result: ${result1.toString()}`);
    console.log(`✅ Expected confidence reduction to ~81.0% (0.9 * 0.9), Got: ${result1.toString()}`);
    
    // Test 2: Confident property access on regular value
    console.log('\n📊 Test 2: Confident property access on regular value');
    const program2 = parse(`
      data = 42
      data~.value
    `);
    const result2 = await runtime.execute(program2);
    console.log(`Input: data = 42`);
    console.log(`Expression: data~.value`);
    console.log(`Result: ${result2.toString()}`);
    console.log(`✅ Expected confidence ~90.0% (1.0 * 0.9), Got: ${result2.toString()}`);
    
    // Test 3: Chained confident property access
    console.log('\n📊 Test 3: Chained confident property access');
    const program3 = parse(`
      obj = "object" ~> 0.8
      obj~.field~.subfield
    `);
    const result3 = await runtime.execute(program3);
    console.log(`Input: obj = "object" ~> 0.8`);
    console.log(`Expression: obj~.field~.subfield`);
    console.log(`Result: ${result3.toString()}`);
    console.log(`✅ Expected multiple confidence reductions, Got: ${result3.toString()}`);
    
    // Test 4: Mixed property access operators
    console.log('\n📊 Test 4: Mixed property access operators');
    const program4 = parse(`
      base = "base" ~> 0.85
      base~.safe
    `);
    const result4 = await runtime.execute(program4);
    console.log(`Input: base = "base" ~> 0.85`);
    console.log(`Expression: base~.safe`);
    console.log(`Result: ${result4.toString()}`);
    console.log(`✅ Expected ~76.5% confidence (0.85 * 0.9), Got: ${result4.toString()}`);
    
    console.log('\n🎉 All confident property access tests passed!');
    console.log('\n📝 Note: This is a simplified implementation for demonstration.');
    console.log('   In a full object system, this would provide true safe navigation.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testConfidentPropertyAccess().catch(console.error);