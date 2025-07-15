import { GeminiProvider, LLMRequest } from '../src';
import { ConfidenceExtractor } from '@prism-lang/confidence';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from root
config({ path: resolve(__dirname, '../../../.env') });

describe('Confidence Extraction Integration Tests', () => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // Skip tests if no API key is available
  const describeIfApiKey = apiKey ? describe : describe.skip;
  
  describeIfApiKey('Using @prism-lang/confidence for extraction', () => {
    let provider: GeminiProvider;
    let extractor: ConfidenceExtractor;
    
    beforeAll(() => {
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not found in environment');
      }
      provider = new GeminiProvider(apiKey);
      extractor = new ConfidenceExtractor();
    });
    
    it('should extract confidence from hedging language', async () => {
      // Get unstructured response (no self-reported confidence)
      const request = new LLMRequest(
        'What will happen to cryptocurrency prices next year?',
        { structuredOutput: false }
      );
      const response = await provider.complete(request);
      
      // Use confidence extractor to analyze the response
      const extracted = await extractor.fromResponseAnalysis(response.content);
      
      console.log('Hedging analysis:', {
        content: response.content.substring(0, 200) + '...',
        extractedConfidence: extracted.value,
        hedgingIndicators: extracted.metadata?.hedgingIndicators
      });
      
      // Expect moderate confidence due to future prediction uncertainty
      expect(extracted.value).toBeLessThan(0.8);
      expect(extracted.metadata?.hedgingIndicators).toBeDefined();
    }, 30000);
    
    it('should extract high confidence from factual responses', async () => {
      const request = new LLMRequest(
        'What is the chemical formula for water?',
        { structuredOutput: false }
      );
      const response = await provider.complete(request);
      
      const extracted = await extractor.fromResponseAnalysis(response.content);
      
      console.log('Factual response analysis:', {
        content: response.content,
        extractedConfidence: extracted.value,
        certaintyIndicators: extracted.metadata?.certaintyIndicators
      });
      
      // Expect good confidence for factual content
      expect(extracted.value).toBeGreaterThan(0.7);
    }, 30000);
    
    it('should compare self-reported vs extracted confidence', async () => {
      const prompt = 'Explain the theory of dark matter';
      
      // Get self-reported confidence
      const structuredRequest = new LLMRequest(prompt, { 
        structuredOutput: true,
        includeReasoning: true 
      });
      const structuredResponse = await provider.complete(structuredRequest);
      
      // Get unstructured response for extraction
      const unstructuredRequest = new LLMRequest(prompt, { 
        structuredOutput: false 
      });
      const unstructuredResponse = await provider.complete(unstructuredRequest);
      
      // Extract confidence
      const extracted = await extractor.fromResponseAnalysis(unstructuredResponse.content);
      
      console.log('Confidence comparison:', {
        prompt,
        selfReported: structuredResponse.confidence,
        extracted: extracted.value,
        difference: Math.abs(structuredResponse.confidence - extracted.value),
        reasoning: structuredResponse.metadata?.reasoning
      });
      
      // They should be somewhat similar (within 0.3)
      expect(Math.abs(structuredResponse.confidence - extracted.value)).toBeLessThan(0.3);
    }, 30000);
    
    it('should use consistency checking for improved accuracy', async () => {
      const prompt = 'Is artificial general intelligence (AGI) possible?';
      
      // Generate multiple responses
      const sampler = async () => {
        const request = new LLMRequest(prompt, { 
          structuredOutput: false,
          temperature: 0.8 // Higher temp for more variation
        });
        const response = await provider.complete(request);
        return response.content;
      };
      
      // Use consistency-based extraction
      const result = await extractor.fromConsistency(sampler, { 
        runs: 3 
      });
      
      console.log('Consistency-based extraction:', {
        confidence: result.value,
        consistency: result.metadata?.consistency,
        samples: result.metadata?.samples
      });
      
      // AGI questions should have moderate confidence
      expect(result.value).toBeGreaterThan(0.3);
      expect(result.value).toBeLessThan(0.8);
    }, 60000);
    
    it('should calibrate confidence for specific domains', async () => {
      // Create domain-specific calibrated extractor
      const calibratedExtractor = new ConfidenceExtractor();
      
      // Medical domain question
      const medicalRequest = new LLMRequest(
        'What are the side effects of aspirin?',
        { structuredOutput: false }
      );
      const medicalResponse = await provider.complete(medicalRequest);
      
      // Extract with calibration
      const calibrated = await calibratedExtractor.extract(medicalResponse.content, {
        domain: 'medical',
        calibration: {
          'medical': { baseAdjustment: -0.15 } // More conservative for medical
        }
      });
      
      // Extract without calibration
      const uncalibrated = await extractor.fromResponseAnalysis(medicalResponse.content);
      
      console.log('Domain calibration:', {
        domain: 'medical',
        uncalibrated: uncalibrated.value,
        calibrated: calibrated.value,
        adjustment: calibrated.value - uncalibrated.value
      });
      
      // Calibrated should be different (may be same if no adjustment needed)
      expect(calibrated.value).toBeLessThanOrEqual(uncalibrated.value);
    }, 30000);
  });
});