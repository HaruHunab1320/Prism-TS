# @prism-lang/llm

LLM provider integrations for the Prism programming language. Supports multiple providers with automatic fallback and confidence extraction.

📚 **[Full Documentation](https://docs.prismlang.dev/)** | 🤖 **[LLM Guide](https://docs.prismlang.dev/docs/llm-integration)** | 🔧 **[API Reference](https://docs.prismlang.dev/docs/api/llm/)**

## Installation

```bash
npm install @prism-lang/llm
```

## Features

- **Multiple Providers**: Claude (Anthropic), Gemini (Google), Mock provider
- **Automatic Fallback**: Configurable provider priority
- **Mock Provider**: For testing without API calls
- **Confidence Integration**: Works seamlessly with Prism's confidence system
- **Environment Configuration**: Automatic setup from environment variables

## Quick Start

```javascript
import { LLMConfigManager, LLMProviderRegistry, LLMRequest } from '@prism-lang/llm';

// Automatic setup from environment
const providers = LLMConfigManager.createFromEnvironment();
const registry = new LLMProviderRegistry();

// Register providers
for (const [name, provider] of Object.entries(providers)) {
  registry.register(name, provider);
}
registry.setDefault(LLMConfigManager.getDefaultProvider());

// Make a request
const request = new LLMRequest('What is the weather like?');
const response = await registry.complete(request);

console.log(response.content);     // "I cannot check current weather..."
console.log(response.confidence);  // 0.95
```

## Environment Configuration

Set your API keys in environment variables:

```bash
export CLAUDE_API_KEY=your-claude-key      # or ANTHROPIC_API_KEY
export GEMINI_API_KEY=your-gemini-key      # or GOOGLE_API_KEY
```

The library automatically detects available providers and sets the default based on priority:
1. Claude (if CLAUDE_API_KEY or ANTHROPIC_API_KEY is set)
2. Gemini (if GEMINI_API_KEY or GOOGLE_API_KEY is set)
3. Mock (always available as fallback)

## Usage in Prism

When used within Prism code, the LLM integration is automatic:

```prism
// Uses the default provider
response = llm("Analyze this code for security issues")

// Specify a provider
response = llm("Translate to Spanish", { 
  model: "gemini",
  temperature: 0.3 
})

// Confidence is automatically attached
conf = <~ response
console.log("Confidence: " + conf)
```

## Providers

### Claude (Anthropic)
```javascript
import { ClaudeProvider, LLMRequest } from '@prism-lang/llm';

const claude = new ClaudeProvider(apiKey);
const request = new LLMRequest('Your prompt here');
const response = await claude.complete(request);
```

### Gemini (Google)
```javascript
import { GeminiProvider, LLMRequest } from '@prism-lang/llm';

const gemini = new GeminiProvider(apiKey);
const request = new LLMRequest('Your prompt here');
const response = await gemini.complete(request);
```

### Mock Provider
```javascript
import { MockLLMProvider } from '@prism-lang/llm';

const mock = new MockLLMProvider();
mock.setMockResponse('Test response', 0.85);
mock.setLatency(100); // Simulate network delay
```

## API Reference

### LLMRequest
```javascript
new LLMRequest(prompt: string, options?: {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  structuredOutput?: boolean;
  includeReasoning?: boolean;
})
```

### LLMResponse
```javascript
interface LLMResponse {
  content: string;
  confidence: number;
  tokensUsed: number;
  model: string;
  metadata?: {
    reasoning?: string;
    usage?: object;
  };
}
```

### Provider Registry
```javascript
const registry = new LLMProviderRegistry();
registry.register('claude', claudeProvider);
registry.setDefault('claude');

// Use specific provider
const response = await registry.complete(request, 'claude');

// Use default provider
const response = await registry.complete(request);
```

## Integration with @prism-lang/confidence

The LLM package integrates seamlessly with confidence extraction:

```javascript
import { GeminiProvider, LLMRequest } from '@prism-lang/llm';
import { ConfidenceExtractor } from '@prism-lang/confidence';

const provider = new GeminiProvider(apiKey);
const extractor = new ConfidenceExtractor();

// Get unstructured response and extract confidence
const request = new LLMRequest('What will happen to crypto prices?', {
  structuredOutput: false
});
const response = await provider.complete(request);

// Extract confidence from the response text
const extracted = await extractor.fromResponseAnalysis(response.content);
console.log('Extracted confidence:', extracted.value);
console.log('Hedging indicators:', extracted.metadata?.hedgingIndicators);
```

## Testing

The mock provider is perfect for testing:

```javascript
describe('My LLM feature', () => {
  it('should handle responses', async () => {
    const mock = new MockLLMProvider();
    mock.setMockResponse('Expected response', 0.9);
    
    registry.register('mock', mock);
    registry.setDefault('mock');
    
    // Your test code here
  });
});
```

## License

MIT