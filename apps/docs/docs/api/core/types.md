---
sidebar_position: 3
title: Types API
---

# Types API

The Types API defines the type system used throughout Prism, including AST node types, token types, and operator types.

## Overview

Prism uses a structural type system with:
- AST node types for representing parsed code
- Token types for lexical analysis
- Operator types for expressions
- Runtime value types (covered in Runtime API)

## AST Node Types

### NodeType Enum

```typescript
export type NodeType = 
  | 'Program'
  | 'IdentifierExpression'
  | 'NumberLiteral'
  | 'StringLiteral'
  | 'InterpolatedString'
  | 'BooleanLiteral'
  | 'NullLiteral'
  | 'ArrayLiteral'
  | 'ObjectLiteral'
  | 'PropertyAccess'
  | 'OptionalChainAccess'
  | 'IndexAccess'
  | 'ConfidenceExpression'
  | 'BinaryExpression'
  | 'UnaryExpression'
  | 'CallExpression'
  | 'TernaryExpression'
  | 'LambdaExpression'
  | 'SpreadElement'
  | 'PlaceholderExpression'
  | 'AssignmentExpression'
  | 'BlockStatement'
  | 'IfStatement'
  | 'UncertainIfStatement'
  | 'ContextStatement'
  | 'AgentDeclaration'
  | 'AssignmentStatement'
  | 'ExpressionStatement'
  | 'ForLoop'
  | 'ForInLoop'
  | 'WhileLoop'
  | 'DoWhileLoop'
  | 'BreakStatement'
  | 'ContinueStatement'
  | 'UncertainForLoop'
  | 'UncertainWhileLoop'
  | 'ArrayPattern'
  | 'ObjectPattern'
  | 'RestElement'
  | 'DestructuringAssignment';
```

### Base AST Classes

#### ASTNode

```typescript
abstract class ASTNode {
  abstract type: NodeType;
  location?: { line: number; column: number };
  setLocation(line: number, column: number): this;
}
```

Base class for all AST nodes.

#### Expression

```typescript
abstract class Expression extends ASTNode {}
```

Base class for all expression nodes.

#### Statement

```typescript
abstract class Statement extends ASTNode {}
```

Base class for all statement nodes.

## Token Types

### TokenType Enum

```typescript
export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  INTERPOLATED_STRING = 'INTERPOLATED_STRING',
  IDENTIFIER = 'IDENTIFIER',

  // Keywords
  IF = 'IF',
  ELSE = 'ELSE',
  UNCERTAIN = 'UNCERTAIN',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  IN = 'IN',
  CONTEXT = 'CONTEXT',
  SHIFTING = 'SHIFTING',
  TO = 'TO',
  AGENTS = 'AGENTS',
  AGENT = 'AGENT',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  NULL = 'NULL',
  UNDEFINED = 'UNDEFINED',
  FOR = 'FOR',
  WHILE = 'WHILE',
  DO = 'DO',
  BREAK = 'BREAK',
  CONTINUE = 'CONTINUE',
  TYPEOF = 'TYPEOF',
  INSTANCEOF = 'INSTANCEOF',

  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  STAR_STAR = 'STAR_STAR',
  SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  EQUAL = 'EQUAL',
  EQUAL_EQUAL = 'EQUAL_EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  // ... (see full list below)

  // Delimiters
  LEFT_PAREN = 'LEFT_PAREN',
  RIGHT_PAREN = 'RIGHT_PAREN',
  LEFT_BRACE = 'LEFT_BRACE',
  RIGHT_BRACE = 'RIGHT_BRACE',
  LEFT_BRACKET = 'LEFT_BRACKET',
  RIGHT_BRACKET = 'RIGHT_BRACKET',
  COMMA = 'COMMA',
  DOT = 'DOT',
  COLON = 'COLON',
  SEMICOLON = 'SEMICOLON',
  QUESTION = 'QUESTION',
  QUESTION_QUESTION = 'QUESTION_QUESTION',

  // Special
  ARROW = 'ARROW',
  SPREAD = 'SPREAD',
  PIPELINE = 'PIPELINE',
  CONFIDENCE_PIPELINE = 'CONFIDENCE_PIPELINE',
  CONFIDENCE_THRESHOLD_GATE = 'CONFIDENCE_THRESHOLD_GATE',
  PLACEHOLDER = 'PLACEHOLDER',
  EOF = 'EOF'
}
```

### Token Interface

```typescript
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}
```

Represents a lexical token with location information.

## Operator Types

### BinaryOperator

```typescript
export type BinaryOperator = 
  // Arithmetic
  | '+' | '-' | '*' | '/' | '%' | '**'
  // Comparison
  | '>' | '<' | '>=' | '<=' | '==' | '!='
  // Logical
  | '&&' | '||' | '??'
  // Confidence operators
  | '~>' | '~~' | '~&&' | '~||' | '~??'
  | '~+' | '~-' | '~*' | '~/' 
  | '~==' | '~!=' | '~>' | '~<' | '~>=' | '~<='
  | '~.' | '~|>' | '~?>'
  // Special
  | '|>' | 'instanceof' | '~|' | '~^';
```

Binary operators for expressions.

### UnaryOperator

```typescript
export type UnaryOperator = 
  | '-' | '!' | '~' | '~?' | 'typeof';
```

Unary operators for expressions.

## Expression Node Types

### Literal Expressions

#### NumberLiteral

```typescript
class NumberLiteral extends Expression {
  type: 'NumberLiteral';
  value: number;
}
```

#### StringLiteral

```typescript
class StringLiteral extends Expression {
  type: 'StringLiteral';
  value: string;
}
```

#### InterpolatedString

```typescript
class InterpolatedString extends Expression {
  type: 'InterpolatedString';
  parts: string[];
  expressions: Expression[];
}
```

Template strings with embedded expressions.

#### BooleanLiteral

```typescript
class BooleanLiteral extends Expression {
  type: 'BooleanLiteral';
  value: boolean;
}
```

#### NullLiteral

```typescript
class NullLiteral extends Expression {
  type: 'NullLiteral';
}
```

### Complex Expressions

#### IdentifierExpression

```typescript
class IdentifierExpression extends Expression {
  type: 'IdentifierExpression';
  name: string;
}
```

#### BinaryExpression

```typescript
class BinaryExpression extends Expression {
  type: 'BinaryExpression';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}
```

#### UnaryExpression

```typescript
class UnaryExpression extends Expression {
  type: 'UnaryExpression';
  operator: UnaryOperator;
  operand: Expression;
}
```

#### CallExpression

```typescript
class CallExpression extends Expression {
  type: 'CallExpression';
  callee: Expression;
  args: (Expression | SpreadElement)[];
}
```

#### TernaryExpression

```typescript
class TernaryExpression extends Expression {
  type: 'TernaryExpression';
  condition: Expression;
  trueBranch: Expression;
  falseBranch: Expression;
}
```

#### ConfidenceExpression

```typescript
class ConfidenceExpression extends Expression {
  type: 'ConfidenceExpression';
  expression: Expression;
  confidence: Expression;
}
```

Expression with explicit confidence value.

### Collection Expressions

#### ArrayLiteral

```typescript
class ArrayLiteral extends Expression {
  type: 'ArrayLiteral';
  elements: (Expression | SpreadElement | null)[];
}
```

Null elements represent holes in sparse arrays.

#### ObjectLiteral

```typescript
class ObjectLiteral extends Expression {
  type: 'ObjectLiteral';
  properties: Array<{
    key?: string;
    value: Expression | SpreadElement;
  }>;
}
```

Properties without keys are spread elements.

### Access Expressions

#### PropertyAccess

```typescript
class PropertyAccess extends Expression {
  type: 'PropertyAccess';
  object: Expression;
  property: string;
}
```

#### OptionalChainAccess

```typescript
class OptionalChainAccess extends Expression {
  type: 'OptionalChainAccess';
  object: Expression;
  property: string;
}
```

#### IndexAccess

```typescript
class IndexAccess extends Expression {
  type: 'IndexAccess';
  object: Expression;
  index: Expression;
}
```

### Function Expressions

#### LambdaExpression

```typescript
class LambdaExpression extends Expression {
  type: 'LambdaExpression';
  parameters: LambdaParameter[];
  body: Expression;
  restParam?: string | ArrayPattern | ObjectPattern;
}

type LambdaParameter = string | ArrayPattern | ObjectPattern;
```

### Special Expressions

#### SpreadElement

```typescript
class SpreadElement extends Expression {
  type: 'SpreadElement';
  argument: Expression;
}
```

#### PlaceholderExpression

```typescript
class PlaceholderExpression extends Expression {
  type: 'PlaceholderExpression';
}
```

Represents `_` in pipeline expressions.

## Statement Node Types

### Control Flow Statements

#### IfStatement

```typescript
class IfStatement extends Statement {
  type: 'IfStatement';
  condition: Expression;
  thenStatement: Statement;
  elseStatement?: Statement;
}
```

#### UncertainIfStatement

```typescript
class UncertainIfStatement extends Statement {
  type: 'UncertainIfStatement';
  condition: Expression;
  threshold: number;
  branches: UncertainBranches;
}

interface UncertainBranches {
  high: Statement;
  medium?: Statement;
  low: Statement;
}
```

### Loop Statements

#### ForLoop

```typescript
class ForLoop extends Statement {
  type: 'ForLoop';
  init: Statement | null;
  condition: Expression | null;
  update: Expression | null;
  body: Statement;
}
```

#### ForInLoop

```typescript
class ForInLoop extends Statement {
  type: 'ForInLoop';
  variable: string;
  index: string | null;
  iterable: Expression;
  body: Statement;
}
```

#### WhileLoop

```typescript
class WhileLoop extends Statement {
  type: 'WhileLoop';
  condition: Expression;
  body: Statement;
}
```

#### DoWhileLoop

```typescript
class DoWhileLoop extends Statement {
  type: 'DoWhileLoop';
  body: Statement;
  condition: Expression;
}
```

### Assignment Statements

#### AssignmentStatement

```typescript
class AssignmentStatement extends Statement {
  type: 'AssignmentStatement';
  identifier: string;
  value: Expression;
}
```

#### DestructuringAssignment

```typescript
class DestructuringAssignment extends Statement {
  type: 'DestructuringAssignment';
  pattern: ArrayPattern | ObjectPattern;
  value: Expression;
  confidenceThreshold?: Expression;
}
```

### Pattern Types

#### ArrayPattern

```typescript
class ArrayPattern extends ASTNode {
  type: 'ArrayPattern';
  elements: (IdentifierExpression | ArrayPattern | 
             ObjectPattern | RestElement | null)[];
  elementThresholds?: (Expression | null)[];
}
```

#### ObjectPattern

```typescript
class ObjectPattern extends ASTNode {
  type: 'ObjectPattern';
  properties: Array<{
    key: string;
    value: IdentifierExpression | ArrayPattern | ObjectPattern;
    defaultValue?: Expression;
    confidenceThreshold?: Expression;
  }>;
  rest?: RestElement;
}
```

#### RestElement

```typescript
class RestElement extends ASTNode {
  type: 'RestElement';
  argument: IdentifierExpression | ArrayPattern | ObjectPattern;
}
```

### Other Statements

#### BlockStatement

```typescript
class BlockStatement extends Statement {
  type: 'BlockStatement';
  statements: Statement[];
}
```

#### ExpressionStatement

```typescript
class ExpressionStatement extends Statement {
  type: 'ExpressionStatement';
  expression: Expression;
}
```

#### ContextStatement

```typescript
class ContextStatement extends Statement {
  type: 'ContextStatement';
  contextName: string;
  body: Statement;
  shiftTo?: string;
}
```

#### AgentDeclaration

```typescript
class AgentDeclaration extends Statement {
  type: 'AgentDeclaration';
  name: string;
  config: AgentConfig;
}

interface AgentConfig {
  confidence?: number;
  role?: string;
}
```

#### Program

```typescript
class Program extends ASTNode {
  type: 'Program';
  statements: Statement[];
}
```

Root node of the AST.

## Type Guards

Common type guard patterns for AST nodes:

```typescript
// Check if node is an expression
if (node instanceof Expression) {
  // node is Expression
}

// Check specific node type
if (node.type === 'BinaryExpression') {
  // node is BinaryExpression
}

// Check if value is confident
if (value instanceof ConfidenceValue) {
  const confidence = value.confidence;
  const innerValue = value.value;
}
```

## Type Relationships

### Expression Hierarchy

```
Expression
├── Literals
│   ├── NumberLiteral
│   ├── StringLiteral
│   ├── BooleanLiteral
│   ├── NullLiteral
├── IdentifierExpression
├── Operations
│   ├── BinaryExpression
│   ├── UnaryExpression
│   └── TernaryExpression
├── Collections
│   ├── ArrayLiteral
│   └── ObjectLiteral
├── Access
│   ├── PropertyAccess
│   ├── OptionalChainAccess
│   └── IndexAccess
├── Functions
│   ├── CallExpression
│   └── LambdaExpression
└── Special
    ├── ConfidenceExpression
    ├── SpreadElement
    └── PlaceholderExpression
```

### Statement Hierarchy

```
Statement
├── Control Flow
│   ├── IfStatement
│   ├── UncertainIfStatement
│   └── ContextStatement
├── Loops
│   ├── ForLoop
│   ├── ForInLoop
│   ├── WhileLoop
│   ├── DoWhileLoop
│   ├── UncertainForLoop
│   └── UncertainWhileLoop
├── Assignments
│   ├── AssignmentStatement
│   └── DestructuringAssignment
├── BlockStatement
├── ExpressionStatement
├── AgentDeclaration
├── BreakStatement
└── ContinueStatement
```

## Best Practices

1. **Type Safety**: Always check node types before accessing type-specific properties
2. **Exhaustive Checks**: Handle all possible node types in switch statements
3. **Location Tracking**: Set location information for better error messages
4. **Immutability**: Treat AST nodes as immutable after creation
