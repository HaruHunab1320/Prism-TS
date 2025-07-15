---
sidebar_position: 1
title: LLM Integration
---

# LLM Integration

Prism provides seamless integration with Large Language Models (LLMs) through the `@prism-lang/llm` package. This guide covers everything you need to know about integrating Claude, Gemini, and other LLM providers with your Prism applications.

## Installation

```bash
npm install @prism-lang/llm
# or
yarn add @prism-lang/llm
# or
pnpm add @prism-lang/llm
```

## Quick Start

```typescript
import { ClaudeProvider, LLMRequest } from '@prism-lang/llm';

// Initialize a provider
const claude = new ClaudeProvider(process.env.CLAUDE_API_KEY);

// Make a request
const request = new LLMRequest('What is the capital of France?');
const response = await claude.complete(request);

console.log(response.content); // "The capital of France is Paris."
console.log(response.confidence); // 0.9
```

## Supported Providers

### Claude (Anthropic)

Claude is Anthropic's state-of-the-art language model. Prism supports all Claude models.

```typescript
import { ClaudeProvider } from '@prism-lang/llm';

const claude = new ClaudeProvider(apiKey, {
  model: 'claude-3-haiku-20240307', // Default model
  baseUrl: 'https://api.anthropic.com',
  timeout: 30000,
  apiVersion: '2023-06-01',
  maxRetries: 3
});
```

**Available Models:**
- `claude-3-opus-20240229` - Most capable model
- `claude-3-sonnet-20240229` - Balanced performance
- `claude-3-haiku-20240307` - Fastest model (default)

### Gemini (Google)

Google's Gemini models offer excellent performance and embedding capabilities.

```typescript
import { GeminiProvider } from '@prism-lang/llm';

const gemini = new GeminiProvider(apiKey, {
  model: 'gemini-1.5-flash', // Default model
  baseUrl: 'https://generativelanguage.googleapis.com',
  timeout: 30000,
  apiVersion: 'v1beta'
});
```

**Available Models:**
- `gemini-1.5-pro` - Most capable model
- `gemini-1.5-flash` - Fast and efficient (default)
- `gemini-1.0-pro` - Previous generation

### Mock Provider

For testing and development, use the mock provider:

```typescript
import { MockLLMProvider } from '@prism-lang/llm';

const mock = new MockLLMProvider();
mock.setMockResponse('Test response', 0.75);
mock.setLatency(100); // Simulate 100ms latency
mock.setFailureRate(0.1); // 10% failure rate
```

## Configuration

### Environment Variables

The recommended way to configure API keys is through environment variables:

```bash
# .env file
CLAUDE_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...

# Alternative names also supported
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
```

### Configuration Manager

Use the configuration manager for automatic setup:

```typescript
import { LLMConfigManager } from '@prism-lang/llm';

// Create providers from environment
const providers = LLMConfigManager.createFromEnvironment();
// Returns: { claude: ClaudeProvider, gemini: GeminiProvider, mock: MockLLMProvider }

// Get available providers
const available = LLMConfigManager.getAvailableProviders();
// Returns: ['claude', 'gemini', 'mock']

// Check configuration status
const status = LLMConfigManager.getConfigStatus();
// Returns detailed status for each provider
```

### Manual Configuration

For more control, configure providers manually:

```typescript
import { ClaudeProvider, LLMProviderConfig } from '@prism-lang/llm';

const config: LLMProviderConfig = {
  type: 'claude',
  apiKey: 'sk-ant-...',
  model: 'claude-3-opus-20240229',
  timeout: 60000
};

const provider = LLMConfigManager.createProvider(config);
```

## Making Requests

### Basic Completion

```typescript
import { LLMRequest, LLMOptions } from '@prism-lang/llm';

const options: LLMOptions = {
  maxTokens: 1000,
  temperature: 0.7,
  topP: 0.95,
  timeout: 30000,
  model: 'claude-3-haiku-20240307'
};

const request = new LLMRequest('Your prompt here', options);
const response = await provider.complete(request);

// Response structure
console.log(response.content);    // The generated text
console.log(response.confidence); // Confidence score (0-1)
console.log(response.tokensUsed); // Number of tokens used
console.log(response.model);      // Model used
console.log(response.metadata);   // Additional metadata
```

### Context and System Prompts

```typescript
const request = new LLMRequest('Summarize this article', {
  context: 'You are a helpful assistant that creates concise summaries.',
  maxTokens: 200
});
```

### Embeddings (Gemini only)

```typescript
const embeddings = await gemini.embed('Text to embed');
// Returns: number[] (384-dimensional vector)
```

## Provider Registry

Use the registry pattern for managing multiple providers:

```typescript
import { LLMProviderRegistry } from '@prism-lang/llm';

const registry = new LLMProviderRegistry();

// Register providers
registry.register('claude', new ClaudeProvider(apiKey));
registry.register('gemini', new GeminiProvider(apiKey));
registry.setDefault('claude');

// Use providers
const response = await registry.complete(request); // Uses default
const response2 = await registry.complete(request, 'gemini'); // Uses specific
```

## Error Handling

All LLM operations can throw `LLMError`:

```typescript
import { LLMError } from '@prism-lang/llm';

try {
  const response = await provider.complete(request);
} catch (error) {
  if (error instanceof LLMError) {
    console.error(`LLM Error: ${error.message}`);
    console.error(`Code: ${error.code}`);
    console.error(`Context:`, error.context);
    
    // Handle specific error codes
    switch (error.code) {
      case 'TIMEOUT':
        // Handle timeout
        break;
      case 'MISSING_API_KEY':
        // Handle missing API key
        break;
      case 'HTTP_429':
        // Handle rate limit
        break;
    }
  }
}
```

### Common Error Codes

- `MISSING_API_KEY` - API key not provided
- `TIMEOUT` - Request timed out
- `API_ERROR` - General API error
- `HTTP_429` - Rate limit exceeded
- `HTTP_401` - Authentication failed
- `INVALID_RESPONSE` - Malformed API response
- `PROVIDER_NOT_FOUND` - Provider not registered

## Rate Limiting

Implement rate limiting to avoid API limits:

```typescript
import { RateLimiter } from '@prism-lang/llm';

const limiter = new RateLimiter(
  10,    // Max requests
  60000  // Per 60 seconds
);

// Use with requests
await limiter.acquire();
const response = await provider.complete(request);

// Check remaining tokens
console.log(limiter.remaining()); // 9
```

## Retry Logic

Implement automatic retry with exponential backoff:

```typescript
import { withRetry } from '@prism-lang/llm';

const response = await withRetry(
  () => provider.complete(request),
  {
    maxRetries: 3,
    delay: 1000,
    exponentialBackoff: true
  }
);
```

## Confidence Extraction

LLM responses include confidence scores:

```typescript
const response = await provider.complete(request);

// Automatic confidence based on response characteristics
console.log(response.confidence); // 0.85

// Claude confidence factors:
// - end_turn: 0.9 (natural completion)
// - max_tokens: 0.75 (truncated)
// - stop_sequence: 0.85 (stop sequence hit)

// Gemini confidence factors:
// - STOP: 0.9 (natural completion)
// - MAX_TOKENS: 0.7 (truncated)
// - Other: 0.6 (safety or other reasons)
```

## Best Practices

### 1. Always Use Environment Variables

```typescript
// Good
const claude = new ClaudeProvider(process.env.CLAUDE_API_KEY);

// Bad
const claude = new ClaudeProvider('sk-ant-hardcoded-key');
```

### 2. Handle Errors Gracefully

```typescript
async function queryLLM(prompt: string): Promise<string> {
  try {
    const response = await provider.complete(new LLMRequest(prompt));
    return response.content;
  } catch (error) {
    if (error instanceof LLMError && error.code === 'TIMEOUT') {
      // Retry with longer timeout
      return queryLLM(prompt);
    }
    // Log and return fallback
    console.error('LLM query failed:', error);
    return 'Unable to process request';
  }
}
```

### 3. Use Type-Safe Configuration

```typescript
import { LLMProviderConfig } from '@prism-lang/llm';

const config: LLMProviderConfig = {
  type: 'claude',
  apiKey: process.env.CLAUDE_API_KEY,
  model: 'claude-3-haiku-20240307',
  timeout: 30000
};

// Validate before using
const errors = LLMConfigManager.validateConfig(config);
if (errors.length > 0) {
  throw new Error(`Invalid config: ${errors.join(', ')}`);
}
```

### 4. Monitor Token Usage

```typescript
let totalTokens = 0;

async function trackUsage(request: LLMRequest): Promise<LLMResponse> {
  const response = await provider.complete(request);
  totalTokens += response.tokensUsed;
  
  if (totalTokens > 100000) {
    console.warn('High token usage:', totalTokens);
  }
  
  return response;
}
```

### 5. Use Provider Registry for Flexibility

```typescript
// Easy to switch providers
const registry = new LLMProviderRegistry();
registry.register('primary', new ClaudeProvider(claudeKey));
registry.register('fallback', new GeminiProvider(geminiKey));

async function robustQuery(request: LLMRequest): Promise<LLMResponse> {
  try {
    return await registry.complete(request, 'primary');
  } catch {
    // Fallback to secondary provider
    return await registry.complete(request, 'fallback');
  }
}
```

## Troubleshooting

### API Key Issues

```typescript
// Check if API keys are configured
const status = LLMConfigManager.getConfigStatus();
status.forEach(s => {
  console.log(`${s.provider}: ${s.status}`);
  if (s.details) console.log(`  ${s.details}`);
});

// Validate API key format
const isValid = LLMConfigManager.validateApiKey('claude', apiKey);
```

### Connection Issues

```typescript
// Test provider connectivity
async function testProvider(provider: LLMProvider): Promise<boolean> {
  try {
    const response = await provider.complete(
      new LLMRequest('Hello', { maxTokens: 10 })
    );
    return response.content.length > 0;
  } catch (error) {
    console.error(`Provider test failed:`, error);
    return false;
  }
}
```

### Performance Issues

```typescript
// Add request timing
async function timedRequest(request: LLMRequest): Promise<LLMResponse> {
  const start = Date.now();
  try {
    const response = await provider.complete(request);
    const duration = Date.now() - start;
    console.log(`Request completed in ${duration}ms`);
    return response;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`Request failed after ${duration}ms:`, error);
    throw error;
  }
}
```

### Debug Configuration

```typescript
// Show help and current configuration
console.log(LLMConfigManager.showConfigHelp());

// Check environment
console.log('Available providers:', LLMConfigManager.getAvailableProviders());
console.log('Default provider:', LLMConfigManager.getDefaultProvider());
```