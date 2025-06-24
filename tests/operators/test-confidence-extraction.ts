import { createRuntime } from '../../src/core/runtime';
import { parse } from '../../src/core/parser';

async function testConfidenceExtraction() {
  console.log('🧪 Testing Confidence Extraction Operator (<~)');
  console.log('='.repeat(50));
  
  const runtime = createRuntime();
  
  try {
    // Test 1: Extract confidence from confident value
    console.log('\n📊 Test 1: Extract confidence from confident value');
    const program1 = parse(`
      measurement = 100 ~> 0.85
      <~ measurement
    `);
    const result1 = await runtime.execute(program1);
    console.log(`Input: measurement = 100 ~> 0.85`);
    console.log(`Expression: <~ measurement`);
    console.log(`Result: ${result1.value} (type: ${result1.type})`);
    console.log(`✅ Expected: 0.85, Got: ${result1.value}`);
    
    // Test 2: Extract confidence from regular value
    console.log('\n📊 Test 2: Extract confidence from regular value');
    const program2 = parse(`
      regularValue = 42
      <~ regularValue
    `);
    const result2 = await runtime.execute(program2);
    console.log(`Input: regularValue = 42`);
    console.log(`Expression: <~ regularValue`);
    console.log(`Result: ${result2.value} (type: ${result2.type})`);
    console.log(`✅ Expected: 1.0, Got: ${result2.value}`);
    
    // Test 3: Chained operations
    console.log('\n📊 Test 3: Using extraction in expressions');
    const program3 = parse(`
      data1 = 50 ~> 0.9
      data2 = 30 ~> 0.7
      conf1 = <~ data1
      conf2 = <~ data2
      conf1 + conf2
    `);
    const result3 = await runtime.execute(program3);
    console.log(`Input: data1 = 50 ~> 0.9, data2 = 30 ~> 0.7`);
    console.log(`Expression: (<~ data1) + (<~ data2)`);
    console.log(`Result: ${result3.value} (type: ${result3.type})`);
    console.log(`✅ Expected: 1.6, Got: ${result3.value}`);
    
    console.log('\n🎉 All confidence extraction tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testConfidenceExtraction().catch(console.error);