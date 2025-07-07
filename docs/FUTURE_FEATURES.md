# Future Features for Prism

This document outlines potential improvements and new operators that could be added to the Prism language. Features are organized by priority and implementation complexity.

## High Priority Features

### 1. Optional Chaining Operator (`?.`)
**Priority:** HIGH  
**Complexity:** Medium  
**Value:** Prevents errors when accessing properties on null/undefined values

```prism
// Safe property access
address = user?.profile?.address?.street

// Safe method calls
result = api?.getData?.()

// Safe array access
firstItem = items?.[0]
```

**Benefits:**
- Eliminates verbose null checking
- Prevents runtime errors
- Makes code more readable
- Common pattern in modern languages

### 2. Spread Operator (`...`)
**Priority:** HIGH  
**Complexity:** Medium-High  
**Value:** Essential for modern data manipulation

```prism
// Array spread
combined = [...array1, ...array2]
newArray = [1, ...oldArray, 5]

// Object spread
merged = {...defaults, ...userConfig}
updated = {...user, age: 31}

// Function arguments
maxValue = max(...numbers)
```

**Benefits:**
- Immutable data operations
- Clean array/object composition
- Useful for functional programming patterns

### 3. Compound Assignment Operators
**Priority:** HIGH  
**Complexity:** Low  
**Value:** Basic convenience operators found in most languages

```prism
x += 5    // x = x + 5
x -= 3    // x = x - 3
x *= 2    // x = x * 2
x /= 4    // x = x / 4
x %= 3    // x = x % 3

// Could also support confidence versions
x ~+= 5   // x = x ~+ 5
```

**Benefits:**
- More concise code
- Expected by developers
- Easy to implement

### 4. Undefined Support
**Priority:** HIGH  
**Complexity:** Low-Medium  
**Value:** Complements null support for complete absence handling

```prism
// Undefined as a value
value = undefined

// Distinguish between null and undefined
if (value == undefined) {
  // Never assigned
} else if (value == null) {
  // Explicitly set to null
}
```

**Benefits:**
- Complete absence value support
- Better JavaScript/TypeScript interop
- Clearer intent in code

## Medium Priority Features

### 5. Nullish Coalescing (`??`)
**Priority:** MEDIUM  
**Complexity:** Low  
**Value:** Different from confidence coalesce, works with null/undefined

```prism
// Use right side only if left is null/undefined
displayName = user.nickname ?? user.name ?? "Anonymous"

// Different from || which checks truthiness
count = userCount ?? 0  // 0 is kept if userCount is 0
```

**Benefits:**
- Precise null/undefined handling
- Avoids falsy value confusion
- Pairs well with optional chaining

### 6. Exponentiation Operator (`**`)
**Priority:** MEDIUM  
**Complexity:** Low  
**Value:** Mathematical completeness

```prism
squared = x ** 2
cubed = x ** 3
power = base ** exponent

// With confidence
result = (value ~> 0.9) ** 2
```

**Benefits:**
- More readable than function calls
- Standard in modern languages
- Useful for scientific computing

### 7. Destructuring Assignment
**Priority:** MEDIUM  
**Complexity:** High  
**Value:** Clean extraction of values from structures

```prism
// Array destructuring
[first, second, ...rest] = numbers
[x, y] = coordinates

// Object destructuring
{name, age, email = "none"} = user
{data: {value}} = response  // Nested

// In function parameters
process = ({name, age}) => "${name} is ${age}"
```

**Benefits:**
- Cleaner variable assignment
- Reduces repetitive code
- Modern pattern matching

### 8. Type Checking Operators
**Priority:** MEDIUM  
**Complexity:** Medium  
**Value:** Runtime type safety

```prism
// typeof operator
if (typeof value == "number") {
  result = value * 2
}

// instanceof operator
if (value instanceof Array) {
  filtered = filter(value, x => x > 0)
}

// Type guard functions
isString = x => typeof x == "string"
```

**Benefits:**
- Safer runtime operations
- Better error handling
- Useful for dynamic data

## Lower Priority Features

### 9. Pipeline Operator (`|>`)
**Priority:** LOW  
**Complexity:** Medium  
**Value:** Functional composition syntax

```prism
// Linear data transformation
result = data
  |> filter(_, x => x > 0)
  |> map(_, x => x * 2)
  |> reduce(_, (a, b) => a + b, 0)

// With confidence
processed = rawData ~> 0.8
  |> validate(_)
  |> transform(_)
```

**Benefits:**
- Readable data pipelines
- Functional programming style
- Reduces nesting

### 10. Pattern Matching
**Priority:** LOW  
**Complexity:** Very High  
**Value:** Advanced control flow

```prism
// Pattern matching expression
result = match value {
  null => "no value",
  0 => "zero",
  n if n > 0 => "positive: ${n}",
  {type: "error", message} => "Error: ${message}",
  [first, ...rest] => "Array starting with ${first}",
  _ => "other"
}

// With confidence patterns
action = match (analysis ~> 0.8) {
  {confidence: c} if c >= 0.9 => "auto-approve",
  {confidence: c} if c >= 0.7 => "review",
  _ => "reject"
}
```

**Benefits:**
- Powerful conditional logic
- Exhaustive checking
- Elegant error handling

### 11. Range Operator
**Priority:** LOW  
**Complexity:** Medium  
**Value:** Convenient sequence generation

```prism
// Inclusive ranges
numbers = 1..10        // [1, 2, 3, ..., 10]
letters = 'a'..'z'     // ['a', 'b', ..., 'z']

// With step
evens = 0..20 step 2   // [0, 2, 4, ..., 20]
countdown = 10..1 step -1

// In loops (if we add loops)
for i in 1..100 {
  print(i)
}
```

**Benefits:**
- Concise sequence creation
- Useful for iterations
- Mathematical clarity

### 12. Custom Confidence Thresholds
**Priority:** LOW  
**Complexity:** Low  
**Value:** Fine-grained confidence control

```prism
// Current ~@> uses 70% threshold
// Custom threshold syntax
result = value ~@[0.9]> action   // 90% threshold
safe = data ~@[0.95]> process    // 95% threshold

// Variable thresholds
threshold = 0.85
decision = analysis ~@[threshold]> approve
```

**Benefits:**
- Flexible confidence handling
- Domain-specific thresholds
- Better control

### 13. Async/Await Support
**Priority:** LOW  
**Complexity:** Very High  
**Value:** Modern async handling

```prism
// Async function definition
async function analyzeData(data) {
  result = await llm("Analyze: ${data}")
  processed = await transform(result)
  return processed
}

// Async with confidence
async function processWithConfidence() {
  analysis = await llm("Complex analysis") ~> 0.8
  if (analysis ~@> "proceed") {
    return await executeAction()
  }
}
```

**Benefits:**
- Clean async code
- Better error handling
- Modern programming model

### 14. Set Operations
**Priority:** LOW  
**Complexity:** Medium  
**Value:** Mathematical set operations

```prism
// Set literals
uniqueNumbers = {1, 2, 3, 3, 4}  // {1, 2, 3, 4}

// Set operations
union = set1 | set2
intersection = set1 & set2
difference = set1 - set2
symmetric = set1 ^ set2

// Set methods
has3 = uniqueNumbers.has(3)
size = uniqueNumbers.size
```

**Benefits:**
- Unique value collections
- Mathematical operations
- Data deduplication

### 15. Tagged Template Literals
**Priority:** LOW  
**Complexity:** High  
**Value:** Domain-specific string processing

```prism
// SQL template tag
query = sql`
  SELECT * FROM users 
  WHERE age > ${minAge} 
  AND city = ${city}
`

// HTML template tag
element = html`
  <div class="${className}">
    ${content}
  </div>
`

// Custom tags
formatted = fmt`Price: ${price:,.2f}`
```

**Benefits:**
- Safe string interpolation
- Domain-specific processing
- Prevention of injection attacks

## Implementation Priority

Based on value, complexity, and user benefit, recommended implementation order:

1. **Compound Assignment Operators** - Easy win, expected feature
2. **Optional Chaining (`?.`)** - High value for null safety
3. **Undefined Support** - Completes null handling
4. **Exponentiation (`**`)** - Simple math operator
5. **Spread Operator (`...`)** - Essential but complex
6. **Nullish Coalescing (`??`)** - Pairs with optional chaining
7. **Type Checking** - Improves runtime safety
8. **Destructuring** - Modern but complex

## Notes

- Features should maintain Prism's focus on uncertainty and confidence
- New operators should integrate with existing confidence operators where sensible
- Syntax choices should be familiar to JavaScript/TypeScript developers
- Each feature needs comprehensive tests and documentation
- Consider how features interact with the confidence system