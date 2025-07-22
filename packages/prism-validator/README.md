# @prism-lang/validator

Comprehensive validation toolkit for the Prism programming language, designed to help LLMs and developers generate correct Prism patterns.

## Features

- **Syntax Validation**: Complete syntax checking with detailed error messages
- **Confidence Flow Analysis**: Validates proper use of confidence operators and values
- **Type Checking**: Runtime type validation for Prism expressions
- **Linting**: Configurable rules to catch common mistakes and enforce best practices
- **LLM-Optimized Error Messages**: Clear, actionable error messages with examples and fixes
- **Streaming Validation**: Validate code as it's being generated

## Installation

```bash
npm install @prism-lang/validator
```

## Quick Start

```typescript
import { createValidator } from '@prism-lang/validator';

const validator = createValidator();

// Validate Prism code
const code = `
const result = llm("Is this valid?")
uncertain if (~result > 0.7) {
  high { print("Very confident") }
  medium { print("Somewhat confident") }
  low { print("Not confident") }
}
`;

const result = validator.validateAll(code);
console.log(result.summary);
```

## API Reference

### PrismValidator

Basic syntax validation:

```typescript
interface PrismValidator {
  validate(code: string): ValidationResult;
  parse(code: string): ParseResult;
}
```

### ConfidenceChecker

Validates confidence flow and completeness:

```typescript
interface ConfidenceChecker {
  checkConfidenceFlow(ast: ASTNode): ConfidenceFlowResult;
  checkConfidenceCompleteness(ast: ASTNode): ConfidenceCompletenessResult;
}
```

### TypeChecker

Runtime type validation:

```typescript
interface TypeChecker {
  checkTypes(ast: ASTNode): TypeCheckResult;
}
```

### PrismLinter

Configurable linting rules:

```typescript
interface PrismLinter {
  lint(code: string, config?: LinterConfig): LintResult[];
}
```

### Unified Validator

Complete validation API:

```typescript
const validator = createValidator({
  rules: {
    'no-infinite-loops': true,
    'confidence-range': true,
    'uncertain-completeness': true,
    'require-confidence-in-uncertain': true
  },
  maxConfidenceValue: 1,
  minConfidenceValue: 0
});

// Comprehensive validation
const result = validator.validateAll(code);

// Individual checks
const syntax = validator.validate(code);
const confidence = validator.checkConfidenceFlow(code);
const types = validator.checkTypes(code);
const lintResults = validator.lint(code);

// Streaming validation
validator.resetStreaming();
const chunk1 = validator.validateStreaming("const x = ");
const chunk2 = validator.validateStreaming("llm(");
const completions = validator.getStreamingCompletions(); // ["llm(\""]
```

## Error Messages

The validator provides LLM-optimized error messages with:

- Clear error codes for pattern matching
- Specific fix suggestions
- Working code examples
- Contextual help

Example error format:

```json
{
  "error": "CONFIDENCE_WITHOUT_VALUE",
  "line": 3,
  "column": 10,
  "message": "Variable 'result' uses confidence operator ~ but has no confidence value assigned",
  "fix": "Assign a confidence value using 'const result = value @ 0.8' or similar",
  "example": "const result = computeScore() @ 0.9\nconst confident = ~result"
}
```

## Linting Rules

Available linting rules:

- `no-infinite-loops`: Detect potentially infinite loops
- `confidence-range`: Ensure confidence values are between 0 and 1
- `uncertain-completeness`: Check uncertain statements have all branches
- `variable-declared-before-use`: Enforce variable declaration before use
- `no-unused-variables`: Detect unused variables
- `confidence-operator-usage`: Validate proper use of confidence operators
- `no-constant-condition`: Warn about constant conditions
- `no-unreachable-code`: Detect unreachable code
- `consistent-confidence-usage`: Ensure consistent confidence usage
- `require-confidence-in-uncertain`: Require confidence in uncertain statements
- `no-empty-blocks`: Warn about empty code blocks
- `no-duplicate-confidence-branches`: Detect duplicate branch logic
- `prefer-confidence-operators`: Suggest confidence operators when appropriate

## Pattern Generation Support

The validator is specifically designed to help with automated pattern generation:

```typescript
// Iterative pattern improvement
let pattern = generateInitialPattern();
let attempts = 0;

while (attempts < MAX_ATTEMPTS) {
  const validation = validator.validateAll(pattern);
  
  if (validation.valid) {
    break;
  }
  
  // Use formatted errors to improve the pattern
  const errors = validation.formattedErrors;
  pattern = improvePattern(pattern, errors);
  attempts++;
}
```

## License

MIT