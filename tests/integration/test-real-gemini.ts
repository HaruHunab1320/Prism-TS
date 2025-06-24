import { PrismREPL } from '../../src/repl';
import { LLMConfigManager } from '../../src/llm';

async function testRealGemini() {
  console.log('🧪 Testing Real Gemini API Integration\n');
  
  const repl = new PrismREPL();
  
  // Set up providers
  const providers = LLMConfigManager.createFromEnvironment();
  const defaultProvider = LLMConfigManager.getDefaultProvider();
  
  for (const [name, provider] of Object.entries(providers)) {
    repl.registerLLMProvider(name, provider);
  }
  repl.setDefaultLLMProvider(defaultProvider);
  
  console.log(`🤖 Using provider: ${defaultProvider}`);
  
  // Test simple LLM call
  console.log('\n📝 Testing simple LLM call:');
  try {
    const result = await repl.evaluate('greeting = llm("Say hello in a creative way!")');
    
    if (result.success) {
      console.log(`✅ Result: ${result.value}`);
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    console.log(`💥 Exception: ${error}`);
  }
  
  // Test confidence-aware call
  console.log('\n📝 Testing confidence handling:');
  try {
    const result = await repl.evaluate('confident_result = llm("What is 2+2?")');
    
    if (result.success) {
      console.log(`✅ Result: ${result.value}`);
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    console.log(`💥 Exception: ${error}`);
  }
  
  console.log('\n🏆 Real Gemini API Test Complete!');
}

testRealGemini().catch(console.error);