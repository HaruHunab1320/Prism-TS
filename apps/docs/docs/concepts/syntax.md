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

Variables in Prism are declared using assignment syntax. There are no explicit `let` or `const` keywords in basic assignments:

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

### Lambda Expressions

Prism uses arrow function syntax for function definitions:

```prism
// Single parameter
double = x => x * 2

// Multiple parameters
add = (a, b) => a + b

// No parameters
getRandom = () => Math.random()

// Multi-line function body (using expressions)
calculate = (x, y) => {
  temp = x + y;
  temp * 2
}

// Rest parameters
sum = (...numbers) => {
  total = 0;
  for n in numbers {
    total = total + n
  };
  total
}

// Calling functions
result1 = double(5)          // 10
result2 = add(3, 4)          // 7
result3 = sum(1, 2, 3, 4)    // 10
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

// Array methods
arr = [1, 2, 3]
len = arr.length      // 3

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

2. **Leverage destructuring**: Use destructuring to extract multiple values cleanly
   ```prism
   // Instead of
   x = point.x
   y = point.y
   
   // Use
   {x, y} = point
   ```

3. **Use pipeline operators for transformations**: Chain operations for better readability
   ```prism
   result = data 
     |> filter(x => x > 0)
     |> map(x => x * 2)
     |> reduce((a, b) => a + b, 0)
   ```

4. **Comment complex logic**: Add comments to explain non-obvious code
   ```prism
   // Calculate confidence based on inverse distance weighting
   confidence = 1 / (1 + distance * decayFactor)
   ```

5. **Use confidence annotations judiciously**: Apply confidence values where uncertainty is meaningful
   ```prism
   // Sensor reading with measurement uncertainty
   temperature = 23.5 ~> 0.92
   
   // User input with validation confidence  
   email = userInput ~> validationScore
   ```