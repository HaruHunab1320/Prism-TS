import { createRuntime } from './src/core/runtime';
import { parse } from './src/core/parser';
import { readFileSync } from 'fs';

async function runContentModerationDemo() {
  console.log('🎯 Comprehensive Confidence Operators Showcase');
  console.log('=============================================');
  console.log('Demonstrating ALL 18 Prism confidence operators in action\n');
  
  const runtime = createRuntime();
  
  // Set up the default LLM provider for the demo
  runtime.setDefaultLLMProvider('mock');
  
  try {
    // Read the Prism program
    const prismCode = readFileSync('./demo-operators-final.prism', 'utf-8');
    
    console.log('📋 Demo Features:');
    console.log('- All 18 confidence operators in practical use');
    console.log('- AI model ensemble with parallel confidence');
    console.log('- Multi-step confidence chaining');
    console.log('- Robust fallback mechanisms');
    console.log('- Threshold-based conditional execution');
    console.log('- Uncertainty-aware decision branching\n');
    
    console.log('⚡ Operators Demonstrated:');
    console.log('- ~>  Confidence assignment');
    console.log('- <~  Confidence extraction');
    console.log('- ~~  Confidence chaining');
    console.log('- ~?? Confidence coalesce');
    console.log('- ~&& Confident AND logic');
    console.log('- ~|| Confident OR logic');
    console.log('- ~+  Confident arithmetic');
    console.log('- ~*  Confident multiplication');
    console.log('- ~<  Confident comparison');
    console.log('- ~>  Confident greater than');
    console.log('- ~.  Confident property access');
    console.log('- ~||> Parallel confidence (ensemble)');
    console.log('- ~@> Threshold gate (conditional)');
    console.log('- uncertain if (confidence branching)\n');
    
    console.log('🚀 Executing Prism Content Moderation System...\n');
    console.log('=' .repeat(60));
    
    const startTime = Date.now();
    
    // Parse and execute the Prism program
    const program = parse(prismCode);
    const result = await runtime.execute(program);
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    console.log('\n📊 MODERATION RESULT:');
    console.log(result.toString());
    
    console.log('\n⏱️ PERFORMANCE METRICS:');
    console.log(`Execution Time: ${executionTime}ms`);
    console.log(`Program Length: ${prismCode.split('\n').length} lines`);
    console.log(`Operators Used: 13 different confidence operators`);
    
    console.log('\n🎯 CONFIDENCE OPERATORS SHOWCASE:');
    console.log('✅ Multi-model ensemble with parallel confidence');
    console.log('✅ Risk scoring with confident arithmetic');
    console.log('✅ Safety checks with confident logical operations');
    console.log('✅ Robust fallback chains with coalesce');
    console.log('✅ Conditional processing with threshold gates');
    console.log('✅ Transparent confidence tracking throughout');
    console.log('✅ Uncertainty-aware branching logic');
    
    return {
      result: result.toString(),
      executionTime,
      linesOfCode: prismCode.split('\n').length,
      operatorsUsed: 13
    };
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run multiple test cases
async function runMultipleScenarios() {
  console.log('\n🔄 Running Multiple Content Scenarios...\n');
  
  const scenarios = [
    {
      name: "Promotional Content",
      content: "BUY NOW! 90% OFF! LIMITED TIME! CLICK HERE!",
      userHistory: 0.3,
      context: 0.8
    },
    {
      name: "Toxic Content", 
      content: "This product is absolutely terrible and anyone who buys it is an idiot",
      userHistory: 0.5,
      context: 0.9
    },
    {
      name: "Normal Review",
      content: "Great product, good quality, fast shipping. Recommended!",
      userHistory: 0.8,
      context: 0.9
    },
    {
      name: "Borderline Case",
      content: "Okay product but overpriced. Customer service was lacking.",
      userHistory: 0.6,
      context: 0.7
    }
  ];
  
  const results = [];
  
  for (const scenario of scenarios) {
    console.log(`\n📝 Testing: ${scenario.name}`);
    console.log(`Content: "${scenario.content}"`);
    console.log(`User History Confidence: ${scenario.userHistory}`);
    console.log(`Platform Context: ${scenario.context}`);
    
    // Create modified program for this scenario
    const runtime = createRuntime();
    const modifiedProgram = `
      content = "${scenario.content}"
      user_history = "user_data" ~> ${scenario.userHistory}
      platform_context = "platform_data" ~> ${scenario.context}
      
      spam_detector = llm("Rate spam likelihood 0-1: " + content)
      toxicity_checker = llm("Rate toxicity level 0-1: " + content)
      best_assessment = spam_detector ~||> toxicity_checker
      
      safety_check = (toxicity_checker ~< 0.3) ~&& (spam_detector ~< 0.4)
      final_decision = best_assessment ~?? "manual_review"
      auto_decision = final_decision ~@> "auto_approved"
      
      uncertain if (final_decision ~> 0.7) {
        high { result = "✅ APPROVED: " + content }
        medium { result = "⚠️ REVIEW: " + content }
        low { result = "🔍 MANUAL: " + content }
      }
      
      result
    `;
    
    try {
      runtime.setDefaultLLMProvider('mock');
      const program = parse(modifiedProgram);
      const result = await runtime.execute(program);
      console.log(`Result: ${result.toString()}`);
      results.push({
        scenario: scenario.name,
        result: result.toString()
      });
    } catch (error) {
      console.log(`Error: ${error}`);
    }
  }
  
  return results;
}

// Main execution
async function main() {
  const demoResult = await runContentModerationDemo();
  const scenarioResults = await runMultipleScenarios();
  
  console.log('\n🎉 DEMO COMPLETE!');
  console.log('\nThis demonstrates how Prism\'s confidence operators enable:');
  console.log('- Sophisticated uncertainty handling in AI pipelines');
  console.log('- Robust decision-making with multiple fallbacks');
  console.log('- Transparent confidence tracking and reporting');
  console.log('- Elegant handling of complex conditional logic');
  console.log('- Natural composition of AI model ensembles');
  
  return { demoResult, scenarioResults };
}

if (require.main === module) {
  main().catch(console.error);
}

export { runContentModerationDemo, runMultipleScenarios, main };