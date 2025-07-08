# prism-uncertainty

The official npm package for Prism - the language where AI meets certainty.

**Latest: v1.0.17** - Complete loop support (for, for-in, while, do-while, break/continue)

## Installation

```bash
npm install prism-uncertainty
```

## Quick Start

### As a Library

```javascript
import { Prism } from 'prism-uncertainty';

const prism = new Prism({
  geminiApiKey: 'your-api-key' // or set GEMINI_API_KEY env var
});

// Execute Prism code
const result = await prism.execute(`
  temperature = 22.5 ~> 0.9
  weather = llm("Is " + temperature + "°C good for outdoor activities?")
  decision = weather ~@> "Go outside!" ~?? "Stay indoors"
  decision
`);

console.log(result); // "Go outside!" (with confidence)
```

### As a CLI

```bash
# Install globally
npm install -g prism-uncertainty

# Run a Prism file
prism run weather-analysis.prism

# Start the REPL
prism repl

# Evaluate an expression
prism eval "42 ~> 0.9"
```

## API Reference

### `new Prism(options?)`

Create a new Prism instance.

Options:
- `geminiApiKey`: Google Gemini API key
- `anthropicApiKey`: Anthropic Claude API key

### `prism.execute(code: string): Promise<any>`

Execute Prism code and return the result.

### `prism.executeFile(filePath: string): Promise<any>`

Execute a Prism file.

### `runPrism(code: string, options?): Promise<any>`

Convenience function for one-off execution.

## Features

- 🎯 18 uncertainty-aware operators
- 🧠 Native LLM integration
- 🌊 Uncertainty-aware control flow
- 🔗 Automatic confidence propagation
- ⚡ 69% less code than traditional approaches
- 🔧 Ternary operators for concise conditionals
- 📦 Arrays and objects with full manipulation
- 💬 String interpolation with `${}`
- 🔄 Array methods as properties (.map, .filter, .reduce, .forEach, .push)
- 🚀 Lambda expressions with arrow syntax
- 🎯 Closures and functional programming
- ⬜ Null support for representing absence of values
- ⚡ Undefined support - distinct from null
- 🔍 Optional chaining operator (?.) for safe navigation
- ➕ Compound assignment operators (+=, -=, *=, /=, %=)
- ⚡ Exponentiation operator (**) for power operations
- 🔀 Nullish coalescing operator (??) for precise null/undefined handling
- ... Spread operator for arrays and objects

## Example: AI Model Ensemble

```javascript
import { runPrism } from 'prism-uncertainty';

const result = await runPrism(`
  // Run multiple models and pick the most confident result
  gpt_result = llm("Analyze this data with GPT")
  claude_result = llm("Analyze this data with Claude") 
  gemini_result = llm("Analyze this data with Gemini")
  
  // Parallel confidence operator selects highest confidence
  best_model = gpt_result ~||> claude_result ~||> gemini_result
  
  // Threshold gate: only proceed if highly confident
  decision = best_model ~@> "auto_approve" ~?? "manual_review"
  
  decision
`);

console.log(result); // "auto_approve" or "manual_review"
```

## What's New

### v1.0.17 - Complete Loop Support
- **C-style for loops**: `for i = 0; i < 5; i++` with optional parts
- **For-in loops**: `for item in array` or `for item, index in array`
- **While loops**: `while condition { ... }`
- **Do-while loops**: `do { ... } while condition`
- **Loop control**: `break` and `continue` statements
- **Nested loops**: Full support for loops within loops
- **Confidence preservation**: Loops work seamlessly with confident values

### v1.0.16 - Array Methods as Properties
- **Method syntax**: `arr.map(fn)`, `arr.filter(fn)`, `arr.reduce(fn)`, `arr.forEach(fn)`, `arr.push(...items)`
- **Immutable push**: Returns a new array instead of mutating
- **Smart parameters**: Methods pass the right number of arguments based on function arity
- **Confidence preservation**: All methods maintain confidence through operations
- **Dual syntax**: Both `arr.map(fn)` and `map(arr, fn)` work

### v1.0.15 - Spread Operator
- **Array spreading**: `[...arr1, ...arr2]` - combine arrays immutably
- **Object spreading**: `{...obj1, ...obj2}` - merge objects with overriding
- Works with confidence values by unwrapping before spreading
- Enables functional programming patterns

### v1.0.14 - Exponentiation & Nullish Coalescing
- **Exponentiation operator**: `2 ** 3` = 8, with right associativity
- **Nullish coalescing**: `value ?? default` - only replaces null/undefined
- Both operators integrate seamlessly with confidence values

### v1.0.13 - Optional Chaining & Undefined
- **Optional chaining**: `user?.profile?.name` - safe property access
- **Undefined support**: Distinct from null for better JavaScript interop
- **Safe navigation**: No more "Cannot read property of null" errors

### v1.0.12 - Compound Assignment Operators
- **Compound assignments**: `+=`, `-=`, `*=`, `/=`, `%=`
- **String concatenation**: Use `+=` with strings
- **Confidence propagation**: All operators maintain confidence values

### v1.0.11 - Null Support
- **Null literal**: `null` as a proper value type
- **Null in data structures**: Arrays and objects can contain null
- **Null comparisons**: `==` and `!=` work with null
- **Confidence with null**: Null values can have confidence

### v1.0.9 - Lambda Expressions & Functional Programming
- **Lambda expressions**: `x => x * 2`, `(a, b) => a + b`
- **Closures**: Capture variables from outer scope
- **Modulo operator**: `%` for remainder operations

### v1.0.8 - Array Methods
- **map()**: Transform arrays with confidence preservation
- **filter()**: Filter arrays based on predicates
- **reduce()**: Reduce arrays to single values

### v1.0.7 - String Interpolation
- **String interpolation**: `"Hello ${name}!"`
- **Complex expressions**: `"Result: ${x * 2 + y}"`
- **Multiline support**: Works in triple-backtick strings

### v1.0.6 - Arrays & Objects
- **Arrays**: `[1, 2, 3]` with index access `arr[0]`
- **Objects**: `{name: "John", age: 30}` with property access
- **Nested structures**: Full support for complex data

### v1.0.5 - Ternary Operators
- **Ternary syntax**: `condition ? "yes" : "no"`
- **Confidence propagation**: Through conditional branches

### v1.0.4 - String Improvements
- **Multiline strings**: Triple backticks for code snippets
- **Escape sequences**: `\n`, `\t`, `\"`
- **Better error messages**: With context and line info

## Advanced Examples

### Lambda Functions with Array Methods

```prism
// Transform data with lambdas
numbers = [1, 2, 3, 4, 5]
doubled = map(numbers, x => x * 2)
evens = filter(doubled, x => x % 2 == 0)
sum = reduce(evens, (acc, val) => acc + val, 0)

// Chain operations with confidence
data = [10, 20, 30] ~> 0.8
processed = map(data, x => x * 1.5)
// processed maintains 0.8 confidence
```

### String Interpolation & Templates

```prism
name = "Alice" ~> 0.95
age = 30 ~> 0.9
message = "Hello ${name}, you are ${age} years old!"
// Confidence propagates through interpolation

// Complex templates
template = ```
User Profile:
- Name: ${name}
- Age: ${age}
- Status: ${age >= 18 ? "Adult" : "Minor"}
```
```

### Object Manipulation

```prism
user = {
  name: "Bob",
  scores: [85, 92, 78],
  active: true
}

// Access nested properties
avg = reduce(user.scores, (a, b) => a + b, 0) / 3
status = user.active ? "Active" : "Inactive"
```

### Exponentiation & Nullish Coalescing

```prism
// Exponentiation - power operations
squared = 3 ** 2              // 9
cubed = 2 ** 3                // 8
rightAssoc = 2 ** 3 ** 2      // 2 ** 9 = 512 (right associative)

// With variables and expressions
base = 4
result = base ** 0.5          // 2 (square root)
complex = (base + 1) ** 2     // 25

// Nullish coalescing - precise null/undefined handling
// Different from || - preserves falsy values
port = process.env.PORT ?? 3000       // Uses 3000 only if PORT is null/undefined
enabled = config.enabled ?? true      // Keeps false if explicitly set
retries = options.retries ?? 0        // Keeps 0 if specified

// Chaining nullish coalescing
value = cache ?? database ?? defaultValue

// With confidence values
uncertain = getData() ~> 0.7
result = (uncertain ?? fallback) ** 2
```

### Null & Undefined Handling

```prism
// Null vs Undefined distinction
profile = {
  username: "alice",
  email: null,        // Explicitly no email
  phone: undefined    // Not yet provided
}

// Optional chaining for safe access
safeEmail = profile?.email ?? "No email"
safePhone = profile?.phone ?? "No phone"

// Deep optional chaining
user = { settings: { theme: { color: "blue" } } }
color = user?.settings?.theme?.color  // "blue"

// Handles null/undefined gracefully
empty = { settings: null }
missing = { settings: undefined }
emptyColor = empty?.settings?.theme?.color    // null (no error!)
missingColor = missing?.settings?.theme?.color // null (no error!)

// Filter nulls vs undefined
data = [1, null, 3, undefined, 5]
noNulls = filter(data, x => x != null)       // [1, 3, undefined, 5]
noUndefined = filter(data, x => x != undefined) // [1, null, 3, 5]
validData = filter(data, x => x != null && x != undefined) // [1, 3, 5]
```

### Compound Assignments

```prism
// Numeric operations
score = 100
score += 25   // score = 125
score -= 10   // score = 115
score *= 2    // score = 230
score /= 5    // score = 46
score %= 10   // score = 6

// String concatenation
greeting = "Hello"
greeting += ", "
greeting += "World!"  // "Hello, World!"

// With confidence values
measurement = 50 ~> 0.9
adjustment = 10 ~> 0.7
measurement += adjustment  // 60 with 0.7 confidence (minimum)
```

### Spread Operator

```prism
// Array spreading
arr1 = [1, 2, 3]
arr2 = [4, 5, 6]
combined = [...arr1, ...arr2]  // [1, 2, 3, 4, 5, 6]
newArray = [0, ...arr1, 4]     // [0, 1, 2, 3, 4]

// Object spreading
defaults = {theme: "dark", lang: "en"}
userPrefs = {lang: "es", debug: true}
settings = {...defaults, ...userPrefs}  // {theme: "dark", lang: "es", debug: true}

// Override properties
user = {name: "Alice", age: 30}
updated = {...user, age: 31}  // {name: "Alice", age: 31}

// Works with confidence
data = [1, 2, 3] ~> 0.8
extended = [...data, 4, 5]  // Spreads the array values
```

## Documentation

Full documentation: https://github.com/HaruHunab1320/Prism-TS

## License

MIT