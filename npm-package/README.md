# prism-uncertainty

The official npm package for Prism - the language where AI meets certainty.

**Latest: v1.0.9** - Lambda expressions, array methods, and powerful functional programming features

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
- 🔄 Built-in array methods (map, filter, reduce)
- 🚀 Lambda expressions with arrow syntax
- 🎯 Closures and functional programming
- ⬜ Null support for representing absence of values
- ➕ Compound assignment operators (+=, -=, *=, /=, %=)

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

### Null Handling

```prism
// Null represents absence of value
profile = {
  username: "alice",
  email: null,
  phone: null
}

// Check for null values
hasEmail = profile.email != null
displayEmail = profile.email != null ? profile.email : "No email provided"

// Filter out nulls from arrays
data = [1, null, 3, null, 5]
validData = filter(data, x => x != null)  // [1, 3, 5]

// Null with confidence
maybeValue = null ~> 0.3
fallback = maybeValue ~?? "default"  // Uses "default" due to low confidence
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

## Documentation

Full documentation: https://github.com/HaruHunab1320/Prism-TS

## License

MIT