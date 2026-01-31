import { parse, createRuntime } from '../src';
import { ArrayValue, StringValue } from '../src/runtime';

describe('Match Expression', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  it('matches literal patterns', async () => {
    const program = parse(`
      match 2 {
        1 => "one",
        2 => "two",
        _ => "other"
      }
    `);

    const result = await runtime.execute(program);
    expect((result as StringValue).value).toBe('two');
  });

  it('matches array patterns with rest', async () => {
    const program = parse(`
      match [1, 2, 3] {
        [a, b, ...rest] => rest,
        _ => []
      }
    `);

    const result = await runtime.execute(program) as ArrayValue;
    expect(result.value).toHaveLength(1);
    expect(result.value[0].toString()).toBe('3');
  });

  it('matches object patterns with literals and bindings', async () => {
    const program = parse(`
      match { type: "error", message: "fail" } {
        {type: "error", message} => message,
        _ => "ok"
      }
    `);

    const result = await runtime.execute(program);
    expect((result as StringValue).value).toBe('fail');
  });

  it('supports guards', async () => {
    const program = parse(`
      match 5 {
        x if x > 3 => "big",
        _ => "small"
      }
    `);

    const result = await runtime.execute(program);
    expect((result as StringValue).value).toBe('big');
  });

  it('respects global confidence thresholds', async () => {
    const program = parse(`
      match [10 ~> 0.9, 20 ~> 0.6] {
        [a, b] ~> 0.8 => "high",
        _ => "low"
      }
    `);

    const result = await runtime.execute(program);
    expect((result as StringValue).value).toBe('low');
  });

  it('supports per-element thresholds', async () => {
    const program = parse(`
      match [10 ~> 0.9, 20 ~> 0.6] {
        [a ~> 0.85, b ~> 0.5] => "ok",
        _ => "no"
      }
    `);

    const result = await runtime.execute(program);
    expect((result as StringValue).value).toBe('ok');
  });

  it('supports per-property thresholds', async () => {
    const program = parse(`
      match { score: 90 ~> 0.7 } {
        {score: s ~> 0.8} => "high",
        _ => "low"
      }
    `);

    const result = await runtime.execute(program);
    expect((result as StringValue).value).toBe('low');
  });
});
