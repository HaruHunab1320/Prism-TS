import { 
  ConfidenceExtractor,
  ConfidenceEnsemble,
  DomainCalibrator,
  SecurityCalibrator,
  InteractiveCalibrator,
  ConfidenceBudgetManager,
  ConfidenceContractManager,
  DifferentialConfidenceManager,
  TemporalConfidence,
  SensorConfidenceExtractor,
  APIConfidenceExtractor,
  smartExtract
} from '../src';
import { GeminiProvider, LLMRequest } from '@prism/llm';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from root
config({ path: resolve(__dirname, '../../../.env') });

describe('Comprehensive Confidence Integration Tests', () => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // Skip tests if no API key is available
  const describeIfApiKey = apiKey ? describe : describe.skip;
  
  describeIfApiKey('All Confidence Features with Real LLM', () => {
    let provider: GeminiProvider;
    let extractor: ConfidenceExtractor;
    
    beforeAll(() => {
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not found in environment');
      }
      provider = new GeminiProvider(apiKey);
      extractor = new ConfidenceExtractor();
    });
    
    describe('Calibration with Real Responses', () => {
      it('should calibrate domain-specific confidence', async () => {
        // Use SecurityCalibrator since DomainCalibrator is abstract
        const calibrator = new SecurityCalibrator();
        
        // Get security-related response
        const securityRequest = new LLMRequest(
          'What are common web application vulnerabilities?',
          { structuredOutput: false }
        );
        const securityResponse = await provider.complete(securityRequest);
        
        // Extract raw confidence
        const rawResult = await extractor.fromResponseAnalysis(securityResponse.content);
        
        // Apply security domain calibration
        const calibratedValue = await calibrator.calibrate(rawResult.value, {
          threatLevel: 'high',
          context: { topic: 'vulnerabilities' }
        });
        
        console.log('Domain calibration:', {
          domain: 'security',
          raw: rawResult.value,
          calibrated: calibratedValue,
          adjustment: calibratedValue - rawResult.value
        });
        
        // Security domain should typically reduce confidence for high threat topics
        expect(calibratedValue).toBeLessThanOrEqual(rawResult.value);
      }, 30000);
      
      it('should apply security calibration', async () => {
        const securityCalibrator = new SecurityCalibrator();
        
        const securityRequest = new LLMRequest(
          'How can I protect my API keys in a web application?',
          { structuredOutput: false }
        );
        const response = await provider.complete(securityRequest);
        
        const rawResult = await extractor.fromResponseAnalysis(response.content);
        const calibratedValue = await securityCalibrator.calibrate(rawResult.value, {
          threatLevel: 'medium',
          context: { topic: 'api_security' }
        });
        
        console.log('Security calibration:', {
          raw: rawResult.value,
          calibrated: calibratedValue,
          threatLevel: 'medium'
        });
        
        expect(calibratedValue).toBeDefined();
      }, 30000);
      
      it('should handle interactive calibration feedback', async () => {
        const interactiveCalibrator = new InteractiveCalibrator('technical');
        
        // Simulate user feedback on previous responses
        interactiveCalibrator.feedback(
          { confidence: 0.8, context: { topic: 'technical' } },
          { confidence: 0.6 }
        );
        
        const techRequest = new LLMRequest(
          'Explain REST API design principles',
          { structuredOutput: false }
        );
        const response = await provider.complete(techRequest);
        
        const rawResult = await extractor.fromResponseAnalysis(response.content);
        const calibratedValue = await interactiveCalibrator.calibrate(rawResult.value, {
          context: { topic: 'technical' }
        });
        
        console.log('Interactive calibration:', {
          raw: rawResult.value,
          calibrated: calibratedValue,
          hasLearning: calibratedValue !== rawResult.value
        });
        
        expect(calibratedValue).toBeDefined();
      }, 30000);
    });
    
    describe('Ensemble Methods with Real Data', () => {
      it('should combine multiple extraction methods', async () => {
        const ensemble = new ConfidenceEnsemble();
        
        const prompt = 'What is machine learning?';
        const request = new LLMRequest(prompt, { structuredOutput: false });
        const response = await provider.complete(request);
        
        // Get confidence from different methods
        const responseAnalysis = await extractor.fromResponseAnalysis(response.content);
        const structuredParsing = await extractor.fromStructuredResponse(response.content);
        
        // Combine using ensemble
        const ensembleResult = ensemble.combine({
          response_analysis: responseAnalysis,
          structured_parsing: structuredParsing
        });
        
        console.log('Ensemble combination:', {
          responseAnalysis: responseAnalysis.value,
          structuredParsing: structuredParsing.value,
          ensemble: ensembleResult.value,
          weights: { response_analysis: 1, structured_parsing: 1 } // Default weights
        });
        
        expect(ensembleResult.value).toBeGreaterThan(0);
        expect(ensembleResult.value).toBeLessThanOrEqual(1);
      }, 30000);
      
      it('should adapt ensemble weights based on performance', async () => {
        const ensemble = new ConfidenceEnsemble();
        
        // Update weights based on performance
        ensemble.updateWeights({
          method1: 0.85, // Better performance
          method2: 0.75  // Lower performance
        });
        
        const prompt = 'Explain quantum computing';
        const request = new LLMRequest(prompt, { structuredOutput: false });
        const response = await provider.complete(request);
        
        const result1 = await extractor.fromResponseAnalysis(response.content);
        const result2 = await extractor.extract(response.content);
        
        const ensembleResult = ensemble.combine({
          method1: result1,
          method2: result2
        });
        
        console.log('Trained ensemble:', {
          weights: { method1: 0.85, method2: 0.75 },
          result: ensembleResult.value
        });
        
        expect(ensembleResult.value).toBeDefined();
      }, 30000);
    });
    
    describe('Confidence Patterns with Real Scenarios', () => {
      it('should manage confidence budgets', async () => {
        const budgetManager = new ConfidenceBudgetManager(0.7); // Min total 0.7
        
        // Multiple related claims
        const claims = [
          'The Earth orbits the Sun',
          'Water boils at 100°C at sea level',
          'Gravity causes objects to fall'
        ];
        
        for (const claim of claims) {
          const request = new LLMRequest(`Is this true: ${claim}?`, { 
            structuredOutput: false 
          });
          const response = await provider.complete(request);
          const result = await extractor.fromResponseAnalysis(response.content);
          
          budgetManager.add(claim, result.value);
        }
        
        const status = budgetManager.getStatus();
        console.log('Confidence budget:', {
          total: status.total,
          required: status.required,
          met: status.met,
          items: status.items
        });
        
        expect(status.total).toBeGreaterThan(0);
      }, 45000);
      
      it('should validate confidence contracts', async () => {
        // Contract manager takes requirements in constructor
        const requirements = {
          accuracy: 0.8,
          completeness: 0.7
        };
        const contractManager = new ConfidenceContractManager(requirements);
        
        const request = new LLMRequest(
          'Provide a comprehensive guide to Python decorators',
          { structuredOutput: false }
        );
        const response = await provider.complete(request);
        
        // Extract detailed confidence
        const result = await extractor.fromResponseAnalysis(response.content);
        
        // Verify contract with results
        const verification = contractManager.verify({
          accuracy: { value: 'response', confidence: result.value },
          completeness: { 
            value: 'response', 
            confidence: result.metadata?.scores?.completeness || 0.5 
          }
        });
        
        console.log('Confidence contract:', {
          requirements,
          verification,
          summary: contractManager.getSummary()
        });
        
        expect(verification.passed).toBeDefined();
      }, 30000);
      
      it('should track differential confidence', async () => {
        const diffManager = new DifferentialConfidenceManager();
        
        const aspects = {
          'syntax': 'Is the syntax correct in: def add(a, b): return a + b',
          'logic': 'Is the logic correct in: def add(a, b): return a + b',
          'style': 'Is the style good in: def add(a, b): return a + b'
        };
        
        for (const [aspect, question] of Object.entries(aspects)) {
          const request = new LLMRequest(question, { structuredOutput: false });
          const response = await provider.complete(request);
          const result = await extractor.fromResponseAnalysis(response.content);
          
          diffManager.setAspect(aspect, result.value);
        }
        
        const differential = diffManager.getAllAspects();
        console.log('Differential confidence:', {
          aspects: differential,
          highest: diffManager.getHighest(),
          lowest: diffManager.getLowest(),
          average: diffManager.getAverage()
        });
        
        expect(differential.syntax).toBeDefined();
        expect(differential.logic).toBeDefined();
        expect(differential.style).toBeDefined();
      }, 45000);
      
      it('should apply temporal decay', async () => {
        const request = new LLMRequest('What is the current weather?', { 
          structuredOutput: false 
        });
        const response = await provider.complete(request);
        const initialResult = await extractor.fromResponseAnalysis(response.content);
        
        // Create temporal confidence with initial value
        const temporal = new TemporalConfidence(initialResult.value, { 
          halfLife: 0.00005, // Very short half-life in hours for testing
          unit: 'hours' 
        });
        
        const immediate = temporal.getCurrent();
        
        // Wait for decay
        await new Promise(resolve => setTimeout(resolve, 150));
        
        const decayed = temporal.getCurrent();
        
        console.log('Temporal decay:', {
          initial: initialResult.value,
          immediate,
          afterDelay: decayed,
          decayAmount: immediate - decayed,
          age: temporal.getAge(),
          isStale: temporal.isStale()
        });
        
        expect(decayed).toBeLessThan(immediate);
      }, 30000);
    });
    
    describe('Non-LLM Sources Integration', () => {
      it('should extract confidence from sensor-like data', async () => {
        const sensorExtractor = new SensorConfidenceExtractor();
        
        // Simulate sensor data with LLM analysis
        const request = new LLMRequest(
          'Analyze sensor reading: temperature=22.5°C, humidity=45%, pressure=1013hPa',
          { structuredOutput: false }
        );
        const response = await provider.complete(request);
        
        // Extract confidence from sensor parameters
        const sensorConfidence = sensorExtractor.fromSensor(
          { value: 22.5, unit: 'celsius' },
          {
            age: 1000, // 1 second old
            environment: { humidity: 45, pressure: 1013 },
            history: 100,
            calibrationDate: new Date(Date.now() - 86400000) // 1 day ago
          }
        );
        
        console.log('Sensor confidence:', {
          value: sensorConfidence.value,
          factors: sensorConfidence.metadata
        });
        
        expect(sensorConfidence.value).toBeGreaterThan(0.5);
      }, 30000);
      
      it('should extract confidence from API-like responses', async () => {
        const apiExtractor = new APIConfidenceExtractor();
        
        // Simulate API response analysis
        const request = new LLMRequest(
          'Parse API response: {"status": "success", "data": {"id": 123}, "timestamp": "2024-01-01T00:00:00Z"}',
          { structuredOutput: false }
        );
        const response = await provider.complete(request);
        
        const apiConfidence = apiExtractor.fromAPIReliability({
          provider: 'example-api',
          historicalAccuracy: 0.95,
          latency: 150,
          lastFailure: new Date(Date.now() - 7200000) // 2 hours ago
        });
        
        console.log('API confidence:', {
          value: apiConfidence.value,
          factors: apiConfidence.metadata
        });
        
        expect(apiConfidence.value).toBeGreaterThan(0.65);
      }, 30000);
    });
    
    describe('Smart Extract Function', () => {
      it('should intelligently extract confidence from various inputs', async () => {
        // Test with string
        const request = new LLMRequest('What is 2 + 2?', { structuredOutput: false });
        const response = await provider.complete(request);
        
        const stringConfidence = await smartExtract(response.content);
        console.log('Smart extract from string:', stringConfidence);
        
        // Test with function (sampler)
        const sampler = async () => {
          const req = new LLMRequest('Define AI', { 
            structuredOutput: false,
            temperature: 0.7
          });
          const res = await provider.complete(req);
          return res.content;
        };
        
        const functionConfidence = await smartExtract(sampler);
        console.log('Smart extract from function:', functionConfidence);
        
        // Test with object
        const objectConfidence = await smartExtract({ confidence: 0.85 });
        console.log('Smart extract from object:', objectConfidence);
        
        expect(stringConfidence).toBeGreaterThan(0);
        expect(functionConfidence).toBeGreaterThan(0);
        expect(objectConfidence).toBe(0.85);
      }, 60000);
    });
  });
});