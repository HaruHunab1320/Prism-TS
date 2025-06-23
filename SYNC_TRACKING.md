# Sync Tracking: NPM Package vs Core Language

This document tracks features implemented in the npm-package that need to be synced back to the core language.

## Status Key
- ✅ Synced
- 🔄 In Progress  
- ❌ Not Synced

## Feature Sync Status

### v1.0.4 Features (Need Sync)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| Multiline strings (```) | ✅ | ❌ | tokenizer.ts |
| String escape sequences | ✅ | ❌ | tokenizer.ts |
| Enhanced parse errors | ✅ | ❌ | parser.ts |
| LLM provider initialization | ✅ | ❌ | index.ts |

### v1.0.5 Features (Need Sync)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| Ternary operators (? :) | ✅ | ❌ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| Confidence manipulation | ✅ (already worked) | ✅ | - |

### v1.0.6 Features (Need Sync)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| Arrays/lists `[1, 2, 3]` | ✅ | ❌ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| Objects `{key: value}` | ✅ | ❌ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| Array index access | ✅ | ❌ | parser.ts, runtime.ts |
| Object property access | ✅ | ❌ | parser.ts, runtime.ts |
| Built-in array methods | ✅ | ❌ | runtime.ts |

### v1.0.7 Features (Need Sync)

| Feature | NPM Package | Core Language | Files to Sync |
|---------|-------------|---------------|---------------|
| String interpolation `${}` | ✅ | ❌ | tokenizer.ts, ast.ts, parser.ts, runtime.ts |
| Interpolation in multiline strings | ✅ | ❌ | tokenizer.ts |
| Complex expression support | ✅ | ❌ | parser.ts |

### Files Modified in NPM Package

1. **src/core/tokenizer.ts**
   - Added `multilineString()` method
   - Updated `string()` method for escape sequences and interpolation
   - Added triple backtick detection in `nextToken()`
   - Added QUESTION and COLON tokens for ternary
   - Added LEFT_BRACKET and RIGHT_BRACKET tokens
   - Added INTERPOLATED_STRING token type
   - Enhanced string parsing with brace depth tracking

2. **src/core/parser.ts**
   - Enhanced `ParseError` class with context formatting
   - Added `sourceCode` parameter to Parser constructor
   - Updated all error throws to include source code
   - Added `ternary()` method
   - Added `arrayLiteral()` and `objectLiteral()` methods
   - Updated `call()` to handle property and index access
   - Enhanced `primary()` to detect object literals vs blocks
   - Added `parseInterpolatedString()` method with proper quote handling

3. **src/core/ast.ts**
   - Added TernaryExpression node
   - Added ArrayLiteral, ObjectLiteral nodes
   - Added PropertyAccess, IndexAccess nodes
   - Added InterpolatedString node with parts and expressions

4. **src/core/runtime.ts**
   - Added ArrayValue and ObjectValue classes
   - Added array/object interpretation methods
   - Enhanced property/index access handling
   - Added built-in array methods (map, filter, reduce)
   - Fixed confidence propagation through data structures
   - Added `interpretInterpolatedString()` method

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

## Sync Strategy

1. Copy modified files from npm-package to core
2. Run core test suite to ensure compatibility
3. Update any import paths if needed
4. Add new tests to core test suite

## Next Features (v1.1.0)

These will be implemented in npm-package first, then synced:

- String interpolation `${}`
- Pattern matching
- Debug mode flag