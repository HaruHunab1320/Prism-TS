import { createRuntime } from '../src/runtime';
import { parse } from '../src/parser';

describe('Confident Property Access (~.)', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  it('should access property with confidence preserved', async () => {
    const program = parse(`
      obj = {x: 10, y: 20} ~> 0.8
      result = obj~.x
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('10');
    expect(result.toString()).toContain('80.0%');
  });

  it('should chain confident property access', async () => {
    const program = parse(`
      data = {user: {name: "Alice", age: 30}} ~> 0.9
      result = data~.user~.name
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('Alice');
    expect(result.toString()).toContain('90.0%');
  });

  it('should handle null/undefined with confident access', async () => {
    const program = parse(`
      obj = null ~> 0.9
      result = obj~.property
      result
    `);
    const result = await runtime.execute(program);
    // Confident property access on null returns a confident null
    expect(result.toString()).toBe('null (~90.0%)');
  });

  it('should work with arrays', async () => {
    const program = parse(`
      arr = [1, 2, 3] ~> 0.7
      result = arr~.length
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('3');
    expect(result.toString()).toContain('70.0%');
  });

  it('should work with confidence propagation', async () => {
    const program = parse(`
      obj1 = {x: 100} ~> 0.8
      obj2 = {y: obj1~.x} ~> 0.9
      result = obj2.y
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('100');
    expect(result.toString()).toContain('80.0%');
  });
});

describe('Parallel Confidence Operator (~||>)', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  it('should select option with highest confidence', async () => {
    const program = parse(`
      opt1 = "low confidence" ~> 0.3
      opt2 = "high confidence" ~> 0.9
      opt3 = "medium confidence" ~> 0.6
      result = opt1 ~||> opt2 ~||> opt3
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('high confidence');
    expect(result.toString()).toContain('90.0%');
  });

  it('should handle non-confident values', async () => {
    const program = parse(`
      opt1 = "confident" ~> 0.8
      opt2 = "not confident"
      result = opt1 ~||> opt2
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toBe('not confident');
  });

  it('should handle all low confidence values', async () => {
    const program = parse(`
      opt1 = "a" ~> 0.2
      opt2 = "b" ~> 0.3
      opt3 = "c" ~> 0.1
      result = opt1 ~||> opt2 ~||> opt3
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('b');
    expect(result.toString()).toContain('30.0%');
  });

  it('should work with complex expressions', async () => {
    const program = parse(`
      // Simulate different model outputs
      model1 = "Model 1 says yes" ~> 0.7
      model2 = "Model 2 says yes" ~> 0.9
      model3 = "Model 3 says maybe" ~> 0.8
      
      ensemble = model1 ~||> model2 ~||> model3
      ensemble
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('Model 2 says yes');
    expect(result.toString()).toContain('90.0%');
  });

  it('should handle null and undefined', async () => {
    const program = parse(`
      opt1 = null ~> 0.9
      opt2 = undefined ~> 0.8
      opt3 = "valid" ~> 0.7
      result = opt1 ~||> opt2 ~||> opt3
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toBe('null (~90.0%)');
  });

  it('should chain with other operators', async () => {
    const program = parse(`
      opt1 = 10 ~> 0.5
      opt2 = 20 ~> 0.8
      opt3 = 30 ~> 0.6
      
      // Select best option then multiply
      result = (opt1 ~||> opt2 ~||> opt3) ~* 2
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('40');
    expect(result.toString()).toContain('80.0%');
  });
});