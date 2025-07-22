---
sidebar_position: 1
title: Syntax
---

# Prism Language Syntax

Prism is a probabilistic programming language that extends familiar JavaScript-like syntax with confidence-based operations and uncertainty handling. This guide covers all essential syntax elements of the language.

## Basic Syntax Elements

### Literals

Prism supports standard literal types with optional confidence annotations:

```prism
// Numbers
42
3.14
1e6

// Strings  
"Hello, world!"
'Single quotes work too'

// String interpolation
name = "Alice"
greeting = `Hello, ${name}!`

// Booleans
true
false

// Null and undefined
null
undefined

// Arrays
[1, 2, 3]
["apple", "banana", "orange"]

// Objects
{name: "Bob", age: 30}
{x: 10, y: 20, z: 30}
```

### Comments

```prism
// Single-line comment

/* 
   Multi-line comment
   spanning multiple lines
*/
```

## Variable Declarations

Prism supports both traditional assignment syntax and modern declaration keywords:

### Basic Assignment
```prism
// Simple assignment
x = 10
name = "Alice"
isReady = true

// Compound assignments
count = 0
count += 1    // count = count + 1
count -= 1    // count = count - 1
count *= 2    // count = count * 2
count /= 2    // count = count / 2
count %= 3    // count = count % 3
```

### Declaration Keywords (const/let)
```prism
// Immutable bindings with const
const PI = 3.14159
const users = ["alice", "bob"]  // Reference is immutable, contents can change

// Mutable variables with let
let counter = 0
let currentUser = null

// Block scoping
function example() {
  const outer = "visible everywhere"
  
  if (condition) {
    let inner = "only visible in this block"
    const temp = process(inner)
    // inner and temp are scoped to this block
  }
  // inner and temp not accessible here
}

// const requires initializer
const name = "Alice"  // ✓ Valid
// const age             // ✗ Error: const declarations must have an initializer

// let allows optional initializer
let score              // ✓ Valid, defaults to 0
let rating = 85        // ✓ Valid with explicit value

// Destructuring with const/let
const [a, b] = [1, 2]
let {name, age} = user
```

## Operators

### Arithmetic Operators

```prism
// Basic arithmetic
a + b    // Addition
a - b    // Subtraction
a * b    // Multiplication
a / b    // Division
a % b    // Modulo
a ** b   // Exponentiation

// Unary operators
-x       // Negation
```

### Comparison Operators

```prism
a == b   // Equality
a != b   // Inequality
a < b    // Less than
a > b    // Greater than
a <= b   // Less than or equal
a >= b   // Greater than or equal
```

### Logical Operators

```prism
a && b   // Logical AND
a || b   // Logical OR
!a       // Logical NOT
a ?? b   // Nullish coalescing (returns b if a is null/undefined)
```

### Type Operators

```prism
typeof x          // Returns type as string
x instanceof Y    // Checks if x is instance of Y
```

## Control Flow

### Conditional Statements

```prism
// Basic if statement
if x > 0 {
  // positive case
}

// If-else statement
if temperature > 30 {
  status = "hot"
} else {
  status = "cool"
}

// Multiple conditions
if score >= 90 {
  grade = "A"
} else if score >= 80 {
  grade = "B"
} else if score >= 70 {
  grade = "C"
} else {
  grade = "F"
}

// Ternary operator
result = condition ? valueIfTrue : valueIfFalse
```

### Loops

```prism
// For loop
for i = 0; i < 10; i = i + 1 {
  // loop body
}

// For-in loop (iterating over arrays)
arr = [1, 2, 3, 4, 5]
for value in arr {
  // process value
}

// For-in with index
for value, index in arr {
  // process value and index
}

// While loop
while condition {
  // loop body
}

// Do-while loop
do {
  // loop body
} while condition

// Loop control
for i = 0; i < 100; i = i + 1 {
  if i == 50 {
    break    // Exit loop
  }
  if i % 2 == 0 {
    continue // Skip to next iteration
  }
  // process odd numbers
}
```

## Functions

Prism supports both traditional named functions and modern lambda expressions:

### Named Functions

```prism
// Basic function declaration
function calculateScore(data, weights) {
  scores = data.map((item, index) => item * weights[index])
  total = scores.reduce((acc, score) => acc + score, 0)
  return total
}

// Function with confidence annotation
function riskAssessment(input) ~> 0.8 {
  analysis = llm("Assess risk: " + input)
  return analysis.score
}

// Function with rest parameters
function sum(...numbers) {
  let total = 0
  for num in numbers {
    total = total + num
  }
  return total
}

// Function hoisting (can be called before declaration)
result = factorial(5)  // Works due to hoisting

function factorial(n) {
  if (n <= 1) {
    return 1
  }
  return n * factorial(n - 1)
}

// Early returns
function validateUser(user) {
  if (!user) {
    return false
  }
  if (!user.email) {
    return false
  }
  return true
}
```

### Lambda Expressions

```prism
// Single parameter
double = x => x * 2

// Multiple parameters
add = (a, b) => a + b

// No parameters
getRandom = () => Math.random()

// Expression-only lambda (traditional)
square = x => x * x

// Block-statement lambda (new!)
complexProcess = data => {
  const filtered = data.filter(x => x > 0)
  let processed = filtered.map(x => x * 2)
  processed = processed.filter(x => x < 100)
  return processed ~> 0.9
}

// Lambda with early returns
validator = input => {
  if (!input) {
    return false
  }
  if (input.length < 3) {
    return false
  }
  return true
}

// Lambda with loops and complex logic
factorial = n => {
  let result = 1
  for i = 1; i <= n; i = i + 1 {
    result = result * i
  }
  return result
}

// Rest parameters in lambdas
sum = (...numbers) => {
  let total = 0
  for n in numbers {
    total = total + n
  }
  return total
}

// Destructuring parameters
extractCoords = ([x, y]) => {
  const distance = Math.sqrt(x * x + y * y)
  return {x, y, distance}
}

// Calling functions
result1 = double(5)              // 10
result2 = add(3, 4)              // 7
result3 = complexProcess([1,2,3]) // Processed array with confidence
result4 = sum(1, 2, 3, 4)        // 10
```

### Function Composition

```prism
// Pipeline operator
result = value |> func1 |> func2 |> func3

// Example
addOne = x => x + 1
double = x => x * 2
square = x => x * x

result = 5 |> addOne |> double |> square  // ((5 + 1) * 2)² = 144

// Placeholder in pipelines
add = (a, b) => a + b
result = 10 |> add(5, _)  // 15 (placeholder represents piped value)
```

## Data Structures

### Arrays

```prism
// Array creation
numbers = [1, 2, 3, 4, 5]
mixed = [1, "two", true, null]
nested = [[1, 2], [3, 4], [5, 6]]

// Array access
first = numbers[0]    // 1
last = numbers[4]     // 5

// Array properties and methods
arr = [1, 2, 3, 4, 5]
len = arr.length      // 5

// Array methods with lambdas
doubled = arr.map(x => x * 2)                    // [2, 4, 6, 8, 10]
evens = arr.filter(x => x % 2 == 0)             // [2, 4]
sum = arr.reduce((acc, x) => acc + x, 0)        // 15

// Array methods with block-statement lambdas
processed = arr.map(x => {
  const doubled = x * 2
  return doubled > 5 ? doubled : 0
})

// String properties
text = "hello"
textLength = text.length     // 5

// Spread operator
arr1 = [1, 2, 3]
arr2 = [4, 5, 6]
combined = [...arr1, ...arr2]  // [1, 2, 3, 4, 5, 6]
```

### Objects

```prism
// Object creation
person = {
  name: "Alice",
  age: 30,
  city: "New York"
}

// Property access
name1 = person.name      // Dot notation
name2 = person["name"]   // Bracket notation

// Nested objects
data = {
  user: {
    profile: {
      name: "Bob",
      settings: {
        theme: "dark"
      }
    }
  }
}

// Property access chain
theme = data.user.profile.settings.theme

// Optional chaining
value = data?.user?.profile?.nickname  // Returns undefined if any part is null/undefined

// Spread in objects
defaults = {theme: "light", fontSize: 16}
userPrefs = {theme: "dark"}
settings = {...defaults, ...userPrefs}  // {theme: "dark", fontSize: 16}
```

## Destructuring

### Array Destructuring

```prism
// Basic array destructuring
[a, b, c] = [1, 2, 3]
// a = 1, b = 2, c = 3

// With rest element
[first, ...rest] = [1, 2, 3, 4, 5]
// first = 1, rest = [2, 3, 4, 5]

// Skipping elements
[, , third] = [1, 2, 3]
// third = 3

// In function parameters
sumFirst2 = ([a, b]) => a + b
result = sumFirst2([10, 20, 30])  // 30
```

### Object Destructuring

```prism
// Basic object destructuring
{name, age} = {name: "Alice", age: 30, city: "NYC"}
// name = "Alice", age = 30

// With different variable names
{name: personName, age: personAge} = {name: "Bob", age: 25}
// personName = "Bob", personAge = 25

// With defaults
{name, role = "user"} = {name: "Charlie"}
// name = "Charlie", role = "user"

// Nested destructuring
{user: {name, email}} = {user: {name: "David", email: "d@test.com"}}
// name = "David", email = "d@test.com"

// Rest in objects
{a, ...others} = {a: 1, b: 2, c: 3}
// a = 1, others = {b: 2, c: 3}
```

## Built-in Functions

Prism provides a rich set of built-in functions for common operations:

### Output and Debugging
```prism
// Simple print function
print("Hello, World!")
print("Answer:", 42, "is", true)  // Hello, World! Answer: 42 is true

// Console functions
console.log("Information message")
console.warn("Warning message")
console.error("Error message")
console.debug("Debug information")

// Confidence values in output
value = 100 ~> 0.85
print("Confident value:", value)     // Confident value: 100 ~> 0.85
console.log("Analysis:", analysis)   // Shows confidence levels
```

### Array Operations
```prism
// Global array functions
numbers = [1, 2, 3, 4, 5]
doubled = map(numbers, x => x * 2)           // [2, 4, 6, 8, 10]
evens = filter(numbers, x => x % 2 == 0)     // [2, 4]
sum = reduce(numbers, (a, b) => a + b, 0)    // 15

// Mathematical functions
values = [10, 20, 5, 30, 15]
maximum = max(...values)     // 30
minimum = min(...values)     // 5
```

### Parameterized Primitives
```prism
// Create confidence-wrapped functions
confidenceWrapper = confidence(0.8)
processor = x => x * 2
confidentProcessor = confidenceWrapper(processor)
result = confidentProcessor(10)  // 20 ~> 0.80

// Create threshold filters
highConfidenceFilter = threshold(0.9)
data = [10 ~> 0.95, 20 ~> 0.7, 30 ~> 0.92]
filtered = highConfidenceFilter(data)  // [10 ~> 0.95, 30 ~> 0.92]

// Create parameterized sorters
scoreSorter = sortBy("score", "desc")
users = [{name: "Alice", score: 85}, {name: "Bob", score: 92}]
sorted = scoreSorter(users)  // Sorted by score descending

// Create grouping functions
categoryGrouper = groupBy("category")
items = [{name: "Apple", category: "fruit"}, {name: "Carrot", category: "vegetable"}]
grouped = categoryGrouper(items)  // Grouped by category
```

### Import/Export System
```prism
// Importing functions and values
import {sum, multiply, PI} from "./math.prism"
import * as utils from "./utilities.prism"

// Using imported functions
result1 = sum(10, 20)
result2 = multiply(5, PI)
result3 = utils.formatNumber(123.456)

// Export declarations
export const VERSION = "1.0.0"
export function calculateArea(radius) {
  return PI * radius * radius
}

// Re-exports
export {PI, sqrt} from "./math.prism"
export * from "./constants.prism"
```

## Advanced Features

### Confidence Expressions

```prism
// Basic confidence annotation
value = "high quality data" ~> 0.95

// Accessing confidence
conf = ~value  // 0.95

// Extracting value from confident expression
rawValue = <~ value  // "high quality data"
```

### Context Statements

```prism
// Define a context
context experiment {
  // Code within experimental context
  result = performExperiment()
}

// Context with shift
context production shifting to staging {
  // Start in production context, shift to staging
  data = fetchData()
}
```

### Agent Declarations

```prism
// Simple agent
agent Assistant

// Agent with configuration
agent Expert {
  confidence: 0.9,
  role: "domain expert",
  capabilities: ["analysis", "recommendation"]
}
```

## Best Practices

1. **Use meaningful variable names**: Choose descriptive names that indicate the purpose of the variable
   ```prism
   // Good
   userAge = 25
   isLoggedIn = true
   
   // Avoid
   x = 25
   flag = true
   ```

2. **Choose appropriate variable declarations**: Use `const` for immutable values, `let` for mutable variables
   ```prism
   // Good - immutable constants
   const API_URL = "https://api.example.com"
   const users = [{name: "Alice"}, {name: "Bob"}]
   
   // Good - mutable variables
   let currentPage = 1
   let isLoading = false
   
   // Traditional assignment for dynamic/computed values
   result = processData(input)
   ```

3. **Leverage destructuring**: Use destructuring to extract multiple values cleanly
   ```prism
   // Instead of
   x = point.x
   y = point.y
   
   // Use
   const {x, y} = point
   
   // With const/let for immutability clarity
   const [first, second, ...rest] = array
   ```

4. **Choose the right function style**: Use named functions for reusable logic, lambdas for inline operations
   ```prism
   // Named functions for complex, reusable logic
   function calculateRiskScore(data) {
     const weights = [0.3, 0.4, 0.3]
     const scores = data.map((item, i) => item * weights[i])
     return scores.reduce((a, b) => a + b, 0)
   }
   
   // Expression lambdas for simple transformations
   double = x => x * 2
   
   // Block-statement lambdas for moderate complexity
   validator = input => {
     if (!input || input.length < 3) {
       return false
     }
     return /^[a-zA-Z0-9]+$/.test(input)
   }
   ```

5. **Use pipeline operators for transformations**: Chain operations for better readability
   ```prism
   result = data 
     |> filter(x => x > 0)
     |> map(x => x * 2)
     |> reduce((a, b) => a + b, 0)
     
   // With parameterized primitives
   result = data
     |> threshold(0.8)(_)    // Filter high-confidence items
     |> sortBy("score")(_)   // Sort by score
     |> map(x => x.value)    // Extract values
   ```

6. **Use print/console for debugging**: Leverage output functions during development
   ```prism
   // Debug intermediate results
   function processData(input) {
     console.debug("Processing input:", input)
     
     const filtered = input.filter(x => x > 0)
     print("Filtered:", filtered.length, "items")
     
     const result = filtered.map(x => x * 2)
     console.log("Final result:", result)
     
     return result
   }
   ```

7. **Leverage parameterized primitives**: Create reusable, configurable functions
   ```prism
   // Create specialized functions for your domain
   const highQualityFilter = threshold(0.9)
   const prioritySorter = sortBy("priority", "desc")
   const statusGrouper = groupBy("status")
   
   // Use in processing pipelines
   result = data
     |> highQualityFilter(_)
     |> prioritySorter(_)
     |> statusGrouper(_)
   ```

8. **Comment complex logic**: Add comments to explain non-obvious code
   ```prism
   // Calculate confidence based on inverse distance weighting
   confidence = 1 / (1 + distance * decayFactor)
   ```

9. **Use confidence annotations judiciously**: Apply confidence values where uncertainty is meaningful
   ```prism
   // Sensor reading with measurement uncertainty
   temperature = 23.5 ~> 0.92
   
   // User input with validation confidence  
   email = userInput ~> validationScore
   
   // LLM responses with model confidence
   analysis = llm("Analyze sentiment: " + text) ~> 0.85
   ```

10. **Organize code with imports/exports**: Structure larger projects with modules
    ```prism
    // utils.prism - utility functions
    export const formatCurrency = amount => "$" + amount.toFixed(2)
    export function validateEmail(email) {
      return /\S+@\S+\.\S+/.test(email)
    }
    
    // main.prism - main application logic
    import {formatCurrency, validateEmail} from "./utils.prism"
    
    function processOrder(order) {
      if (!validateEmail(order.email)) {
        return false
      }
      console.log("Total:", formatCurrency(order.total))
      return true
    }
    ```