import { Validator } from '../src/validator';

describe('Function Validation', () => {
  const validator = new Validator();

  it('should validate lambda expressions without warnings', () => {
    const code = `
      // Simple lambda
      double = x => x * 2
      
      // Lambda with multiple parameters
      add = (a, b) => a + b
      
      // Lambda with block body
      process = data => {
        const filtered = data.filter(x => x > 0)
        return filtered
      }
      
      // Lambda with rest parameters
      sum = (...numbers) => {
        let total = 0
        for n in numbers {
          total = total + n
        }
        return total
      }
    `;
    
    const result = validator.validate(code);
    
    // Should not have unknown node type warnings
    const unknownNodeWarnings = result.warnings.filter(w => w.code === 'UNKNOWN_NODE_TYPE');
    expect(unknownNodeWarnings).toHaveLength(0);
  });

  it('should validate function expressions without warnings', () => {
    const code = `
      // Function expression assigned to variable
      myFunc = function(x) {
        return x * 2
      }
      
      // Function expression with multiple parameters
      calculate = function(a, b, operation) {
        if (operation == "add") {
          return a + b
        }
        return a - b
      }
    `;
    
    const result = validator.validate(code);
    
    // Should not have unknown node type warnings
    const unknownNodeWarnings = result.warnings.filter(w => w.code === 'UNKNOWN_NODE_TYPE');
    expect(unknownNodeWarnings).toHaveLength(0);
  });

  it('should validate function declarations without warnings', () => {
    const code = `
      // Regular function
      function greet(name) {
        return "Hello, " + name
      }
      
      // Function with confidence annotation
      function analyze(data) ~> 0.9 {
        return llm("Analyze: " + data)
      }
      
      // Async function
      async function fetchData(url) {
        result = await fetch(url)
        return result
      }
    `;
    
    const result = validator.validate(code);
    
    // Should not have unknown node type warnings
    const unknownNodeWarnings = result.warnings.filter(w => w.code === 'UNKNOWN_NODE_TYPE');
    expect(unknownNodeWarnings).toHaveLength(0);
  });

  it('should handle mix of function types', () => {
    const code = `
      // Lambda expression
      f1 = x => x + 1
      
      // Function declaration
      function f2(x) { 
        return x + 2 
      }
      
      // Using the functions
      result1 = f1(5)
      result2 = f2(5)
    `;
    
    const result = validator.validate(code);
    expect(result.errors).toHaveLength(0);
    
    // Ensure all function types are recognized
    const unknownNodeWarnings = result.warnings.filter(w => w.code === 'UNKNOWN_NODE_TYPE');
    expect(unknownNodeWarnings).toHaveLength(0);
  });
});