import { PrismREPL } from './src/repl';
import { LLMConfigManager } from './src/llm';

async function testScopingFixes() {
  console.log('🔧 Testing Prism Scoping Bug Fixes 🔧\n');
  
  const repl = new PrismREPL();
  
  // Set up real providers
  const providers = LLMConfigManager.createFromEnvironment();
  const defaultProvider = LLMConfigManager.getDefaultProvider();
  
  for (const [name, provider] of Object.entries(providers)) {
    repl.registerLLMProvider(name, provider);
  }
  repl.setDefaultLLMProvider(defaultProvider);
  
  console.log(`🤖 Using provider: ${defaultProvider}\n`);
  
  const fixTests = [
    // === FIX 1: Variable Confidence Assignment ===
    {
      description: "❌ Previously failed: Variable confidence assignment",
      setup: "data_quality = 0.8\nmeasurement = 100",
      test: "processed = (measurement * 2) ~> data_quality",
      expectSuccess: true
    },
    
    // === FIX 2: Context Variable Scoping ===
    {
      description: "❌ Previously failed: Context variable scoping",
      setup: "",
      test: `in context DataAnalysis {
  research_topic = "artificial intelligence"
  findings = "AI is advancing rapidly"
}
findings`,
      expectSuccess: true
    },
    {
      description: "❌ Previously failed: Multiple context usage",
      setup: "",
      test: `in context MedicalResearch {
  symptoms = "fever, cough, fatigue"
}
in context TreatmentPlan {
  treatment = "rest and fluids"
}
combined = symptoms + " | Treatment: " + treatment`,
      expectSuccess: true
    },
    
    // === FIX 3: LLM Variable Arguments ===
    {
      description: "❌ Previously failed: LLM with variable arguments",
      setup: 'research_question = "What is quantum computing?"',
      test: "initial_research = llm(research_question)",
      expectSuccess: true
    },
    {
      description: "❌ Previously failed: Chained LLM calls",
      setup: 'topic = "sustainable energy"',
      test: `overview = llm("Give me an overview of " + topic)
deep_dive = llm("Based on this overview: " + overview + " - What are the biggest challenges?")`,
      expectSuccess: true
    },
    
    // === VERIFICATION: Previously Working Features Still Work ===
    {
      description: "✅ Should still work: Basic confidence",
      setup: "",
      test: "basic_conf = 100 ~> 0.85",
      expectSuccess: true
    },
    {
      description: "✅ Should still work: LLM with string literal",
      setup: "",
      test: 'direct_llm = llm("Tell me a joke about programming")',
      expectSuccess: true
    },
    {
      description: "✅ Should still work: Uncertain if statement",
      setup: "confident_value = 90 ~> 0.9",
      test: `result = 0
uncertain if (confident_value ~> 0.8) {
  high { result = 1 }
  medium { result = 2 }
  low { result = 3 }
}
result`,
      expectSuccess: true
    }
  ];
  
  let successCount = 0;
  let totalTests = fixTests.length;
  
  for (let i = 0; i < fixTests.length; i++) {
    const test = fixTests[i];
    console.log(`\n🧪 Test ${i + 1}/${totalTests}: ${test.description}`);
    
    // Run setup if provided
    if (test.setup) {
      console.log(`📋 Setup: ${test.setup.replace(/\n/g, '\\n')}`);
      try {
        await repl.evaluate(test.setup);
      } catch (error) {
        console.log(`⚠️  Setup failed: ${error}`);
        continue;
      }
    }
    
    console.log(`📝 Test: ${test.test.replace(/\n/g, '\\n')}`);
    
    try {
      const result = await repl.evaluate(test.test);
      
      if (result.success) {
        console.log(`✅ SUCCESS: ${result.value}`);
        successCount++;
      } else {
        console.log(`❌ FAILED: ${result.error}`);
        if (test.expectSuccess) {
          console.log(`   ⚠️  This was expected to pass after fixes!`);
        }
      }
    } catch (error) {
      console.log(`💥 EXCEPTION: ${error}`);
      if (test.expectSuccess) {
        console.log(`   ⚠️  This was expected to pass after fixes!`);
      }
    }
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Calculate results
  const successRate = ((successCount / totalTests) * 100).toFixed(1);
  const previouslyFailedTests = fixTests.filter(t => t.description.includes('Previously failed'));
  const fixedTests = previouslyFailedTests.filter((_, i) => {
    const testIndex = fixTests.findIndex(test => test === fixTests[i]);
    return testIndex < successCount;
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('🔧 SCOPING FIXES TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`📊 Overall Success Rate: ${successCount}/${totalTests} (${successRate}%)`);
  console.log(`🛠️  Previously Failed Tests: ${previouslyFailedTests.length}`);
  console.log(`✅ Tests Fixed: ${fixedTests.length}`);
  console.log(`🎯 Fix Success Rate: ${fixedTests.length}/${previouslyFailedTests.length} (${((fixedTests.length / previouslyFailedTests.length) * 100).toFixed(1)}%)`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! All scoping bugs have been fixed! 🎉');
  } else {
    console.log(`\n⚠️  ${totalTests - successCount} tests still failing. More work needed.`);
  }
  
  console.log('='.repeat(70));
}

testScopingFixes().catch(console.error);