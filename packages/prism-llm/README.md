# @prism-lang/llm

LLM provider integrations for the Prism programming language. Supports multiple providers with automatic fallback and confidence extraction.

## Installation

```bash
npm install @prism-lang/llm
```

## Features

- **Multiple Providers**: Claude (Anthropic), Gemini (Google), OpenAI support
- **Automatic Fallback**: Configurable provider priority
- **Mock Provider**: For testing without API calls
- **Confidence Integration**: Works seamlessly with Prism's confidence system
- **Environment Configuration**: Automatic setup from environment variables

## Quick Start

```javascript
import { LLMConfigManager, LLMProviderRegistry } from '@prism-lang/llm';

// Automatic setup from environment
const providers = LLMConfigManager.createFromEnvironment();
const registry = LLMConfigManager.createRegistry(providers);

// Make a request
const request = new LLMRequest('What is the weather like?');
const response = await registry.complete(request);

console.log(response.content);     // "I cannot check current weather..."
console.log(response.confidence);  // 0.95
```

## Environment Configuration

Set your API keys in environment variables:

```bash
export CLAUDE_API_KEY=your-claude-key
export GEMINI_API_KEY=your-gemini-key
export OPENAI_API_KEY=your-openai-key
```

The library automatically detects available providers and sets the default based on priority:
1. Claude (if CLAUDE_API_KEY is set)
2. Gemini (if GEMINI_API_KEY is set)
3. OpenAI (if OPENAI_API_KEY is set)
4. Mock (always available)

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
print("Confidence: " + conf)
```

## Providers

### Claude (Anthropic)
```javascript
import { ClaudeProvider } from '@prism-lang/llm';

const claude = new ClaudeProvider(apiKey);
const response = await claude.complete(request);
```

### Gemini (Google)
```javascript
import { GeminiProvider } from '@prism-lang/llm';

const gemini = new GeminiProvider(apiKey);
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
  systemPrompt?: string;
  timeout?: number;
})
```

### LLMResponse
```javascript
interface LLMResponse {
  content: string;
  confidence: number;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
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