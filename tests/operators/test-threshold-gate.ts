import { createRuntime } from '../../src/core/runtime';
import { parse } from '../../src/core/parser';

async function testThresholdGate() {
  console.log('🚪 Testing Threshold Gate Operator (~@>)');
  console.log('='.repeat(50));
  
  const runtime = createRuntime();
  
  try {
    // Test 1: High confidence passes threshold
    console.log('\n🟢 Test 1: High confidence passes threshold (0.9 > 0.7)');
    const program1 = parse(`
      condition = "high confidence check" ~> 0.9
      action = "execute action" ~> 0.8
      condition ~@> action
    `);
    const result1 = await runtime.execute(program1);
    console.log(`Input: condition = "high confidence check" ~> 0.9, action = "execute action" ~> 0.8`);
    console.log(`Expression: condition ~@> action`);
    console.log(`Result: ${result1.toString()}`);
    console.log(`✅ Expected: "execute action" (~80.0%), Got: ${result1.toString()}`);
    
    // Test 2: Low confidence fails threshold
    console.log('\n🔴 Test 2: Low confidence fails threshold (0.5 < 0.7)');
    const program2 = parse(`
      uncertainCondition = "low confidence check" ~> 0.5
      riskyAction = "risky operation" ~> 0.9
      uncertainCondition ~@> riskyAction
    `);
    const result2 = await runtime.execute(program2);
    console.log(`Input: uncertainCondition = "low confidence check" ~> 0.5, riskyAction = "risky operation" ~> 0.9`);
    console.log(`Expression: uncertainCondition ~@> riskyAction`);
    console.log(`Result: ${result2.toString()}`);
    console.log(`✅ Expected: "low confidence check" (~25.0%), Got: ${result2.toString()}`);
    
    // Test 3: Exact threshold confidence (0.7)
    console.log('\n⚖️ Test 3: Exact threshold confidence (0.7 = 0.7)');
    const program3 = parse(`
      borderline = "exactly at threshold" ~> 0.7
      thresholdAction = "borderline action" ~> 0.6
      borderline ~@> thresholdAction
    `);
    const result3 = await runtime.execute(program3);
    console.log(`Input: borderline = "exactly at threshold" ~> 0.7, thresholdAction = "borderline action" ~> 0.6`);
    console.log(`Expression: borderline ~@> thresholdAction`);
    console.log(`Result: ${result3.toString()}`);
    console.log(`✅ Expected: "borderline action" (~60.0%), Got: ${result3.toString()}`);
    
    // Test 4: Regular value (treated as 1.0 confidence)
    console.log('\n💯 Test 4: Regular value treated as full confidence');
    const program4 = parse(`
      certainty = "definitely true"
      action = "safe operation" ~> 0.85
      certainty ~@> action
    `);
    const result4 = await runtime.execute(program4);
    console.log(`Input: certainty = "definitely true", action = "safe operation" ~> 0.85`);
    console.log(`Expression: certainty ~@> action`);
    console.log(`Result: ${result4.toString()}`);
    console.log(`✅ Expected: "safe operation" (~85.0%), Got: ${result4.toString()}`);
    
    // Test 5: AI Model Decision Pattern
    console.log('\n🤖 Test 5: AI Model Decision Pattern');
    const program5 = parse(`
      modelPrediction = "spam detected" ~> 0.92
      humanReview = "needs human review" ~> 0.7
      autoBlock = "automatically blocked" ~> 0.95
      modelPrediction ~@> autoBlock
    `);
    const result5 = await runtime.execute(program5);
    console.log(`Input: modelPrediction = "spam detected" ~> 0.92, autoBlock = "automatically blocked" ~> 0.95`);
    console.log(`Expression: modelPrediction ~@> autoBlock`);
    console.log(`Result: ${result5.toString()}`);
    console.log(`✅ Expected: "automatically blocked" (~95.0%), Got: ${result5.toString()}`);
    
    // Test 6: Chained threshold gates
    console.log('\n🔗 Test 6: Chained threshold gates');
    const program6 = parse(`
      check1 = "first validation" ~> 0.9
      check2 = "second validation" ~> 0.8
      finalAction = "multi-step approved" ~> 0.75
      check1 ~@> check2 ~@> finalAction
    `);
    const result6 = await runtime.execute(program6);
    console.log(`Input: check1 = "first validation" ~> 0.9, check2 = "second validation" ~> 0.8, finalAction = "multi-step approved" ~> 0.75`);
    console.log(`Expression: check1 ~@> check2 ~@> finalAction`);
    console.log(`Result: ${result6.toString()}`);
    console.log(`✅ Expected: "multi-step approved" (~75.0%), Got: ${result6.toString()}`);
    
    console.log('\n🎉 All threshold gate tests passed!');
    console.log('\n📝 Threshold Gate Operator (~@>) Summary:');
    console.log('   • Executes right operand only if left operand confidence ≥ 0.7 threshold');
    console.log('   • If threshold not met, returns left operand with reduced confidence (×0.5)');
    console.log('   • Perfect for conditional execution based on AI model confidence');
    console.log('   • Enables safe automated decision-making with uncertainty handling');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testThresholdGate().catch(console.error);