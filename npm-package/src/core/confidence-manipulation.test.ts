import { Tokenizer } from './tokenizer';
import { Parser } from './parser';
import { Runtime } from './runtime';
import { NumberValue, ConfidenceValue } from './runtime';

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
        confValue = 100 ~> 0.8
        adjusted = confValue * 2
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect((conf.value as NumberValue).value).toBe(200);
      expect(conf.confidence.value).toBeCloseTo(0.8);
    });

    it('should add regular number to confidence value', async () => {
      const result = await execute(`
        confValue = 50 ~> 0.9
        result = confValue + 30
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect((conf.value as NumberValue).value).toBe(80);
      expect(conf.confidence.value).toBeCloseTo(0.9);
    });

    it('should handle confidence on right side', async () => {
      const result = await execute(`
        regular = 10
        confValue = 5 ~> 0.7
        result = regular * confValue
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
        value = 100 ~> 0.8
        conf = <~ value
        adjustedConf = conf * 0.9
      `);
      expect(result).toBeInstanceOf(NumberValue);
      expect((result as NumberValue).value).toBeCloseTo(0.72);
    });

    it('should apply adjusted confidence to value', async () => {
      const result = await execute(`
        value = 100 ~> 0.8
        conf = <~ value
        adjustedConf = conf * 0.5
        newValue = 100 ~> adjustedConf
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
        initial = 100 ~> 0.9
        step1 = initial * 2
        step2 = step1 + 50
        step3 = step2 / 5
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect((conf.value as NumberValue).value).toBe(50); // (100*2+50)/5
      expect(conf.confidence.value).toBeCloseTo(0.9);
    });

    it('should work with ternary operator', async () => {
      const result = await execute(`
        highConf = 100 ~> 0.9
        lowConf = 100 ~> 0.3
        
        useHigh = (<~ highConf) > 0.5
        result = useHigh ? highConf * 2 : lowConf * 2
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect((conf.value as NumberValue).value).toBe(200);
      expect(conf.confidence.value).toBeCloseTo(0.9);
    });

    it('should handle confidence in conditions', async () => {
      const result = await execute(`
        measurement = 25.5 ~> 0.85
        
        // Check if confident enough
        confident = (<~ measurement) > 0.8
        
        result = confident ? "high confidence" : "low confidence"
      `);
      expect(result.toString()).toBe('high confidence');
    });
  });

  describe('Confidence adjustment patterns', () => {
    it('should support confidence scaling', async () => {
      const result = await execute(`
        original = 100 ~> 0.8
        
        // Scale confidence down by 80%
        conf = <~ original
        newConf = conf * 0.8
        adjusted = 100 ~> newConf
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect(conf.confidence.value).toBeCloseTo(0.64);
    });

    it('should support confidence thresholding', async () => {
      const result = await execute(`
        value = 100 ~> 0.6
        
        // If confidence < 0.7, set to 0.5
        conf = <~ value
        adjustedConf = conf < 0.7 ? 0.5 : conf
        result = 100 ~> adjustedConf
      `);
      expect(result).toBeInstanceOf(ConfidenceValue);
      const conf = result as ConfidenceValue;
      expect(conf.confidence.value).toBeCloseTo(0.5);
    });
  });
});