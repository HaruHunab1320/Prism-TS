import { PrismREPL } from './src/repl';
import { LLMConfigManager } from './src/llm';

async function testLLMCommand() {
  console.log('🧪 Testing Enhanced :llm Command\n');
  
  const repl = new PrismREPL();
  
  // Set up providers
  const providers = LLMConfigManager.createFromEnvironment();
  const defaultProvider = LLMConfigManager.getDefaultProvider();
  
  for (const [name, provider] of Object.entries(providers)) {
    repl.registerLLMProvider(name, provider);
  }
  repl.setDefaultLLMProvider(defaultProvider);
  
  // Test the :llm command
  console.log('📝 Testing :llm command output:');
  const result = await repl.evaluate(':llm');
  
  if (result.success) {
    console.log(result.value);
  } else {
    console.log(`❌ Error: ${result.error}`);
  }
  
  console.log('\n🏆 :llm Command Test Complete!');
}

testLLMCommand().catch(console.error);