import {
  MockLLMProvider,
  ClaudeProvider,
  GeminiProvider,
  LLMProviderRegistry,
  LLMRequest,
  LLMError,
  LLMConfigManager
} from '../src';

describe('LLM Providers', () => {
  describe('MockLLMProvider', () => {
    let provider: MockLLMProvider;

    beforeEach(() => {
      provider = new MockLLMProvider();
    });

    it('should have correct name', () => {
      expect(provider.name).toBe('Mock');
    });

    it('should complete requests with default response', async () => {
      const request = new LLMRequest('Hello AI!');
      const response = await provider.complete(request);
      
      expect(response.content).toBe('Mock response for testing purposes.');
      expect(response.confidence).toBe(0.75);
      expect(response.model).toBe('mock-model');
    });

    it('should allow setting custom mock responses', async () => {
      provider.setMockResponse('Custom response', 0.9);
      
      const request = new LLMRequest('Test prompt');
      const response = await provider.complete(request);
      
      expect(response.content).toBe('Custom response');
      expect(response.confidence).toBe(0.9);
    });

    it('should simulate failures when failure rate is set', async () => {
      provider.setFailureRate(1.0); // Always fail
      
      const request = new LLMRequest('Test prompt');
      await expect(provider.complete(request)).rejects.toThrow(LLMError);
    });

    it('should simulate latency', async () => {
      provider.setLatency(100);
      
      const start = Date.now();
      const request = new LLMRequest('Test prompt');
      await provider.complete(request);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it('should timeout if latency exceeds request timeout', async () => {
      provider.setLatency(200);
      
      const request = new LLMRequest('Test prompt', { timeout: 100 });
      await expect(provider.complete(request)).rejects.toThrow('Request timeout');
    });

    it('should generate embeddings', async () => {
      const embeddings = await provider.embed('Test text');
      
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings).toHaveLength(384); // Default dimension
      expect(embeddings.every(v => v >= -1 && v <= 1)).toBe(true);
    });

    it('should generate deterministic embeddings for same text', async () => {
      const text = 'Test text';
      const embeddings1 = await provider.embed(text);
      const embeddings2 = await provider.embed(text);
      
      expect(embeddings1).toEqual(embeddings2);
    });
  });

  describe('ClaudeProvider', () => {
    it('should require API key', () => {
      expect(() => new ClaudeProvider('')).toThrow('API key is required');
    });

    it('should have correct name', () => {
      const provider = new ClaudeProvider('test-key');
      expect(provider.name).toBe('Claude');
    });

    it('should not support embeddings', async () => {
      const provider = new ClaudeProvider('test-key');
      await expect(provider.embed('test')).rejects.toThrow('does not provide embedding functionality');
    });
  });

  describe('GeminiProvider', () => {
    it('should require API key', () => {
      expect(() => new GeminiProvider('')).toThrow('API key is required');
    });

    it('should have correct name', () => {
      const provider = new GeminiProvider('test-key');
      expect(provider.name).toBe('Gemini');
    });
  });

  describe('LLMProviderRegistry', () => {
    let registry: LLMProviderRegistry;
    let mockProvider: MockLLMProvider;

    beforeEach(() => {
      registry = new LLMProviderRegistry();
      mockProvider = new MockLLMProvider();
    });

    it('should register and retrieve providers', () => {
      registry.register('mock', mockProvider);
      
      expect(registry.get('mock')).toBe(mockProvider);
      expect(registry.list()).toContain('mock');
    });

    it('should set and get default provider', () => {
      registry.register('mock', mockProvider);
      registry.setDefault('mock');
      
      expect(registry.getDefault()).toBe(mockProvider);
    });

    it('should throw when setting non-existent provider as default', () => {
      expect(() => registry.setDefault('non-existent')).toThrow('Provider \'non-existent\' not found');
    });

    it('should complete requests using specified provider', async () => {
      registry.register('mock', mockProvider);
      
      const request = new LLMRequest('Test prompt');
      const response = await registry.complete(request, 'mock');
      
      expect(response.content).toBe('Mock response for testing purposes.');
    });

    it('should complete requests using default provider', async () => {
      registry.register('mock', mockProvider);
      registry.setDefault('mock');
      
      const request = new LLMRequest('Test prompt');
      const response = await registry.complete(request);
      
      expect(response.content).toBe('Mock response for testing purposes.');
    });

    it('should throw when completing without provider', async () => {
      const request = new LLMRequest('Test prompt');
      await expect(registry.complete(request)).rejects.toThrow('No default provider set');
    });

    it('should embed using specified provider', async () => {
      registry.register('mock', mockProvider);
      
      const embeddings = await registry.embed('Test text', 'mock');
      
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings).toHaveLength(384);
    });
  });

  describe('LLMConfigManager', () => {
    it('should create providers from environment', () => {
      // Save original env
      const originalEnv = process.env;
      
      // Set test environment
      process.env = {
        ...originalEnv,
        CLAUDE_API_KEY: 'test-claude-key',
        GEMINI_API_KEY: 'test-gemini-key'
      };
      
      try {
        const providers = LLMConfigManager.createFromEnvironment();
        
        // Should always have mock provider
        expect(providers.mock).toBeDefined();
        expect(providers.mock.name).toBe('Mock');
        
        // Should have providers for API keys
        expect(providers.claude).toBeDefined();
        expect(providers.claude.name).toBe('Claude');
        
        expect(providers.gemini).toBeDefined();
        expect(providers.gemini.name).toBe('Gemini');
      } finally {
        // Restore env
        process.env = originalEnv;
      }
    });

    it('should determine default provider based on available API keys', () => {
      const originalEnv = process.env;
      
      // Test with no API keys
      process.env = { ...originalEnv };
      delete process.env.CLAUDE_API_KEY;
      delete process.env.GEMINI_API_KEY;
      expect(LLMConfigManager.getDefaultProvider()).toBe('mock');
      
      // Test with Claude key
      process.env.CLAUDE_API_KEY = 'test-key';
      expect(LLMConfigManager.getDefaultProvider()).toBe('claude');
      
      // Test with only Gemini key (remove Claude key first)
      delete process.env.CLAUDE_API_KEY;
      process.env.GEMINI_API_KEY = 'test-key';
      expect(LLMConfigManager.getDefaultProvider()).toBe('gemini');
      
      // Test with both keys (Claude takes precedence)
      process.env.CLAUDE_API_KEY = 'test-key';
      process.env.GEMINI_API_KEY = 'test-key';
      expect(LLMConfigManager.getDefaultProvider()).toBe('claude');
      
      // Restore env
      process.env = originalEnv;
    });
  });

  describe('LLMRequest', () => {
    it('should create request with prompt', () => {
      const request = new LLMRequest('Test prompt');
      
      expect(request.prompt).toBe('Test prompt');
      expect(request.options).toEqual({});
    });

    it('should create request with options', () => {
      const options = { maxTokens: 100, temperature: 0.5 };
      const request = new LLMRequest('Test prompt', options);
      
      expect(request.prompt).toBe('Test prompt');
      expect(request.options).toEqual(options);
    });
  });

  describe('LLMError', () => {
    it('should create error with code and context', () => {
      const error = new LLMError('Test error', 'TEST_CODE', { detail: 'value' });
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.context).toEqual({ detail: 'value' });
      expect(error.name).toBe('LLMError');
    });
  });
});