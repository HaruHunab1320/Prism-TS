---
sidebar_position: 1
title: Parser API
---

# Parser API

The Parser API provides a comprehensive parser for the Prism language, transforming source code into an Abstract Syntax Tree (AST) that can be executed by the runtime.

## Overview

The parser handles:
- Tokenization of source code
- Parsing of all Prism language constructs
- Error handling with detailed error messages
- Support for confidence expressions and uncertain control flow
- Pipeline operators and placeholders
- Destructuring patterns with confidence thresholds

## Parser Class

### Constructor

```typescript
class Parser {
  constructor(tokens: Token[], sourceCode?: string)
}
```

**Parameters:**
- `tokens`: Array of tokens from the tokenizer
- `sourceCode`: Optional source code for enhanced error messages

### Methods

#### parse()

```typescript
parse(): Program
```

Parses the tokens into a complete program AST.

**Returns:** A `Program` node containing all parsed statements

**Example:**
```typescript
import { tokenize, Parser } from '@prism-lang/core';

const source = `
  x = 42;
  if (x > 40) {
    console.log("Large number");
  }
`;

const tokens = tokenize(source);
const parser = new Parser(tokens, source);
const ast = parser.parse();
```

## parse() Function

```typescript
export function parse(source: string): Program
```

Convenience function that handles tokenization and parsing in one step.

**Parameters:**
- `source`: The source code string to parse

**Returns:** A `Program` AST node

**Example:**
```typescript
import { parse } from '@prism-lang/core';

const ast = parse('x = 10 ~> 0.9;');
```

## Error Handling

### ParseError

```typescript
class ParseError extends Error {
  constructor(message: string, token: Token, sourceCode?: string)
  token: Token
  sourceCode?: string
}
```

Thrown when the parser encounters invalid syntax.

**Properties:**
- `message`: Detailed error message with location
- `token`: The token where the error occurred
- `sourceCode`: The original source code (if provided)

**Error Format:**
```
ParseError at line 2, column 5: Expected ')' after expression

  2 | if (x > 10
        ^

Found: '{' (LEFT_BRACE)
```

## Supported Language Features

### Expressions

#### Literals
- Numbers: `42`, `3.14`
- Strings: `"hello"`, `'world'`
- Interpolated strings: `` `Hello ${name}` ``
- Booleans: `true`, `false`
- Null: `null` (the `undefined` keyword is treated as an alias of `null`)

#### Operators
- Arithmetic: `+`, `-`, `*`, `/`, `%`, `**`
- Comparison: `>`, `<`, `>=`, `<=`, `==`, `!=`
- Logical: `&&`, `||`, `!`
- Confidence operators: `~>`, `~~`, `~&&`, `~||`
- Pipeline: `|>`, `~|>`, `~?>`
- Nullish coalescing: `??`
- Confidence coalescing: `~??`

#### Complex Expressions
- Arrays: `[1, 2, 3]`, `[...arr, 4]`
- Objects: `{x: 10, y: 20}`, `{...obj, z: 30}`
- Property access: `obj.prop`, `obj?.prop`, `obj~.prop`
- Index access: `arr[0]`
- Function calls: `fn(arg1, arg2)`
- Lambda expressions: `x => x * 2`, `(x, y) => x + y`
- Ternary: `condition ? true : false`
- Placeholders: `_` (for use in pipelines)

### Statements

#### Variable Declaration
```typescript
let x = 42;
let y = "hello" ~> 0.9;  // with confidence
```
Assignments (`x = value`) are parsed as statements too, but require a prior declaration.

#### Compound Assignment
```typescript
x += 5;   // x = x + 5
y *= 2;   // y = y * 2
```

#### Control Flow
```typescript
// Regular if
if (condition) {
  // statements
} else {
  // statements
}

// Uncertain if
uncertain if (condition ~> 0.8) {
  high {
    // high confidence branch
  }
  medium {
    // medium confidence branch
  }
  low {
    // low confidence branch
  }
}
```

#### Loops
```typescript
// C-style for loop
for let i = 0; i < 10; i++ {
  // statements
}

// For-in loop
for item in array {
  // statements
}

// For-in with index
for item, index in array {
  // statements
}

// While loop
while condition {
  // statements
}

// Do-while loop
do {
  // statements
} while condition;

// Uncertain loops
uncertain for let i = 0; i < 10; i++ {
  high { /* high confidence */ }
  low { /* low confidence */ }
}

uncertain while condition {
  high { /* high confidence */ }
  low { /* low confidence */ }
}
```

#### Loop Control
```typescript
break;     // Exit loop
continue;  // Skip to next iteration
```

#### Context Management
```typescript
in context "user_input" {
  // statements
}

in context "analysis" {
  // statements
} shifting to "report" {
  // statements
}
```

#### Agent Declarations
```typescript
agents {
  assistant: {
    confidence: 0.9,
    role: "helpful assistant"
  }
}
```

### Destructuring

#### Array Destructuring
```typescript
let [a, b, c] = array;
let [first, ...rest] = array;
let [a, , c] = array;  // Skip element

// With confidence thresholds
let a = null;
let b = null;
[a, b] ~> 0.8 = array;
let [a ~> 0.9, b ~> 0.7] = array;
```

#### Object Destructuring
```typescript
let {x, y} = point;
let {name: userName, age} = user;
let {a, ...rest} = obj;

// With confidence thresholds
let x = null;
let y = null;
{x, y} ~> 0.8 = point;
let {x ~> 0.9, y ~> 0.7} = point;

// With default values
let {x = 0, y = 0} = point;
```

#### Nested Destructuring
```typescript
let [{x, y}, [a, b]] = data;
let {user: {name, age}} = response;
```

### Pipeline Operations

```typescript
// Regular pipeline
value |> transform(_) |> format(_);

// Confidence pipeline (preserves confidence)
value ~|> transform(_) ~|> format(_);

// Threshold gate
value ~?> 0.8;  // Pass through only if confidence >= 0.8
```

## AST Node Types

The parser generates various AST node types. Each node extends the base `ASTNode` class:

```typescript
abstract class ASTNode {
  abstract type: NodeType;
  location?: { line: number; column: number };
  setLocation(line: number, column: number): this;
}
```

### Common Properties
- `type`: The node type identifier
- `location`: Optional source location information

### Expression Nodes
- `IdentifierExpression`: Variable references
- `NumberLiteral`, `StringLiteral`, `BooleanLiteral`: Literal values
- `InterpolatedString`: Template strings with expressions
- `ArrayLiteral`, `ObjectLiteral`: Collection literals
- `BinaryExpression`: Binary operations
- `UnaryExpression`: Unary operations
- `CallExpression`: Function calls
- `ConfidenceExpression`: Expression with confidence value
- `LambdaExpression`: Arrow functions

### Statement Nodes
- `Program`: Root node containing all statements
- `AssignmentStatement`: Variable assignments
- `IfStatement`, `UncertainIfStatement`: Conditional execution
- `ForLoop`, `ForInLoop`, `WhileLoop`: Loop constructs
- `ContextStatement`: Context management
- `BlockStatement`: Statement blocks
- `ExpressionStatement`: Expression as statement

## Best Practices

1. **Error Recovery**: The parser includes synchronization points to recover from errors and continue parsing

2. **Source Code Tracking**: Always provide source code to the parser for better error messages

3. **Location Information**: AST nodes include location information for debugging and error reporting

4. **Validation**: The parser performs syntactic validation but not semantic validation (that's done by the runtime)

## Example: Custom AST Traversal

```typescript
import { parse, ASTNode, IdentifierExpression } from '@prism-lang/core';

function findIdentifiers(node: ASTNode): string[] {
  const identifiers: string[] = [];
  
  function traverse(n: ASTNode) {
    if (n instanceof IdentifierExpression) {
      identifiers.push(n.name);
    }
    
    // Traverse child nodes based on type
    // (implementation depends on node type)
  }
  
  traverse(node);
  return identifiers;
}

const ast = parse('x = y + z;');
const vars = findIdentifiers(ast);
console.log(vars); // ['x', 'y', 'z']
```
