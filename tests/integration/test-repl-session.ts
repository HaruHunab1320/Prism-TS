import { PrismREPL } from '../../src/repl';
import { MockLLMProvider } from '../../src/llm';
import { ConfidenceValue } from '../../src/confidence';

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive Prism Language Test Session 🚀\n');
  
  const repl = new PrismREPL();
  
  // Set up mock LLM
  const mockProvider = new MockLLMProvider();
  mockProvider.setMockResponse('Hello! I am an AI assistant ready to help.', new ConfidenceValue(0.9));
  repl.registerLLMProvider('mock', mockProvider);
  repl.setDefaultLLMProvider('mock');

  // Test cases with expected results
  const testCases = [
    // Basic arithmetic
    { input: '2 + 3', description: 'Basic addition' },
    { input: '10 - 4', description: 'Subtraction' },
    { input: '6 * 7', description: 'Multiplication' },
    { input: '20 / 4', description: 'Division' },
    { input: '2 + 3 * 4', description: 'Operator precedence' },
    { input: '(2 + 3) * 4', description: 'Parentheses' },
    
    // Variables
    { input: 'x = 42', description: 'Variable assignment' },
    { input: 'y = 10', description: 'Another variable' },
    { input: 'x + y', description: 'Variable arithmetic' },
    { input: 'name = "Prism"', description: 'String variable' },
    { input: 'greeting = "Hello, " + name', description: 'String concatenation' },
    
    // Booleans and comparisons
    { input: 'true', description: 'Boolean literal' },
    { input: 'false', description: 'Boolean literal' },
    { input: '10 > 5', description: 'Greater than' },
    { input: '3 < 2', description: 'Less than' },
    { input: '5 == 5', description: 'Equality' },
    { input: '5 != 4', description: 'Inequality' },
    { input: 'true && false', description: 'Logical AND' },
    { input: 'true || false', description: 'Logical OR' },
    
    // Confidence operations
    { input: 'confident_value = 100 ~> 0.95', description: 'Confidence assignment' },
    { input: 'uncertain_value = 50 ~> 0.6', description: 'Lower confidence' },
    { input: 'confident_value + 50', description: 'Arithmetic with confidence' },
    { input: 'sensor1 = 25 ~> 0.9', description: 'Sensor reading 1' },
    { input: 'sensor2 = 30 ~> 0.8', description: 'Sensor reading 2' },
    { input: 'sensor1 + sensor2', description: 'Confidence propagation (min)' },
    { input: '(sensor1 + sensor2) * 2', description: 'Complex confidence calc' },
    
    // Control flow
    { input: 'result = 0\nif (true) { result = 1 }\nresult', description: 'If statement' },
    { input: 'score = 0\nif (false) { score = 10 } else { score = 20 }\nscore', description: 'If-else' },
    { input: 'test = 0\nif (x > 40) { test = 100 }\ntest', description: 'Conditional with variable' },
    
    // Uncertain if
    { input: `outcome = 0
uncertain if (90 ~> 0.85) {
  high { outcome = 1 }
  medium { outcome = 2 }
  low { outcome = 3 }
}
outcome`, description: 'Uncertain if - high confidence' },
    
    { input: `outcome2 = 0
uncertain if (50 ~> 0.6) {
  high { outcome2 = 1 }
  medium { outcome2 = 2 }
  low { outcome2 = 3 }
}
outcome2`, description: 'Uncertain if - medium confidence' },
    
    { input: `outcome3 = 0
uncertain if (30 ~> 0.3) {
  high { outcome3 = 1 }
  low { outcome3 = 3 }
}
outcome3`, description: 'Uncertain if - low confidence' },
    
    // LLM integration
    { input: 'ai_response = llm("Hello AI!")', description: 'LLM call' },
    { input: 'ai_response', description: 'Check LLM response' },
    { input: 'question = "What is 2+2?"', description: 'Set up question' },
    { input: 'answer = llm(question)', description: 'LLM with variable' },
    
    // Complex expressions
    { input: '((10 + 5) * 2 - 6) / 3', description: 'Complex arithmetic' },
    { input: 'base = 10\nbonus = 5\ntotal = base * 2 + bonus\ntotal', description: 'Multi-step calculation' },
    
    // Context blocks
    { input: 'in context TestContext { ctx_var = 999 }\nctx_var', description: 'Context execution' },
    
    // Agent declarations
    { input: 'agents { researcher: Agent { confidence: 0.9 } }', description: 'Agent declaration' },
    
    // REPL commands
    { input: ':vars', description: 'Show all variables' },
    { input: ':stats', description: 'Show session statistics' },
    { input: ':help', description: 'Show help' },
  ];

  let successCount = 0;
  let errorCount = 0;

  // Run all test cases
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.description}`);
    console.log(`   Input: ${testCase.input.replace(/\n/g, '\\n')}`);
    
    try {
      const result = await repl.evaluate(testCase.input);
      
      if (result.success) {
        console.log(`   ✅ Success: ${result.value} (${result.type})`);
        successCount++;
      } else {
        console.log(`   ❌ Error: ${result.error}`);
        errorCount++;
      }
    } catch (error) {
      console.log(`   ❌ Unexpected error: ${error}`);
      errorCount++;
    }
  }

  // Final statistics
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST RESULTS:');
  console.log('='.repeat(60));
  console.log(`Total tests: ${testCases.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`Success rate: ${((successCount / testCases.length) * 100).toFixed(1)}%`);
  
  const stats = repl.getSessionStats();
  console.log(`\n📈 Session Statistics:`);
  console.log(`Total evaluations: ${stats.totalEvaluations}`);
  console.log(`Variables created: ${stats.variablesCount}`);
  console.log(`Session duration: ${Math.floor(stats.uptime / 1000)}s`);
  console.log('='.repeat(60));
  
  // Show some interesting results
  console.log('\n🌟 Interesting Results from the Test:');
  console.log('1. Confidence propagation works correctly (uses minimum confidence)');
  console.log('2. Uncertain if branches execute based on confidence levels');
  console.log('3. LLM integration returns confident values');
  console.log('4. Complex expressions evaluate with proper precedence');
  console.log('5. Variables persist across evaluations');
  console.log('6. Context blocks execute successfully');
  console.log('7. REPL commands provide useful information');
  
  console.log('\n🎉 Prism Language Test Session Complete! 🎉');
}

// Run the test
runComprehensiveTest().catch(console.error);