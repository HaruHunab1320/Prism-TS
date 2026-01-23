---
sidebar_position: 6
title: Utilities
---

# Validator Utilities

The `@prism-lang/validator` package includes utility classes for error formatting and AST manipulation.

## ErrorFormatter

The `ErrorFormatter` class transforms validation errors into LLM-friendly messages with fix suggestions and code examples.

### Import

```typescript
import { ErrorFormatter } from '@prism-lang/validator';
```

### formatForLLM()

Convert a single error into a structured message with fix guidance.

```typescript
static formatForLLM(
  error: SyntaxError | ParseError | ConfidenceIssue | TypeError | LintResult
): ErrorMessage
```

**Returns:** `ErrorMessage` with fix suggestions and examples

**Example:**

```typescript
import { ErrorFormatter } from '@prism-lang/validator';

const error = {
  line: 5,
  column: 10,
  message: 'Missing confidence branches',
  code: 'MISSING_CONFIDENCE_BRANCHES'
};

const formatted = ErrorFormatter.formatForLLM(error);

console.log(formatted);
// {
//   error: 'MISSING_CONFIDENCE_BRANCHES',
//   line: 5,
//   column: 10,
//   message: 'Missing confidence branches',
//   fix: "Add a 'low { }' block after the 'medium' block",
//   example: `uncertain if (confidence > 0.5) {
//     high { return "very confident" }
//     medium { return "somewhat confident" }
//     low { return "not confident" }
//   }`
// }
```

### Supported Error Codes

| Error Code | Fix Suggestion |
|------------|----------------|
| `SYNTAX_ERROR` | Check for missing semicolons, brackets, or parentheses |
| `MISSING_CONFIDENCE_BRANCHES` | Add missing `low { }` block |
| `CONFIDENCE_WITHOUT_VALUE` | Assign confidence using `value @ 0.8` |
| `CONFIDENCE_OPERATOR_WITHOUT_VALUE` | Ensure variable has confidence before using operators |
| `UNCERTAIN_WITHOUT_CONFIDENCE` | Use confidence expression in the test |
| `INVALID_CONFIDENCE_VALUE` | Confidence must be between 0 and 1 |
| `UNDEFINED_VARIABLE` | Declare variable before using it |
| `NOT_A_FUNCTION` | Ensure calling a function, not a value |
| `INVALID_BINARY_OPERAND` | Convert types before using operator |
| `INCOMPLETE_CONFIDENCE_BRANCHES` | Add all three branches (high, medium, low) |
| `VARIABLE_MISSING_CONFIDENCE` | Initialize with confidence before using operators |
| `WRONG_ARGUMENT_COUNT` | Provide correct number of arguments |
| `no-infinite-loops` | Add break condition or termination logic |
| `confidence-range` | Use value between 0 and 1 |
| `no-unused-variables` | Remove or prefix with underscore |
| `uncertain-completeness` | Add at least one confidence branch |
| `no-constant-condition` | Replace constant with variable |

### formatMultipleErrors()

Format and group multiple errors by type.

```typescript
static formatMultipleErrors(
  errors: Array<SyntaxError | ParseError | ConfidenceIssue | TypeError | LintResult>
): ErrorMessage[]
```

**Example:**

```typescript
const errors = [
  { line: 1, column: 1, message: 'Undefined variable: x', code: 'UNDEFINED_VARIABLE' },
  { line: 3, column: 1, message: 'Undefined variable: y', code: 'UNDEFINED_VARIABLE' },
  { line: 5, column: 10, message: 'Missing brackets', code: 'SYNTAX_ERROR' }
];

const formatted = ErrorFormatter.formatMultipleErrors(errors);

console.log(formatted);
// [
//   {
//     error: 'UNDEFINED_VARIABLE',
//     line: 1,
//     message: 'Multiple UNDEFINED_VARIABLE errors (2 instances)',
//     suggestion: 'Fix all 2 instances of this error type'
//   },
//   {
//     error: 'SYNTAX_ERROR',
//     line: 5,
//     message: 'Missing brackets',
//     fix: 'Check for missing semicolons, brackets, or parentheses'
//   }
// ]
```

### generateFixSuggestion()

Generate a prioritized fix suggestion for multiple errors.

```typescript
static generateFixSuggestion(errors: ErrorMessage[]): string
```

Errors are prioritized:
1. Syntax/Parse errors (fix first)
2. Undefined variables, function errors
3. Argument count errors
4. Confidence-related errors

**Example:**

```typescript
const formatted = ErrorFormatter.formatMultipleErrors(errors);
const suggestion = ErrorFormatter.generateFixSuggestion(formatted);

console.log(suggestion);
// "Start by fixing the SYNTAX_ERROR at line 5: Check for missing semicolons, brackets, or parentheses"
```

---

## ASTUtils

Simple utilities for working with Prism AST nodes.

### Import

```typescript
import { getNodeLocation, getLine, getColumn } from '@prism-lang/validator';
```

### getNodeLocation()

Get the location of an AST node.

```typescript
function getNodeLocation(node: ASTNode): { line: number; column: number }
```

**Example:**

```typescript
import { parse } from '@prism-lang/core';
import { getNodeLocation } from '@prism-lang/validator';

const ast = parse('const x = 42');
const location = getNodeLocation(ast.body[0]);

console.log(location); // { line: 1, column: 1 }
```

### getLine()

Get just the line number from a node.

```typescript
function getLine(node: ASTNode): number
```

### getColumn()

Get just the column number from a node.

```typescript
function getColumn(node: ASTNode): number
```

**Example:**

```typescript
import { getLine, getColumn } from '@prism-lang/validator';

const line = getLine(node);   // 1
const col = getColumn(node);  // 1
```

---

## ErrorMessage Type

```typescript
interface ErrorMessage {
  error: string;      // Error code
  line: number;       // Line number
  column: number;     // Column number
  message: string;    // Human-readable message
  fix?: string;       // How to fix the error
  example?: string;   // Code example showing correct usage
  suggestion?: string; // Additional guidance
}
```

---

## LLM Error Correction Example

Use ErrorFormatter to help an LLM fix code:

```typescript
import { UnifiedValidator, ErrorFormatter } from '@prism-lang/validator';
import { llm } from '@prism-lang/llm';

async function autoFixCode(code: string): Promise<string> {
  const validator = new UnifiedValidator();
  const result = validator.validateAll(code);

  if (result.valid) {
    return code;
  }

  // Format errors for LLM
  const allErrors = [
    ...result.syntax.errors,
    ...result.types.errors,
    ...result.confidence.issues,
    ...result.lint.results.filter(r => r.severity === 'error')
  ];

  const formatted = ErrorFormatter.formatMultipleErrors(allErrors);
  const suggestion = ErrorFormatter.generateFixSuggestion(formatted);

  // Build prompt for LLM
  const prompt = `
Fix the following Prism code. ${suggestion}

Errors found:
${formatted.map(e => `- Line ${e.line}: ${e.message}\n  Fix: ${e.fix}`).join('\n')}

Original code:
\`\`\`prism
${code}
\`\`\`

Provide only the corrected code:`;

  const fixed = await llm(prompt);
  return fixed;
}
```

---

## Prism Integration

```javascript
// error-helper.prism
import {UnifiedValidator, ErrorFormatter} from "@prism-lang/validator"

function explainErrors(code) {
  validator = new UnifiedValidator()
  result = validator.validateAll(code)

  if result.valid {
    return "Code is valid!" ~> 1.0
  }

  errors = result.syntax.errors
  formatted = ErrorFormatter.formatMultipleErrors(errors)

  explanation = ""
  for error in formatted {
    explanation = explanation + "Line " + error.line + ": " + error.message + "\n"
    if error.fix {
      explanation = explanation + "  Fix: " + error.fix + "\n"
    }
    if error.example {
      explanation = explanation + "  Example:\n" + error.example + "\n"
    }
  }

  return explanation ~> 0.9
}

// Usage
code = "uncertain if (x { high { } }"
help = explainErrors(code)
print(help)
```
