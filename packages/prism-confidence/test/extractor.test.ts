import { ConfidenceExtractor } from '../src/extractor';

describe('ConfidenceExtractor', () => {
  let extractor: ConfidenceExtractor;

  beforeEach(() => {
    extractor = new ConfidenceExtractor();
  });

  describe('Level 1 API - Simple extraction', () => {
    it('should extract confidence from a simple response', async () => {
      const response = 'I am certain this is correct.';
      const result = await extractor.extract(response);
      
      expect(result.value).toBeGreaterThan(0.5);
      expect(result.value).toBeLessThanOrEqual(1);
      expect(result.explanation).toBeDefined();
    });
  });

  describe('Response analysis', () => {
    it('should detect high confidence from certainty markers', async () => {
      const response = 'I am definitely certain that this is absolutely correct.';
      const result = await extractor.fromResponseAnalysis(response);
      
      expect(result.value).toBeGreaterThan(0.65);
      expect(result.explanation).toContain('certainty');
    });

    it('should detect low confidence from hedging', async () => {
      const response = 'This might possibly be correct, but I am not sure. It could be wrong perhaps.';
      const result = await extractor.fromResponseAnalysis(response);
      
      expect(result.value).toBeLessThan(0.55);
      expect(result.explanation).toContain('hedging');
    });

    it('should handle custom markers', async () => {
      const response = 'The analysis is inconclusive';
      const result = await extractor.fromResponseAnalysis(response, {
        customMarkers: {
          low: ['inconclusive', 'unclear', 'ambiguous']
        }
      });
      
      expect(result.value).toBeLessThan(0.7); // Short complete sentence gets moderate confidence despite hedging
    });
  });

  describe('Structured response parsing', () => {
    it('should extract percentage confidence', async () => {
      const response = 'Based on my analysis, I am confidence: 85% that this is a SQL injection vulnerability.';
      const result = await extractor.fromStructuredResponse(response);
      
      expect(result.value).toBe(0.85);
      expect(result.explanation).toContain('85%');
    });

    it('should extract ratio confidence', async () => {
      const response = 'Security assessment complete. Confidence: 7/10 for this being a genuine threat.';
      const result = await extractor.fromStructuredResponse(response);
      
      expect(result.value).toBeCloseTo(0.7, 1);
    });

    it('should extract categorical confidence', async () => {
      const response = 'After careful consideration, my certainty: high that this code has issues.';
      const result = await extractor.fromStructuredResponse(response);
      
      expect(result.value).toBe(0.9);
    });
  });

  describe('Consistency-based extraction', () => {
    it('should calculate confidence from consistent samples', async () => {
      const samples = ['Yes', 'Yes', 'Yes', 'Yes', 'Yes'];
      let index = 0;
      
      const sampler = async () => samples[index++];
      const result = await extractor.fromConsistency(sampler, { samples: 5 });
      
      expect(result.value).toBeGreaterThan(0.9);
      expect(result.explanation).toContain('5/5 samples agreed');
    });

    it('should calculate lower confidence from inconsistent samples', async () => {
      const samples = ['Yes', 'No', 'Maybe', 'Yes', 'Not sure'];
      let index = 0;
      
      const sampler = async () => samples[index++];
      const result = await extractor.fromConsistency(sampler, { samples: 5 });
      
      expect(result.value).toBeLessThan(0.7);
      expect(result.explanation).toContain('unique variations');
    });
  });

  describe('Provenance tracking', () => {
    it('should track confidence source and adjustments', async () => {
      const response = 'I am certain this is correct.';
      const result = await extractor.fromResponseAnalysis(response);
      
      expect(result.provenance).toBeDefined();
      expect(result.provenance!.sources).toHaveLength(1);
      expect(result.provenance!.sources[0].method).toBe('linguistic');
      expect(result.provenance!.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Explanation generation', () => {
    it('should explain confidence reasoning', async () => {
      const response = 'This might be correct, but I am absolutely certain about the main issue.';
      const result = await extractor.fromResponseAnalysis(response);
      const explanation = extractor.explain(result);
      
      expect(explanation).toContain('confidence');
      expect(explanation).toContain('%');
    });
  });
});