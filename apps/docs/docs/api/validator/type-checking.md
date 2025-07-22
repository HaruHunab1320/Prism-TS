---
sidebar_position: 3
title: Type Checking
---

# Type Checking

The Prism type checker performs runtime type validation and tracks confidence propagation through expressions.

## Overview

```typescript
import { TypeChecker } from '@prism-lang/validator';

const checker = new TypeChecker();
const result = checker.checkTypes(ast);

if (result.errors.length > 0) {
  console.error("Type errors:", result.errors);
}
```

## Type System

### Basic Types
- `number` - Numeric values
- `string` - Text values
- `boolean` - true/false
- `null` - Null value
- `undefined` - Undefined value
- `array` - Arrays of any type
- `object` - Key-value objects
- `function` - Functions
- `confidence` - Confidence-wrapped values

### Type Inference

```prism
// Types are inferred from values
const x = 42              // number
const name = "Alice"      // string
const items = [1, 2, 3]   // array
const user = {id: 1}      // object

// Confidence types
const conf = 0.8 ~> 0.9   // confidence<number>
const result = x ~> 0.7   // confidence<number>
```

## Type Checking Rules

### 1. Binary Operations
```prism
// ✅ Valid
const sum = 10 + 20       // number + number
const concat = "a" + "b"  // string + string

// ❌ Type Error
const invalid = 10 + "20" // number + string
```

### 2. Confidence Operations
```prism
// Confidence operators preserve types
const x = 42 ~> 0.8       // confidence<number>
const y = 10 ~> 0.9       // confidence<number>
const z = x ~+ y          // confidence<number>

// Extract confidence
const conf = ~x           // number (0.8)
```

### 3. Function Calls
```prism
// Functions track parameter and return types
function add(a, b) {
  return a + b
}

// ✅ Valid
add(10, 20)              // number, number

// ❌ Type Error  
add("hello", 20)         // string, number
```

### 4. Array Operations
```prism
const nums = [1, 2, 3]
const strs = ["a", "b"]

// ✅ Valid
nums.push(4)             // number to number[]
nums.map(x => x * 2)     // number => number

// ❌ Type Error
nums.push("four")        // string to number[]
```

## Confidence Propagation

### Arithmetic Operations
```prism
const a = 10 ~> 0.8
const b = 20 ~> 0.9

// Confidence propagates through operations
const sum = a ~+ b       // 30 ~> 0.72 (0.8 * 0.9)
const product = a ~* b   // 200 ~> 0.72
```

### Control Flow
```prism
// Type checker ensures branches return compatible types
uncertain if (condition ~> 0.7) {
  high { return 42 }          // number
  medium { return 0 }         // number
  low { return -1 }          // number
}
```

## Error Messages

### Type Mismatch
```typescript
{
  code: "TYPE_MISMATCH",
  message: "Cannot add number and string",
  expected: "number",
  actual: "string",
  location: { line: 3, column: 10 }
}
```

### Undefined Variable
```typescript
{
  code: "UNDEFINED_VARIABLE",
  message: "Variable 'x' is not defined",
  suggestion: "Did you mean 'y'?",
  location: { line: 5, column: 7 }
}
```

### Invalid Operation
```typescript
{
  code: "INVALID_OPERATION",
  message: "Cannot use confidence operator on non-numeric value",
  location: { line: 8, column: 15 }
}
```

## Advanced Features

### Custom Type Definitions
```typescript
const checker = new TypeChecker({
  customTypes: {
    'llm': { returns: 'string', confidence: true },
    'embedding': { returns: 'array', params: ['string'] }
  }
});
```

### Type Annotations (Future)
```prism
// Planned feature
function add(a: number, b: number): number {
  return a + b
}
```

### Strict Mode
```typescript
const checker = new TypeChecker({ strict: true });
// Enables additional checks:
// - No implicit any
// - No unused variables
// - Stricter confidence rules
```

## Integration with Other Validators

```typescript
import { createValidator } from '@prism-lang/validator';

const validator = createValidator();

// Type checking is part of comprehensive validation
const result = validator.validateAll(code);
console.log("Type errors:", result.typeErrors);
```

## Best Practices

1. **Let Type Inference Work**: Prism infers most types automatically
2. **Use Confidence Operators Correctly**: Only on numeric values
3. **Check Function Arguments**: Ensure correct types are passed
4. **Handle Mixed Types**: Use type guards when needed

```prism
// Type guard example
function process(value) {
  if (typeof value === "number") {
    return value * 2
  } else if (typeof value === "string") {
    return value.toUpperCase()
  }
}
```