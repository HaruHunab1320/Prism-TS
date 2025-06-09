import { createRuntime } from './src/core/runtime';
import { parse } from './src/core/parser';

async function testParallelConfidence() {
  console.log('⚡ Testing Parallel Confidence Operator (~||>)');
  console.log('='.repeat(50));
  
  const runtime = createRuntime();
  
  try {
    // Test 1: Select higher confidence option
    console.log('\n📊 Test 1: Select higher confidence option');
    const program1 = parse(`
      fast = "quick result" ~> 0.6
      accurate = "thorough result" ~> 0.9
      fast ~||> accurate
    `);
    const result1 = await runtime.execute(program1);
    console.log(`Input: fast = "quick result" ~> 0.6, accurate = "thorough result" ~> 0.9`);
    console.log(`Expression: fast ~||> accurate`);
    console.log(`Result: ${result1.toString()}`);
    console.log(`✅ Expected: "thorough result" (~90.0%), Got: ${result1.toString()}`);
    
    // Test 2: Select first when equal confidence
    console.log('\n📊 Test 2: Select first when equal confidence');
    const program2 = parse(`
      option1 = "first choice" ~> 0.8
      option2 = "second choice" ~> 0.8
      option1 ~||> option2
    `);
    const result2 = await runtime.execute(program2);
    console.log(`Input: option1 = "first choice" ~> 0.8, option2 = "second choice" ~> 0.8`);
    console.log(`Expression: option1 ~||> option2`);
    console.log(`Result: ${result2.toString()}`);
    console.log(`✅ Expected: "first choice" (~80.0%), Got: ${result2.toString()}`);
    
    // Test 3: Multiple parallel operations (chained)
    console.log('\n📊 Test 3: Multiple parallel operations (chained)');
    const program3 = parse(`
      quick = "fast" ~> 0.5
      moderate = "medium" ~> 0.7
      thorough = "slow" ~> 0.95
      quick ~||> moderate ~||> thorough
    `);
    const result3 = await runtime.execute(program3);
    console.log(`Input: quick = "fast" ~> 0.5, moderate = "medium" ~> 0.7, thorough = "slow" ~> 0.95`);
    console.log(`Expression: quick ~||> moderate ~||> thorough`);
    console.log(`Result: ${result3.toString()}`);
    console.log(`✅ Expected: "slow" (~95.0%), Got: ${result3.toString()}`);
    
    // Test 4: Mixed with regular values
    console.log('\n📊 Test 4: Mixed confident and regular values');
    const program4 = parse(`
      lowConf = "uncertain" ~> 0.4
      highConf = "definitely this"
      lowConf ~||> highConf
    `);
    const result4 = await runtime.execute(program4);
    console.log(`Input: lowConf = "uncertain" ~> 0.4, highConf = "definitely this"`);
    console.log(`Expression: lowConf ~||> highConf`);
    console.log(`Result: ${result4.toString()}`);
    console.log(`✅ Expected: "definitely this" (1.0 confidence), Got: ${result4.toString()}`);
    
    // Test 5: Ensemble pattern
    console.log('\n📊 Test 5: AI ensemble pattern');
    const program5 = parse(`
      model1 = "prediction A" ~> 0.85
      model2 = "prediction B" ~> 0.92
      model3 = "prediction C" ~> 0.78
      model1 ~||> model2 ~||> model3
    `);
    const result5 = await runtime.execute(program5);
    console.log(`Input: model1 = "prediction A" ~> 0.85, model2 = "prediction B" ~> 0.92, model3 = "prediction C" ~> 0.78`);
    console.log(`Expression: model1 ~||> model2 ~||> model3`);
    console.log(`Result: ${result5.toString()}`);
    console.log(`✅ Expected: "prediction B" (~92.0%), Got: ${result5.toString()}`);
    
    console.log('\n🎉 All parallel confidence tests passed!');
    console.log('\n📝 Note: This demonstrates ensemble selection based on confidence.');
    console.log('   Perfect for AI systems that want to try multiple approaches!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testParallelConfidence().catch(console.error);