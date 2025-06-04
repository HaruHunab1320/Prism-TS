import {
  LLMRequest,
  LLMResponse,
  LLMError,
  MockLLMProvider,
  GeminiProvider,
  LLMProviderRegistry,
  withRetry,
  RateLimiter,
} from './provider';
import { ConfidenceValue } from '../confidence';

describe('LLM Provider System', () => {
  describe('LLMRequest and LLMResponse', () => {
    it('should create LLM requests', () => {
      const request = new LLMRequest('What is AI?', {
        maxTokens: 100,
        temperature: 0.7,
        context: 'educational',
      });

      expect(request.prompt).toBe('What is AI?');
      expect(request.options.maxTokens).toBe(100);
      expect(request.options.temperature).toBe(0.7);
      expect(request.options.context).toBe('educational');
    });

    it('should create LLM responses with confidence', () => {
      const confidence = new ConfidenceValue(0.85);
      const response = new LLMResponse(
        'AI is artificial intelligence.',
        confidence,
        50,
        'test-model',
        { processingTime: 150 }
      );

      expect(response.content).toBe('AI is artificial intelligence.');
      expect(response.confidence.value).toBe(0.85);
      expect(response.tokensUsed).toBe(50);
      expect(response.model).toBe('test-model');
      expect(response.metadata?.processingTime).toBe(150);
    });
  });

  describe('MockLLMProvider', () => {
    it('should provide consistent mock responses', async () => {
      const provider = new MockLLMProvider();
      const request = new LLMRequest('Test prompt');

      const response = await provider.complete(request);
      expect(response.content).toContain('Mock response');
      expect(response.confidence.value).toBeGreaterThan(0);
      expect(response.tokensUsed).toBeGreaterThan(0);
    });

    it('should support custom mock responses', async () => {
      const provider = new MockLLMProvider();
      provider.setMockResponse('Custom mock response', new ConfidenceValue(0.9));

      const request = new LLMRequest('Any prompt');
      const response = await provider.complete(request);

      expect(response.content).toBe('Custom mock response');
      expect(response.confidence.value).toBe(0.9);
    });

    it('should simulate failures when configured', async () => {
      const provider = new MockLLMProvider();
      provider.setFailureRate(1.0); // Always fail

      const request = new LLMRequest('Test prompt');
      await expect(provider.complete(request)).rejects.toThrow(LLMError);
    });

    it('should provide embeddings', async () => {
      const provider = new MockLLMProvider();
      const embeddings = await provider.embed('test text');

      expect(embeddings).toHaveLength(384); // Default mock embedding size
      expect(embeddings.every(val => typeof val === 'number')).toBe(true);
    });
  });

  describe('GeminiProvider', () => {
    it('should create with API key', () => {
      const provider = new GeminiProvider('test-api-key');
      expect(provider.name).toBe('Gemini');
    });

    it('should handle configuration options', () => {
      const provider = new GeminiProvider('test-key', {
        model: 'gemini-pro',
        baseUrl: 'https://custom-api.com',
        timeout: 10000,
      });

      expect(provider.name).toBe('Gemini');
    });

    // Note: Actual API tests would require real API keys and network access
    // In a real implementation, we'd use dependency injection for HTTP client
  });

  describe('LLMProviderRegistry', () => {
    it('should register and retrieve providers', () => {
      const registry = new LLMProviderRegistry();
      const mockProvider = new MockLLMProvider();

      registry.register('mock', mockProvider);
      expect(registry.get('mock')).toBe(mockProvider);
      expect(registry.list()).toEqual(['mock']);
    });

    it('should set and get default provider', () => {
      const registry = new LLMProviderRegistry();
      const mockProvider = new MockLLMProvider();

      registry.register('mock', mockProvider);
      registry.setDefault('mock');

      expect(registry.getDefault()).toBe(mockProvider);
    });

    it('should handle missing providers gracefully', () => {
      const registry = new LLMProviderRegistry();
      
      expect(registry.get('nonexistent')).toBeUndefined();
      expect(() => registry.setDefault('nonexistent')).toThrow();
    });

    it('should support provider switching', async () => {
      const registry = new LLMProviderRegistry();
      const mock1 = new MockLLMProvider();
      const mock2 = new MockLLMProvider();

      mock1.setMockResponse('Response from mock1', new ConfidenceValue(0.8));
      mock2.setMockResponse('Response from mock2', new ConfidenceValue(0.9));

      registry.register('mock1', mock1);
      registry.register('mock2', mock2);
      registry.setDefault('mock1');

      const request = new LLMRequest('Test');
      
      let response = await registry.complete(request);
      expect(response.content).toBe('Response from mock1');

      registry.setDefault('mock2');
      response = await registry.complete(request);
      expect(response.content).toBe('Response from mock2');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const limiter = new RateLimiter(2, 1000); // 2 requests per second

      // First two requests should succeed
      await expect(limiter.acquire()).resolves.toBeUndefined();
      await expect(limiter.acquire()).resolves.toBeUndefined();

      // Third request should be delayed
      const start = Date.now();
      await limiter.acquire();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThan(990); // Allow some timing variance
    });

    it('should track remaining capacity', async () => {
      const limiter = new RateLimiter(3, 1000);
      
      expect(limiter.remaining()).toBe(3);
      await limiter.acquire();
      expect(limiter.remaining()).toBe(2);
      await limiter.acquire();
      expect(limiter.remaining()).toBe(1);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on failures', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new LLMError('Temporary failure', 'TEMP_ERROR');
        }
        return 'success';
      };

      const result = await withRetry(operation, { maxRetries: 3, delay: 10 });
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      const operation = async () => {
        throw new LLMError('Persistent failure', 'PERSISTENT_ERROR');
      };

      await expect(withRetry(operation, { maxRetries: 2, delay: 10 }))
        .rejects.toThrow('Persistent failure');
    });

    it('should use exponential backoff', async () => {
      let attempts = 0;
      const timestamps: number[] = [];
      
      const operation = async () => {
        timestamps.push(Date.now());
        attempts++;
        if (attempts < 3) {
          throw new LLMError('Failure', 'ERROR');
        }
        return 'success';
      };

      await withRetry(operation, { 
        maxRetries: 3, 
        delay: 50, 
        exponentialBackoff: true 
      });

      // Check that delays increase exponentially
      expect(timestamps).toHaveLength(3);
      if (timestamps.length >= 3) {
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];
        expect(delay2).toBeGreaterThan(delay1 * 1.8); // Allow some variance
      }
    });
  });

  describe('Error Handling', () => {
    it('should create LLM errors with context', () => {
      const error = new LLMError('API failure', 'API_ERROR', {
        statusCode: 500,
        provider: 'test-provider',
      });

      expect(error.message).toBe('API failure');
      expect(error.code).toBe('API_ERROR');
      expect(error.context?.statusCode).toBe(500);
      expect(error.context?.provider).toBe('test-provider');
    });

    it('should handle network timeouts', async () => {
      const provider = new MockLLMProvider();
      provider.setLatency(2000); // 2 second delay
      
      const request = new LLMRequest('Test', { timeout: 500 }); // 500ms timeout
      
      await expect(provider.complete(request)).rejects.toThrow('timeout');
    }, 10000);
  });
});