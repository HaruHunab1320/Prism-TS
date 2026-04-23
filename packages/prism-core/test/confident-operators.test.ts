import { createRuntime } from '../src/runtime';
import { parse } from '../src/parser';

describe('Confident Property Access (~.)', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  it('should access property with confidence preserved', async () => {
    const program = parse(`
      let obj = {x: 10, y: 20} ~> 0.8
      let result = obj~.x
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('10');
    expect(result.toString()).toContain('80.0%');
  });

  it('should chain confident property access', async () => {
    const program = parse(`
      let data = {user: {name: "Alice", age: 30}} ~> 0.9
      let result = data~.user~.name
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('Alice');
    expect(result.toString()).toContain('90.0%');
  });

  it('should handle null/null with confident access', async () => {
    const program = parse(`
      let obj = null ~> 0.9
      let result = obj~.property
      result
    `);
    const result = await runtime.execute(program);
    // Confident property access on null returns a confident null
    expect(result.toString()).toBe('null (~90.0%)');
  });

  it('should work with arrays', async () => {
    const program = parse(`
      let arr = [1, 2, 3] ~> 0.7
      let result = arr~.length
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('3');
    expect(result.toString()).toContain('70.0%');
  });

  it('should work with confidence propagation', async () => {
    const program = parse(`
      let obj1 = {x: 100} ~> 0.8
      let obj2 = {y: obj1~.x} ~> 0.9
      let result = obj2.y
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('100');
    expect(result.toString()).toContain('72.0%');
  });
});

describe('Parallel Confidence Operator (~||>)', () => {
  let runtime: ReturnType<typeof createRuntime>;

  beforeEach(() => {
    runtime = createRuntime();
  });

  it('should select option with highest confidence', async () => {
    const program = parse(`
      let opt1 = "low confidence" ~> 0.3
      let opt2 = "high confidence" ~> 0.9
      let opt3 = "medium confidence" ~> 0.6
      let result = opt1 ~||> opt2 ~||> opt3
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('high confidence');
    expect(result.toString()).toContain('90.0%');
  });

  it('should handle non-confident values', async () => {
    const program = parse(`
      let opt1 = "confident" ~> 0.8
      let opt2 = "not confident"
      let result = opt1 ~||> opt2
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toBe('not confident');
  });

  it('should handle all low confidence values', async () => {
    const program = parse(`
      let opt1 = "a" ~> 0.2
      let opt2 = "b" ~> 0.3
      let opt3 = "c" ~> 0.1
      let result = opt1 ~||> opt2 ~||> opt3
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('b');
    expect(result.toString()).toContain('30.0%');
  });

  it('should work with complex expressions', async () => {
    const program = parse(`
      // Simulate different model outputs
      let model1 = "Model 1 says yes" ~> 0.7
      let model2 = "Model 2 says yes" ~> 0.9
      let model3 = "Model 3 says maybe" ~> 0.8
      
      let ensemble = model1 ~||> model2 ~||> model3
      ensemble
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('Model 2 says yes');
    expect(result.toString()).toContain('90.0%');
  });

  it('should handle null and null', async () => {
    const program = parse(`
      let opt1 = null ~> 0.9
      let opt2 = null ~> 0.8
      let opt3 = "valid" ~> 0.7
      let result = opt1 ~||> opt2 ~||> opt3
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toBe('null (~90.0%)');
  });

  it('should chain with other operators', async () => {
    const program = parse(`
      let opt1 = 10 ~> 0.5
      let opt2 = 20 ~> 0.8
      let opt3 = 30 ~> 0.6
      
      // Select best option then multiply
      let result = (opt1 ~||> opt2 ~||> opt3) ~* 2
      result
    `);
    const result = await runtime.execute(program);
    expect(result.toString()).toContain('40');
    expect(result.toString()).toContain('80.0%');
  });
});
