# Prism Language Examples Index

This document provides a comprehensive index of all Prism language examples, organized by category. Each example is a fully functional Prism script that demonstrates specific language features.

## 📚 Table of Contents

### 01. Basic Syntax
- **[01-variables.prism](examples/01-basic-syntax/01-variables.prism)** - Variable declarations, types, and scoping
- **[02-operators.prism](examples/01-basic-syntax/02-operators.prism)** - All operators: arithmetic, logical, bitwise, comparison
- **[03-comments.prism](examples/01-basic-syntax/03-comments.prism)** - Comment styles and documentation

### 02. Control Flow
- **[01-if-else.prism](examples/02-control-flow/01-if-else.prism)** - Conditional statements and ternary operators
- **[02-loops.prism](examples/02-control-flow/02-loops.prism)** - All loop types: for, while, do-while, for-in, for-of
- **[03-switch.prism](examples/02-control-flow/03-switch.prism)** - Switch statements and pattern matching

### 03. Functions
- **[01-function-basics.prism](examples/03-functions/01-function-basics.prism)** - Function declarations, expressions, arrow functions

### 04. Objects and Arrays
- **[01-objects.prism](examples/04-objects-arrays/01-objects.prism)** - Object creation, manipulation, destructuring

### 05. Confidence Operators ⭐ (Prism-specific)
- **[01-confident-operators.prism](examples/05-confidence-operators/01-confident-operators.prism)** - Core confident operators: ~, ~=, ~==, ~>
- **[02-confident-ternary.prism](examples/05-confidence-operators/02-confident-ternary.prism)** - The confident ternary operator (~?)
- **[03-confident-assignments.prism](examples/05-confidence-operators/03-confident-assignments.prism)** - Compound assignments: ~+=, ~-=, ~*=, ~/=

### 06. Modules
- **[01-imports-exports.prism](examples/06-modules/01-imports-exports.prism)** - ES6-style module system

### 10. Real World Examples
- **[01-user-authentication.prism](examples/10-real-world/01-user-authentication.prism)** - Complete auth system with confidence

## 🌟 Unique Prism Features

### Confident Operators
Prism introduces confidence tracking to programming:

```prism
// Confident assignment
let value ~= 42;

// Confident comparison
if (a ~== b) { /* true with confidence */ }

// Confident ternary
let result = condition ~? "yes" : "no";

// Confident function
function calculate(x, y) ~> {
    return x + y;
}

// Get confidence level
let conf = ~value;

// Compound assignments
total ~+= 10;  // Add with confidence
score ~*= 2;   // Multiply with confidence
```

### Module System
ES6-style modules with confidence support:

```prism
// Named exports
export const config ~= { timeout: 5000 };
export function process(data) ~> { /* ... */ }

// Default export
export default class Service { /* ... */ }

// Imports
import { config, process } from './module';
import Service from './service';
```

### Type System
JavaScript-compatible with optional confidence:

```prism
// Basic types
const str = "text";
const num = 42;
const bool = true;
const arr = [1, 2, 3];
const obj = { key: "value" };

// With confidence
const confStr ~= "confident text";
const confNum ~= 99.9;
```

## 🎯 Key Language Concepts

### 1. Confidence Propagation
Confidence flows through operations:
```prism
let a ~= 10;
let b ~= 20;
let sum ~= a + b;  // sum has confidence
```

### 2. Confidence Validation
Check confidence levels:
```prism
if (~value < 0.8) {
    console.log("Low confidence!");
}
```

### 3. Module Isolation
Each module has its own scope:
```prism
// module.prism
export const data ~= loadData();

// main.prism
import { data } from './module';
```

### 4. Async Support
Full async/await with confidence:
```prism
async function fetchData() ~> {
    const result = await api.get('/data');
    return result;
}
```

## 🚀 Running Examples

```bash
# Run all examples
npm test

# Run specific example
npx prism-cli run examples/05-confidence-operators/01-confident-operators.prism

# Run category
npx tsx src/run-category.ts confidence-operators
```

## 📝 Example Format

Each example follows this structure:

```prism
// filename: example-name.prism
// description: What this example demonstrates
// tags: #feature1 #feature2
// expected: Description of expected output

// === CODE STARTS HERE ===
// Actual Prism code

// === EXPECTED OUTPUT ===
// Expected console output
```

## 🔍 Common Patterns

### Error Handling with Confidence
```prism
function safeDivide(a, b) ~> {
    return b !== 0 ~? a / b : "Error: Division by zero";
}
```

### Confidence-based Decisions
```prism
let authConfidence ~= checkCredentials(user, pass);
if (authConfidence > 0.8) {
    grantAccess();
} else {
    requireAdditionalVerification();
}
```

### Module Patterns
```prism
// Barrel exports
export * from './userService';
export * from './authService';

// Factory pattern
export function createService(type) {
    return type ~== "api" ~? new ApiService() : new MockService();
}
```

## 📚 Learning Path

1. Start with **Basic Syntax** (01-*)
2. Learn **Control Flow** (02-*)
3. Master **Functions** (03-*)
4. Understand **Objects/Arrays** (04-*)
5. **Focus on Confidence Operators** (05-*) - Prism's unique feature
6. Learn **Module System** (06-*)
7. Study **Real World Examples** (10-*)

## 🤝 Contributing

To add new examples:
1. Create a `.prism` file in the appropriate category
2. Follow the example format with metadata
3. Include expected output
4. Test the example
5. Update this index

## 📖 Additional Resources

- [Prism Language Specification](../../../docs/LANGUAGE_SPEC.md)
- [Confidence System Guide](../../../docs/CONFIDENCE_GUIDE.md)
- [Module System Documentation](../../../docs/MODULES.md)