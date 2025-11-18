# Prism-TS API Reference

This document provides detailed API reference for Prism-TS language constructs and runtime components.

## Language Syntax

### Variables and Literals

#### Number Literals
```prism
42          // Integer
3.14159     // Float
-17         // Negative number
```

#### String Literals
```prism
"hello"           // Double quotes
"multi\nline"     // Escape sequences
"embedded " + var // String concatenation
"Hello ${name}!"  // String interpolation
```
Multiline string
```  // Triple backticks for multiline
```

#### Boolean Literals
```prism
true
false
```

#### Null and Undefined
```prism
null       // Explicit absence of value
undefined  // Unassigned value
```

#### Array Literals
```prism
[1, 2, 3]              // Array of numbers
["a", "b", "c"]        // Array of strings
[1, "mixed", true]     // Mixed types
[...arr1, ...arr2]     // Array spread
```

#### Object Literals  
```prism
{name: "Alice", age: 30}           // Basic object
{...defaults, ...overrides}        // Object spread
{key: value, "string key": value}  // Property syntax
```

### Confidence Expressions

#### Syntax
```prism
expression ~> confidence_value
```

#### Examples
```prism
// Literal confidence
measurement = 100 ~> 0.85

// Variable confidence
quality = 0.9
result = data ~> quality

// Expression confidence
sensor_avg = (sensor1 + sensor2) / 2 ~> 0.75
```

### Binary Operators

#### Arithmetic
- `+` - Addition (numbers) or concatenation (strings)
- `-` - Subtraction
- `*` - Multiplication  
- `/` - Division
- `%` - Modulo (remainder)
- `**` - Exponentiation (right-associative)

#### Assignment Operators
- `=` - Assignment
- `+=` - Addition assignment
- `-=` - Subtraction assignment
- `*=` - Multiplication assignment
- `/=` - Division assignment
- `%=` - Modulo assignment

#### Comparison
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal
- `<=` - Less than or equal
- `==` - Equal
- `!=` - Not equal

#### Logical
- `&&` - Logical AND
- `||` - Logical OR
- `??` - Nullish coalescing (null/undefined only)

#### Special Operators
- `?.` - Optional chaining
- `...` - Spread operator
- `=>` - Lambda/arrow function
- `instanceof` - Type checking (returns boolean)

### Unary Operators

- `-` - Numeric negation
- `!` - Logical NOT
- `~` - Confidence accessor
- `<~` - Confidence extraction
- `typeof` - Type inspection (returns string)

### Confidence Operators

#### Binary Confidence Operators
- `~>` - Confidence assignment
- `~~` - Confidence chaining
- `~??` - Confidence coalesce
- `~&&` - Confident AND
- `~||` - Confident OR
- `~+` - Confident addition
- `~-` - Confident subtraction
- `~*` - Confident multiplication
- `~/` - Confident division
- `~==` - Confident equality
- `~!=` - Confident inequality
- `~>=` - Confident greater equal
- `~<` - Confident less
- `~<=` - Confident less equal
- `~.` - Confident property access
- `~||>` - Parallel confidence
- `~@>` - Threshold gate

### Control Flow

#### If Statements
```prism
if (condition) {
  // then branch
} else {
  // else branch (optional)
}
```

#### Uncertain If Statements
```prism
uncertain if (confident_expression ~> threshold) {
  high { 
    // Execute when confidence >= 0.8
  }
  medium { 
    // Execute when 0.5 <= confidence < 0.8
  }
  low { 
    // Execute when confidence < 0.5
  }
}
```

#### For Loops
```prism
// C-style for loop
for init; condition; update {
  // loop body
}

// Examples
for i = 0; i < 10; i = i + 1 {
  // Standard loop
}

for ; i < 10; i++ {  // No init
for i = 0; ; i++ {   // No condition (use break)
for i = 0; i < 10; { // No update
```

#### For-In Loops
```prism
// Iterate over array elements
for item in array {
  // process item
}

// With index
for item, index in array {
  // process item and index
}
```

#### While Loops
```prism
while condition {
  // loop body
}
```

#### Do-While Loops
```prism
do {
  // loop body (executes at least once)
} while condition
```

#### Loop Control
- `break` - Exit the current loop
- `continue` - Skip to next iteration

#### Uncertain For Loops
```prism
// Syntax
uncertain for init; condition; update {
  high {
    // Execute when confidence >= 0.7
  }
  medium {
    // Execute when 0.5 <= confidence < 0.7
  }
  low {
    // Execute when confidence < 0.5
  }
}

// With confident condition
uncertain for i = 0; (i < n) ~> confidence; i++ {
  high { /* ... */ }
  medium { /* ... */ }
  low { /* ... */ }
}
```

#### Uncertain While Loops
```prism
// Syntax
uncertain while condition ~> confidence {
  high {
    // Execute when confidence >= 0.7
  }
  medium {
    // Execute when 0.5 <= confidence < 0.7
  }
  low {
    // Execute when confidence < 0.5
  }
}

// Example
uncertain while (isActive() ~> getConfidence()) {
  high { processNormally() }
  medium { processWithCaution() }
  low { handleLowConfidence() }
}
```

### Context Management

#### Context Declaration
```prism
in context ContextName {
  // Isolated execution environment
  variable = value
  result = computation
}
```

#### Context Shifting
```prism
in context Source {
  data = "initial"
} -> Target  // Shift to Target context
```

### LLM Integration

#### Basic LLM Call
```prism
response = llm("Your prompt here")
```

#### Variable Prompts
```prism
topic = "machine learning"
explanation = llm("Explain ${topic}")  // String interpolation
```

#### Chained Calls
```prism
overview = llm("Overview of quantum computing")
details = llm("Based on: ${overview} - explain challenges")
```

### Lambda Expressions

```prism
// Single parameter (no parentheses)
square = x => x * x

// Multiple parameters
add = (a, b) => a + b

// No parameters
getRandom = () => Math.random()

// Using lambdas
result = square(5)  // 25
sum = add(3, 7)     // 10

// Rest parameters - collect arguments as array
sumAll = (...nums) => nums.reduce((a, b) => a + b, 0)
total = sumAll(1, 2, 3, 4, 5)  // 15

// Regular and rest parameters
greet = (greeting, ...names) => greeting + " " + names.join(" and ")
message = greet("Hello", "Alice", "Bob")  // "Hello Alice and Bob"

// Spread operator in function calls
numbers = [1, 2, 3, 4, 5]
maxValue = max(...numbers)  // 5

// Combining spread and regular arguments
result = sumAll(1, ...[2, 3, 4], 5)  // 15
```

### Array Methods

#### As Properties (v1.0.16+)
```prism
arr = [1, 2, 3, 4, 5]

// Map - transform elements
squares = arr.map(x => x * x)           // [1, 4, 9, 16, 25]

// Filter - select elements
evens = arr.filter(x => x % 2 == 0)     // [2, 4]

// Reduce - aggregate values
sum = arr.reduce((a, b) => a + b)        // 15
product = arr.reduce((a, b) => a * b, 1) // 120

// ForEach - iterate (returns undefined)
arr.forEach(x => println(x))

// Push - add elements (immutable)
newArr = arr.push(6, 7)                 // [1, 2, 3, 4, 5, 6, 7]
```

#### As Functions (legacy)
```prism
// Still supported for compatibility
doubled = map(arr, x => x * 2)
filtered = filter(arr, x => x > 3)
sum = reduce(arr, (a, b) => a + b, 0)
```

### Pipeline Operators

#### Basic Pipeline Operator |>
The pipeline operator allows you to chain operations in a more readable left-to-right manner.

```prism
// Basic usage with placeholder _
result = 5 |> double(_)  // equivalent to: double(5)

// Chaining multiple operations
result = 5 
  |> double(_)      // 10
  |> addOne(_)      // 11
  |> toString(_)    // "11"

// With array methods
nums = [1, 2, 3, 4, 5]
result = nums
  |> filter(_, x => x > 2)         // [3, 4, 5]
  |> map(_, x => x * 2)            // [6, 8, 10]
  |> reduce(_, (a, b) => a + b, 0) // 24

// Multiple placeholders in one call
add = (a, b) => a + b
result = 10 |> add(_, 5)  // 15

// Nested operations
result = 5 |> add(double(_), 3)  // double(5) + 3 = 13
```

#### Confidence Pipeline Operator ~|>
The confidence pipeline operator preserves confidence values through the pipeline chain.

```prism
// Preserves confidence through transformations
confident_value = 5 ~> 0.8
result = confident_value
  ~|> double(_)     // 10 with 80% confidence
  ~|> addOne(_)     // 11 with 80% confidence

// Can override confidence mid-pipeline
data = 10 ~> 0.9
result = data
  ~|> process1(_)
  ~|> process2(_) ~> 0.7  // Changes confidence to 70%

// Works with confidence-aware operations
nums = [1 ~> 0.9, 2 ~> 0.8, 3 ~> 0.7]
filtered = nums ~|> filter(_, x => (<~ x) > 0.75)
// Result preserves confidence through the operation
```

#### Placeholder Behavior
- The `_` placeholder represents the piped value
- Can only be used within pipeline expressions
- Multiple placeholders can be used in the same function call
- Placeholders are replaced at parse time, not runtime

```prism
// Error: placeholder outside pipeline
result = _  // Error!

// Valid: placeholder in pipeline
result = 5 |> process(_)  // OK

// Valid: multiple placeholders
result = 10 |> between(5, _, 15)  // between(5, 10, 15)
```

#### Confidence Threshold Gate ~?>
The threshold gate operator allows conditional pipeline continuation based on confidence levels.

```prism
// Basic threshold - returns undefined if below threshold
value = data ~> 0.6
result = value ~?> 0.8  // Only continues if confidence >= 0.8

// Threshold with default value
value = data ~> 0.4
result = value ~?> [0.7, "low_confidence"]  // Returns default if below 0.7

// Chaining with pipelines
result = aiResponse ~> 0.85
  ~?> 0.9                     // Quality gate at 90%
  ~|> enhance(_)              // Only runs if gate passes
  ~|> format(_)

// Progressive enhancement based on confidence
analysis = measurement ~> 0.95
  ~|> basicAnalysis(_)        // Always runs
  ~?> 0.7                     // Continue if >= 70%
  ~|> advancedAnalysis(_)     // Enhanced analysis
  ~?> 0.9                     // Continue if >= 90%
  ~|> expertAnalysis(_)       // Expert-level analysis

// Adaptive processing
result = sensorData ~> confidence
  ~?> [0.8, sensorData]       // Use original if < 80%
  ~|> complexProcess(_)       // Only for high confidence
```

### Type Checking Operators

#### typeof Operator
Returns a string indicating the type of a value.

```prism
typeof 42              // "number"
typeof "hello"         // "string"
typeof true            // "boolean"
typeof null            // "null"
typeof undefined       // "undefined"
typeof [1, 2, 3]       // "array"
typeof {a: 1}          // "object"
typeof (x => x + 1)    // "function"

// With confidence values
typeof (42 ~> 0.8)     // "number" (checks wrapped value)
```

#### instanceof Operator
Checks if a value is an instance of a specific type, returning a boolean.

```prism
42 instanceof "number"           // true
"hello" instanceof "string"      // true
[1, 2, 3] instanceof "array"     // true
{a: 1} instanceof "object"       // true

// Arrays are distinct from objects
[1, 2, 3] instanceof "object"    // false

// With confidence values
(42 ~> 0.8) instanceof "number"  // true
```

Common usage patterns:
```prism
// Type guards
processValue = value => {
  if (typeof value == "number") {
    value * 2
  } else if (typeof value == "string") {
    value + value
  } else {
    "unknown type"
  }
}

// Input validation
safeDivide = (a, b) => {
  if (a instanceof "number" && b instanceof "number") {
    b != 0 ? a / b : "Cannot divide by zero"
  } else {
    "Both arguments must be numbers"
  }
}
```

## Runtime API

### Value Types

#### NumberValue
```typescript
class NumberValue extends Value {
  constructor(value: number)
  value: number
  equals(other: Value): boolean
  isTruthy(): boolean
  toString(): string
}
```

#### StringValue
```typescript
class StringValue extends Value {
  constructor(value: string)
  value: string
  equals(other: Value): boolean
  isTruthy(): boolean
  toString(): string
}
```

#### BooleanValue
```typescript
class BooleanValue extends Value {
  constructor(value: boolean)
  value: boolean
  equals(other: Value): boolean
  isTruthy(): boolean
  toString(): string
}
```

#### NullValue
```typescript
class NullValue extends Value {
  constructor()
  value: null
  equals(other: Value): boolean
  isTruthy(): boolean  // returns false
  toString(): string   // returns "null"
}
```

#### UndefinedValue
```typescript
class UndefinedValue extends Value {
  constructor()
  value: undefined
  equals(other: Value): boolean
  isTruthy(): boolean  // returns false
  toString(): string   // returns "undefined"
}
```

#### ArrayValue
```typescript
class ArrayValue extends Value {
  constructor(value: Value[])
  value: Value[]
  equals(other: Value): boolean
  isTruthy(): boolean  // returns true if non-empty
  toString(): string
}
```

#### ObjectValue
```typescript
class ObjectValue extends Value {
  constructor(value: Map<string, Value>)
  value: Map<string, Value>
  equals(other: Value): boolean
  isTruthy(): boolean  // returns true
  toString(): string
}
```

#### FunctionValue
```typescript
class FunctionValue extends Value {
  constructor(name: string, fn: Function, arity?: number)
  name: string
  arity: number  // parameter count
  equals(other: Value): boolean
  isTruthy(): boolean  // returns true
  toString(): string
}
```

#### ConfidenceValue
```typescript
class ConfidenceValue extends Value {
  constructor(value: Value, confidence: ConfidenceLib)
  value: Value
  confidence: ConfidenceLib
  equals(other: Value): boolean
  isTruthy(): boolean
  toString(): string
}
```

### Confidence System

#### ConfidenceLib
```typescript
class ConfidenceLib {
  constructor(value: number)  // 0.0 to 1.0
  
  readonly value: number
  readonly level: ConfidenceLevel
  
  equals(other: ConfidenceLib): boolean
  min(other: ConfidenceLib): ConfidenceLib
  toString(): string
}
```

#### ConfidenceLevel
```typescript
enum ConfidenceLevel {
  LOW = "low",      // < 0.5
  MEDIUM = "medium", // 0.5 - 0.8
  HIGH = "high"     // >= 0.8
}
```

### Runtime Classes

#### Runtime
```typescript
class Runtime {
  constructor()
  
  async execute(program: Program): Promise<Value>
  registerLLMProvider(name: string, provider: LLMProvider): void
  setDefaultLLMProvider(name: string): void
  getDefaultLLMProvider(): string | undefined
}
```

#### Interpreter
```typescript
class Interpreter {
  constructor()
  
  async interpret(node: ASTNode): Promise<Value>
  registerLLMProvider(name: string, provider: LLMProvider): void
  setDefaultLLMProvider(name: string): void
}
```

#### Environment
```typescript
class Environment {
  constructor(parent?: Environment)
  
  define(name: string, value: Value): void
  get(name: string): Value
  set(name: string, value: Value): void
  getAllVariables(): Map<string, Value>
}
```

### LLM Provider Interface

#### LLMProvider
```typescript
interface LLMProvider {
  readonly name: string
  complete(request: LLMRequest): Promise<LLMResponse>
}
```

#### LLMRequest
```typescript
class LLMRequest {
  constructor(prompt: string)
  
  readonly prompt: string
}
```

#### LLMResponse
```typescript
class LLMResponse {
  constructor(content: string, confidence: ConfidenceLib)
  
  readonly content: string
  readonly confidence: ConfidenceLib
}
```

### Built-in Providers

#### ClaudeProvider
```typescript
class ClaudeProvider implements LLMProvider {
  constructor(apiKey: string)
  name: string = "claude"
  
  async complete(request: LLMRequest): Promise<LLMResponse>
}
```

#### GeminiProvider
```typescript
class GeminiProvider implements LLMProvider {
  constructor(apiKey: string)
  name: string = "gemini"
  
  async complete(request: LLMRequest): Promise<LLMResponse>
}
```

#### MockLLMProvider
```typescript
class MockLLMProvider implements LLMProvider {
  constructor()
  name: string = "mock"
  
  async complete(request: LLMRequest): Promise<LLMResponse>
  stream(request: LLMRequest): LLMStreamingSession
  embed(text: string): Promise<number[]>
  
  setMockResponse(response: string, confidence: number, reasoning?: string): void
  queueResponse(response: { content: string; confidence: number; reasoning?: string }): void
  clearQueue(): void
  setFailureRate(rate: number): void
  setLatency(ms: number): void
  setRandomGenerator(fn: () => number): void
}
```

### Context Management

#### Context
```typescript
class Context {
  constructor(name: string)
  
  readonly name: string
  setVariable(key: string, value: Value): void
  getVariable(key: string): Value | undefined
  getAllVariables(): Map<string, Value>
}
```

#### ContextManager
```typescript
class ContextManager {
  constructor()
  
  registerContext(context: Context): void
  enterContext(name: string): void
  exitContext(): void
  switchContext(name: string): void
  getCurrentContext(): Context | undefined
}
```

### Error Types

#### RuntimeError
```typescript
class RuntimeError extends Error {
  constructor(message: string, node?: ASTNode)
  
  readonly name: string = "RuntimeError"
  readonly node?: ASTNode
}
```

#### ParseError
```typescript
class ParseError extends Error {
  constructor(message: string, token?: Token)
  
  readonly name: string = "ParseError"
  readonly token?: Token
}
```

#### LexError
```typescript
class LexError extends Error {
  constructor(message: string, position: number)
  
  readonly name: string = "LexError"
  readonly position: number
}
```

## AST Nodes

### Expression Nodes

#### LambdaExpression
```typescript
class LambdaExpression extends Expression {
  constructor(parameters: string[], body: Expression, restParameter?: string)
  parameters: string[]
  body: Expression
  restParameter?: string
}
```

#### SpreadElement
```typescript
class SpreadElement extends Expression {
  constructor(argument: Expression)
  argument: Expression
}
```

#### AssignmentExpression
```typescript
class AssignmentExpression extends Expression {
  constructor(identifier: string, value: Expression)
  identifier: string
  value: Expression
}
```

### Statement Nodes

#### ForLoop
```typescript
class ForLoop extends Statement {
  constructor(
    init: Statement | null,
    condition: Expression | null,
    update: Expression | null,
    body: Statement
  )
}
```

#### ForInLoop
```typescript
class ForInLoop extends Statement {
  constructor(
    variable: string,
    index: string | null,  // Optional index variable
    iterable: Expression,
    body: Statement
  )
}
```

#### WhileLoop
```typescript
class WhileLoop extends Statement {
  constructor(
    condition: Expression,
    body: Statement
  )
}
```

#### DoWhileLoop
```typescript
class DoWhileLoop extends Statement {
  constructor(
    body: Statement,
    condition: Expression
  )
}
```

#### BreakStatement
```typescript
class BreakStatement extends Statement {
  constructor()
}
```

#### ContinueStatement
```typescript
class ContinueStatement extends Statement {
  constructor()
}
```

#### UncertainForLoop
```typescript
class UncertainForLoop extends Statement {
  constructor(
    init: Statement | null,
    condition: Expression | null,
    update: Expression | null,
    branches: UncertainBranches
  )
}
```

#### UncertainWhileLoop
```typescript
class UncertainWhileLoop extends Statement {
  constructor(
    condition: Expression,
    branches: UncertainBranches
  )
}
```

#### UncertainBranches
```typescript
interface UncertainBranches {
  high: Statement;
  medium?: Statement;
  low: Statement;
}
```

## Configuration

### Environment Variables

```env
# Required for real LLM integration
GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: Default provider selection
PRISM_DEFAULT_PROVIDER=gemini
```

### LLM Configuration

#### Automatic Configuration
```typescript
import { LLMConfigManager } from './src/llm';

// Create providers from environment
const providers = LLMConfigManager.createFromEnvironment();
const defaultProvider = LLMConfigManager.getDefaultProvider();

// Register with runtime
for (const [name, provider] of Object.entries(providers)) {
  runtime.registerLLMProvider(name, provider);
}
runtime.setDefaultLLMProvider(defaultProvider);
```

#### Manual Configuration
```typescript
import { ClaudeProvider, GeminiProvider } from './src/llm';

// Create providers manually
const claude = new ClaudeProvider('your-api-key');
const gemini = new GeminiProvider('your-api-key');

// Register with runtime
runtime.registerLLMProvider('claude', claude);
runtime.registerLLMProvider('gemini', gemini);
runtime.setDefaultLLMProvider('gemini');
```

## Usage Examples

### Basic Runtime Usage
```typescript
import { createRuntime } from './src/core/runtime';
import { parseProgram } from './src/core/parser';

const runtime = createRuntime();
const source = 'result = 42 ~> 0.85';
const program = parseProgram(source);
const value = await runtime.execute(program);

console.log(value.toString()); // "42 (~85.0%)"
```

### REPL Integration
```typescript
import { PrismREPL } from './src/repl';

const repl = new PrismREPL();

// Configure LLM providers
repl.registerLLMProvider('gemini', new GeminiProvider(apiKey));
repl.setDefaultLLMProvider('gemini');

// Evaluate code
const result = await repl.evaluate('response = llm("Hello!")');
console.log(result.value);
```

### Custom LLM Provider
```typescript
class CustomLLMProvider implements LLMProvider {
  name = "custom";
  
  async complete(request: LLMRequest): Promise<LLMResponse> {
    // Your custom implementation
    const content = await callYourAPI(request.prompt);
    const confidence = new ConfidenceLib(0.8);
    return new LLMResponse(content, confidence);
  }
}
```

This API reference covers all major components and interfaces in Prism-TS. For implementation details and examples, see the source code and test files.
