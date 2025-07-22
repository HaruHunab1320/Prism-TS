---
sidebar_position: 4
title: Linting
---

# Linting

The Prism linter helps maintain code quality by enforcing best practices and catching common mistakes.

## Configuration

```typescript
import { PrismLinter, createValidator } from '@prism-lang/validator';

// Standalone linter
const linter = new PrismLinter({
  rules: {
    'no-unused-variables': true,
    'confidence-range': true,
    'no-infinite-loops': true
  }
});

// Or with unified validator
const validator = createValidator({
  rules: {
    'uncertain-completeness': true,
    'require-confidence-in-uncertain': true
  }
});
```

## Available Rules

### Code Quality

#### `no-unused-variables`
Detects variables that are declared but never used.

```prism
// ❌ Lint Warning
const unused = 42
const used = 10
print(used)

// ✅ Fixed
const used = 10
print(used)
```

#### `no-unreachable-code`
Identifies code that can never be executed.

```prism
// ❌ Lint Warning
function example() {
  return 42
  print("Never runs")  // Unreachable
}

// ✅ Fixed
function example() {
  const result = 42
  print("Returning:", result)
  return result
}
```

#### `no-empty-blocks`
Warns about empty code blocks.

```prism
// ❌ Lint Warning
if (condition) {
  // Empty block
}

// ✅ Fixed
if (condition) {
  // TODO: Implement logic
  print("Condition met")
}
```

### Confidence Rules

#### `confidence-range`
Ensures confidence values are between 0 and 1.

```prism
// ❌ Lint Error
const x = 42 ~> 1.5    // Confidence > 1
const y = 10 ~> -0.1   // Confidence < 0

// ✅ Fixed
const x = 42 ~> 0.9
const y = 10 ~> 0.1
```

#### `consistent-confidence-usage`
Enforces consistent use of confidence throughout related operations.

```prism
// ❌ Lint Warning
const a = getValue() ~> 0.8
const b = getValue()        // Missing confidence
const result = a + b

// ✅ Fixed
const a = getValue() ~> 0.8
const b = getValue() ~> 0.7
const result = a ~+ b
```

#### `prefer-confidence-operators`
Suggests using confidence operators when working with confident values.

```prism
// ❌ Lint Suggestion
const a = 10 ~> 0.8
const b = 20 ~> 0.9
const sum = a + b      // Regular operator

// ✅ Fixed
const a = 10 ~> 0.8
const b = 20 ~> 0.9
const sum = a ~+ b     // Confidence operator
```

### Control Flow Rules

#### `uncertain-completeness`
Ensures uncertain statements have all required branches.

```prism
// ❌ Lint Warning
uncertain if (analysis) {
  high { process() }
  // Missing low branch
}

// ✅ Fixed
uncertain if (analysis) {
  high { process() }
  medium { review() }
  low { fallback() }
}
```

#### `require-confidence-in-uncertain`
Requires confidence values in uncertain conditions.

```prism
// ❌ Lint Error
uncertain if (result) {  // No confidence
  high { accept() }
  low { reject() }
}

// ✅ Fixed
uncertain if (result ~> 0.7) {
  high { accept() }
  low { reject() }
}
```

#### `no-infinite-loops`
Detects potentially infinite loops.

```prism
// ❌ Lint Warning
while (true) {
  process()
  // No break condition
}

// ✅ Fixed
let count = 0
while (count < 100) {
  process()
  count = count + 1
}
```

### Best Practice Rules

#### `const-requires-initializer`
Enforces that const declarations have initializers.

```prism
// ❌ Lint Error
const x

// ✅ Fixed
const x = 0
```

#### `function-requires-name`
Requires functions to have names (no anonymous functions).

```prism
// ❌ Lint Warning
const handler = function() {
  return 42
}

// ✅ Fixed
const handler = function calculate() {
  return 42
}
```

#### `no-duplicate-confidence-branches`
Detects duplicate logic in confidence branches.

```prism
// ❌ Lint Warning
uncertain if (score ~> 0.8) {
  high { print("Good") }
  medium { print("Good") }  // Duplicate
  low { print("Bad") }
}

// ✅ Fixed
uncertain if (score ~> 0.8) {
  high { print("Excellent") }
  medium { print("Good") }
  low { print("Needs improvement") }
}
```

## Custom Rules

```typescript
const linter = new PrismLinter({
  customRules: {
    'company-style': {
      create(context) {
        return {
          VariableDeclaration(node) {
            if (node.kind === 'let') {
              context.report({
                node,
                message: 'Prefer const over let'
              });
            }
          }
        };
      }
    }
  }
});
```

## Rule Configuration

### Severity Levels
```typescript
const linter = new PrismLinter({
  rules: {
    'no-unused-variables': 'error',     // Fail linting
    'no-empty-blocks': 'warning',       // Show warning
    'prefer-confidence-operators': 'info' // Suggestion only
  }
});
```

### Rule Options
```typescript
const linter = new PrismLinter({
  rules: {
    'confidence-range': ['error', {
      min: 0,
      max: 1,
      allowSpecialValues: false
    }],
    'no-unused-variables': ['warning', {
      ignorePattern: '^_',  // Ignore vars starting with _
      argsIgnorePattern: '^_'
    }]
  }
});
```

## Integration

### VS Code Extension
```json
// .vscode/settings.json
{
  "prism.linting.enabled": true,
  "prism.linting.rules": {
    "no-unused-variables": true,
    "uncertain-completeness": true
  }
}
```

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

files=$(git diff --cached --name-only --diff-filter=ACM | grep '\.prism$')
if [ -n "$files" ]; then
  npx prism-lint $files
fi
```

### CI Pipeline
```yaml
# .github/workflows/lint.yml
- name: Lint Prism Code
  run: |
    npx @prism-lang/validator lint src/**/*.prism
```

## Output Format

```typescript
interface LintResult {
  file: string;
  errors: LintMessage[];
  warnings: LintMessage[];
  info: LintMessage[];
}

interface LintMessage {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  line: number;
  column: number;
  message: string;
  fix?: {
    range: [number, number];
    text: string;
  };
}
```

## Auto-fixing

Some rules support auto-fixing:

```typescript
const linter = new PrismLinter();
const results = linter.lint(code, { fix: true });

// Apply fixes
const fixedCode = linter.applyFixes(code, results);
```