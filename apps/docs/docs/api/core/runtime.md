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
import { parse, Interpreter } from '@prism/core';

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
import { MockLLMProvider } from '@prism/llm';

const interpreter = new Interpreter();
const mockProvider = new MockLLMProvider();

interpreter.registerLLMProvider('mock', mockProvider);
interpreter.setDefaultLLMProvider('mock');
```

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
llm(prompt: string): Promise<ConfidenceValue<string>>
```

Calls the configured LLM provider.

**Parameters:**
- `prompt`: The prompt string

**Returns:** Confident string response

**Example:**
```prism
response = llm("What is 2+2?");
// Returns: "4" ~> 0.95
```

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
import { Interpreter, FunctionValue, NumberValue, Value } from '@prism/core';

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