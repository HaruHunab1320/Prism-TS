---
sidebar_position: 2
title: Runtime API
---

# Runtime API

The Runtime API provides the execution engine for Prism programs, handling AST interpretation, value management, confidence tracking, and context management.

## Overview

The runtime system includes:
- AST interpretation and execution
- Value types with confidence tracking
- Environment management for variable scoping
- Context management for uncertainty handling
- Built-in functions and LLM integration
- Error handling with detailed error messages

## Interpreter Class

### Constructor

```typescript
class Interpreter {
  constructor()
}
```

Creates a new interpreter instance with an empty environment and context manager.

### Methods

#### interpret()

```typescript
async interpret(node: ASTNode): Promise<Value>
```

Interprets an AST node and returns the resulting value.

**Parameters:**
- `node`: The AST node to interpret

**Returns:** A Promise resolving to the execution result

**Example:**
```typescript
import { parse, Interpreter } from '@prism-lang/core';

const interpreter = new Interpreter();
const ast = parse('x = 10; y = x * 2;');
const result = await interpreter.interpret(ast);
console.log(result.toString()); // "20"
```

#### registerLLMProvider()

```typescript
registerLLMProvider(name: string, provider: LLMProvider): void
```

Registers an LLM provider for use in `llm()` function calls.

**Parameters:**
- `name`: Unique identifier for the provider
- `provider`: LLMProvider implementation

#### setDefaultLLMProvider()

```typescript
setDefaultLLMProvider(name: string): void
```

Sets the default LLM provider for `llm()` calls.

**Parameters:**
- `name`: Name of a registered provider

**Example:**
```typescript
import { MockLLMProvider } from '@prism-lang/llm';

const interpreter = new Interpreter();
const mockProvider = new MockLLMProvider();

interpreter.registerLLMProvider('mock', mockProvider);
interpreter.setDefaultLLMProvider('mock');
```

## Runtime Class

While the `Interpreter` gives you low-level control, most applications use the higher-level `Runtime`, which wires an interpreter together with the module system, built-ins, and helpers for cache management.

### createRuntime

```typescript
function createRuntime(options?: RuntimeOptions): Runtime
```

Creates a fully configured runtime.

- `options.moduleSystem` (optional): Provide a preconfigured `ModuleSystem` (custom file readers, virtual files, etc.). When omitted, a new one is created automatically.

```typescript
interface RuntimeOptions {
  moduleSystem?: ModuleSystem;
}
```

### Runtime Methods

#### execute()

```typescript
await runtime.execute(ast: Program): Promise<Value>
```

Runs a parsed program.

#### registerLLMProvider() / setDefaultLLMProvider()

Proxy to the interpreter helpers; register or select an LLM provider shared across all modules.

#### getModuleSystem()

```typescript
const moduleSystem = runtime.getModuleSystem();
```

Returns the `ModuleSystem` instance backing the runtime. Useful if you need direct access for advanced tooling.

#### invalidateModule()

```typescript
runtime.invalidateModule('/path/to/module.prism', {
  invalidateDependents: true // default
});
```

Drops a module (and, by default, all modules that depend on it) from the cache. The next `import` will re-execute it.

#### reloadModule()

```typescript
const module = await runtime.reloadModule('/shared/state.prism');
```

Convenience helper that invalidates and immediately reloads a module, returning the updated `Module` descriptor (exports, dependency graph, etc.). Dependents are automatically invalidated so subsequent imports see the new exports.

**Example: hot reload loop**

```typescript
import { createRuntime } from '@prism-lang/core';

const runtime = createRuntime();
await runtime.getModuleSystem().loadModule('/app/main.prism', runtime);

// when a file changes:
await runtime.reloadModule('/app/theme.prism');
```

This reuses the same interpreter, so existing globals, registered LLM providers, and environments remain intact between reloads.

> The `prism run --watch` command uses this helper internally to refresh the edited module and all dependents without restarting the CLI.

#### streamLLM()

```typescript
const stream = runtime.streamLLM("Draft today's update", {
  provider: 'claude',
  structuredOutput: false,
  temperature: 0.3,
});

for await (const chunk of stream.chunks) {
  if (chunk.type === 'text' && chunk.content) {
    process.stdout.write(chunk.content);
  }
}

const final = await stream.response;
console.log(`\nConfidence: ${(final.confidence * 100).toFixed(1)}%`);
```

Returns a `RuntimeLLMStream` with:

- `chunks`: `AsyncIterable<LLMStreamChunk>` of text/metadata events
- `response`: Promise resolving to the final `LLMResponse`
- `cancel(reason?)`: stop streaming (best-effort for providers without native streaming)

If a provider does not implement streaming, Prism falls back to a single chunk once the request finishes. Providers that rely on structured responses should set `structuredOutput: false` when streaming plain text.

## Value Types

All runtime values extend the abstract `Value` class:

```typescript
abstract class Value {
  abstract type: string;
  abstract value: unknown;
  abstract equals(other: Value): boolean;
  abstract isTruthy(): boolean;
  abstract toString(): string;
}
```

### NumberValue

```typescript
class NumberValue extends Value {
  constructor(value: number)
  type: 'number'
  value: number
}
```

Represents numeric values.

**Truthy:** When not zero

### StringValue

```typescript
class StringValue extends Value {
  constructor(value: string)
  type: 'string'
  value: string
}
```

Represents string values.

**Truthy:** When not empty

### BooleanValue

```typescript
class BooleanValue extends Value {
  constructor(value: boolean)
  type: 'boolean'
  value: boolean
}
```

Represents boolean values.

**Truthy:** When true

### NullValue

```typescript
class NullValue extends Value {
  constructor()
  type: 'null'
  value: null
}
```

Represents null values.

**Truthy:** Always false

### UndefinedValue

```typescript
class UndefinedValue extends Value {
  constructor()
  type: 'undefined'
  value: undefined
}
```

Represents undefined values.

**Truthy:** Always false

### ArrayValue

```typescript
class ArrayValue extends Value {
  constructor(elements: Value[])
  type: 'array'
  value: Value[]
  elements: Value[]
}
```

Represents array values.

**Truthy:** Always true

**Example:**
```typescript
const arr = new ArrayValue([
  new NumberValue(1),
  new StringValue("hello")
]);
```

### ObjectValue

```typescript
class ObjectValue extends Value {
  constructor(properties: Map<string, Value>)
  type: 'object'
  value: Map<string, Value>
  properties: Map<string, Value>
}
```

Represents object values with string keys.

**Truthy:** Always true

**Example:**
```typescript
const obj = new ObjectValue(new Map([
  ['name', new StringValue('Alice')],
  ['age', new NumberValue(30)]
]));
```

### FunctionValue

```typescript
class FunctionValue extends Value {
  constructor(
    name: string,
    value: (args: Value[]) => Promise<Value>,
    arity?: number
  )
  type: 'function'
  name: string
  value: (args: Value[]) => Promise<Value>
  arity?: number
}
```

Represents function values, including built-ins and lambdas.

**Truthy:** Always true

### ConfidenceValue

```typescript
class ConfidenceValue extends Value {
  constructor(
    value: Value,
    confidence: ConfidenceLib
  )
  type: 'confident'
  value: Value
  confidence: ConfidenceLib
}
```

Wraps any value with a confidence score.

**Truthy:** Based on wrapped value

**Example:**
```typescript
const confident = new ConfidenceValue(
  new StringValue("prediction"),
  new ConfidenceLib(0.85)
);
console.log(confident.toString()); // "prediction (~0.85)"
```

## Environment Management

### Environment Class

```typescript
class Environment {
  constructor(parent?: Environment)
  define(name: string, value: Value): void
  get(name: string): Value
  set(name: string, value: Value): void
  getAllVariables(): Map<string, Value>
}
```

Manages variable scoping with lexical parent chaining.

**Methods:**
- `define()`: Creates a new variable in current scope
- `get()`: Retrieves variable value (searches parent scopes)
- `set()`: Updates existing variable (searches parent scopes)
- `getAllVariables()`: Returns all variables in current scope

**Example:**
```typescript
const global = new Environment();
global.define('x', new NumberValue(10));

const local = new Environment(global);
local.define('y', new NumberValue(20));

console.log(local.get('x')); // NumberValue(10) - from parent
console.log(local.get('y')); // NumberValue(20) - from local
```

## Error Handling

### RuntimeError

```typescript
class RuntimeError extends Error {
  constructor(
    message: string,
    node?: ASTNode,
    location?: { line: number; column: number }
  )
  line?: number
  column?: number
  node?: ASTNode
}
```

Thrown during runtime execution errors.

**Example:**
```typescript
try {
  await interpreter.interpret(ast);
} catch (error) {
  if (error instanceof RuntimeError) {
    console.error(`Runtime error at line ${error.line}: ${error.message}`);
  }
}
```

### LoopControlError

```typescript
class LoopControlError extends Error {
  constructor(type: 'break' | 'continue')
  type: 'break' | 'continue'
}
```

Internal error used for loop control flow (break/continue).

## Built-in Functions

The interpreter provides several built-in functions:

### llm()

```typescript
llm(prompt: string, options?: LLMCallOptions): Promise<ConfidenceValue<string>>
```

Calls an LLM provider using the current runtime configuration.

**Parameters:**
- `prompt`: The prompt string
- `options`: Optional object to override provider behavior

```typescript
interface LLMCallOptions {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  timeout?: number;
  structuredOutput?: boolean;
  includeReasoning?: boolean;
  confidenceExtractor?: (responseText: string) => Promise<{ value: number }>;
  extractor?: (response: {
    content: string;
    confidence: number;
    model: string;
    tokensUsed: number;
    provider: string;
    prompt: string;
    options: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) => number | ConfidenceValue<any>;
}
```

`confidenceExtractor` is forwarded to the provider implementation (e.g. `@prism-lang/llm`) so it can derive a confidence score when structured output isn't available. `extractor` receives an object with `{ content, confidence, model, tokensUsed, provider, prompt, options, metadata }` and lets you override the returned confidence by returning a number or confident value.

**Returns:** Confident string response using either the provider-reported confidence or the extractor override.

**Example:**
```prism
response = llm("What is 2+2?");
// => "4" (~95%)

custom = llm("Summarize this doc", {
  provider: "claude",
  model: "claude-3-sonnet",
  temperature: 0.2,
  extractor: info => info.confidence * 0.8
});
```

### stream_llm()

```prism
handle = stream_llm("Draft a summary", { structuredOutput: false })

chunk = await handle.next()
while (chunk) {
  console.log(chunk.text)
  chunk = await handle.next()
}

final = await handle.result()
```

Returns a stream handle containing:
- `next(): Promise<Chunk | null>` – resolves to the next `LLMStreamChunk` with fields such as `type`, `text`, `reasoning`, `error`.
- `result(): Promise<ConfidenceValue<string>>` – resolves to the final confident string (extractor rules apply).
- `cancel(): void` – aborts the stream.

If the provider doesn’t support streaming, Prism buffers the response and returns it as a single chunk once complete.

### Array Functions

#### map()

```typescript
map(array: Array, fn: Function): Array
```

Transforms array elements.

**Example:**
```prism
numbers = [1, 2, 3];
doubled = map(numbers, x => x * 2);
// Returns: [2, 4, 6]
```

#### filter()

```typescript
filter(array: Array, predicate: Function): Array
```

Filters array elements.

**Example:**
```prism
numbers = [1, 2, 3, 4, 5];
evens = filter(numbers, x => x % 2 == 0);
// Returns: [2, 4]
```

#### reduce()

```typescript
reduce(array: Array, reducer: Function, initial?: any): any
```

Reduces array to single value.

**Example:**
```prism
numbers = [1, 2, 3, 4];
sum = reduce(numbers, (acc, x) => acc + x, 0);
// Returns: 10
```

### Math Functions

#### max()

```typescript
max(...values: number[]): number
```

Returns maximum value.

**Example:**
```prism
largest = max(10, 5, 20, 15);
// Returns: 20
```

#### min()

```typescript
min(...values: number[]): number
```

Returns minimum value.

**Example:**
```prism
smallest = min(10, 5, 20, 15);
// Returns: 5
```

### Async Functions

#### delay()

```typescript
delay(milliseconds: number): Promise<void>
```

Pauses execution for the specified number of milliseconds. Returns a promise that resolves after the delay.

**Example:**
```prism
async function slowOperation() {
  console.log("Starting...")
  await delay(2000)  // Wait 2 seconds
  console.log("Done!")
}

// Retry with exponential backoff
async function retryWithBackoff(operation, maxRetries) {
  for i = 0; i < maxRetries; i++ {
    try {
      return await operation()
    } catch (e) {
      await delay(1000 * (2 ** i))  // 1s, 2s, 4s...
    }
  }
}
```

#### sleep()

```typescript
sleep(milliseconds: number): Promise<void>
```

Alias for `delay()`. Pauses execution for the specified duration.

**Example:**
```prism
await sleep(500)  // Same as await delay(500)
```

#### debounce()

```typescript
debounce(waitMs: number): Function
```

Creates a debounced wrapper that delays invoking a function until after `waitMs` milliseconds have elapsed since the last call. Useful for rate-limiting user input handlers.

**Example:**
```prism
// Create a debounced search function
searchDebouncer = debounce(300)

// In event handler
onSearchInput = (query) => {
  searchDebouncer(() => {
    results = performSearch(query)
    updateUI(results)
  })
}

// Only executes 300ms after the user stops typing
```

### Collection Functions

#### sortBy()

```typescript
sortBy(key: string, direction?: "asc" | "desc"): Function
```

Creates a function that sorts an array of objects by the specified key. Returns a higher-order function for use in pipelines.

**Parameters:**
- `key`: The property name to sort by
- `direction`: Sort direction - `"asc"` (default) or `"desc"`

**Example:**
```prism
users = [
  {name: "Alice", score: 85},
  {name: "Bob", score: 92},
  {name: "Charlie", score: 78}
]

// Create sorter functions
byScoreDesc = sortBy("score", "desc")
byName = sortBy("name")

// Apply sorting
rankedUsers = byScoreDesc(users)
// [{name: "Bob", score: 92}, {name: "Alice", score: 85}, {name: "Charlie", score: 78}]

alphabetical = byName(users)
// [{name: "Alice", ...}, {name: "Bob", ...}, {name: "Charlie", ...}]

// Use in pipeline
result = users |> sortBy("score", "desc")(_) |> map(u => u.name)
// ["Bob", "Alice", "Charlie"]
```

#### groupBy()

```typescript
groupBy(key: string | Function): Function
```

Creates a function that groups an array of objects by the specified key or function. Returns an object with keys for each group.

**Parameters:**
- `key`: Property name to group by, or a function that returns the group key

**Example:**
```prism
items = [
  {name: "Apple", category: "fruit", price: 1.5},
  {name: "Banana", category: "fruit", price: 0.5},
  {name: "Carrot", category: "vegetable", price: 0.8},
  {name: "Broccoli", category: "vegetable", price: 1.2}
]

// Group by property
byCategory = groupBy("category")
grouped = byCategory(items)
// {
//   fruit: [{name: "Apple", ...}, {name: "Banana", ...}],
//   vegetable: [{name: "Carrot", ...}, {name: "Broccoli", ...}]
// }

// Group by computed value
byPriceRange = groupBy(item => item.price > 1 ? "expensive" : "cheap")
priceGrouped = byPriceRange(items)
// {
//   expensive: [{name: "Apple", ...}, {name: "Broccoli", ...}],
//   cheap: [{name: "Banana", ...}, {name: "Carrot", ...}]
// }

// Use in pipeline
result = items |> groupBy("category")(_)
```

### Confidence Functions

#### confidence()

```typescript
confidence(threshold: number): Function
```

Creates a function that wraps another function's return value with the specified confidence level. Useful for creating confidence-aware processing pipelines.

**Parameters:**
- `threshold`: Confidence value between 0 and 1 to attach to results

**Example:**
```prism
// Wrap a function to add confidence to its output
highConfidence = confidence(0.95)
mediumConfidence = confidence(0.7)

processWithConfidence = highConfidence(data => data * 2)
result = processWithConfidence(10)
// 20 ~> 0.95

// Create calibrated processors
sensorProcessor = confidence(0.85)
userInputProcessor = confidence(0.6)

sensorReading = sensorProcessor(() => readSensor())
userValue = userInputProcessor(() => getUserInput())
```

#### threshold()

```typescript
threshold(minConfidence: number): Function
```

Creates a filter function that only passes values meeting the minimum confidence threshold. Values below the threshold are filtered out.

**Parameters:**
- `minConfidence`: Minimum confidence value (0-1) required to pass

**Example:**
```prism
// Filter data by confidence level
highConfidenceOnly = threshold(0.9)
moderateConfidence = threshold(0.5)

data = [
  10 ~> 0.95,
  20 ~> 0.7,
  30 ~> 0.92,
  40 ~> 0.4
]

reliable = highConfidenceOnly(data)
// [10 ~> 0.95, 30 ~> 0.92]

usable = moderateConfidence(data)
// [10 ~> 0.95, 20 ~> 0.7, 30 ~> 0.92]

// Use in pipeline for confident decision making
result = predictions
  |> threshold(0.8)(_)
  |> map(p => p.recommendation)
  |> first
```

## Execution Features

### Confidence Propagation

Confidence values are propagated through operations:

```prism
x = 10 ~> 0.9;
y = 20 ~> 0.8;
z = x + y;  // Result has confidence based on inputs
```

### Context Management

The runtime maintains execution contexts for uncertainty handling:

```prism
in context "analysis" {
  // Code executes in analysis context
  result = processData(input);
}
```

### Loop Control

Supports break and continue statements:

```prism
for i = 0; i < 10; i++ {
  if (i == 5) {
    break;  // Exit loop
  }
  if (i % 2 == 0) {
    continue;  // Skip even numbers
  }
  // Process odd numbers
}
```

### Destructuring Assignment

Supports array and object destructuring with confidence:

```prism
// Array destructuring
[a, b, c] = [1, 2, 3];
[x, ...rest] = array;

// Object destructuring
{name, age} = person;
{x: coordX, y: coordY} = point;

// With confidence thresholds
[a, b] ~> 0.8 = uncertainArray;
```

## Performance Considerations

1. **Async Execution**: All operations are async to support LLM calls
2. **Environment Lookup**: Variable lookup is O(depth) where depth is scope nesting
3. **Confidence Tracking**: Adds minimal overhead to operations
4. **Memory Management**: Values are garbage collected when out of scope

## Example: Custom Function Registration

```typescript
import { Interpreter, FunctionValue, NumberValue, Value } from '@prism-lang/core';

const interpreter = new Interpreter();

// Add custom sqrt function
interpreter.environment.define('sqrt', new FunctionValue(
  'sqrt',
  async (args: Value[]) => {
    if (args.length !== 1) {
      throw new RuntimeError('sqrt() requires exactly one argument');
    }
    
    const arg = args[0];
    if (!(arg instanceof NumberValue)) {
      throw new RuntimeError('sqrt() requires a number');
    }
    
    return new NumberValue(Math.sqrt(arg.value));
  },
  1 // arity
));

// Use the custom function
const result = await interpreter.interpret(parse('sqrt(16)'));
console.log(result.toString()); // "4"
```
