import { parse, createRuntime } from '../src';
import { ConfidenceValue, NumberValue } from '../src/runtime';

describe('Confidence helpers', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  it('consensus picks highest confidence by default', async () => {
    const program = parse(`
      let result = consensus([1 ~> 0.4, 2 ~> 0.9])
      result
    `);
    const result = await runtime.execute(program);
    expect(result).toBeInstanceOf(ConfidenceValue);
    const confident = result as ConfidenceValue;
    expect((confident.value as NumberValue).value).toBe(2);
    expect(confident.confidence.value).toBe(0.9);
  });

  it('consensus supports min strategy', async () => {
    const program = parse(`
      let result = consensus([1 ~> 0.4, 2 ~> 0.9], { strategy: "min" })
      result
    `);
    const result = await runtime.execute(program);
    const confident = result as ConfidenceValue;
    expect((confident.value as NumberValue).value).toBe(1);
    expect(confident.confidence.value).toBe(0.4);
  });

  it('aggregate combines confidence with average by default', async () => {
    const program = parse(`
      let aggregated = aggregate([1 ~> 0.5, 2 ~> 1.0])
      <~ aggregated
    `);
    const result = await runtime.execute(program) as NumberValue;
    expect(result.value).toBe(0.75);
  });
});
