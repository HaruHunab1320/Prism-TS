import { PrismREPL } from './src/repl';
import { MockLLMProvider } from './src/llm';
import { ConfidenceValue } from './src/confidence';

async function runEdgeCaseTests() {
  console.log('🧪 Testing Prism Language Edge Cases and Stress Scenarios 🧪\n');
  
  const repl = new PrismREPL();
  
  // Set up mock LLM with various responses
  const mockProvider = new MockLLMProvider();
  mockProvider.setMockResponse('Edge case response from AI system', new ConfidenceValue(0.75));
  repl.registerLLMProvider('mock', mockProvider);
  repl.setDefaultLLMProvider('mock');

  const edgeCases = [
    // Extreme confidence values
    { input: '100 ~> 1.0', description: 'Maximum confidence (100%)' },
    { input: '50 ~> 0.0', description: 'Minimum confidence (0%)' },
    { input: '75 ~> 0.001', description: 'Very low confidence' },
    { input: '25 ~> 0.999', description: 'Very high confidence' },
    
    // Division edge cases
    { input: '10 / 2', description: 'Normal division' },
    { input: '1 / 3', description: 'Floating point division' },
    { input: '7 / 0', description: 'Division by zero (should error)' },
    
    // Complex confidence propagation
    { input: 'a = 10 ~> 0.9', description: 'Setup confident value a' },
    { input: 'b = 20 ~> 0.1', description: 'Setup low confidence value b' },
    { input: 'c = 30 ~> 0.8', description: 'Setup medium confidence value c' },
    { input: 'a + b + c', description: 'Triple confidence propagation' },
    { input: '(a * b) + c', description: 'Mixed operations with confidence' },
    { input: 'a * (b + c)', description: 'Parentheses with confidence' },
    
    // Boundary testing for uncertain if
    { input: 'val1 = 1 ~> 0.70', description: 'Exactly at high threshold (70%)' },
    { input: 'val2 = 1 ~> 0.69', description: 'Just below high threshold' },
    { input: 'val3 = 1 ~> 0.50', description: 'Exactly at medium threshold (50%)' },
    { input: 'val4 = 1 ~> 0.49', description: 'Just below medium threshold' },
    
    { input: `result1 = 0
uncertain if (val1 ~> 0.7) {
  high { result1 = 1 }
  medium { result1 = 2 }
  low { result1 = 3 }
}
result1`, description: 'Uncertain if at high boundary' },
    
    { input: `result2 = 0
uncertain if (val2 ~> 0.7) {
  high { result2 = 1 }
  medium { result2 = 2 }
  low { result2 = 3 }
}
result2`, description: 'Uncertain if below high boundary' },
    
    // Long variable names and strings
    { input: 'very_long_variable_name_that_tests_parser_limits = 42', description: 'Long variable name' },
    { input: 'long_string = "This is a very long string that tests how well the parser and runtime handle extended text content with multiple words and spaces and punctuation marks!"', description: 'Long string literal' },
    
    // Nested operations
    { input: '((((10 + 5) * 2) - 3) / 4)', description: 'Deeply nested parentheses' },
    { input: 'nested = 5 ~> 0.8', description: 'Setup for nested confidence' },
    { input: '((nested + 10) * 2) ~> 0.9', description: 'Nested with new confidence' },
    
    // Complex boolean expressions
    { input: 'complex_bool = true && (false || true) && !false', description: 'Complex boolean logic' },
    { input: '(10 > 5) && (20 < 30) && (15 == 15)', description: 'Multiple comparisons' },
    
    // String edge cases
    { input: 'empty_string = ""', description: 'Empty string' },
    { input: 'space_string = " "', description: 'Space-only string' },
    { input: 'special_chars = "!@#$%^&*()_+-={}[]|\\:;\\\"<>?,./"', description: 'Special characters' },
    
    // Multiple LLM calls
    { input: 'llm1 = llm("First call")', description: 'First LLM call' },
    { input: 'llm2 = llm("Second call")', description: 'Second LLM call' },
    { input: 'llm3 = llm("Third call")', description: 'Third LLM call' },
    
    // Variable chaining
    { input: 'chain1 = 10', description: 'Start chain' },
    { input: 'chain2 = chain1 + 5', description: 'Chain step 2' },
    { input: 'chain3 = chain2 * 2', description: 'Chain step 3' },
    { input: 'chain4 = chain3 ~> 0.95', description: 'Add confidence to chain' },
    { input: 'final_chain = chain4 + chain1', description: 'Combine with confidence' },
    
    // Error recovery testing
    { input: 'bad syntax here', description: 'Syntax error test' },
    { input: '2 + 2', description: 'Recovery after syntax error' },
    { input: 'undefined_var + 1', description: 'Runtime error test' },
    { input: '3 + 3', description: 'Recovery after runtime error' },
    
    // Context with same variable names
    { input: 'global_var = 100', description: 'Global variable' },
    { input: 'in context TestScope { local_var = 200 }', description: 'Context with local var' },
    { input: 'global_var', description: 'Access global after context' },
  ];

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const testCase of edgeCases) {
    console.log(`\n🔬 ${testCase.description}`);
    console.log(`   Input: ${testCase.input.replace(/\n/g, '\\n')}`);
    
    try {
      const result = await repl.evaluate(testCase.input);
      
      if (result.success) {
        console.log(`   ✅ Result: ${result.value} (${result.type})`);
        successCount++;
      } else {
        console.log(`   ❌ Error: ${result.error}`);
        errors.push(`${testCase.description}: ${result.error}`);
        errorCount++;
      }
    } catch (error) {
      console.log(`   💥 Crash: ${error}`);
      errors.push(`${testCase.description}: CRASH - ${error}`);
      errorCount++;
    }
  }

  // Show detailed results
  console.log('\n' + '='.repeat(70));
  console.log('🧪 EDGE CASE TEST RESULTS:');
  console.log('='.repeat(70));
  console.log(`Total edge cases tested: ${edgeCases.length}`);
  console.log(`✅ Handled successfully: ${successCount}`);
  console.log(`❌ Errors encountered: ${errorCount}`);
  console.log(`Success rate: ${((successCount / edgeCases.length) * 100).toFixed(1)}%`);
  
  if (errors.length > 0) {
    console.log('\n🔍 Error Analysis:');
    errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  const stats = repl.getSessionStats();
  console.log(`\n📊 Final Session Stats:`);
  console.log(`Total evaluations: ${stats.totalEvaluations}`);
  console.log(`Success rate: ${stats.successfulEvaluations}/${stats.totalEvaluations} (${((stats.successfulEvaluations / stats.totalEvaluations) * 100).toFixed(1)}%)`);
  
  console.log('\n🏆 CONCLUSION:');
  if (successCount / edgeCases.length >= 0.9) {
    console.log('EXCELLENT: Prism handles edge cases very well!');
  } else if (successCount / edgeCases.length >= 0.8) {
    console.log('GOOD: Prism handles most edge cases correctly.');
  } else {
    console.log('NEEDS IMPROVEMENT: Several edge cases need attention.');
  }
  
  console.log('='.repeat(70));
}

runEdgeCaseTests().catch(console.error);