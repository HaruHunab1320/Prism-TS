---
sidebar_position: 1
title: Overview
---

# @prism-lang/validator

The Prism Validator package provides comprehensive validation, linting, and type-checking capabilities for Prism code. It's designed to help both developers and LLMs write correct, idiomatic Prism programs.

## Installation

```bash
npm install @prism-lang/validator
# or
pnpm add @prism-lang/validator
```

## Quick Start

```typescript
import { createValidator } from '@prism-lang/validator';

const validator = createValidator();

const code = `
const result = llm("Analyze this") ~> 0.8
uncertain if (result.confidence > 0.7) {
  high { print("High confidence:", result) }
  low { print("Low confidence") }
}
`;

const validation = validator.validateAll(code);
if (validation.valid) {
  console.log("Code is valid!");
} else {
  console.log("Errors:", validation.formattedErrors);
}
```

## Features

### 1. **Syntax Validation**
- Complete AST validation
- Detailed error messages with line/column info
- Recovery suggestions for common mistakes

### 2. **Type Checking**
- Runtime type validation
- Confidence propagation checking
- Function signature validation

### 3. **Linting**
- Configurable rules
- Best practice enforcement
- Performance suggestions

### 4. **Confidence Analysis**
- Flow tracking
- Completeness checking
- Threshold validation

### 5. **Streaming Support**
- Validate code as it's generated
- Provide completions for partial code
- Ideal for LLM integration

## Architecture

The validator consists of several specialized modules:

```
@prism-lang/validator
├── PrismValidator      # Core syntax validation
├── TypeChecker         # Runtime type checking
├── ConfidenceChecker   # Confidence flow analysis
├── PrismLinter         # Configurable linting rules
└── StreamingValidator  # Real-time validation
```

## Use Cases

### Development Time
```typescript
// Configure strict validation for development
const validator = createValidator({
  rules: {
    'no-unused-variables': true,
    'require-confidence-in-uncertain': true,
    'no-infinite-loops': true
  }
});
```

### LLM Integration
```typescript
// Use streaming validation for AI code generation
const validator = createValidator();
validator.resetStreaming();

// Validate chunks as they're generated
const chunk1 = validator.validateStreaming("const x = ");
const chunk2 = validator.validateStreaming("llm(");
const completions = validator.getStreamingCompletions(); // ["llm(\""]
```

### CI/CD Pipeline
```typescript
// Run comprehensive checks in CI
const validator = createValidator({ strict: true });
const result = validator.validateAll(sourceCode);

if (!result.valid) {
  console.error("Validation failed:");
  result.errors.forEach(err => {
    console.error(`${err.file}:${err.line}:${err.column} - ${err.message}`);
  });
  process.exit(1);
}
```

## Next Steps

- [Syntax Validation](./syntax-validation) - Learn about AST validation
- [Type Checking](./type-checking) - Understand runtime type validation
- [Linting Rules](./linting) - Configure code quality rules
- [Streaming API](./streaming) - Integrate with code generation