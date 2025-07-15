import { ConfidenceExtractor } from '../src';
import { GeminiProvider, LLMRequest } from '@prism/llm';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from root
config({ path: resolve(__dirname, '../../../.env') });

describe('Confidence Extraction Integration Tests', () => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // Skip tests if no API key is available
  const describeIfApiKey = apiKey ? describe : describe.skip;
  
  describeIfApiKey('Response Analysis with Real LLM Outputs', () => {
    let provider: GeminiProvider;
    let extractor: ConfidenceExtractor;
    
    beforeAll(() => {
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not found in environment');
      }
      provider = new GeminiProvider(apiKey);
      extractor = new ConfidenceExtractor();
    });
    
    describe('Hedging Detection', () => {
      it('should detect high confidence in factual statements', async () => {
        const request = new LLMRequest('What is 2 + 2?', { structuredOutput: false });
        const response = await provider.complete(request);
        
        const result = await extractor.fromResponseAnalysis(response.content);
        
        console.log('Factual response:', {
          content: response.content,
          confidence: result.value,
          indicators: result.metadata
        });
        
        expect(result.value).toBeGreaterThan(0.8);
        expect(result.metadata?.hedgingIndicators).toHaveLength(0);
      }, 30000);
      
      it('should detect low confidence in uncertain predictions', async () => {
        const request = new LLMRequest(
          'What will be the most popular programming language in 2050?',
          { structuredOutput: false }
        );
        const response = await provider.complete(request);
        
        const result = await extractor.fromResponseAnalysis(response.content);
        
        console.log('Uncertain prediction:', {
          content: response.content.substring(0, 200) + '...',
          confidence: result.value,
          hedgingIndicators: result.metadata?.hedgingIndicators,
          uncertaintyScore: result.metadata?.uncertaintyScore,
          scores: result.metadata?.scores
        });
        
        expect(result.value).toBeLessThan(0.75);
        expect(result.metadata?.hedgingIndicators?.length).toBeGreaterThan(0);
      }, 30000);
      
      it('should detect medium confidence in qualified statements', async () => {
        const request = new LLMRequest(
          'Is coffee good for health?',
          { structuredOutput: false }
        );
        const response = await provider.complete(request);
        
        const result = await extractor.fromResponseAnalysis(response.content);
        
        console.log('Qualified statement:', {
          content: response.content.substring(0, 200) + '...',
          confidence: result.value,
          qualifiers: result.metadata?.hedgingIndicators
        });
        
        // Health topics often have nuanced answers
        expect(result.value).toBeGreaterThan(0.4);
        expect(result.value).toBeLessThan(0.9);
      }, 30000);
    });
    
    describe('Structured Response Parsing', () => {
      it('should parse JSON responses with confidence', async () => {
        const request = new LLMRequest(
          'Give me a JSON object with the capital of France and your confidence level. Format: {"answer": "...", "confidence": 0.X}',
          { structuredOutput: false }
        );
        const response = await provider.complete(request);
        
        const result = await extractor.fromStructuredResponse(response.content);
        
        console.log('Structured parsing:', {
          rawResponse: response.content,
          parsedConfidence: result.value,
          parsedContent: result.metadata?.parsed
        });
        
        expect(result.value).toBeGreaterThan(0);
        expect(result.value).toBeLessThanOrEqual(1);
      }, 30000);
      
      it('should handle XML-style confidence tags', async () => {
        const request = new LLMRequest(
          'What is the speed of light? Include your confidence using <confidence>X.X</confidence> tags.',
          { structuredOutput: false }
        );
        const response = await provider.complete(request);
        
        const result = await extractor.fromStructuredResponse(response.content);
        
        console.log('XML parsing:', {
          rawResponse: response.content,
          extractedConfidence: result.value
        });
        
        if (response.content.includes('<confidence>')) {
          expect(result.value).toBeGreaterThan(0);
        }
      }, 30000);
    });
    
    describe('Consistency-Based Extraction', () => {
      it('should measure consistency across multiple responses', async () => {
        const prompt = 'What are the main causes of climate change?';
        
        const sampler = async () => {
          const request = new LLMRequest(prompt, { 
            structuredOutput: false,
            temperature: 0.7
          });
          const response = await provider.complete(request);
          return response.content;
        };
        
        const result = await extractor.fromConsistency(sampler, { 
          samples: 3
        });
        
        console.log('Consistency analysis:', {
          confidence: result.value,
          consistency: result.metadata?.consistency,
          overlap: result.metadata?.overlap,
          sampleCount: result.metadata?.samples?.length
        });
        
        expect(result.value).toBeGreaterThan(0);
        expect(result.metadata?.samples).toHaveLength(3);
        expect(result.metadata?.consistency).toBeDefined();
      }, 60000);
      
      it('should detect inconsistency in subjective topics', async () => {
        const prompt = 'What is the best programming language for beginners?';
        
        const sampler = async () => {
          const request = new LLMRequest(prompt, { 
            structuredOutput: false,
            temperature: 0.9 // High temperature for more variation
          });
          const response = await provider.complete(request);
          return response.content;
        };
        
        const result = await extractor.fromConsistency(sampler, { samples: 3 });
        
        console.log('Subjective topic consistency:', {
          confidence: result.value,
          consistency: result.metadata?.consistency,
          variations: result.metadata?.samples?.map(s => s.substring(0, 50) + '...')
        });
        
        // Subjective topics should have lower consistency
        expect(result.metadata?.consistency).toBeLessThan(0.8);
      }, 60000);
    });
    
    describe('Combined Extraction Methods', () => {
      it('should combine multiple extraction strategies', async () => {
        const request = new LLMRequest(
          'Explain quantum computing and rate your confidence in this explanation from 0 to 1',
          { structuredOutput: false }
        );
        const response = await provider.complete(request);
        
        // Try different extraction methods
        const responseAnalysis = await extractor.fromResponseAnalysis(response.content);
        const structuredParsing = await extractor.fromStructuredResponse(response.content);
        const combined = await extractor.extract(response.content);
        
        console.log('Multiple extraction methods:', {
          content: response.content.substring(0, 150) + '...',
          responseAnalysis: responseAnalysis.value,
          structuredParsing: structuredParsing.value,
          combined: combined.value,
          method: combined.metadata?.method
        });
        
        // Combined should be reasonable
        expect(combined.value).toBeGreaterThan(0.3);
        expect(combined.value).toBeLessThan(1);
      }, 30000);
    });
    
    describe('Edge Cases', () => {
      it('should handle very short responses', async () => {
        const request = new LLMRequest('Answer with just one word: Yes or No', { 
          structuredOutput: false 
        });
        const response = await provider.complete(request);
        
        const result = await extractor.fromResponseAnalysis(response.content);
        
        console.log('Short response:', {
          content: response.content,
          confidence: result.value
        });
        
        // Short definitive answers should have high confidence
        if (response.content.trim().length < 10) {
          expect(result.value).toBeGreaterThan(0.7);
        }
      }, 30000);
      
      it('should handle responses with mixed confidence levels', async () => {
        const request = new LLMRequest(
          'Tell me three facts: one you are certain about, one you are unsure about, and one that is speculative',
          { structuredOutput: false }
        );
        const response = await provider.complete(request);
        
        const result = await extractor.fromResponseAnalysis(response.content);
        
        console.log('Mixed confidence response:', {
          contentLength: response.content.length,
          overallConfidence: result.value,
          hedgingCount: result.metadata?.hedgingIndicators?.length
        });
        
        // Mixed responses should have moderate confidence
        expect(result.value).toBeGreaterThan(0.3);
        expect(result.value).toBeLessThan(0.9);
      }, 30000);
    });
  });
});