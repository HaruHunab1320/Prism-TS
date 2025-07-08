# Sync Tracking: NPM Package vs Core Language

This document tracks features implemented in the npm-package that need to be synced back to the core language.

## Status Key
- ✅ Synced
- 🔄 In Progress  
- ❌ Not Synced

## Feature Sync Status

### v1.0.4 Features (Synced ✅)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| Multiline strings (```) | ✅ | ✅ | tokenizer.ts |
| String escape sequences | ✅ | ✅ | tokenizer.ts |
| Enhanced parse errors | ✅ | ✅ | parser.ts |
| LLM provider initialization | ✅ | ✅ | index.ts |

### v1.0.5 Features (Synced ✅)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| Ternary operators (? :) | ✅ | ✅ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| Confidence manipulation | ✅ (already worked) | ✅ | - |

### v1.0.6 Features (Synced ✅)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| Arrays/lists `[1, 2, 3]` | ✅ | ✅ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| Objects `{key: value}` | ✅ | ✅ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| Array index access | ✅ | ✅ | parser.ts, runtime.ts |
| Object property access | ✅ | ✅ | parser.ts, runtime.ts |
| Built-in array methods | ✅ | ✅ | runtime.ts |

### v1.0.7 Features (Synced ✅)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| String interpolation `${}` | ✅ | ✅ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| Interpolation in multiline strings | ✅ | ✅ | tokenizer.ts |
| Complex expression support | ✅ | ✅ | parser.ts |

### v1.0.8 Features (Synced ✅)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| Array methods implementation | ✅ | ✅ | runtime.ts |
| map(array, fn) function | ✅ | ✅ | runtime.ts |
| filter(array, predicate) function | ✅ | ✅ | runtime.ts |
| reduce(array, reducer, init?) function | ✅ | ✅ | runtime.ts |

### v1.0.9 Features (Synced ✅)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| Lambda expressions `x => x * 2` | ✅ | ✅ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| Arrow function syntax `=>` | ✅ | ✅ | tokenizer.ts |
| Single param without parens | ✅ | ✅ | parser.ts |
| Multiple params `(x, y) => x + y` | ✅ | ✅ | parser.ts |
| Zero params `() => 42` | ✅ | ✅ | parser.ts |
| Closures and scope capture | ✅ | ✅ | runtime.ts |
| Modulo operator `%` | ✅ | ✅ | tokenizer.ts, ast.ts, runtime.ts |

### v1.0.10 Features (Synced ✅)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| Null literal `null` | ✅ | ✅ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| NULL token type | ✅ | ✅ | tokenizer.ts |
| NullLiteral AST node | ✅ | ✅ | ast.ts |
| NullValue runtime class | ✅ | ✅ | runtime.ts |
| Null in arrays/objects | ✅ | ✅ | runtime.ts |
| Null comparisons | ✅ | ✅ | runtime.ts |
| Null with confidence | ✅ | ✅ | runtime.ts |

### v1.0.11 Features (Synced ✅)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| Null literal `null` | ✅ | ✅ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| NULL token type | ✅ | ✅ | tokenizer.ts |
| NullLiteral AST node | ✅ | ✅ | ast.ts |
| NullValue runtime class | ✅ | ✅ | runtime.ts |
| Null in arrays/objects | ✅ | ✅ | runtime.ts |
| Null comparisons | ✅ | ✅ | runtime.ts |
| Null with confidence | ✅ | ✅ | runtime.ts |

### v1.0.12 Features (Synced ✅)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| Compound assignment operators | ✅ | ✅ | tokenizer.ts, parser.ts |
| += operator | ✅ | ✅ | tokenizer.ts, parser.ts |
| -= operator | ✅ | ✅ | tokenizer.ts, parser.ts |
| *= operator | ✅ | ✅ | tokenizer.ts, parser.ts |
| /= operator | ✅ | ✅ | tokenizer.ts, parser.ts |
| %= operator | ✅ | ✅ | tokenizer.ts, parser.ts |
| String concatenation with += | ✅ | ✅ | runtime.ts |
| Compound ops with confidence | ✅ | ✅ | runtime.ts |

### v1.0.13 Features (Synced ✅)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| Optional chaining operator (?.) | ✅ | ✅ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| OptionalChainAccess AST node | ✅ | ✅ | ast.ts |
| Optional chain parsing | ✅ | ✅ | parser.ts |
| Optional chain runtime | ✅ | ✅ | runtime.ts |
| Undefined literal support | ✅ | ✅ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| UNDEFINED token type | ✅ | ✅ | tokenizer.ts |
| UndefinedLiteral AST node | ✅ | ✅ | ast.ts |
| UndefinedValue runtime class | ✅ | ✅ | runtime.ts |
| Undefined vs null distinction | ✅ | ✅ | runtime.ts |
| Optional chain with undefined | ✅ | ✅ | runtime.ts |

### v1.0.14 Features (Synced ✅)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| Exponentiation operator (**) | ✅ | ✅ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| STAR_STAR token type | ✅ | ✅ | tokenizer.ts |
| Right-associative parsing | ✅ | ✅ | parser.ts |
| Math.pow implementation | ✅ | ✅ | runtime.ts |
| Nullish coalescing operator (??) | ✅ | ✅ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| QUESTION_QUESTION token type | ✅ | ✅ | tokenizer.ts |
| Nullish coalescing parsing | ✅ | ✅ | parser.ts |
| Null/undefined-only fallback | ✅ | ✅ | runtime.ts |
| Preserves falsy values (0, false, "") | ✅ | ✅ | runtime.ts |
| Works with confidence values | ✅ | ✅ | runtime.ts |

### Files Modified in NPM Package

1. **src/core/tokenizer.ts**
   - Added `multilineString()` method
   - Updated `string()` method for escape sequences and interpolation
   - Added triple backtick detection in `nextToken()`
   - Added QUESTION and COLON tokens for ternary
   - Added LEFT_BRACKET and RIGHT_BRACKET tokens
   - Added INTERPOLATED_STRING token type
   - Enhanced string parsing with brace depth tracking
   - Added ARROW token type for lambda expressions
   - Added PERCENT token type for modulo operator
   - Added PLUS_EQUAL, MINUS_EQUAL, STAR_EQUAL, SLASH_EQUAL, PERCENT_EQUAL tokens
   - Added OPTIONAL_CHAIN token type for ?.
   - Added NULL and UNDEFINED token types
   - Added STAR_STAR token type for **
   - Added QUESTION_QUESTION token type for ??

2. **src/core/parser.ts**
   - Enhanced `ParseError` class with context formatting
   - Added `sourceCode` parameter to Parser constructor
   - Updated all error throws to include source code
   - Added `ternary()` method
   - Added `arrayLiteral()` and `objectLiteral()` methods
   - Updated `call()` to handle property and index access
   - Enhanced `primary()` to detect object literals vs blocks
   - Added `parseInterpolatedString()` method with proper quote handling
   - Added lambda expression parsing for all three syntaxes
   - Updated `primary()` to detect single param lambdas
   - Updated parenthesized expressions to detect multi-param lambdas
   - Added PERCENT to `factor()` method for modulo
   - Added compound assignment parsing in `expressionStatement()`
   - Added OptionalChainAccess parsing in `call()`
   - Added null and undefined literal parsing
   - Added `exponent()` method for right-associative ** operator
   - Added `nullishCoalesce()` method for ?? operator
   - Renamed `coalesce()` to `confidenceCoalesce()`

3. **src/core/ast.ts**
   - Added TernaryExpression node
   - Added ArrayLiteral, ObjectLiteral nodes
   - Added PropertyAccess, IndexAccess nodes
   - Added InterpolatedString node with parts and expressions
   - Added LambdaExpression node type
   - Added LambdaExpression class with parameters and body
   - Added '%' to BinaryOperator type
   - Added NullLiteral and UndefinedLiteral nodes
   - Added OptionalChainAccess node
   - Added '**' and '??' to BinaryOperator type

4. **src/core/runtime.ts**
   - Added ArrayValue and ObjectValue classes
   - Added array/object interpretation methods
   - Enhanced property/index access handling
   - Added built-in array methods (map, filter, reduce) as global functions
   - Fixed confidence propagation through data structures
   - Added `interpretInterpolatedString()` method
   - Added `interpretLambdaExpression()` method with closure support
   - Updated array methods to work with lambda functions
   - Added modulo operator implementation
   - Added NullValue and UndefinedValue classes
   - Added compound assignment operations
   - Added `interpretOptionalChainAccess()` method
   - Added '**' case using Math.pow
   - Added '??' case for nullish coalescing

5. **src/index.ts**
   - Added `initializeLLMProviders()` method
   - Fixed provider registration in constructor
   - Pass source code to parser for error context

### Tests Added

- `src/core/tokenizer.multiline.test.ts` - Multiline string tests
- `src/core/parser.errors.test.ts` - Enhanced error message tests
- `src/core/ternary.test.ts` - Ternary operator tests
- `src/core/arrays.test.ts` - Arrays and objects tests
- `src/core/string-interpolation.test.ts` - String interpolation tests (272 tests total)
- `src/core/array-methods.test.ts` - Array methods tests
- `src/core/lambda.test.ts` - Lambda expression tests
- `src/core/null.test.ts` - Null support tests
- `src/core/compound-assignment.test.ts` - Compound assignment tests
- `src/core/optional-chaining.test.ts` - Optional chaining tests
- `src/core/undefined.test.ts` - Undefined support tests
- `src/core/exponentiation.test.ts` - Exponentiation operator tests
- `src/core/nullish-coalescing.test.ts` - Nullish coalescing tests

## Sync Strategy

1. Copy modified files from npm-package to core
2. Run core test suite to ensure compatibility
3. Update any import paths if needed
4. Add new tests to core test suite

## Sync Completion Summary

### 2025-06-27
✅ **Successfully synced features v1.0.1 through v1.0.11**

Features synced:
- Multiline strings with ```
- String escape sequences
- Enhanced error messages with context
- Ternary operators (? :)
- Arrays and lists
- Objects/dictionaries
- String interpolation
- Built-in array methods (map, filter, reduce)
- Lambda expressions with arrow syntax
- Closures and scope capture
- Modulo operator (%)
- Null literal support

### 2025-07-08
✅ **Successfully synced features v1.0.12 through v1.0.15**

Features synced:
- Compound assignment operators (+=, -=, *=, /=, %=)
- Optional chaining operator (?.)
- Undefined support (distinct from null)
- Exponentiation operator (**) with right associativity
- Nullish coalescing operator (??)
- Spread operator (...) for arrays and objects

### Current Status:
1. **Core files synced**: tokenizer.ts, parser.ts, ast.ts, runtime.ts
2. **Test files added**: 
   - compound-assignment.test.ts
   - optional-chaining.test.ts
   - undefined.test.ts
   - exponentiation.test.ts
   - nullish-coalescing.test.ts
   - spread.test.ts
   - array-methods-properties.test.ts
3. **Total tests in core**: 488 tests (all passing)

### Features now available in both npm-package and core:
- Multiline strings with ```
- String escape sequences
- Enhanced error messages with context
- Ternary operators (? :)
- Arrays and lists
- Objects/dictionaries
- String interpolation
- Built-in array methods (map, filter, reduce)
- Lambda expressions with arrow syntax
- Closures and scope capture
- Modulo operator (%)
- Null literal support
- Compound assignment operators (+=, -=, *=, /=, %=)
- Optional chaining operator (?.)
- Undefined support (distinct from null)
- Exponentiation operator (**) with right associativity
- Nullish coalescing operator (??)
- Spread operator (...) for arrays and objects
- Array methods as properties (.map, .filter, .reduce, .forEach, .push)

## Next Features (v1.1.0)

These will be implemented in npm-package first, then synced:

- Pattern matching
- Debug mode flag