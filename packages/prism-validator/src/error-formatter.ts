import { 
  SyntaxError, 
  ParseError, 
  ConfidenceIssue, 
  TypeError, 
  LintResult,
  ErrorMessage 
} from './types';

export class ErrorFormatter {
  static formatForLLM(error: SyntaxError | ParseError | ConfidenceIssue | TypeError | LintResult): ErrorMessage {
    const code = 'code' in error ? error.code : 'ruleId' in error ? error.ruleId : 'UNKNOWN_ERROR';
    const baseMessage: ErrorMessage = {
      error: code,
      line: error.line,
      column: error.column,
      message: error.message
    };

    switch (code) {
      case 'SYNTAX_ERROR':
        return {
          ...baseMessage,
          fix: 'Check for missing semicolons, brackets, or parentheses',
          example: this.getSyntaxExample(error.message)
        };

      case 'MISSING_CONFIDENCE_BRANCHES':
        return {
          ...baseMessage,
          fix: "Add a 'low { }' block after the 'medium' block",
          example: `uncertain if (confidence > 0.5) {
  high { return "very confident" }
  medium { return "somewhat confident" }
  low { return "not confident" }
}`
        };

      case 'CONFIDENCE_WITHOUT_VALUE':
        const varName = (error as ConfidenceIssue).variableName || 'variable';
        return {
          ...baseMessage,
          fix: `Assign a confidence value using 'const ${varName} = value @ 0.8' or similar`,
          example: `// Correct usage:
const result = computeScore() @ 0.9
const confident = ~result  // Now ~result has confidence

// Or use with llm:
const answer = llm("What is 2+2?")
const value = ~answer  // llm returns confidence automatically`
        };

      case 'CONFIDENCE_OPERATOR_WITHOUT_VALUE':
        return {
          ...baseMessage,
          fix: 'Ensure the variable has confidence before using confidence operators',
          example: `// Add confidence when declaring:
const score = 85 @ 0.95
const isHigh = score ~> 80  // Now this works

// Or get from llm:
const prediction = llm("Will it rain?")
const likely = prediction ~> 0.7`
        };

      case 'UNCERTAIN_WITHOUT_CONFIDENCE':
        return {
          ...baseMessage,
          fix: 'Use a confidence expression or confidence variable in the test',
          example: `// Use confidence operator:
uncertain if (~result > 0.7) {
  high { print("Very confident") }
  medium { print("Somewhat confident") }
  low { print("Not confident") }
}

// Or use llm result:
const answer = llm("Is this safe?")
uncertain if (answer) {
  high { proceed() }
  low { abort() }
}`
        };

      case 'INVALID_CONFIDENCE_VALUE':
        return {
          ...baseMessage,
          fix: 'Confidence values must be between 0 and 1',
          example: `// Valid confidence values:
const high = value @ 0.95
const medium = value @ 0.5
const low = value @ 0.1

// Invalid:
// const wrong = value @ 1.5  // Too high
// const negative = value @ -0.2  // Too low`
        };

      case 'UNDEFINED_VARIABLE':
        const undefinedVar = error.message.match(/Undefined variable: (\w+)/)?.[1] || 'variable';
        return {
          ...baseMessage,
          fix: `Declare '${undefinedVar}' before using it`,
          example: `// Declare the variable first:
const ${undefinedVar} = computeValue()
// Now you can use ${undefinedVar}

// Or if it should be a parameter:
function myFunction(${undefinedVar}) {
  return ${undefinedVar} * 2
}`
        };

      case 'NOT_A_FUNCTION':
        return {
          ...baseMessage,
          fix: 'Ensure you are calling a function, not a value',
          example: `// Common mistakes:
const result = 42
// result() // Error: result is not a function

// Correct:
const compute = () => 42
const result = compute() // OK

// Or check the variable type:
if (typeof callback === 'function') {
  callback()
}`
        };

      case 'INVALID_BINARY_OPERAND':
        const expectedType = (error as TypeError).expectedType || 'number';
        const actualType = (error as TypeError).actualType || 'unknown';
        return {
          ...baseMessage,
          fix: `Convert ${actualType} to ${expectedType} before using the operator`,
          example: `// For numeric operations:
const num = parseInt(stringValue)
const result = num + 10

// For string concatenation:
const text = value.toString() + " items"

// Type checking:
if (typeof value === 'number') {
  const doubled = value * 2
}`
        };

      case 'INCOMPLETE_CONFIDENCE_BRANCHES':
        return {
          ...baseMessage,
          fix: 'Add all three confidence branches (high, medium, low)',
          example: `uncertain if (llm("Is this correct?")) {
  high {
    print("Definitely correct")
    return true
  }
  medium {
    print("Probably correct") 
    return true
  }
  low {
    print("Likely incorrect")
    return false
  }
}`
        };

      case 'VARIABLE_MISSING_CONFIDENCE':
        const missingVar = (error as ConfidenceIssue).variableName || 'variable';
        return {
          ...baseMessage,
          fix: `Initialize '${missingVar}' with confidence before using confidence operators`,
          example: `// Initialize with confidence:
const ${missingVar} = calculateValue() @ 0.8

// Or get from llm:
const ${missingVar} = llm("Analyze this data")

// Now you can use confidence operators:
if (${missingVar} ~> 0.5) {
  processResult(~${missingVar})
}`
        };

      case 'WRONG_ARGUMENT_COUNT':
        const match = error.message.match(/expects (\d+) arguments, got (\d+)/);
        const expected = match?.[1] || 'N';
        const actual = match?.[2] || 'M';
        return {
          ...baseMessage,
          fix: `Provide exactly ${expected} argument${expected === '1' ? '' : 's'}`,
          example: `// If function expects ${expected} arguments:
function process(${Array(parseInt(expected)).fill(0).map((_, i) => `arg${i+1}`).join(', ')}) {
  // ...
}

// Call with correct number:
process(${Array(parseInt(expected)).fill(0).map((_, i) => `value${i+1}`).join(', ')})

// Not: process(${Array(parseInt(actual)).fill(0).map((_, i) => `value${i+1}`).join(', ')})`
        };

      case 'no-infinite-loops':
        return {
          ...baseMessage,
          fix: 'Add a break condition or loop termination logic',
          example: `// Instead of:
while (true) {
  // infinite loop
}

// Use:
let count = 0
while (count < 100) {
  // do work
  count++
  if (shouldStop()) {
    break
  }
}`
        };

      case 'confidence-range':
        return {
          ...baseMessage,
          fix: 'Use a confidence value between 0 and 1',
          example: `// Valid confidence ranges:
const veryHigh = result @ 0.99
const high = result @ 0.8
const medium = result @ 0.5
const low = result @ 0.2
const veryLow = result @ 0.01`
        };

      case 'no-unused-variables':
        const unusedVar = error.message.match(/Variable '(\w+)'/)?.[1] || 'unused';
        return {
          ...baseMessage,
          fix: `Remove '${unusedVar}' or prefix with underscore if intentionally unused`,
          example: `// If truly unused, remove it:
// const ${unusedVar} = getValue() // Remove this line

// Or if intentionally unused:
const _${unusedVar} = getValue() // Prefixed with _

// Or use it somewhere:
const ${unusedVar} = getValue()
print(${unusedVar}) // Now it's used`
        };

      case 'uncertain-completeness':
        return {
          ...baseMessage,
          fix: 'Add at least one confidence branch to the uncertain statement',
          example: `uncertain if (llm("Check this")) {
  high { 
    print("High confidence action")
  }
  // Optional: add medium and low branches
}`
        };

      case 'no-constant-condition':
        return {
          ...baseMessage,
          fix: 'Replace constant condition with a variable or remove the conditional',
          example: `// Instead of:
if (true) { doSomething() }

// Use:
doSomething()

// Or with a variable:
const shouldRun = checkCondition()
if (shouldRun) { doSomething() }`
        };

      default:
        return {
          ...baseMessage,
          suggestion: 'Review the Prism language documentation for correct syntax'
        };
    }
  }

  private static getSyntaxExample(message: string): string {
    if (message.includes('parenthes')) {
      return `// Balance parentheses:
const result = (a + b) * (c + d)
function calc(x, y) { return x + y }`
    }
    
    if (message.includes('bracket')) {
      return `// Balance brackets:
const array = [1, 2, 3]
const value = array[0]`
    }
    
    if (message.includes('brace') || message.includes('}')) {
      return `// Balance braces:
if (condition) {
  doSomething()
}

const obj = {
  key: "value"
}`
    }

    if (message.includes('unexpected')) {
      return `// Check for common syntax errors:
// Missing comma in object:
const obj = {
  a: 1,
  b: 2  // comma needed after each property except last
}

// Missing operator:
const sum = a + b  // not 'a b'`
    }

    return `// Check your syntax matches Prism patterns:
const value = 42 @ 0.9
uncertain if (~result > 0.5) {
  high { print("confident") }
  low { print("uncertain") }
}`
  }

  static formatMultipleErrors(errors: Array<SyntaxError | ParseError | ConfidenceIssue | TypeError | LintResult>): ErrorMessage[] {
    const formattedErrors = errors.map(error => this.formatForLLM(error));
    
    const grouped = new Map<string, ErrorMessage[]>();
    formattedErrors.forEach(error => {
      const existing = grouped.get(error.error) || [];
      existing.push(error);
      grouped.set(error.error, existing);
    });

    const consolidated: ErrorMessage[] = [];
    grouped.forEach((group, errorCode) => {
      if (group.length === 1) {
        consolidated.push(group[0]);
      } else {
        consolidated.push({
          error: errorCode,
          line: group[0].line,
          column: group[0].column,
          message: `Multiple ${errorCode} errors (${group.length} instances)`,
          fix: group[0].fix,
          example: group[0].example,
          suggestion: `Fix all ${group.length} instances of this error type`
        });
      }
    });

    return consolidated.sort((a, b) => a.line - b.line);
  }

  static generateFixSuggestion(errors: ErrorMessage[]): string {
    if (errors.length === 0) return 'No errors found';
    
    if (errors.length === 1) {
      return `Fix the error at line ${errors[0].line}: ${errors[0].fix || errors[0].message}`;
    }

    const priorities = {
      'SYNTAX_ERROR': 1,
      'PARSE_ERROR': 1,
      'UNDEFINED_VARIABLE': 2,
      'NOT_A_FUNCTION': 2,
      'WRONG_ARGUMENT_COUNT': 3,
      'MISSING_CONFIDENCE_BRANCHES': 4,
      'CONFIDENCE_WITHOUT_VALUE': 4,
      'UNCERTAIN_WITHOUT_CONFIDENCE': 4
    };

    const sorted = errors.sort((a, b) => {
      const aPriority = priorities[a.error as keyof typeof priorities] || 5;
      const bPriority = priorities[b.error as keyof typeof priorities] || 5;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.line - b.line;
    });

    const topError = sorted[0];
    return `Start by fixing the ${topError.error} at line ${topError.line}: ${topError.fix || topError.message}`;
  }
}