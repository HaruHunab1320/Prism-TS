import { Tokenizer } from '../src/tokenizer';
import { Parser } from '../src/parser';
import { Runtime } from '../src/runtime';
import { NumberValue, ConfidenceValue } from '../src/runtime';

describe('Confidence Manipulation in Expressions', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  async function execute(code: string) {
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens, code);
    const ast = parser.parse();
    return await runtime.execute(ast);
  }

  describe('Arithmetic with confidence values', () => {
    it('should multiply confidence value with regular number', async () => {
      const result = await execute(`
        let confValue = 100 ~> 0.8
        let adjusted = confValue * 2
        adjusted
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect((conf.value as NumberValue).value).toBe(200);
      expect(conf.confidence.value).toBeCloseTo(0.8);
    });

    it('should add regular number to confidence value', async () => {
      const result = await execute(`
        let confValue = 50 ~> 0.9
        let result = confValue + 30
        result
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect((conf.value as NumberValue).value).toBe(80);
      expect(conf.confidence.value).toBeCloseTo(0.9);
    });

    it('should handle confidence on right side', async () => {
      const result = await execute(`
        let regular = 10
        let confValue = 5 ~> 0.7
        let result = regular * confValue
        result
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect((conf.value as NumberValue).value).toBe(50);
      expect(conf.confidence.value).toBeCloseTo(0.7);
    });
  });

  describe('Extracting and manipulating confidence', () => {
    it('should extract confidence and use in calculations', async () => {
      const result = await execute(`
        let value = 100 ~> 0.8
        let conf = <~ value
        let adjustedConf = conf * 0.9
        adjustedConf
      `);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBeCloseTo(0.72);
    });

    it('should apply adjusted confidence to value', async () => {
      const result = await execute(`
        let value = 100 ~> 0.8
        let conf = <~ value
        let adjustedConf = conf * 0.5
        let newValue = 100 ~> adjustedConf
        newValue
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect((conf.value as NumberValue).value).toBe(100);
      expect(conf.confidence.value).toBeCloseTo(0.4);
    });
  });

  describe('Complex confidence manipulations', () => {
    it('should handle confidence decay in calculations', async () => {
      const result = await execute(`
        let initial = 100 ~> 0.9
        let step1 = initial * 2
        let step2 = step1 + 50
        let step3 = step2 / 5
        step3
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect((conf.value as NumberValue).value).toBe(50); // (100*2+50)/5
      expect(conf.confidence.value).toBeCloseTo(0.9);
    });

    it('should work with ternary operator', async () => {
      const result = await execute(`
        let highConf = 100 ~> 0.9
        let lowConf = 100 ~> 0.3
        
        let useHigh = (<~ highConf) > 0.5
        let result = useHigh ? highConf * 2 : lowConf * 2
        result
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect((conf.value as NumberValue).value).toBe(200);
      expect(conf.confidence.value).toBeCloseTo(0.9);
    });

    it('should handle confidence in conditions', async () => {
      const result = await execute(`
        let measurement = 25.5 ~> 0.85
        
        // Check if confident enough
        let confident = (<~ measurement) > 0.8
        
        let result = confident ? "high confidence" : "low confidence"
        result
      `);
      expect(result.toString()).toBe('high confidence');
    });
  });

  describe('Confidence adjustment patterns', () => {
    it('should support confidence scaling', async () => {
      const result = await execute(`
        let original = 100 ~> 0.8
        
        // Scale confidence down by 80%
        let conf = <~ original
        let newConf = conf * 0.8
        let adjusted = 100 ~> newConf
        adjusted
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect(conf.confidence.value).toBeCloseTo(0.64);
    });

    it('should support confidence thresholding', async () => {
      const result = await execute(`
        let value = 100 ~> 0.6
        
        // If confidence < 0.7, set to 0.5
        let conf = <~ value
        let adjustedConf = conf < 0.7 ? 0.5 : conf
        let result = 100 ~> adjustedConf
        result
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect(conf.confidence.value).toBeCloseTo(0.5);
    });
  });
});
