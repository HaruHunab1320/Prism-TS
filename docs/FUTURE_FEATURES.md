# Future Features for Prism

This document outlines potential improvements and new operators that could be added to the Prism language. Features are organized by priority and implementation status.

## Completed Features ✅

These features were previously planned and are now implemented:

### 1. Array Property Access
**Status:** COMPLETED ✅  
**Implemented:** v1.0.14
- `array.length` property
- All array methods: `map()`, `filter()`, `reduce()`, `forEach()`, `push()`
- Both method and function syntax supported

### 2. Logical NOT Operator (`!`)
**Status:** COMPLETED ✅  
**Note:** Was already working, tests confirm functionality

### 3. Optional Chaining (`?.`)
**Status:** COMPLETED ✅  
**Implemented:** v1.0.11
- Safe property access: `user?.profile?.name`
- Works with arrays and confidence values
- Returns undefined when encountering null/undefined

### 4. Spread Operator (`...`)
**Status:** COMPLETED ✅  
**Implemented:** v1.0.10 (arrays/objects), v1.0.20 (functions)
- Array spread: `[...arr1, ...arr2]`
- Object spread: `{...base, z: 3}`
- Function argument spread: `max(...numbers)`
- Rest parameters: `(...args) => args.length`

### 5. Compound Assignment Operators
**Status:** COMPLETED ✅  
**Implemented:** v1.0.9
- All operators: `+=`, `-=`, `*=`, `/=`, `%=`
- Works with numbers, strings, and confidence values

### 6. Undefined Support
**Status:** COMPLETED ✅  
**Implemented:** v1.0.12
- `undefined` keyword
- Distinct from `null`
- Works with all operators

### 7. Nullish Coalescing (`??`)
**Status:** COMPLETED ✅  
**Implemented:** v1.0.8
- Returns right operand when left is null/undefined
- Different from `||` which checks truthiness

### 8. Exponentiation Operator (`**`)
**Status:** COMPLETED ✅  
**Implemented:** v1.0.13
- Power operator with right-associativity
- Works with confidence values

### 9. Standard Loops
**Status:** COMPLETED ✅  
**Implemented:** v1.0.17
- C-style for loops: `for (i = 0; i < 10; i++)`
- For-in loops: `for item in array` and `for item, index in array`
- While loops: `while (condition) { }`
- Do-while loops: `do { } while (condition)`
- Break and continue statements
- Full nested loop support

### 10. Uncertainty-Aware Loops
**Status:** COMPLETED ✅  
**Implemented:** v1.0.18
- `uncertain for` and `uncertain while` loops
- Confidence-based branching (high/medium/low)
- Thresholds: HIGH >= 0.7, MEDIUM >= 0.5, LOW < 0.5

### 11. Type Coercion for || and && Operators
**Status:** COMPLETED ✅  
**Implemented:** v1.0.19
- JavaScript-style logical operators
- `||` returns first truthy value or last value
- `&&` returns first falsy value or last value
- Short-circuit evaluation

### 12. Better Error Messages
**Status:** COMPLETED ✅  
**Implemented:** v1.0.19
- Runtime errors now show line and column numbers

## Critical Missing Features
- Format: `Error at line X, column Y: message`
- AST nodes carry optional location information
- Future improvement: Show actual variable values in error messages

## High Priority Features

### 1. Function Argument Spread
**Priority:** HIGH  
**Complexity:** Medium  
**Value:** Completes spread operator implementation

```prism
// Spread in function calls
maxValue = max(...numbers)
combined = concat(...arrays)

// Rest parameters
sum = (...nums) => reduce(nums, (a, b) => a + b, 0)
```

### 2. Pipeline Operator (`|>`)
**Status:** COMPLETED ✅  
**Implemented:** v1.0.20
- Function composition with `|>` operator
- Placeholder `_` for piped values
- Works with all functions and methods

### 3. Destructuring Assignment
**Status:** COMPLETED ✅  
**Implemented:** v1.0.21
- Array destructuring with rest elements
- Object destructuring with default values
- Destructuring in function parameters
- **NEW**: Confidence-based destructuring with thresholds
  - Global thresholds: `[a, b] ~> 0.8 = array`
  - Per-element thresholds: `[a ~> 0.9, b ~> 0.5] = array`

### 4. Type Checking Operators
**Status:** COMPLETED ✅  
**Implemented:** v1.0.21
- `typeof` operator returns type as string
- `instanceof` operator for type checking
- Works with all Prism types including confidence values

## Lower Priority Features

### 5. Pattern Matching
**Priority:** LOW  
**Complexity:** Very High  
**Value:** Advanced control flow

```prism
result = match value {
  null => "no value",
  0 => "zero",
  n if n > 0 => "positive: ${n}",
  {type: "error", message} => "Error: ${message}",
  _ => "other"
}
```

### 6. Range Operator
**Priority:** LOW  
**Complexity:** Medium  
**Value:** Sequence generation

```prism
numbers = 1..10        // [1, 2, 3, ..., 10]
evens = 0..20 step 2   // [0, 2, 4, ..., 20]

for i in 1..100 {
  print(i)
}
```

### 7. Custom Confidence Thresholds
**Priority:** LOW  
**Complexity:** Low  
**Value:** Fine-grained control

```prism
// Custom threshold syntax
result = value ~@[0.9]> action   // 90% threshold
safe = data ~@[0.95]> process    // 95% threshold
```

### 8. Async/Await Support
**Priority:** LOW  
**Complexity:** Very High  
**Value:** Modern async handling

```prism
async function analyzeData(data) {
  result = await llm("Analyze: ${data}")
  return await transform(result)
}
```

### 9. Set Operations
**Priority:** LOW  
**Complexity:** Medium  
**Value:** Mathematical operations

```prism
// Set literals and operations
uniqueNumbers = {1, 2, 3, 3, 4}  // {1, 2, 3, 4}
union = set1 | set2
intersection = set1 & set2
```

### 10. Tagged Template Literals
**Priority:** LOW  
**Complexity:** High  
**Value:** Domain-specific processing

```prism
query = sql`
  SELECT * FROM users 
  WHERE age > ${minAge}
`
```

## Implementation Priority Summary

### Immediate (Next to Implement):
1. **Pipeline Operator** - Functional programming style for chaining operations

### Near Term (High Value):
2. **Destructuring** - Modern syntax
3. **Type Checking** - Runtime safety

### Long Term (Nice to Have):
8. Pattern Matching
9. Range Operators
10. Custom Confidence Thresholds
11. Async/Await
12. Set Operations
13. Tagged Templates

## Notes

- All new features should integrate with the confidence system where appropriate
- Maintain backwards compatibility
- Each feature needs comprehensive tests and documentation
- Prioritize features that unblock common use cases
- Consider developer experience and error messages