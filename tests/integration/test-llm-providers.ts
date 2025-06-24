import { PrismREPL } from '../../src/repl';
import { LLMConfigManager } from '../../src/llm';

async function testLLMProviders() {
  console.log('🧪 Testing LLM Provider Integration\n');
  
  const repl = new PrismREPL();
  
  // Set up providers from environment
  const providers = LLMConfigManager.createFromEnvironment();
  const defaultProvider = LLMConfigManager.getDefaultProvider();
  
  console.log('📦 Available Providers:');
  for (const [name, provider] of Object.entries(providers)) {
    console.log(`  • ${name}: ${provider.name}`);
  }
  
  console.log(`\n🎯 Default Provider: ${defaultProvider}`);
  
  // Register all providers
  for (const [name, provider] of Object.entries(providers)) {
    repl.registerLLMProvider(name, provider);
  }
  repl.setDefaultLLMProvider(defaultProvider);
  
  // Test basic functionality
  console.log('\n🔍 Testing basic functionality:');
  
  const testCases = [
    ':llm',
    '2 + 3',
    'llm("Hello AI!")',
    'result = 42 ~> 0.9'
  ];
  
  for (const test of testCases) {
    console.log(`\n📝 Testing: ${test}`);
    try {
      const result = await repl.evaluate(test);
      if (result.success) {
        if (result.type === 'llm' || result.type === 'help') {
          console.log('✅ Success - command output displayed');
        } else {
          console.log(`✅ Result: ${result.value} (${result.type})`);
        }
      } else {
        console.log(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`💥 Exception: ${error}`);
    }
  }
  
  console.log('\n🏆 LLM Provider Integration Test Complete!');
}

testLLMProviders().catch(console.error);