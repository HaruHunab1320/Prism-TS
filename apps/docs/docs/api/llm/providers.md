---
sidebar_position: 1
title: Providers API
---

# LLM Providers API

The Providers API enables integration with various Large Language Model providers through a unified interface.

## Overview

The provider system offers:
- Unified interface for multiple LLM providers
- Built-in providers (Claude, Gemini, Mock)
- Custom provider support
- Automatic confidence estimation
- Error handling and retries
- Rate limiting support

## Core Interfaces

### LLMProvider

```typescript
interface LLMProvider {
  readonly name: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
  embed(text: string): Promise<number[]>;
}
```

Base interface that all providers must implement.

**Methods:**
- `complete()`: Generate text completion
- `embed()`: Generate text embeddings (optional)

### LLMRequest

```typescript
class LLMRequest {
  constructor(
    readonly prompt: string,
    readonly options: LLMOptions = {}
  )
}
```

Encapsulates a request to an LLM.

### LLMResponse

```typescript
class LLMResponse {
  constructor(
    readonly content: string,
    readonly confidence: number,
    readonly tokensUsed: number = 0,
    readonly model: string = 'unknown',
    readonly metadata?: Record<string, unknown>
  )
}
```

Standardized response from any provider.

**Properties:**
- `content`: Generated text
- `confidence`: Confidence score (0-1)
- `tokensUsed`: Total tokens consumed
- `model`: Model identifier
- `metadata`: Provider-specific data

### LLMOptions

```typescript
interface LLMOptions {
  maxTokens?: number;      // Max output tokens
  temperature?: number;    // Randomness (0-1)
  topP?: number;          // Nucleus sampling
  timeout?: number;       // Request timeout (ms)
  context?: string;       // Additional context
  model?: string;         // Override model
  [key: string]: unknown; // Provider-specific
}
```

## Built-in Providers

### MockLLMProvider

Testing provider with configurable behavior.

```typescript
class MockLLMProvider implements LLMProvider {
  readonly name = 'Mock';
  
  setMockResponse(response: string, confidence: number): void
  setFailureRate(rate: number): void
  setLatency(ms: number): void
}
```

**Features:**
- Configurable responses
- Simulated failures
- Artificial latency
- Deterministic embeddings

**Example:**
```typescript
import { MockLLMProvider } from '@prism-lang/llm';

const mock = new MockLLMProvider();
mock.setMockResponse("Test response", 0.9);
mock.setLatency(100); // 100ms delay

const response = await mock.complete(
  new LLMRequest("Hello world")
);

console.log(response.content); // "Test response"
console.log(response.confidence); // 0.9
```

### ClaudeProvider

Anthropic Claude integration.

```typescript
class ClaudeProvider implements LLMProvider {
  readonly name = 'Claude';
  
  constructor(
    apiKey: string,
    config?: ClaudeConfig
  )
}
```

**Configuration:**
```typescript
interface ClaudeConfig {
  model?: string;        // Default: 'claude-3-haiku-20240307'
  baseUrl?: string;      // Default: 'https://api.anthropic.com'
  timeout?: number;      // Default: 30000
  apiVersion?: string;   // Default: '2023-06-01'
  maxRetries?: number;   // Retry attempts
}
```

**Features:**
- All Claude 3 models supported
- Automatic confidence estimation
- Structured error handling
- No embedding support

**Example:**
```typescript
import { ClaudeProvider } from '@prism-lang/llm';

const claude = new ClaudeProvider(
  process.env.CLAUDE_API_KEY!,
  {
    model: 'claude-3-opus-20240229',
    timeout: 60000
  }
);

const response = await claude.complete(
  new LLMRequest(
    "Explain quantum computing",
    { maxTokens: 500, temperature: 0.7 }
  )
);
```

### GeminiProvider

Google Gemini integration.

```typescript
class GeminiProvider implements LLMProvider {
  readonly name = 'Gemini';
  
  constructor(
    apiKey: string,
    config?: GeminiConfig
  )
}
```

**Configuration:**
```typescript
interface GeminiConfig {
  model?: string;        // Default: 'gemini-1.5-flash'
  baseUrl?: string;      // Default: 'https://generativelanguage.googleapis.com'
  timeout?: number;      // Default: 30000
  apiVersion?: string;   // Default: 'v1beta'
}
```

**Features:**
- Gemini 1.5 models
- Native embedding support
- Safety rating metadata
- Token usage tracking

**Example:**
```typescript
import { GeminiProvider } from '@prism-lang/llm';

const gemini = new GeminiProvider(
  process.env.GEMINI_API_KEY!,
  { model: 'gemini-1.5-pro' }
);

// Text generation
const response = await gemini.complete(
  new LLMRequest("Write a haiku about code")
);

// Embeddings
const embeddings = await gemini.embed(
  "This text will be embedded"
);
console.log(embeddings.length); // 768 dimensions
```

## Provider Registry

### LLMProviderRegistry

Manages multiple providers with default selection.

```typescript
class LLMProviderRegistry {
  register(name: string, provider: LLMProvider): void
  get(name: string): LLMProvider | undefined
  getDefault(): LLMProvider | undefined
  setDefault(name: string): void
  list(): string[]
  complete(request: LLMRequest, providerName?: string): Promise<LLMResponse>
  embed(text: string, providerName?: string): Promise<number[]>
}
```

**Example:**
```typescript
import { LLMProviderRegistry, ClaudeProvider, GeminiProvider } from '@prism-lang/llm';

const registry = new LLMProviderRegistry();

// Register providers
registry.register('claude', new ClaudeProvider(claudeKey));
registry.register('gemini', new GeminiProvider(geminiKey));

// Set default
registry.setDefault('claude');

// Use default provider
const response = await registry.complete(
  new LLMRequest("Hello")
);

// Use specific provider
const geminiResponse = await registry.complete(
  new LLMRequest("Hello"),
  'gemini'
);
```

### Default Registry

```typescript
import { defaultLLMRegistry } from '@prism-lang/llm';

// Pre-configured global registry
defaultLLMRegistry.register('mock', new MockLLMProvider());
```

## Error Handling

### LLMError

```typescript
class LLMError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly context?: Record<string, unknown>
  )
}
```

**Error Codes:**
- `MISSING_API_KEY`: No API key provided
- `API_ERROR`: Provider API error
- `TIMEOUT`: Request timeout
- `PROVIDER_NOT_FOUND`: Unknown provider
- `INVALID_RESPONSE`: Malformed response
- `EMBEDDING_NOT_SUPPORTED`: No embedding capability
- `HTTP_*`: HTTP status codes

**Example:**
```typescript
try {
  const response = await provider.complete(request);
} catch (error) {
  if (error instanceof LLMError) {
    console.error(`LLM Error [${error.code}]: ${error.message}`);
    console.error('Context:', error.context);
  }
}
```

## Utilities

### withRetry

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T>
```

Retry failed operations with backoff.

**Options:**
```typescript
interface RetryOptions {
  maxRetries: number;
  delay: number;              // Base delay (ms)
  exponentialBackoff?: boolean;
}
```

**Example:**
```typescript
const response = await withRetry(
  () => provider.complete(request),
  {
    maxRetries: 3,
    delay: 1000,
    exponentialBackoff: true
  }
);
```

### RateLimiter

```typescript
class RateLimiter {
  constructor(
    maxTokens: number,
    refillPeriod: number  // milliseconds
  )
  
  async acquire(): Promise<void>
  remaining(): number
}
```

Token bucket rate limiting.

**Example:**
```typescript
const limiter = new RateLimiter(10, 60000); // 10 requests per minute

for (const prompt of prompts) {
  await limiter.acquire(); // Wait if necessary
  const response = await provider.complete(
    new LLMRequest(prompt)
  );
}
```

## Custom Provider Implementation

### Example: OpenAI Provider

```typescript
import { LLMProvider, LLMRequest, LLMResponse, LLMError } from '@prism-lang/llm';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'OpenAI';
  
  constructor(
    private apiKey: string,
    private model: string = 'gpt-3.5-turbo'
  ) {}
  
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: request.options.model || this.model,
        messages: [{ role: 'user', content: request.prompt }],
        max_tokens: request.options.maxTokens || 1000,
        temperature: request.options.temperature || 0.7
      })
    });
    
    if (!response.ok) {
      throw new LLMError(
        `OpenAI API error: ${response.statusText}`,
        `HTTP_${response.status}`
      );
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    const tokensUsed = data.usage.total_tokens;
    
    // Estimate confidence based on model and parameters
    const confidence = this.estimateConfidence(
      data.choices[0].finish_reason,
      request.options.temperature || 0.7
    );
    
    return new LLMResponse(
      content,
      confidence,
      tokensUsed,
      this.model,
      { usage: data.usage }
    );
  }
  
  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text
      })
    });
    
    const data = await response.json();
    return data.data[0].embedding;
  }
  
  private estimateConfidence(finishReason: string, temperature: number): number {
    let base = 0.85;
    
    if (finishReason === 'stop') {
      base = 0.9;
    } else if (finishReason === 'length') {
      base = 0.7;
    }
    
    // Lower temperature = higher confidence
    const tempAdjustment = (1 - temperature) * 0.1;
    
    return Math.min(0.95, base + tempAdjustment);
  }
}
```

## Best Practices

1. **API Key Security**: Never hardcode API keys
2. **Error Handling**: Always catch LLMError
3. **Timeouts**: Set appropriate timeouts
4. **Rate Limiting**: Respect provider limits
5. **Confidence Calibration**: Adjust based on use case
6. **Provider Selection**: Choose based on requirements

## Performance Tips

1. **Reuse Providers**: Create once, use many times
2. **Batch Requests**: Use provider-specific batching when available
3. **Cache Responses**: For deterministic queries
4. **Stream Responses**: For real-time applications
5. **Monitor Usage**: Track tokens and costs