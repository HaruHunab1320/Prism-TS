import { GeminiProvider, LLMRequest, LLMProviderRegistry } from '../src';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from root
config({ path: resolve(__dirname, '../../../.env') });

describe('LLM Integration Tests', () => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // Skip tests if no API key is available
  const describeIfApiKey = apiKey ? describe : describe.skip;
  
  describeIfApiKey('GeminiProvider - Real API Calls', () => {
    let provider: GeminiProvider;
    
    beforeAll(() => {
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not found in environment');
      }
      provider = new GeminiProvider(apiKey);
    });
    
    it('should generate response with confidence using structured output', async () => {
      const request = new LLMRequest('What is the capital of France?');
      const response = await provider.complete(request);
      
      console.log('Response:', {
        content: response.content,
        confidence: response.confidence,
        model: response.model
      });
      
      expect(response.content).toContain('Paris');
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
      expect(response.tokensUsed).toBeGreaterThan(0);
    }, 30000);
    
    it('should include reasoning when requested', async () => {
      const request = new LLMRequest(
        'Is it safe to eat raw cookie dough?',
        { includeReasoning: true }
      );
      const response = await provider.complete(request);
      
      console.log('Response with reasoning:', {
        content: response.content,
        confidence: response.confidence,
        reasoning: response.metadata?.reasoning
      });
      
      expect(response.content).toBeTruthy();
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.metadata?.reasoning).toBeTruthy();
    }, 30000);
    
    it('should handle uncertain responses with lower confidence', async () => {
      const request = new LLMRequest(
        'What will the stock market do tomorrow?',
        { includeReasoning: true }
      );
      const response = await provider.complete(request);
      
      console.log('Uncertain response:', {
        content: response.content,
        confidence: response.confidence,
        reasoning: response.metadata?.reasoning
      });
      
      // Expect lower confidence for uncertain/future predictions
      expect(response.confidence).toBeLessThan(0.8);
      // Check for uncertainty indicators in reasoning or content
      const reasoning = response.metadata?.reasoning?.toLowerCase() || '';
      const content = response.content.toLowerCase();
      const hasUncertaintyIndicator = 
        reasoning.includes('uncertain') || 
        reasoning.includes('impossible') || 
        reasoning.includes('cannot predict') ||
        reasoning.includes('speculation') ||
        reasoning.includes('complex') ||
        reasoning.includes('depends') ||
        content.includes('cannot predict') ||
        content.includes('impossible');
      expect(hasUncertaintyIndicator).toBe(true);
    }, 30000);
    
    it('should handle factual questions with high confidence', async () => {
      const request = new LLMRequest(
        'What is 2 + 2?',
        { includeReasoning: true }
      );
      const response = await provider.complete(request);
      
      console.log('Factual response:', {
        content: response.content,
        confidence: response.confidence,
        reasoning: response.metadata?.reasoning
      });
      
      expect(response.content).toContain('4');
      expect(response.confidence).toBeGreaterThan(0.9);
    }, 30000);
    
    it('should work without structured output when disabled', async () => {
      const request = new LLMRequest(
        'Tell me a joke about programming',
        { structuredOutput: false }
      );
      const response = await provider.complete(request);
      
      console.log('Unstructured response:', {
        content: response.content,
        confidence: response.confidence
      });
      
      expect(response.content).toBeTruthy();
      // Should use default confidence
      expect(response.confidence).toBe(0.8);
    }, 30000);
    
    it.skip('should generate embeddings', async () => {
      // Embeddings not yet implemented in AI SDK for Gemini
      const text = 'This is a test sentence for embeddings';
      const embeddings = await provider.embed(text);
      
      console.log('Embeddings:', {
        dimensions: embeddings.length,
        sample: embeddings.slice(0, 5)
      });
      
      expect(embeddings).toBeInstanceOf(Array);
      expect(embeddings.length).toBeGreaterThan(0);
      expect(embeddings.every(val => typeof val === 'number')).toBe(true);
    }, 30000);
  });
  
  describeIfApiKey('Confidence Extraction Integration', () => {
    let provider: GeminiProvider;
    
    beforeAll(() => {
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not found in environment');
      }
      provider = new GeminiProvider(apiKey);
    });
    
    it('should extract confidence from complex reasoning', async () => {
      const request = new LLMRequest(
        'Can you explain quantum entanglement and how certain you are about your explanation?',
        { includeReasoning: true }
      );
      const response = await provider.complete(request);
      
      console.log('Complex topic response:', {
        contentLength: response.content.length,
        confidence: response.confidence,
        reasoning: response.metadata?.reasoning
      });
      
      expect(response.content).toContain('quantum');
      expect(response.confidence).toBeGreaterThan(0.5);
      expect(response.confidence).toBeLessThan(1); // Should not be 100% certain about complex topics
    }, 30000);
    
    it('should handle multiple questions with varying confidence', async () => {
      const questions = [
        'What is the speed of light?', // High confidence
        'What is the meaning of life?', // Lower confidence
        'Is water H2O?', // Very high confidence
        'Will it rain next Tuesday in Tokyo?', // Very low confidence
      ];
      
      const responses = await Promise.all(
        questions.map(q => provider.complete(new LLMRequest(q)))
      );
      
      console.log('Multiple questions:', 
        questions.map((q, i) => ({
          question: q,
          confidence: responses[i].confidence
        }))
      );
      
      // Speed of light - high confidence
      expect(responses[0].confidence).toBeGreaterThan(0.8);
      // Meaning of life - lower confidence (or at most 0.8)
      expect(responses[1].confidence).toBeLessThanOrEqual(0.8);
      // Water is H2O - very high confidence
      expect(responses[2].confidence).toBeGreaterThan(0.9);
      // Weather prediction - low confidence
      expect(responses[3].confidence).toBeLessThanOrEqual(0.8);
    }, 60000);
  });
  
  describeIfApiKey('Registry Integration', () => {
    let registry: LLMProviderRegistry;
    
    beforeAll(() => {
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not found in environment');
      }
      registry = new LLMProviderRegistry();
      registry.register('gemini', new GeminiProvider(apiKey));
      registry.setDefault('gemini');
    });
    
    it('should complete requests through registry', async () => {
      const request = new LLMRequest('What is TypeScript?');
      const response = await registry.complete(request);
      
      console.log('Registry response:', {
        content: response.content.substring(0, 100) + '...',
        confidence: response.confidence
      });
      
      expect(response.content).toContain('TypeScript');
      expect(response.confidence).toBeGreaterThan(0.7);
    }, 30000);
  });
});