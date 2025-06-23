# Changelog

All notable changes to prism-uncertainty will be documented in this file.

## [1.0.7] - 2024-06-22

### Added
- **String interpolation** with `${}` syntax inside strings
- Support for complex expressions in interpolations
- Nested interpolations with proper quote handling
- Interpolation in multiline strings
- Confidence value formatting in interpolations

### Example
```prism
// Basic interpolation
name = "Alice"
greeting = "Hello, ${name}!"

// Complex expressions
user = { name: "Bob", age: 30 }
info = "${user.name} is ${user.age} years old"

// With ternary operators
score = 85
grade = "Your grade: ${score >= 90 ? "A" : "B"}"

// Multiline with interpolation
report = ```
User: ${name}
Score: ${score}
Grade: ${grade}
```
```

## [1.0.6] - 2024-06-22

### Added
- **Arrays and lists** with literal syntax `[1, 2, 3]`
- **Objects/dictionaries** with literal syntax `{ key: value }`
- **Array methods**: length property, index access `array[0]`
- **Object property access** with dot notation `object.property`
- **Built-in array functions**: `map()`, `filter()`, `reduce()`
- Support for nested data structures and confidence propagation

### Example
```prism
// Arrays and objects
scores = [85 ~> 0.9, 92 ~> 0.8, 78 ~> 0.7]
firstScore = scores[0]       # 85 (~90%)
count = scores.length        # 3

person = {
  name: "Alice",
  scores: scores,
  metadata: { verified: true }
}
name = person.name           # "Alice"
verified = person.metadata.verified  # true
```

## [1.0.5] - 2024-06-22

### Added
- **Ternary operator** support (`condition ? true : false`)
- Support for nested ternary expressions
- Reduces need for verbose if-else statements

### Example
```prism
status = age >= 18 ? "adult" : "minor"
grade = score >= 90 ? "A" : (score >= 80 ? "B" : "C")
action = confidence > 0.8 ? "auto-approve" : "manual-review"
```

## [1.0.4] - 2024-06-22

### Added
- **Multiline string support** with triple backticks (```) - enables passing code snippets to LLMs
- **Standard escape sequences** in strings (\n, \t, \", \\, etc.)
- **Enhanced error messages** showing line content and error position

### Fixed
- String literals now properly handle escape sequences instead of throwing errors
- Parse errors now show helpful context including the problematic line and column marker

### Example
```prism
// New multiline strings for code analysis
code = ```
function getUserData(userId) {
  const query = "SELECT * FROM users WHERE id = " + userId;
  return db.execute(query);
}
```
analysis = llm("Find security issues in: " + code)

// Escape sequences now work
query = "SELECT * FROM users WHERE name = \"John\""
```

## [1.0.3] - 2024-06-22

### Fixed
- LLM providers now properly initialize when API keys are provided
- Fixed "No LLM provider configured" error when using geminiApiKey or anthropicApiKey options
- Providers are automatically registered and set as default when API keys are available

## [1.0.2] - 2024-06-22

### Fixed
- Updated GitHub repository URL in documentation to correct address

## [1.0.1] - 2024-06-06

### Added
- Semicolon support for statement separation
- Better handling of multiple statements per line
- Backwards compatibility maintained (semicolons are optional)

### Fixed
- Parser now properly consumes semicolons after statements
- Improved statement boundary detection

### Known Issues
- Multiple assignments on one line (e.g., `x = 10; y = 20`) still require workaround
- Recommended: Use one statement per line for best results

## [1.0.0] - 2024-06-06

### Initial Release
- 18 confidence-aware operators for uncertainty handling
- Native LLM integration support
- Uncertainty-aware control flow (uncertain if statements)
- Automatic confidence propagation
- Full TypeScript implementation
- Interactive REPL
- CLI tools (prism run, prism eval, prism repl)
- npm package: prism-uncertainty