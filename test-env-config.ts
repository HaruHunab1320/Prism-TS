import { LLMConfigManager } from './src/llm';

async function testEnvConfig() {
  console.log('🧪 Testing .env Configuration\n');

  // Test API key detection
  console.log('🔍 API Key Detection:');
  const claudeKey = LLMConfigManager.getApiKey('claude');
  const geminiKey = LLMConfigManager.getApiKey('gemini');
  
  console.log(`Claude API Key: ${claudeKey ? 'Found (' + claudeKey.substring(0, 10) + '...)' : 'Not found'}`);
  console.log(`Gemini API Key: ${geminiKey ? 'Found (' + geminiKey.substring(0, 10) + '...)' : 'Not found'}`);

  // Test key validation
  console.log('\n✅ API Key Validation:');
  if (claudeKey) {
    console.log(`Claude key valid: ${LLMConfigManager.validateApiKey('claude', claudeKey)}`);
  }
  if (geminiKey) {
    console.log(`Gemini key valid: ${LLMConfigManager.validateApiKey('gemini', geminiKey)}`);
  }

  // Test provider creation
  console.log('\n🤖 Provider Creation:');
  try {
    const providers = LLMConfigManager.createFromEnvironment();
    console.log(`Created providers: ${Object.keys(providers).join(', ')}`);
  } catch (error) {
    console.log(`Error creating providers: ${error}`);
  }

  // Test configuration status
  console.log('\n📊 Configuration Status:');
  const status = LLMConfigManager.getConfigStatus();
  status.forEach(item => {
    console.log(`${item.provider}: ${item.status}`);
    if (item.details) {
      console.log(`  Details: ${item.details}`);
    }
  });

  // Test available providers
  console.log('\n🌟 Available Providers:');
  const available = LLMConfigManager.getAvailableProviders();
  console.log(`Available: ${available.join(', ')}`);
  console.log(`Default: ${LLMConfigManager.getDefaultProvider()}`);

  console.log('\n🏆 .env Configuration Test Complete!');
}

testEnvConfig().catch(console.error);