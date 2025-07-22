---
sidebar_position: 2
title: Syntax Validation
---

# Syntax Validation

The core syntax validator ensures Prism code follows the language grammar and produces valid AST structures.

## Basic Usage

```typescript
import { PrismValidator } from '@prism-lang/validator';

const validator = new PrismValidator();
const result = validator.validate(code);

if (result.valid) {
  console.log("AST:", result.ast);
} else {
  console.log("Errors:", result.errors);
}
```

## Validation Process

### 1. Tokenization Check
```typescript
// The validator first ensures code can be tokenized
const parseResult = validator.parse(code);
if (!parseResult.success) {
  console.error("Tokenization failed:", parseResult.error);
}
```

### 2. AST Construction
```typescript
// Valid code produces a complete AST
const result = validator.validate(`
  const x = 42
  const y = x * 2
  print("Result:", y)
`);

// result.ast contains the parsed program
```

### 3. Syntax Rules

The validator checks:
- Variable declarations (const/let)
- Expression validity
- Statement structure
- Control flow syntax
- Function declarations
- Import/export statements

## Error Reporting

### Error Structure
```typescript
interface ValidationError {
  code: string;           // Error code (e.g., "SYNTAX_ERROR")
  message: string;        // Human-readable message
  line: number;          // Line number (1-based)
  column: number;        // Column number (1-based)
  severity: 'error' | 'warning';
  suggestion?: string;    // Fix suggestion
}
```

### Common Errors

#### Missing Initializer
```prism
// ❌ Error
const x

// ✅ Fixed
const x = 0
```

#### Invalid Confidence Syntax
```prism
// ❌ Error
const x = 42 @ 1.5  // Confidence > 1

// ✅ Fixed
const x = 42 ~> 0.9
```

#### Incomplete Uncertain Blocks
```prism
// ❌ Error
uncertain if (condition) {
  high { action() }
  // Missing low/medium branches
}

// ✅ Fixed
uncertain if (condition) {
  high { action() }
  low { fallback() }
}
```

## Advanced Features

### Custom Error Messages
```typescript
const validator = new PrismValidator({
  errorFormatter: (error) => {
    return `${error.file}:${error.line} - ${error.message}`;
  }
});
```

### Partial Validation
```typescript
// Validate specific node types
const validator = new PrismValidator();
const ast = parse(code);
const errors = validator.validateNode(ast.statements[0]);
```

### Recovery Suggestions
```typescript
const result = validator.validate("cosnt x = 42");
// Produces: "Unknown keyword 'cosnt'. Did you mean 'const'?"
```

## Integration Examples

### With Build Tools
```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [{
      test: /\.prism$/,
      use: ['prism-validator-loader']
    }]
  }
};
```

### With ESLint
```javascript
// .eslintrc.js
module.exports = {
  plugins: ['@prism-lang/validator'],
  rules: {
    '@prism-lang/syntax': 'error'
  }
};
```

## Performance Considerations

- Validation is performed in a single pass
- AST is cached for subsequent checks
- Incremental validation available for editors
- Typical validation time: <10ms for 1000 LOC

## Best Practices

1. **Validate Early**: Check syntax before other validations
2. **Cache Results**: Reuse AST for type checking and linting
3. **Handle Errors Gracefully**: Provide meaningful feedback
4. **Use Streaming**: For real-time validation in editors