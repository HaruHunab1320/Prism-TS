# Future Features for Prism

This document outlines potential improvements and new features for the Prism language. For completed features and development guide, see [DEVELOPMENT.md](../DEVELOPMENT.md).

## 🎯 Next Highest Priority (Architectural Improvements)

This section details critical architectural improvements and features needed to mature the language.

### 1. Implement `try/catch/finally` for Error Handling
**Priority:** CRITICAL  
**Complexity:** High  
**Value:** Enables robust, production-ready scripting by allowing recovery from runtime errors.

```prism
try {
  // Code that might fail
  result = 10 / 0
} catch (e) {
  console.error("An error occurred:", e)
} finally {
  console.log("Execution finished.")
}
```

### 2. Refactor `ModuleSystem` to be Non-Singleton
**Priority:** CRITICAL  
**Complexity:** Medium  
**Value:** Improves testability, enables isolated runtime instances, and prevents state contamination.
**Plan:** The `ModuleSystem` should be an instantiable class passed to the `Runtime` on creation.

### 3. Fully Implement `~.` (Confident Property Access)
**Priority:** HIGH  
**Complexity:** Medium  
**Value:** Fixes a major feature gap where the operator is currently a non-functional placeholder.
**Plan:** The runtime logic must be updated to perform actual property access on `ObjectValue`, handle `null`/`undefined`, and propagate confidence correctly.

### 4. Unify `null` and `undefined`
**Priority:** HIGH  
**Complexity:** Medium  
**Value:** Simplifies the language and eliminates a common source of bugs by having a single `null` type for the absence of a value.
**Plan:** Remove `UndefinedLiteral` and `UndefinedValue` from the language, and update all relevant logic to use `NullValue`.

### 5. Enforce Consistent Keyword Casing
**Priority:** MEDIUM  
**Complexity:** Low  
**Value:** Improves language consistency and clarity.
**Plan:** Remove alternate casings like `Agent` from the tokenizer, enforcing lowercase for all keywords.

### 6. Remove Incomplete `shifting to` Syntax
**Priority:** MEDIUM  
**Complexity:** Low  
**Value:** Removes a confusing and non-functional piece of syntax from the language.
**Plan:** Update the parser to remove the logic for `shifting to`.

### 7. Implement a Standard Library
**Priority:** MEDIUM  
**Complexity:** High (ongoing)  
**Value:** Increases the language's utility for general-purpose scripting.
**Plan:** Begin planning a standard library for tasks like File I/O and Date/Time manipulation, likely implemented as built-in modules.

---

## 🎯 High Priority Features

### 1. Pattern Matching
**Priority:** HIGH  
**Complexity:** High  
**Value:** Advanced control flow and destructuring

```prism
result = match value {
  null => "no value",
  0 => "zero",
  n if n > 0 => "positive: ${n}",
  {type: "error", message} => "Error: ${message}",
  [head, ...tail] => "Array with ${tail.length + 1} items",
  _ => "other"
}
```

Benefits:
- More expressive than if/else chains
- Built-in destructuring
- Exhaustiveness checking potential
- Natural fit with confidence values

### 2. Async/Await Support ✅ **IMPLEMENTED**
**Priority:** HIGH  
**Complexity:** Very High  
**Value:** Modern async handling for LLM operations

```prism
async function analyzeData(data) {
  // Parallel LLM calls
  results = await Promise.all([
    llm("Analyze sentiment: ${data}"),
    llm("Extract entities: ${data}"),
    llm("Summarize: ${data}")
  ])
  
  return await combineAnalysis(results)
}

// Top-level await
analysis = await analyzeData(input)
```

*Implemented in v1.2.1 - Full async/await support with Promise built-ins*

### 3. Import/Export System ✅ **IMPLEMENTED**
**Priority:** HIGH  
**Complexity:** High  
**Value:** Code organization and reusability

```prism
// math.prism
export sum = (a, b) => a + b
export multiply = (a, b) => a * b
export const PI = 3.14159

// main.prism
import {sum, PI} from "./math.prism"
import * as math from "./math.prism"

result = sum(10, 20) * PI
```

*Implemented in v1.4.0 - Full ES module-style imports/exports with runtime support and partial circular dependency handling*

### 4. Standard Named Functions ✅ **IMPLEMENTED**
**Priority:** HIGH  
**Complexity:** Medium  
**Value:** Traditional function syntax alongside lambdas

```prism
// Named functions with block syntax
function calculateScore(data, weights) {
  scores = data.map((item, index) => item * weights[index])
  total = scores.reduce((acc, score) => acc + score, 0)
  return total ~> 0.9
}

// Still support lambda expressions for simple cases
quickAdd = (a, b) => a + b

// Functions with confidence declarations
function riskAssessment(input) ~> 0.8 {
  analysis = llm("Assess risk: ${input}")
  return analysis.score
}
```

### 5. Block-Statement Lambda Functions ✅ **IMPLEMENTED**
**Priority:** HIGH  
**Complexity:** Medium  
**Value:** Complex logic in lambda expressions

```prism
// Current: expression-only lambdas
process = (data) => data.filter(x => x > 0).map(x => x * 2)

// Now available: block-statement lambdas
complexProcess = (data) => {
  filtered = data.filter(x => x > 0)
  transformed = filtered.map(x => x * 2)
  validated = transformed.filter(x => x < 100)
  return validated ~> 0.8
}

// Nested uncertain operations in lambdas
riskProcessor = (items) => {
  results = items.map(item => {
    uncertain if (item.risk > 0.5) {
      high { return item.value * 0.5 }
      medium { return item.value * 0.7 }
      low { return item.value }
    }
  })
  return results
}
```

### 6. Multi-Parameter Arrow Functions ✅ **IMPLEMENTED**
**Priority:** HIGH  
**Complexity:** Low  
**Value:** Essential for functional programming patterns

```prism
// Basic multi-parameter arrows
add = (a, b) => a + b
multiply = (x, y, z) => x * y * z

// With destructuring
processUser = ({name, age}, options) => {
  // Process user with options
}

// With confidence
confidenceSum = (a, b) => (a ~+ b) ~> 0.95

// In higher-order functions
data.reduce((acc, val) => acc + val, 0)
items.sort((a, b) => a.score - b.score)

// With block statements
complexCalc = (x, y, threshold) => {
  result = x * y
  uncertain if (result > threshold) {
    high { return result }
    low { return threshold }
  }
}

// Arrow functions in map/filter/reduce
pairs
  .map((x, y) => x + y)
  .filter((sum, index) => index % 2 === 0)
  .reduce((acc, val, idx) => acc + val * idx, 0)
```

Benefits:
- Enables standard functional programming patterns
- Consistent with JavaScript/TypeScript syntax
- Required for reduce, sort, and other multi-param callbacks
- Natural extension of existing single-param arrows

*Implemented in v1.3.0 - Full support for 0 to N parameters in arrow functions*

### 7. Variable Declaration Keywords ✅ **IMPLEMENTED**
**Priority:** HIGH  
**Complexity:** Low  
**Value:** Explicit mutability and scoping

```prism
// Immutable bindings
const PI = 3.14159
const users = ["alice", "bob"] // Immutable reference, mutable contents

// Mutable variables  
let counter = 0
let currentUser = null

// Block scoping
function example() {
  const outer = "visible everywhere"
  
  if (condition) {
    let inner = "only visible in this block"
    const temp = process(inner)
  }
  // inner and temp not accessible here
}

// Const with confidence
const analysis = llm("Analyze data") ~> 0.9
```

## 🔧 Medium Priority Features

### 8. Built-in Print/Console Functions
**Priority:** MEDIUM  
**Complexity:** Low  
**Value:** Debugging and output capabilities

```prism
// Simple output
print("Hello, World!")
print(value, anotherValue, "with confidence:", confidence)

// Formatted output with confidence
console.log("Result: ${result ~> 0.9}")
console.warn("Low confidence: ${analysis ~> 0.3}")
console.error("Critical failure: ${error}")

// Debug with confidence levels
debug("Processing ${items.length} items")
uncertain if (success) {
  high { console.log("✅ Success: ${result}") }
  medium { console.warn("⚠️ Partial success: ${result}") }
  low { console.error("❌ Failed: ${error}") }
}
```

### 9. Parameterized Primitives
**Priority:** MEDIUM  
**Complexity:** Medium  
**Value:** Flexible built-in operations

```prism
// Parameterized confidence operations
fuzzyEquals = confidence(threshold: 0.8) => (a, b) => {
  similarity = calculateSimilarity(a, b)
  return similarity ~> threshold
}

// Parameterized array operations
sortBy = confidence(key: string, direction: "asc" | "desc" = "asc") => (array) => {
  sorted = array.sort((a, b) => {
    comparison = compare(a[key], b[key])
    return direction === "asc" ? comparison : -comparison
  })
  return sorted ~> 0.95
}

// Usage
isEqual = fuzzyEquals(threshold: 0.9)
ascending = sortBy(key: "score", direction: "asc")
```

### 10. Array Pipeline Operations
**Priority:** MEDIUM  
**Complexity:** Medium  
**Value:** Functional array processing with confidence

```prism
// Enhanced array methods with confidence propagation
results = data
  |> filter(x => x.score > 0.5)          // Remove low-confidence items
  |> map(x => process(x) ~> 0.8)         // Process with confidence
  |> confidenceFilter(threshold: 0.7)    // Filter by confidence
  |> take(10)                            // Limit results
  |> groupBy(x => x.category)            // Group results

// Parallel processing pipelines
processed = items
  |> parallel(item => {
      analysis = llm("Analyze: ${item}")
      score = calculateScore(analysis)
      return {item, analysis, score} ~> 0.85
    })
  |> collectConfident(threshold: 0.8)
  |> sortBy(x => x.score)

// Confidence-aware reduce operations
total = values
  |> map(x => x ~> 0.9)
  |> confidenceReduce((acc, val) => acc ~+ val, 0 ~> 1.0)
```

### 11. Custom Operators
**Priority:** MEDIUM  
**Complexity:** Medium  
**Value:** Domain-specific abstractions

```prism
// Define custom operators
operator <=> (a, b) => {
  a < b ? -1 : a > b ? 1 : 0
}

operator ~=> (value, transform) => {
  value ~> 0.8 ? transform(value) : undefined
}

// Use custom operators
comparison = 10 <=> 20  // -1
result = data ~=> processHighConfidence
```

### 12. Decorators/Attributes
**Priority:** MEDIUM  
**Complexity:** Medium  
**Value:** Metadata and behavior modification

```prism
@cached
@timeout(5000)
function expensiveComputation(input) {
  llm("Complex analysis: ${input}")
}

@confident(0.9)
criticalDecision = analyzeRisk(data)
```

### 13. Confident Operators for Standard Operations
**Priority:** MEDIUM  
**Complexity:** Medium  
**Value:** Consistent confidence propagation across all operations

#### ✅ Implemented Confident Operators (v1.3.0)

```prism
// Confident ternary operator
result = condition ~? valueA : valueB
// Propagates confidence from condition AND selected value

// Confident assignment operators
total ~+= uncertainValue  // Equivalent to: total = total ~+ uncertainValue
count ~-= adjustment     // Equivalent to: count = count ~- adjustment
product ~*= factor       // Equivalent to: product = product ~* factor
average ~/= divisor      // Equivalent to: average = average ~/ divisor
```

#### 🚧 Not Yet Implemented

```prism
// Confident membership operators
if ("key" ~in uncertainObject) { 
  // Confidence based on object's confidence
}
if (value ~instanceof MyClass) {
  // Confidence check for type membership
}

// Confident spread operator
merged = [~...uncertainArray, 4, 5]  // Explicitly propagates confidence
combined = {~...uncertainObject, newKey: value}

// Enhanced typeof with confidence
type = ~typeof uncertainValue  // Returns type with value's confidence
```

Benefits:
- Complete confidence propagation story
- Consistent `~` prefix pattern
- Intuitive for existing Prism users
- Enables confidence-aware algorithms

### 14. Range Operator
**Priority:** MEDIUM  
**Complexity:** Low  
**Value:** Sequence generation and iteration

```prism
numbers = 1..10        // [1, 2, 3, ..., 10]
evens = 0..20 step 2   // [0, 2, 4, ..., 20]
countdown = 10..1      // [10, 9, 8, ..., 1]

for i in 1..100 {
  process(i)
}

// With confidence
confidences = (0.1..1.0 step 0.1).map(c => value ~> c)
```

### 15. Generators and Iterators
**Priority:** MEDIUM  
**Complexity:** High  
**Value:** Memory-efficient sequences

```prism
function* fibonacci() {
  [a, b] = [0, 1]
  while true {
    yield a
    [a, b] = [b, a + b]
  }
}

// Take first 10 fibonacci numbers
fibs = fibonacci().take(10).toArray()
```

### 16. Syntax Highlighting Theme Support
**Priority:** MEDIUM  
**Complexity:** Medium-High  
**Value:** Enhanced code readability and developer experience

Comprehensive syntax highlighting for Prism's unique features:
- **100+ distinct tokens** requiring styling
- **~20 confidence operators** needing visual distinction
- **Semantic highlighting** for uncertainty levels (high/medium/low)
- **Context-aware coloring** for agents and contexts

Key requirements:
```prism
// Confidence operators should be visually distinct
value = data ~> 0.9        // Confidence arrow
extracted = result <~      // Confidence extraction
chained = a ~~ b ~~ c      // Confidence chain
parallel = tasks ~||> process  // Parallel confidence

// Uncertainty blocks need clear visual hierarchy
uncertain if (analysis) {
  high { deployToProduction() }      // Success path
  medium { requestReview() }         // Caution path
  low { blockDeployment() }          // Failure path
}

// Context and agent blocks
in context Medical {
  diagnosis = analyzeSymptoms(patient)
} shifting to Treatment {
  plan = createTreatmentPlan(diagnosis)
}
```

Implementation approach:
- Extend existing Prism.js highlighting
- Support both light and dark themes
- Use distinct color families for confidence operators
- Provide semantic token support for LSP integration

### 17. Code Formatter (Prettier-style)
**Priority:** MEDIUM  
**Complexity:** High  
**Value:** Consistent code style across projects

A comprehensive code formatter handling Prism's unique syntax:
- **37 AST node types** to format
- **29 binary operators** with precedence rules
- **Confidence-aware formatting** for readability

Key formatting challenges:
```prism
// Confidence operator chains
result = value ~> 0.9 ~&& condition ~> 0.8 ~|| fallback ~> 0.7

// Pipeline formatting
processed = data
  |> filter(_, x => x.confidence > 0.5)
  |> map(_, x => x ~> increaseConfidence(x))
  |> reduce(_, (a, b) => a ~+ b, 0)

// Uncertain control flow indentation
uncertain for item in items {
  high {
    process(item)
    commit()
  }
  medium {
    review(item)
    uncertain if (approved) {
      high { process(item) }
      low { reject(item) }
    }
  }
  low { skip(item) }
}

// Complex destructuring with confidence
[
  first ~> 0.9,
  second ~> 0.8,
  ...rest
] = analyzeResults(data) ~> threshold
```

Configuration options:
- Indentation (spaces/tabs)
- Line length limits
- Confidence operator spacing
- Pipeline operator alignment
- Uncertain branch formatting
- Comment preservation

Implementation timeline: 4-6 weeks for production-ready formatter

## 🎨 Low Priority Features

### 18. Set and Map Data Types
**Priority:** LOW  
**Complexity:** Medium  
**Value:** Additional data structures

```prism
// Set operations
uniqueValues = Set([1, 2, 2, 3, 3, 4])  // {1, 2, 3, 4}
union = set1 | set2
intersection = set1 & set2
difference = set1 - set2

// Map operations
userScores = Map([
  ["alice", 95 ~> 0.9],
  ["bob", 87 ~> 0.8]
])
score = userScores.get("alice")  // 95 ~> 0.9
```

### 19. Tagged Template Literals
**Priority:** LOW  
**Complexity:** Medium  
**Value:** Domain-specific string processing

```prism
// SQL query builder
query = sql`
  SELECT * FROM users 
  WHERE age > ${minAge}
  AND confidence > ${minConfidence}
`

// Confidence-aware templates
report = confident`
  Analysis: ${result ~> 0.9}
  Recommendation: ${action ~> 0.8}
`
```

### 20. Algebraic Effects
**Priority:** LOW  
**Complexity:** Very High  
**Value:** Advanced control flow

```prism
// Define effects
effect Logger {
  log(message: string): void
}

effect Storage {
  save(key: string, value: any): void
  load(key: string): any
}

// Use effects
function process(data) with Logger, Storage {
  perform Logger.log("Processing started")
  result = transform(data)
  perform Storage.save("result", result)
  return result
}

// Handle effects
handle process(myData) {
  Logger.log(msg) => console.log(`[${Date.now()}] ${msg}`)
  Storage.save(k, v) => localStorage.set(k, v)
  Storage.load(k) => localStorage.get(k)
}
```

### 21. Partial Application and Currying
**Priority:** LOW  
**Complexity:** Medium  
**Value:** Functional programming patterns

```prism
// Automatic currying
add = curry((a, b, c) => a + b + c)
add5 = add(5)
add5and10 = add5(10)
result = add5and10(15)  // 30

// Partial application with placeholders
processData = analyze(~> 0.8, _, "production")
result = processData(measurements)
```

## 🚀 Experimental Ideas

### Type Annotations (Optional)
```prism
function calculate(x: number, y: number): number ~> confidence {
  result = x * y
  return result ~> 0.95
}

type User = {
  name: string,
  age: number,
  score: number ~> confidence
}
```

### Reactive Variables
```prism
reactive temperature = readSensor()
reactive threshold = 25

// Automatically re-evaluates when dependencies change
reactive alert = temperature > threshold ? 
  "WARNING: High temperature" : 
  "Normal"
```

### Confidence Constraints
```prism
// Require minimum confidence at compile time
function criticalOperation(data: any ~> 0.9) {
  // Only accepts values with 90%+ confidence
}

// Confidence contracts
ensure result ~> 0.8 {
  // Code must produce result with 80%+ confidence
  // or compilation fails
}
```

## 📋 Implementation Considerations

When implementing new features, consider:

1. **Confidence Integration** - How does the feature interact with confidence values?
2. **Backwards Compatibility** - Will existing code continue to work?
3. **Performance Impact** - Does it affect runtime performance?
4. **Syntax Clarity** - Is the syntax intuitive and consistent?
5. **Error Messages** - Can we provide helpful error messages?
6. **Testing** - How will we thoroughly test the feature?

## 🗓️ Rough Roadmap

### Phase 1 (Next 3-6 months)
- **Import/Export System** (✅ Complete with runtime support and circular dependency handling)
- **Standard Named Functions** (✅ Complete with hoisting and closures)
- **Variable Declaration Keywords** (✅ Complete with const/let and block scoping)
- **Block-Statement Lambda Functions** (✅ Complete with return statements and full compatibility)
- **Async/Await** (✅ Complete with Promise built-ins and confidence propagation)
- **Multi-Parameter Arrow Functions** (✅ Complete with 0 to N parameters)
- **Confident Ternary Operator** (✅ Complete with confidence propagation)
- **Confident Assignment Operators** (✅ Complete with ~+=, ~-=, ~*=, ~/=)
- Pattern Matching

### Phase 2 (6-12 months)
- Custom Operators
- Decorators
- Range Operators
- Generators

### Phase 3 (12+ months)
- Type Annotations
- Reactive Variables
- Advanced Features

## 💡 Community Input

We welcome suggestions for new features! When proposing a feature, consider:

1. **Use Case** - What problem does it solve?
2. **Syntax** - What would it look like?
3. **Semantics** - How would it behave?
4. **Confidence** - How does it interact with uncertainty?
5. **Examples** - Provide concrete examples

Submit feature requests as GitHub issues with the "enhancement" label.
