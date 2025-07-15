import { GeminiProvider, LLMRequest } from '../src';
import { ConfidenceExtractor } from '@prism-lang/confidence';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from root
config({ path: resolve(__dirname, '../../../.env') });

describe('LLM with Confidence Extraction Integration', () => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // Skip tests if no API key is available
  const describeIfApiKey = apiKey ? describe : describe.skip;
  
  describeIfApiKey('Combined LLM and Confidence Extraction', () => {
    let provider: GeminiProvider;
    let extractor: ConfidenceExtractor;
    
    beforeAll(() => {
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not found in environment');
      }
      provider = new GeminiProvider(apiKey);
      extractor = new ConfidenceExtractor();
    });
    
    describe('Structured Output vs Extracted Confidence', () => {
      it('should compare self-reported vs extracted confidence for factual questions', async () => {
        const prompt = 'What is the capital of France?';
        
        // Get self-reported confidence using structured output
        const structuredRequest = new LLMRequest(prompt, { 
          structuredOutput: true,
          includeReasoning: true 
        });
        const structuredResponse = await provider.complete(structuredRequest);
        
        // Get extracted confidence
        const plainRequest = new LLMRequest(prompt, { 
          structuredOutput: false,
          confidenceExtractor: extractor
        });
        const plainResponse = await provider.complete(plainRequest);
        
        console.log('Factual question comparison:', {
          prompt,
          selfReported: {
            content: structuredResponse.content,
            confidence: structuredResponse.confidence,
            reasoning: structuredResponse.metadata?.reasoning
          },
          extracted: {
            content: plainResponse.content,
            confidence: plainResponse.confidence
          },
          difference: Math.abs(structuredResponse.confidence - plainResponse.confidence)
        });
        
        // Both should have high confidence for factual questions
        expect(structuredResponse.confidence).toBeGreaterThan(0.8);
        expect(plainResponse.confidence).toBeGreaterThan(0.7);
      }, 30000);
      
      it('should compare confidence for uncertain predictions', async () => {
        const prompt = 'What will be the most important technology in 2100?';
        
        const structuredRequest = new LLMRequest(prompt, { 
          structuredOutput: true,
          includeReasoning: true 
        });
        const structuredResponse = await provider.complete(structuredRequest);
        
        const plainRequest = new LLMRequest(prompt, { 
          structuredOutput: false,
          confidenceExtractor: extractor
        });
        const plainResponse = await provider.complete(plainRequest);
        
        console.log('Uncertain prediction comparison:', {
          prompt,
          selfReported: {
            confidence: structuredResponse.confidence,
            reasoning: structuredResponse.metadata?.reasoning
          },
          extracted: {
            confidence: plainResponse.confidence
          }
        });
        
        // Both should have lower confidence for speculative questions
        expect(structuredResponse.confidence).toBeLessThan(0.8);
        expect(plainResponse.confidence).toBeLessThan(0.8);
      }, 30000);
    });
    
    describe('Confidence Extraction Options', () => {
      it('should use different extraction methods', async () => {
        const prompt = 'Explain the concept of quantum entanglement';
        
        // Response analysis method
        const analysisRequest = new LLMRequest(prompt, { 
          structuredOutput: false,
          confidenceExtractor: extractor
        });
        const analysisResponse = await provider.complete(analysisRequest);
        
        // Consistency method (multiple samples)
        const sampler = async () => {
          const req = new LLMRequest(prompt, { 
            structuredOutput: false,
            temperature: 0.8
          });
          const res = await provider.complete(req);
          return res.content;
        };
        
        const consistencyResult = await extractor.fromConsistency(sampler, { samples: 3 });
        
        console.log('Different extraction methods:', {
          responseAnalysis: analysisResponse.confidence,
          consistencyBased: consistencyResult.value,
          metadata: consistencyResult.metadata
        });
        
        // Both methods should produce reasonable confidence values
        expect(analysisResponse.confidence).toBeGreaterThan(0.5);
        expect(consistencyResult.value).toBeGreaterThan(0);
      }, 60000);
    });
    
    describe('Real-world Scenarios', () => {
      it('should handle technical documentation generation', async () => {
        const prompt = 'Write a brief technical documentation for a REST API endpoint that creates a new user. Include request/response examples.';
        
        const request = new LLMRequest(prompt, { 
          structuredOutput: true,
          includeReasoning: true,
          maxTokens: 500
        });
        const response = await provider.complete(request);
        
        // Also extract confidence from the content
        const extractedResult = await extractor.fromResponseAnalysis(response.content);
        
        console.log('Technical documentation generation:', {
          contentLength: response.content.length,
          selfReportedConfidence: response.confidence,
          extractedConfidence: extractedResult.value,
          hedgingIndicators: extractedResult.metadata?.hedgingIndicators,
          tokensUsed: response.tokensUsed
        });
        
        // Technical documentation should have relatively high confidence
        expect(response.confidence).toBeGreaterThan(0.7);
      }, 30000);
      
      it('should handle code generation with confidence', async () => {
        const prompt = 'Write a Python function that calculates the factorial of a number using recursion.';
        
        const request = new LLMRequest(prompt, { 
          structuredOutput: true,
          includeReasoning: true
        });
        const response = await provider.complete(request);
        
        console.log('Code generation confidence:', {
          hasCode: response.content.includes('def'),
          confidence: response.confidence,
          reasoning: response.metadata?.reasoning
        });
        
        // Code generation for well-defined problems should have high confidence
        expect(response.confidence).toBeGreaterThan(0.8);
        expect(response.content).toContain('def');
      }, 30000);
      
      it('should handle ambiguous requests appropriately', async () => {
        const prompt = 'What is the best way to do it?';
        
        const request = new LLMRequest(prompt, { 
          structuredOutput: true,
          includeReasoning: true
        });
        const response = await provider.complete(request);
        
        console.log('Ambiguous request:', {
          confidence: response.confidence,
          reasoning: response.metadata?.reasoning,
          contentStart: response.content.substring(0, 100) + '...'
        });
        
        // The LLM might be confident about needing more information
        // Check the reasoning or content mentions lack of context/information
        expect(response.metadata?.reasoning || response.content).toMatch(/lack|absence|missing|need.*information|specifics|context|details|broad|specific task|impossible.*without|general answer/i);
      }, 30000);
    });
    
    describe('Error Handling', () => {
      it('should handle extraction failures gracefully', async () => {
        const prompt = 'Generate random bytes: ' + Buffer.from([0xFF, 0xFE, 0xFD]).toString();
        
        const request = new LLMRequest(prompt, { 
          structuredOutput: false,
          confidenceExtractor: extractor
        });
        
        // This should not throw, even with potentially problematic content
        const response = await provider.complete(request);
        
        expect(response.confidence).toBeGreaterThan(0);
        expect(response.confidence).toBeLessThanOrEqual(1);
      }, 30000);
    });
  });
});