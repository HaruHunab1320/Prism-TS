---
sidebar_position: 4
title: Values API
---

# Values API

The Values API defines the runtime value system used by the Prism interpreter, including all value types, confidence tracking, and value operations.

## Overview

The value system provides:
- Type-safe runtime values
- Confidence metadata support
- Value equality and truthiness
- String representations
- Automatic confidence propagation

## Base Value Class

```typescript
export abstract class Value {
  abstract type: string;
  abstract value: unknown;
  abstract equals(other: Value): boolean;
  abstract isTruthy(): boolean;
  abstract toString(): string;
}
```

All runtime values extend this abstract base class.

### Methods

#### equals()

```typescript
equals(other: Value): boolean
```

Compares two values for equality. Each value type implements its own equality logic.

#### isTruthy()

```typescript
isTruthy(): boolean
```

Determines if a value is truthy for conditional expressions.

#### toString()

```typescript
toString(): string
```

Returns a string representation of the value.

## Primitive Value Types

### NumberValue

```typescript
class NumberValue extends Value {
  type = 'number';
  constructor(public value: number)
}
```

**Properties:**
- `value`: The numeric value

**Equality:** Strict numeric equality
**Truthy:** When not zero
**String:** Standard number formatting

**Example:**
```typescript
const num = new NumberValue(42);
console.log(num.toString()); // "42"
console.log(num.isTruthy()); // true

const zero = new NumberValue(0);
console.log(zero.isTruthy()); // false
```

### StringValue

```typescript
class StringValue extends Value {
  type = 'string';
  constructor(public value: string)
}
```

**Properties:**
- `value`: The string value

**Equality:** String content equality
**Truthy:** When not empty
**String:** The string itself

**Example:**
```typescript
const str = new StringValue("hello");
console.log(str.toString()); // "hello"
console.log(str.isTruthy()); // true

const empty = new StringValue("");
console.log(empty.isTruthy()); // false
```

### BooleanValue

```typescript
class BooleanValue extends Value {
  type = 'boolean';
  constructor(public value: boolean)
}
```

**Properties:**
- `value`: The boolean value

**Equality:** Boolean value equality
**Truthy:** The boolean value itself
**String:** "true" or "false"

**Example:**
```typescript
const bool = new BooleanValue(true);
console.log(bool.toString()); // "true"
console.log(bool.isTruthy()); // true
```

### NullValue

```typescript
class NullValue extends Value {
  type = 'null';
  value = null;
  constructor()
}
```

**Equality:** Only equal to other null values
**Truthy:** Always false
**String:** "null"

**Example:**
```typescript
const nullVal = new NullValue();
console.log(nullVal.toString()); // "null"
console.log(nullVal.isTruthy()); // false
```

## Collection Value Types

### ArrayValue

```typescript
class ArrayValue extends Value {
  type = 'array';
  value: Value[];
  constructor(public elements: Value[])
}
```

**Properties:**
- `elements`: Array of Value objects
- `value`: Same as elements (for compatibility)

**Equality:** Element-wise equality comparison
**Truthy:** Always true
**String:** "[element1, element2, ...]"

**Example:**
```typescript
const arr = new ArrayValue([
  new NumberValue(1),
  new StringValue("two"),
  new BooleanValue(true)
]);
console.log(arr.toString()); // "[1, two, true]"
console.log(arr.elements.length); // 3
```

### ObjectValue

```typescript
class ObjectValue extends Value {
  type = 'object';
  value: Map<string, Value>;
  constructor(public properties: Map<string, Value>)
}
```

**Properties:**
- `properties`: Map of property names to values
- `value`: Same as properties (for compatibility)

**Equality:** All properties must match
**Truthy:** Always true
**String:** `"{ key1: value1, key2: value2, ... }"`

**Example:**
```typescript
const obj = new ObjectValue(new Map([
  ['name', new StringValue('Alice')],
  ['age', new NumberValue(30)],
  ['active', new BooleanValue(true)]
]));
console.log(obj.toString()); // "{ name: Alice, age: 30, active: true }"

// Access property
const name = obj.properties.get('name');
console.log(name?.toString()); // "Alice"
```

## Function Value Type

### FunctionValue

```typescript
class FunctionValue extends Value {
  type = 'function';
  constructor(
    public name: string,
    public value: (args: Value[]) => Promise<Value>,
    public arity?: number
  )
}
```

**Properties:**
- `name`: Function name for display
- `value`: The async function implementation
- `arity`: Optional parameter count

**Equality:** Name equality (same function)
**Truthy:** Always true
**String:** "[Function: name]"

**Example:**
```typescript
const add = new FunctionValue(
  'add',
  async (args: Value[]) => {
    if (args.length !== 2) {
      throw new Error('add requires 2 arguments');
    }
    const a = args[0] as NumberValue;
    const b = args[1] as NumberValue;
    return new NumberValue(a.value + b.value);
  },
  2 // arity
);

console.log(add.toString()); // "[Function: add]"

// Call the function
const result = await add.value([
  new NumberValue(5),
  new NumberValue(3)
]);
console.log(result.toString()); // "8"
```

## Confidence Value Type

### ConfidenceValue

```typescript
class ConfidenceValue extends Value {
  type = 'confident';
  constructor(
    public value: Value,
    public confidence: ConfidenceLib
  )
}
```

**Properties:**
- `value`: The wrapped value
- `confidence`: Confidence score (0-1)

**Equality:** Both value and confidence must match
**Truthy:** Based on wrapped value
**String:** "value (~confidence)"

**Example:**
```typescript
import { ConfidenceLib } from '@prism-lang/core';

const confidentStr = new ConfidenceValue(
  new StringValue("prediction"),
  new ConfidenceLib(0.85)
);

console.log(confidentStr.toString()); // "prediction (~0.85)"
console.log(confidentStr.isTruthy()); // true (non-empty string)

// Access wrapped value
const innerValue = confidentStr.value as StringValue;
console.log(innerValue.value); // "prediction"

// Access confidence
console.log(confidentStr.confidence.value); // 0.85
```

## Value Operations

### Type Checking

```typescript
// Check value type
if (value instanceof NumberValue) {
  console.log(value.value); // Safe to access number
}

// Check for confidence
if (value instanceof ConfidenceValue) {
  const confidence = value.confidence;
  const inner = value.value;
}

// Type property check
if (value.type === 'array') {
  // value is ArrayValue
}
```

### Value Creation Helpers

```typescript
// Create values from JavaScript types
function fromJS(value: any): Value {
  if (typeof value === 'number') {
    return new NumberValue(value);
  } else if (typeof value === 'string') {
    return new StringValue(value);
  } else if (typeof value === 'boolean') {
    return new BooleanValue(value);
  } else if (value === null) {
    return new NullValue();
  } else if (value === undefined) {
    return new NullValue();
  } else if (Array.isArray(value)) {
    return new ArrayValue(value.map(fromJS));
  } else if (typeof value === 'object') {
    const props = new Map<string, Value>();
    for (const [k, v] of Object.entries(value)) {
      props.set(k, fromJS(v));
    }
    return new ObjectValue(props);
  }
  throw new Error(`Cannot convert value: ${value}`);
}
```

### Extracting JavaScript Values

```typescript
// Extract JavaScript value
function toJS(value: Value): any {
  if (value instanceof ConfidenceValue) {
    return toJS(value.value);
  }
  
  switch (value.type) {
    case 'number':
      return (value as NumberValue).value;
    case 'string':
      return (value as StringValue).value;
    case 'boolean':
      return (value as BooleanValue).value;
    case 'null':
      return null;
    case 'array':
      return (value as ArrayValue).elements.map(toJS);
    case 'object':
      const obj: any = {};
      for (const [k, v] of (value as ObjectValue).properties) {
        obj[k] = toJS(v);
      }
      return obj;
    default:
      return value.toString();
  }
}
```

## Confidence Propagation

When operations involve confident values, confidence is propagated:

```typescript
// Example: Adding confident numbers
const a = new ConfidenceValue(new NumberValue(10), new ConfidenceLib(0.9));
const b = new ConfidenceValue(new NumberValue(20), new ConfidenceLib(0.8));

// Result will have combined confidence (e.g., min of inputs)
const result = add(a, b); // 30 with confidence ~0.8
```

## Memory Considerations

1. **Value Sharing**: Values are immutable and can be safely shared
2. **Garbage Collection**: Values are GC'd when no longer referenced
3. **Circular References**: Avoid circular references in objects/arrays
4. **Large Collections**: Be mindful of memory with large arrays/objects

## Best Practices

1. **Type Safety**: Always check value types before casting
2. **Confidence Handling**: Preserve confidence through operations
3. **Error Messages**: Include value type in error messages
4. **Immutability**: Treat values as immutable
5. **Equality**: Use `.equals()` for value comparison

## Example: Custom Value Type

```typescript
// Create a custom date value type
class DateValue extends Value {
  type = 'date';
  
  constructor(public value: Date) {
    super();
  }
  
  equals(other: Value): boolean {
    return other instanceof DateValue && 
           other.value.getTime() === this.value.getTime();
  }
  
  isTruthy(): boolean {
    return true;
  }
  
  toString(): string {
    return this.value.toISOString();
  }
}

// Usage
const date = new DateValue(new Date('2024-01-01'));
console.log(date.toString()); // "2024-01-01T00:00:00.000Z"
```
