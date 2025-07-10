# Type Checking Operators in Prism

Prism provides two operators for runtime type checking: `typeof` and `instanceof`. These operators help you write type-safe code and handle different data types appropriately.

## typeof Operator

The `typeof` operator returns a string indicating the type of a value. It's a unary operator that works with all Prism values.

### Syntax
```prism
typeof value
```

### Return Values

- `"number"` - for numeric values
- `"string"` - for string values
- `"boolean"` - for boolean values
- `"array"` - for arrays
- `"object"` - for objects
- `"function"` - for functions/lambdas
- `"null"` - for null values
- `"undefined"` - for undefined values

### Examples

```prism
// Basic types
typeof 42              // "number"
typeof "hello"         // "string"
typeof true            // "boolean"
typeof null            // "null"
typeof undefined       // "undefined"

// Complex types
typeof [1, 2, 3]       // "array"
typeof {a: 1}          // "object"
typeof (x => x + 1)    // "function"

// With variables
x = "test"
typeof x               // "string"

// With expressions
typeof (10 + 20)       // "number"
typeof (x => x * 2)    // "function"
```

### With Confidence Values

When used with confidence values, `typeof` returns the type of the wrapped value:

```prism
typeof (42 ~> 0.8)     // "number"
typeof ("hi" ~> 0.9)   // "string"
```

## instanceof Operator

The `instanceof` operator checks if a value is an instance of a specific type. It's a binary operator that returns a boolean.

### Syntax
```prism
value instanceof typeName
```

### Type Names

The right-hand side should be a string containing one of these type names:
- `"number"`
- `"string"`
- `"boolean"`
- `"array"`
- `"object"`
- `"function"`
- `"null"`
- `"undefined"`

### Examples

```prism
// Basic checks
42 instanceof "number"           // true
"hello" instanceof "string"      // true
[1, 2, 3] instanceof "array"     // true
{a: 1} instanceof "object"       // true

// Negative checks
42 instanceof "string"           // false
[1, 2, 3] instanceof "object"    // false (arrays are distinct from objects)

// With variables
value = "test"
typeName = "string"
value instanceof typeName        // true

// With confidence values
(42 ~> 0.8) instanceof "number"  // true (checks wrapped value)
```

## Type Guards

Use these operators to create type guards in your code:

```prism
// Using typeof for type guards
processValue = value => {
  if (typeof value == "number") {
    value * 2
  } else if (typeof value == "string") {
    value + value
  } else {
    "unknown type"
  }
}

// Using instanceof for type guards
safeDivide = (a, b) => {
  if (a instanceof "number" && b instanceof "number") {
    b != 0 ? a / b : "Cannot divide by zero"
  } else {
    "Both arguments must be numbers"
  }
}

// Conditional type checking
formatValue = value => 
  value instanceof "array" ? "[" + value.join(", ") + "]" :
  value instanceof "object" ? "{object}" :
  value.toString()
```

## Differences Between typeof and instanceof

While both operators check types, they serve slightly different purposes:

- `typeof` returns a string describing the type
- `instanceof` returns a boolean indicating if the value matches the type

```prism
x = 42

// typeof returns the type name
typeStr = typeof x           // "number"

// instanceof checks if it matches
isNumber = x instanceof "number"  // true

// They're consistent
(typeof x == "number") == (x instanceof "number")  // true
```

## Array vs Object Distinction

Note that Prism distinguishes between arrays and objects:

```prism
arr = [1, 2, 3]
obj = {a: 1, b: 2}

typeof arr            // "array"
typeof obj            // "object"

arr instanceof "array"    // true
arr instanceof "object"   // false

obj instanceof "object"   // true
obj instanceof "array"    // false
```

## Use Cases

### Dynamic Type Handling
```prism
// Process different types differently
processData = data => {
  typeof data == "array" ? data.map(x => x * 2) :
  typeof data == "number" ? data * 2 :
  data
}
```

### Input Validation
```prism
// Validate function arguments
add = (a, b) => {
  if (!(a instanceof "number" && b instanceof "number")) {
    "Error: Both arguments must be numbers"
  } else {
    a + b
  }
}
```

### Safe Property Access
```prism
// Check before accessing properties
getLength = value => {
  value instanceof "array" || value instanceof "string" ? value.length :
  value instanceof "object" ? Object.keys(value).length :
  0
}
```

## Best Practices

1. Use `typeof` when you need the type name as a string
2. Use `instanceof` when you need a boolean check
3. Remember that arrays are distinct from objects in Prism
4. Both operators work with confidence values by checking the wrapped value
5. Type checking doesn't affect confidence levels
6. Consider using type guards to make your code more robust