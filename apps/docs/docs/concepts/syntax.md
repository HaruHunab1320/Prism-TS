---
sidebar_position: 1
title: Syntax
---

# Prism Language Syntax

Prism is a probabilistic programming language that extends familiar JavaScript-like syntax with confidence-based operations and uncertainty handling. This guide covers all essential syntax elements of the language.

## Basic Syntax Elements

### Literals

Prism supports standard literal types with optional confidence annotations:

```javascript
// Numbers
42
3.14
1e6

// Strings  
"Hello, world!"
'Single quotes work too'

// String interpolation
let name = "Alice"
let greeting = `Hello, ${name}!`

// Booleans
true
false

// Null (absence of a value)
null
// "undefined" is treated as an alias for null
undefined

// Arrays
[1, 2, 3]
["apple", "banana", "orange"]

// Objects
{name: "Bob", age: 30}
{x: 10, y: 20, z: 30}
```

### Comments

```javascript
// Single-line comment

/* 
   Multi-line comment
   spanning multiple lines
*/
```

## Variable Declarations

Prism supports both traditional assignment syntax and modern declaration keywords:

### Assignment (Requires Declaration)
```javascript
// Simple assignment
let x = 10
let name = "Alice"
let isReady = true

// Compound assignments
let count = 0
count += 1    // count = count + 1
count -= 1    // count = count - 1
count *= 2    // count = count * 2
count /= 2    // count = count / 2
count %= 3    // count = count % 3

// Confident compound assignments (preserve confidence)
let balance = 1000 ~> 0.9
balance ~+= 100 ~> 0.8   // balance = balance ~+ (100 ~> 0.8)
balance ~-= 50 ~> 0.95   // balance = balance ~- (50 ~> 0.95)
balance ~*= 1.1 ~> 0.85  // balance = balance ~* (1.1 ~> 0.85)
balance ~/= 2 ~> 0.9     // balance = balance ~/ (2 ~> 0.9)
```

### Declaration Keywords (const/let)
```javascript
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
let score              // ✓ Valid, defaults to null
let rating = 85        // ✓ Valid with explicit value

// Destructuring with const/let
const [a, b] = [1, 2]
let {name, age} = user
```

## Operators

### Arithmetic Operators

```javascript
// Basic arithmetic
a + b    // Addition
a - b    // Subtraction
a * b    // Multiplication
a / b    // Division
a % b    // Modulo
a ** b   // Exponentiation

// Unary operators
-x       // Negation
+x       // Unary plus (converts to number)

// Increment/Decrement operators
i++      // Post-increment (returns value, then increments)
i--      // Post-decrement (returns value, then decrements)
++i      // Pre-increment (increments, then returns value)
--i      // Pre-decrement (decrements, then returns value)

// Example usage
let counter = 0
print(counter++)  // Prints 0, counter is now 1
print(++counter)  // Prints 2, counter is now 2
print(counter--)  // Prints 2, counter is now 1
print(--counter)  // Prints 0, counter is now 0
```

### Comparison Operators

```javascript
// Loose equality (with type coercion)
a == b   // Equality with type coercion
a != b   // Inequality with type coercion

// Strict equality (no type coercion)
a === b  // Strict equality
a !== b  // Strict inequality

// Relational operators
a < b    // Less than
a > b    // Greater than
a <= b   // Less than or equal
a >= b   // Greater than or equal
```

#### Type Coercion in Comparisons

Loose equality (`==`) performs type coercion:
```javascript
5 == "5"          // true - number to string coercion
0 == false        // true - number to boolean coercion
"" == false       // true - empty string is falsy

// Strict equality does not coerce
5 === "5"         // false - different types
0 === false       // false - different types
null == null      // true
```

### Logical Operators

```javascript
a && b   // Logical AND
a || b   // Logical OR
!a       // Logical NOT
a ?? b   // Nullish coalescing (returns b if a is null)
```

### Type Operators

```javascript
typeof x          // Returns type as string
x instanceof Y    // Checks if x is instance of Y
```

## Control Flow

### Conditional Statements

```javascript
// Basic if statement
if x > 0 {
  // positive case
}

// If-else statement
let status = "cool"
if temperature > 30 {
  status = "hot"
} else {
  status = "cool"
}

// Multiple conditions
let grade = "F"
if score >= 90 {
  grade = "A"
} else if score >= 80 {
  grade = "B"
} else if score >= 70 {
  grade = "C"
}

// Ternary operator
let result = condition ? valueIfTrue : valueIfFalse

// Confident ternary operator (propagates confidence)
let confident = condition ~? valueIfTrue : valueIfFalse
```

### Match Expressions

```javascript
let result = match value {
  0 => "zero",
  [x, y, ...rest] => rest,
  {type: "error", message} => message,
  x if x > 10 => "large",
  _ => "fallback"
}
```

### Loops

```javascript
// For loop
for let i = 0; i < 10; i = i + 1 {
  // loop body
}

// For-in loop (iterating over arrays)
let arr = [1, 2, 3, 4, 5]
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
for let i = 0; i < 100; i = i + 1 {
  if i == 50 {
    break    // Exit loop
  }
  if i % 2 == 0 {
    continue // Skip to next iteration
  }
  // process odd numbers
}
```

### Exception Handling

Prism supports try/catch/finally for handling errors and ensuring cleanup:

```javascript
// Basic try/catch
try {
  let result = riskyOperation()
  processResult(result)
} catch (error) {
  console.error("Operation failed:", error)
}

// Try/catch/finally - finally always executes
try {
  let connection = openConnection()
  let data = fetchData(connection)
  return data
} catch (error) {
  console.error("Failed to fetch data:", error)
  return null
} finally {
  // Cleanup - runs whether or not an error occurred
  closeConnection(connection)
}

// Catching specific error handling
try {
  let user = await fetchUser(userId)
  let profile = await fetchProfile(user.id)
} catch (error) {
  if (error.code == "NOT_FOUND") {
    return createDefaultProfile()
  } else if (error.code == "NETWORK_ERROR") {
    console.warn("Network issue, retrying...")
    return await retryWithBackoff(() => fetchProfile(user.id))
  }
  // Re-throw unknown errors
  throw error
}

// Try/catch with async/await
async function safeApiCall(url) {
  try {
    let response = await fetch(url)
    data = await response.json()
    return data ~> 0.95
  } catch (error) {
    console.error("API call failed:", error)
    return null ~> 0.0
  }
}

// Nested try/catch for granular error handling
try {
  let config = loadConfig()
  try {
    data = parseData(config.input)
  } catch (parseError) {
    console.warn("Parse failed, using defaults")
    data = defaultData
  }
  processData(data)
} catch (error) {
  console.error("Fatal error:", error)
}
```

## Functions

Prism supports both traditional named functions and modern lambda expressions:

### Named Functions

```javascript
// Basic function declaration
function calculateScore(data, weights) {
  let scores = data.map((item, index) => item * weights[index])
  let total = scores.reduce((acc, score) => acc + score, 0)
  return total
}

// Function with confidence annotation
function riskAssessment(input) ~> 0.8 {
  let analysis = llm("Assess risk: " + input)
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
let result = factorial(5)  // Works due to hoisting

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

```javascript
// Single parameter
let double = x => x * 2

// Multiple parameters
let add = (a, b) => a + b
let multiply = (x, y, z) => x * y * z
let greet = (first, last) => "Hello, " + first + " " + last + "!"

// No parameters
let getRandom = () => Math.random()

// Multi-parameter lambdas with array methods
let numbers = [1, 2, 3, 4, 5]
let summed = reduce(numbers, (acc, val) => acc + val, 0)
let product = reduce(numbers, (acc, val) => acc * val, 1)

// Nested multi-parameter lambdas
let makeCalculator = (op) => (a, b) => {
  if (op == "+") { return a + b }
  if (op == "*") { return a * b }
  if (op == "-") { return a - b }
  return a / b
}
let adder = makeCalculator("+")
let result = adder(10, 5)  // 15

// Expression-only lambda (traditional)
let square = x => x * x

// Block-statement lambda (new!)
let complexProcess = data => {
  const filtered = data.filter(x => x > 0)
  let processed = filtered.map(x => x * 2)
  processed = processed.filter(x => x < 100)
  return processed ~> 0.9
}

// Lambda with early returns
let validator = input => {
  if (!input) {
    return false
  }
  if (input.length < 3) {
    return false
  }
  return true
}

// Lambda with loops and complex logic
let factorial = n => {
  let result = 1
  for let i = 1; i <= n; i = i + 1 {
    result = result * i
  }
  return result
}

// Rest parameters in lambdas
let sum = (...numbers) => {
  let total = 0
  for n in numbers {
    total = total + n
  }
  return total
}

// Destructuring parameters
let extractCoords = ([x, y]) => {
  const distance = Math.sqrt(x * x + y * y)
  return {x, y, distance}
}

// Calling functions
let result1 = double(5)              // 10
let result2 = add(3, 4)              // 7
let result3 = complexProcess([1,2,3]) // Processed array with confidence
let result4 = sum(1, 2, 3, 4)        // 10
```

### Function Composition

```javascript
// Pipeline operator
let result = value |> func1 |> func2 |> func3

// Example
let addOne = x => x + 1
let double = x => x * 2
let square = x => x * x

result = 5 |> addOne |> double |> square  // ((5 + 1) * 2)² = 144

// Placeholder in pipelines
let add = (a, b) => a + b
result = 10 |> add(5, _)  // 15 (placeholder represents piped value)
```

### Asynchronous Functions

Prism supports asynchronous programming with async/await for handling promises and asynchronous operations:

```javascript
// Async function declaration
async function fetchData(url) {
  let response = await httpGet(url)
  let data = await response.json()
  return data
}

// Async function with confidence
async function analyzeData(input) ~> 0.9 {
  let result = await llm("Analyze: " + input)
  let processed = await processResult(result)
  return processed
}

// Calling async functions
let data = await fetchData("https://api.example.com/data")
let analysis = await analyzeData(data)

// Await with Promise values
let promise = Promise.resolve(42)
let value = await promise  // 42

// Await passes through non-promise values
let direct = await 100  // 100 (no waiting needed)

// Promise built-in functions
let p1 = Promise.resolve("success")
let p2 = Promise.reject("error")  // Creates rejected promise

// Promise.all - wait for multiple promises
let results = await Promise.all([
  fetchData("/api/users"),
  fetchData("/api/posts"),
  fetchData("/api/comments")
])

// Mixing promises and values in Promise.all
let mixed = await Promise.all([
  Promise.resolve(1),
  2,  // Non-promise values are wrapped
  Promise.resolve(3)
])  // [1, 2, 3]

// Delay/sleep functions
async function delayedOperation() {
  console.log("Starting...")
  await delay(1000)  // Wait 1 second (1000ms)
  console.log("...continued after delay")

  await sleep(500)   // sleep is an alias for delay
  return "completed"
}

// Async in loops
async function processItems(items) {
  for item in items {
    result = await processItem(item)
    console.log("Processed:", result)
  }
}

// Async error handling with try/catch
async function safeOperation() {
  try {
    let result = await riskyOperation()
    return result ~> 0.95
  } catch (error) {
    console.error("Operation failed:", error)
    return null ~> 0.0
  } finally {
    console.log("Operation completed")
  }
}

// Retry pattern with delay
async function fetchWithRetry(url, maxRetries) {
  let attempts = 0
  while (attempts < maxRetries) {
    try {
      return await fetch(url)
    } catch (error) {
      attempts++
      if (attempts < maxRetries) {
        console.warn("Retrying in 1 second...")
        await delay(1000 * attempts)  // Exponential backoff
      }
    }
  }
  throw "Max retries exceeded"
}

// Debounce - delays execution until after wait period with no new calls
let debouncedSearch = debounce(500)  // Create 500ms debouncer
// Usage: debouncedSearch(searchFunction)

// Timeout pattern
async function withTimeout(operation, timeoutMs) {
  let timedOut = false

  // Start timer
  let setTimeout = async () => {
    await delay(timeoutMs)
    timedOut = true
  }

  // Race between operation and timeout
  let [opResult, _] = await Promise.all([
    operation(),
    setTimeout()
  ])

  if (timedOut && !opResult) {
    throw "Operation timed out"
  }
  return opResult
}
```

## Data Structures

### Arrays

```javascript
// Array creation
let numbers = [1, 2, 3, 4, 5]
let mixed = [1, "two", true, null]
let nested = [[1, 2], [3, 4], [5, 6]]

// Array access
let first = numbers[0]    // 1
let last = numbers[4]     // 5

// Array properties and methods
let arr = [1, 2, 3, 4, 5]
let len = arr.length      // 5

// Array methods with lambdas
let doubled = arr.map(x => x * 2)                    // [2, 4, 6, 8, 10]
let evens = arr.filter(x => x % 2 == 0)             // [2, 4]
let sum = arr.reduce((acc, x) => acc + x, 0)        // 15

// Array methods with block-statement lambdas
let processed = arr.map(x => {
  const doubled = x * 2
  return doubled > 5 ? doubled : 0
})

// String properties
let text = "hello"
let textLength = text.length     // 5

// Spread operator
let arr1 = [1, 2, 3]
let arr2 = [4, 5, 6]
let combined = [...arr1, ...arr2]  // [1, 2, 3, 4, 5, 6]
```

### Objects

```javascript
// Object creation
let person = {
  name: "Alice",
  age: 30,
  city: "New York"
}

// Property access
let name1 = person.name      // Dot notation
let name2 = person["name"]   // Bracket notation

// Dynamic/computed property access
let key = "city"
let city = person[key]

// Index type rules
// - arrays require numeric indices: arr[0]
// - objects require string indices: obj["name"] or obj[key]

// Nested objects
let data = {
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
let theme = data.user.profile.settings.theme

// Optional chaining
let value = data?.user?.profile?.nickname  // Returns null if any part is null

// Spread in objects
let defaults = {theme: "light", fontSize: 16}
let userPrefs = {theme: "dark"}
let settings = {...defaults, ...userPrefs}  // {theme: "dark", fontSize: 16}
```

## Destructuring

### Array Destructuring

```javascript
// Basic array destructuring
let [a, b, c] = [1, 2, 3]
// a = 1, b = 2, c = 3

// With rest element
let [first, ...rest] = [1, 2, 3, 4, 5]
// first = 1, rest = [2, 3, 4, 5]

// Skipping elements
let [, , third] = [1, 2, 3]
// third = 3

// In function parameters
let sumFirst2 = ([a, b]) => a + b
let result = sumFirst2([10, 20, 30])  // 30
```

### Object Destructuring

```javascript
// Basic object destructuring
let {name, age} = {name: "Alice", age: 30, city: "NYC"}
// name = "Alice", age = 30

// With different variable names
let {name: personName, age: personAge} = {name: "Bob", age: 25}
// personName = "Bob", personAge = 25

// With defaults
let {name, role = "user"} = {name: "Charlie"}
// name = "Charlie", role = "user"

// Nested destructuring
let {user: {name, email}} = {user: {name: "David", email: "d@test.com"}}
// name = "David", email = "d@test.com"

// Rest in objects
let {a, ...others} = {a: 1, b: 2, c: 3}
// a = 1, others = {b: 2, c: 3}
```

## Built-in Functions

Prism provides a rich set of built-in functions for common operations:

### Output and Debugging
```javascript
// Simple print function
print("Hello, World!")
print("Answer:", 42, "is", true)  // Hello, World! Answer: 42 is true

// Console functions
console.log("Information message")
console.warn("Warning message")
console.error("Error message")
console.debug("Debug information")

// Confidence values in output
let value = 100 ~> 0.85
print("Confident value:", value)     // Confident value: 100 ~> 0.85
console.log("Analysis:", analysis)   // Shows confidence levels
```

### Array Operations
```javascript
// Global array functions
let numbers = [1, 2, 3, 4, 5]
let doubled = map(numbers, x => x * 2)           // [2, 4, 6, 8, 10]
let evens = filter(numbers, x => x % 2 == 0)     // [2, 4]
let sum = reduce(numbers, (a, b) => a + b, 0)    // 15

// Mathematical functions
let values = [10, 20, 5, 30, 15]
let maximum = max(...values)     // 30
let minimum = min(...values)     // 5
```

### Parameterized Primitives
Prism supports type-parameterized primitives for type-safe operations:

```javascript
// Array operations with type parameters
let numbers = [3, 1, 4, 1, 5]
let sorted = sort<number>(numbers, (a, b) => a - b)
let filtered = filter<number>(numbers, n => n > 2)

// Working with complex types
let users = [
  {name: "Alice", age: 30},
  {name: "Bob", age: 25}
]
let adults = filter<{name: string, age: number}>(users, u => u.age >= 18)
let sortedByAge = sort<{name: string, age: number}>(users, (a, b) => a.age - b.age)

// Map with type transformation
let squared = map<number, number>(numbers, n => n * n)
let names = map<{name: string}, string>(users, u => u.name)

// Reduce with accumulator type
let sum = reduce<number, number>(numbers, 0, (acc, n) => acc + n)
let concatenated = reduce<string, string>(names, "", (acc, name) => acc + ", " + name)

// First-class function behavior
// Create confidence-wrapped functions
let confidenceWrapper = confidence(0.8)
let processor = x => x * 2
let confidentProcessor = confidenceWrapper(processor)
let result = confidentProcessor(10)  // 20 ~> 0.80

// Create threshold filters
let highConfidenceFilter = threshold(0.9)
let data = [10 ~> 0.95, 20 ~> 0.7, 30 ~> 0.92]
let filtered = highConfidenceFilter(data)  // [10 ~> 0.95, 30 ~> 0.92]

// Create parameterized sorters
let scoreSorter = sortBy("score", "desc")
users = [{name: "Alice", score: 85}, {name: "Bob", score: 92}]
let sorted = scoreSorter(users)  // Sorted by score descending

// Create grouping functions
let categoryGrouper = groupBy("category")
let items = [{name: "Apple", category: "fruit"}, {name: "Carrot", category: "vegetable"}]
let grouped = categoryGrouper(items)  // Grouped by category
```

### Import/Export System
```javascript
// Importing functions and values
import {sum, multiply, PI} from "./math.prism"
import * as utils from "./utilities.prism"

// Using imported functions
let result1 = sum(10, 20)
let result2 = multiply(5, PI)
let result3 = utils.formatNumber(123.456)

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

```javascript
// Basic confidence annotation
let value = "high quality data" ~> 0.95

// Accessing confidence
let conf = ~value  // 0.95

// Extracting value from confident expression
let rawValue = <~ value  // "high quality data"
```

### Context Statements

```javascript
// Define a context
context experiment {
  // Code within experimental context
  let result = performExperiment()
}

// Context with shift
context production shifting to staging {
  // Start in production context, shift to staging
  let data = fetchData()
}
```

### Agent Declarations

```javascript
// Agent declarations
agents {
  Assistant: {
    confidence: 0.9,
    role: "domain expert",
    capabilities: ["analysis", "recommendation"]
  }
}
```

## Best Practices

1. **Use meaningful variable names**: Choose descriptive names that indicate the purpose of the variable
   ```prism
   // Good
   let userAge = 25
   let isLoggedIn = true
   
   // Avoid implicit bindings (will throw)
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
   
   // Dynamic/computed values
   let result = processData(input)
   ```

3. **Leverage destructuring**: Use destructuring to extract multiple values cleanly
   ```prism
   // Instead of
   let x = point.x
   let y = point.y
   
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
   const double = x => x * 2
   
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
   let result = data 
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

10. **Handle asynchronous operations properly**: Use async/await for clean asynchronous code
    ```prism
    // Good - clear async flow
    async function fetchUserData(userId) {
      let user = await getUserById(userId)
      let profile = await getProfile(user.profileId)
      let preferences = await getPreferences(user.id)
      return {user, profile, preferences}
    }
    
    // Good - parallel operations with Promise.all
    async function fetchAllData(userId) {
      let [user, posts, comments] = await Promise.all([
        getUserById(userId),
        getUserPosts(userId),
        getUserComments(userId)
      ])
      return {user, posts, comments}
    }
    
    // Good - async with confidence
    async function analyzeWithRetry(data) ~> 0.95 {
      let result = await llm("Analyze: " + data)
      if (!result.success) {
        await delay(1000)
        result = await llm("Retry analysis: " + data)
      }
      return result
    }
    ```

11. **Organize code with imports/exports**: Structure larger projects with modules
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
