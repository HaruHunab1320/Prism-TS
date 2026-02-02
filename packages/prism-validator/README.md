# @prism-lang/validator

Validation toolkit for Prism code generation and CI checks.

<div align="center">
  <img src="https://docs.prismlang.dev/img/prism-logo-v1.png" width="160" alt="Prism logo" />
</div>

## Features

- Syntax validation with parser-backed diagnostics
- Confidence flow/completeness checks for `uncertain` logic
- Type analysis and configurable lint rules
- Streaming validation for incremental generation workflows
- Error formatting helpers for agent/tooling feedback loops

## Installation

```bash
npm install @prism-lang/validator
```

## Quick Start

```typescript
import { createValidator } from '@prism-lang/validator';

const validator = createValidator();

const code = `
const result = llm("Is this valid?") ~> 0.78
uncertain if (result) {
  high { console.log("Very confident") }
  medium { console.log("Somewhat confident") }
  low { console.log("Not confident") }
}
`;

const report = validator.validateAll(code);
console.log(report.valid);
console.log(report.summary);
```

## API Surface

```typescript
interface PrismValidationAPI {
  validate(code: string): ValidationResult;
  parse(code: string): ParseResult;
  checkConfidenceFlow(code: string): ConfidenceFlowResult;
  checkConfidenceCompleteness(code: string): ConfidenceCompletenessResult;
  checkTypes(code: string): TypeCheckResult;
  lint(code: string, config?: LinterConfig): LintResult[];
  validateAll(code: string, config?: LinterConfig): ComprehensiveValidationResult;
  validateStreaming(chunk: string): StreamingValidationResult;
  formatErrors(errors: any[]): ErrorMessage[];
}
```

## Streaming Example

```typescript
const chunk1 = validator.validateStreaming('const x = llm("hello")');
const chunk2 = validator.validateStreaming(' ~> 0.8');
console.log(chunk1.errors, chunk2.errors);
```

## Common Rules

- `confidence-range`
- `uncertain-completeness`
- `require-confidence-in-uncertain`
- `variable-declared-before-use`
- `no-unused-variables`

## License

MIT
