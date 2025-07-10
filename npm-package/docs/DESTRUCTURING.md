# Destructuring in Prism

Prism supports destructuring assignment for both arrays and objects, making it easy to extract values from complex data structures. Destructuring can be used in variable assignments, function parameters, and with rest elements.

## Array Destructuring

Extract values from arrays into individual variables:

```prism
// Basic array destructuring
[a, b, c] = [1, 2, 3]
// a = 1, b = 2, c = 3

// Skip elements with holes
[first, , third] = [10, 20, 30]
// first = 10, third = 30

// With rest elements
[head, ...tail] = [1, 2, 3, 4, 5]
// head = 1, tail = [2, 3, 4, 5]

// Nested arrays
[a, [b, c]] = [1, [2, 3]]
// a = 1, b = 2, c = 3
```

## Object Destructuring

Extract properties from objects:

```prism
// Basic object destructuring
{name, age} = {name: "Alice", age: 30}
// name = "Alice", age = 30

// Rename properties
{name: userName, age: userAge} = {name: "Bob", age: 25}
// userName = "Bob", userAge = 25

// Default values
{name = "Anonymous", role = "user"} = {name: "Charlie"}
// name = "Charlie", role = "user"

// Rest properties
{a, b, ...rest} = {a: 1, b: 2, c: 3, d: 4}
// a = 1, b = 2, rest = {c: 3, d: 4}

// Nested objects
{user: {name, email}} = {user: {name: "Dave", email: "dave@example.com"}}
// name = "Dave", email = "dave@example.com"
```

## Destructuring in Function Parameters

Use destructuring patterns directly in function parameters:

```prism
// Array parameters
sum = ([a, b]) => a + b
sum([3, 4]) // returns 7

// Object parameters
greet = ({name, age}) => name + " is " + age
greet({name: "Alice", age: 30}) // returns "Alice is 30"

// With default values
createUser = ({name, email, role = "user"}) => {
  name + " (" + email + ") - " + role
}
createUser({name: "Test", email: "test@example.com"})
// returns "Test (test@example.com) - user"

// Mixed parameters
process = (multiplier, [a, b], {add}) => (a + b) * multiplier + add
process(2, [3, 4], {add: 10}) // returns 24

// Rest parameters with destructuring
firstAndRest = (first, ...[second, third]) => first + second + third
firstAndRest(1, 2, 3) // returns 6
```

## Common Patterns

### Variable Swapping
```prism
a = 10
b = 20
[a, b] = [b, a]
// Now a = 20, b = 10
```

### Function Return Values
```prism
getCoords = () => [100, 200]
[x, y] = getCoords()
// x = 100, y = 200
```

### Options Objects
```prism
configure = ({host = "localhost", port = 3000, ssl = false}) => {
  // Use configuration options
}
configure({port: 8080})
```

### Array Methods
```prism
users = [{name: "Alice"}, {name: "Bob"}, {name: "Charlie"}]
[firstUser, ...otherUsers] = users
{name} = firstUser
// name = "Alice", otherUsers = [{name: "Bob"}, {name: "Charlie"}]
```

## With Confidence Values

Destructuring works seamlessly with confidence values:

```prism
// Array with confident values
[x, y] = [10 ~> 0.9, 20 ~> 0.8]
// x and y maintain their confidence levels

// Object with confident values
data = {value: 100 ~> 0.85, status: "active"}
{value, status} = data
// value maintains its 85% confidence
```

## Error Handling

Destructuring will throw errors when:
- Trying to destructure non-array values with array patterns
- Trying to destructure non-object values with object patterns

```prism
// These will throw errors:
[a, b] = 123 // Error: Cannot destructure non-array value
{x, y} = "string" // Error: Cannot destructure non-object value
```

## Best Practices

1. Use destructuring to make code more readable when working with complex data structures
2. Provide default values when properties might be missing
3. Use rest elements to collect remaining values
4. Combine destructuring with function parameters for cleaner APIs
5. Remember that destructuring creates new bindings, not references