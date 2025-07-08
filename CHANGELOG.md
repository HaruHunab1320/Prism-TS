# Changelog

All notable changes to prism-uncertainty will be documented in this file.

## [1.0.19] - 2025-07-08

### Added
- **JavaScript-style logical operators** - The `||` and `&&` operators now behave like JavaScript
  - `||` returns the first truthy value or the last value
  - `&&` returns the first falsy value or the last value
  - Enables common patterns like `name = userInput || "default"`
  - Full short-circuit evaluation for better performance
- **Enhanced error messages** - Runtime errors now include location information
  - Shows line and column numbers where errors occur
  - Example: `Error at line 5, column 23: Cannot apply - to string and number`
  - AST nodes now carry optional location information
  - Improved developer experience for debugging

### Changed
- Logical operators `||` and `&&` now return actual values instead of booleans
- Runtime error handling enhanced with location tracking

## [1.0.18] - 2025-07-08

### Added
- **Uncertainty-aware loops** - Revolutionary loop constructs that adapt behavior based on confidence levels
- **Uncertain for loops** - Execute different branches based on loop confidence
  - `uncertain for i = 0; condition ~> confidence; i++`
  - High, medium, and low confidence branches
  - Dynamic confidence evaluation at each iteration
- **Uncertain while loops** - Conditional execution with confidence-based branching
  - `uncertain while condition ~> confidence`
  - Automatic branch selection based on confidence thresholds
  - Perfect for sensor monitoring and AI model inference
- **Confidence thresholds**:
  - HIGH: confidence >= 0.7
  - MEDIUM: 0.5 <= confidence < 0.7
  - LOW: confidence < 0.5
- Full support for break and continue within uncertainty branches
- Seamless integration with existing confidence system

### Example
```prism
// Uncertain for loop - adapt to confidence levels
uncertain for i = 0; (i < readings.length) ~> confidence; i++ {
  high {
    // Confidence >= 0.7 - fully automated
    processAutomatically(readings[i])
  }
  medium {
    // 0.5 <= confidence < 0.7 - human review
    flagForReview(readings[i])
  }
  low {
    // Confidence < 0.5 - alert and skip
    sendAlert(readings[i])
    break
  }
}

// Uncertain while - monitor with degradation handling
uncertain while (systemActive() ~> getSystemHealth()) {
  high {
    runNormalOperations()
  }
  medium {
    runDegradedMode()
  }
  low {
    enterSafeMode()
    break
  }
}

// AI inference with confidence-based retries
uncertain for attempt = 0; attempt < 3; attempt++ {
  high {
    return model.predict(input)
  }
  medium {
    // Use ensemble for medium confidence
    return ensemblePredict(input)
  }
  low {
    // Request human labeling
    return requestHumanInput(input)
  }
}
```

## [1.0.17] - 2025-07-08

### Added
- **Complete loop support** - Standard JavaScript-style loops with Prism's unique features
- **C-style for loops** - Traditional loops with init, condition, and update expressions
  - Optional parts: `for ; i < 10; i++` or `for i = 0; ; i++`
  - Variables use outer scope (not block-scoped)
- **For-in loops** - Iterate over array elements with optional index
  - `for item in array { ... }`
  - `for item, index in array { ... }`
  - Creates new scope for loop variables
- **While loops** - Execute while condition is true
- **Do-while loops** - Execute at least once, then check condition
- **Break and continue** - Control flow within loops
  - Break exits the current loop
  - Continue skips to next iteration
- **Nested loops** - Full support for loops within loops
- **Confidence preservation** - Loops work seamlessly with confident values
- Comprehensive test suite with 31 loop tests

### Example
```prism
// C-style for loop
sum = 0
for i = 0; i < 5; i = i + 1 {
  sum = sum + i
}
// sum = 10 (0 + 1 + 2 + 3 + 4)

// For-in loop with array
arr = ["a", "b", "c"]
result = ""
for item, idx in arr {
  result = result + item + idx
}
// result = "a0b1c2"

// While loop
i = 0
while i < 3 {
  i = i + 1
}

// Do-while - executes at least once
count = 0
do {
  count = count + 1
} while false
// count = 1

// Break and continue
for i = 0; i < 10; i = i + 1 {
  if (i == 5) break      // Exit loop at 5
  if (i % 2 == 0) continue  // Skip even numbers
  // Process odd numbers only
}

// Works with confident values
data = [1, 2, 3] ~> 0.8
sum = 0
for item in data {
  sum = sum + item
}
// sum gets confidence from operations

// Nested loops
for i = 0; i < 3; i = i + 1 {
  for j = 0; j < 2; j = j + 1 {
    // Inner loop runs 6 times total
  }
}
```

## [1.0.16] - 2025-07-08

### Added
- **Array methods as properties** - All array methods now available as properties for better ergonomics
- `array.map(fn)` - Transform array elements with a function
- `array.filter(fn)` - Filter elements based on a predicate
- `array.reduce(fn, init?)` - Reduce array to a single value with optional initial value
- `array.forEach(fn)` - Iterate over elements (returns undefined)
- `array.push(...items)` - Add elements to array (returns new array, immutable)
- All methods preserve confidence values when used on confident arrays
- Methods intelligently handle optional parameters (e.g., index in reduce)
- Both method syntax (`arr.map(fn)`) and function syntax (`map(arr, fn)`) are supported

### Fixed
- Lambda functions now properly track their arity for correct parameter handling
- Array method callbacks receive the correct number of arguments based on their parameter count

### Example
```prism
// Array methods as properties
numbers = [1, 2, 3, 4, 5]

// Map - transform elements
doubled = numbers.map(x => x * 2)         // [2, 4, 6, 8, 10]
squares = numbers.map(x => x ** 2)        // [1, 4, 9, 16, 25]

// Filter - select elements
evens = numbers.filter(x => x % 2 == 0)   // [2, 4]
large = numbers.filter(x => x > 3)        // [4, 5]

// Reduce - aggregate values
sum = numbers.reduce((a, b) => a + b)     // 15
product = numbers.reduce((a, b) => a * b, 1) // 120

// With index parameter
indexed = numbers.reduce((acc, val, idx) => acc + val * idx, 0) // 40

// ForEach - side effects (returns undefined)
result = numbers.forEach(x => x * 2)      // undefined

// Push - add elements (immutable)
original = [1, 2, 3]
expanded = original.push(4, 5)            // [1, 2, 3, 4, 5]
// original is still [1, 2, 3]

// Method chaining
result = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  .filter(x => x % 2 == 0)               // [2, 4, 6, 8, 10]
  .map(x => x ** 2)                       // [4, 16, 36, 64, 100]
  .reduce((a, b) => a + b)                // 220

// Works with confident arrays
confident = [1, 2, 3] ~> 0.8
doubled = confident.map(x => x * 2)       // [2, 4, 6] ~> 0.8

// Both syntaxes work
methodResult = arr.map(x => x * 2)
functionResult = map(arr, x => x * 2)     // Same result
```

## [1.0.15] - 2025-07-08

### Added
- **Spread operator (`...`)** - Essential for modern data manipulation
- Array spreading: `[...arr1, ...arr2]` combines arrays immutably
- Object spreading: `{...obj1, ...obj2}` merges objects with property overriding
- Works seamlessly with confidence values by unwrapping before spreading
- Enables clean, functional programming patterns

### Example
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

// Multiple spreads
a = [1, 2]
b = [3, 4]
c = [5, 6]
all = [...a, ...b, ...c]  // [1, 2, 3, 4, 5, 6]

// Works with confidence
data = [1, 2, 3] ~> 0.8
extended = [...data, 4, 5]  // Spreads the array values

// Nested structures
config = {
  server: {host: "localhost", port: 3000},
  debug: true
}
production = {...config, debug: false}  // Overrides debug while keeping server
```

## [1.0.14] - 2024-06-27

### Added
- **Exponentiation operator (`**`)** - Mathematical power operations with right associativity
- **Nullish coalescing operator (`??`)** - Returns right operand only for null/undefined values
- Exponentiation has higher precedence than multiplication/division
- Nullish coalescing differs from `||` by preserving falsy values like `0`, `false`, and `""`
- Both operators work seamlessly with confidence values

### Example
```prism
// Exponentiation - power operations
squared = 3 ** 2              // 9
cubed = 2 ** 3                // 8
rightAssoc = 2 ** 3 ** 2      // 2 ** 9 = 512

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

// With optional chaining
user = { profile: null }
name = user?.profile?.name ?? "Anonymous"

// With confidence values
uncertain = getData() ~> 0.7
result = (uncertain ?? fallback) ** 2
```

## [1.0.13] - 2024-06-27

### Added
- **Optional chaining operator (`?.`)** - Safe property access that returns null instead of throwing errors
- **Undefined support** - `undefined` is now a proper value type, distinct from `null`
- Undefined works with all operators including optional chaining
- Both null and undefined are falsy but remain distinct values
- Optional chaining works with arrays, objects, and nested properties

### Example
```prism
// Optional chaining - safe navigation
user = { profile: null }
name = user?.profile?.name  // Returns null instead of throwing

// Undefined support
value = undefined
isEmpty = value == null      // false (undefined != null)
isUndefined = value == undefined  // true

// Optional chaining with undefined
data = { info: undefined }
result = data?.info?.details  // Returns null

// Distinction between null and undefined
missing = undefined          // Never assigned
empty = null                // Explicitly empty

// Both are falsy
if (!missing && !empty) {
  // This executes because both are falsy
}

// Safe navigation in complex structures
config = {
  server: {
    host: "localhost",
    port: undefined
  }
}
port = config?.server?.port ?? 3000  // Uses default 3000
```

## [1.0.12] - 2024-06-27

### Added
- **Compound assignment operators** - `+=`, `-=`, `*=`, `/=`, `%=`
- Compound assignments work with numbers, strings, and confidence values
- String concatenation with `+=` operator
- All compound operators properly propagate confidence values

### Example
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

## [1.0.11] - 2024-06-27

### Added
- **Null literal support** - `null` is now a proper value type
- Null can be used in variables, arrays, objects, and comparisons
- Null works with all operators including ternary and logical operators
- Null integrates with confidence system
- Array methods handle null values properly

### Example
```prism
// Basic null usage
value = null
isEmpty = value == null  // true

// Null in data structures
user = { name: "Alice", email: null }
data = [1, null, 3, null, 5]

// Null handling with array methods
validData = filter(data, x => x != null)  // [1, 3, 5]
mapped = map(data, x => x != null ? x * 2 : 0)  // [2, 0, 6, 0, 10]

// Null with confidence
uncertain = null ~> 0.5
fallback = uncertain ~?? "default"  // Uses fallback due to low confidence
```

## [1.0.9] - 2024-06-26

### Added
- **Lambda expressions** with arrow syntax (`=>`)
- Support for single parameter without parentheses: `x => x * 2`
- Support for multiple parameters: `(x, y) => x + y`
- Support for zero parameters: `() => 42`
- **Closures** - lambdas can capture variables from outer scope
- **Modulo operator** (`%`) for remainder operations
- Integration of lambdas with array methods for functional programming

### Example
```prism
// Lambda expressions
double = x => x * 2
add = (x, y) => x + y
getRandom = () => 42

// With array methods
numbers = [1, 2, 3, 4, 5]
squared = map(numbers, x => x * x)        // [1, 4, 9, 16, 25]
evens = filter(numbers, x => x % 2 == 0)  // [2, 4]
sum = reduce(numbers, (a, b) => a + b, 0) // 15

// Closures
multiplier = 10
scale = x => x * multiplier
scaled = scale(5)  // 50

// Currying
makeAdder = x => (y => x + y)
add10 = makeAdder(10)
result = add10(32)  // 42
```

## [1.0.8] - 2024-06-25

### Added
- **Array methods** as built-in global functions
- `map(array, fn)` - transform each element
- `filter(array, predicate)` - keep elements matching predicate
- `reduce(array, reducer, initialValue?)` - combine elements into single value
- Confidence preservation through array transformations
- Support for index parameter in reduce function

### Example
```prism
// Array methods with confidence
data = [10, 20, 30] ~> 0.8
doubled = map(data, x => x * 2)           // [20, 40, 60] ~> 0.8
filtered = filter(data, x => x > 15)      // [20, 30] ~> 0.8
sum = reduce(data, (acc, val) => acc + val, 0)  // 60 ~> 0.8

// With index in reduce
indexed = reduce(data, (acc, val, idx) => acc + (val * idx), 0)
```

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