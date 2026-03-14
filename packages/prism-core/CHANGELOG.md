# Changelog

## 3.0.1

### Patch Changes

- Add dynamic object bracket access support (`object[key]`) to Prism runtime index evaluation, including confident object propagation.

  Improve validator `IndexAccess` type analysis to:

  - validate numeric indices for arrays,
  - validate string indices for objects,
  - report missing object properties for string-literal keys,
  - support dynamic string-key object indexing.

  Update core/validator changelogs and docs to document object index access syntax and behavior.

  - @prism-lang/llm@1.3.2

## Unreleased

### Fixed

- Added support for dynamic object index access with string keys (`object[key]`) in runtime `IndexAccess`.
- Added support for confident object index access so container confidence propagates through `object[key]`.
- Bracket access on objects with missing keys (e.g. `obj[""]` or `obj[missingVar]`) now returns `null` instead of throwing `Property '' does not exist`, matching JS-like semantics.

## 3.0.0

### Major Changes

- Major release for core language and validation updates.

  - Added Rust-style `match` expressions with guards and nested patterns.
  - Added configurable runtime confidence strategy and provenance tracking.
  - Added built-in confidence helpers (`consensus`, `aggregate`).
  - Removed legacy `Agent` keyword requirement inside `agents` blocks.
  - Updated validator behavior/docs to align with current Prism syntax and confidence semantics.

### Patch Changes

- @prism-lang/llm@1.3.1

## 2.0.0

### Major Changes

- 90722f0: Major runtime and language update: strict scoping, module system overhaul, diagnostics with spans, `do…while` support, confident property access fixes, and builtins refactor.

### Patch Changes

- Updated dependencies [90722f0]
  - @prism-lang/llm@1.3.0

## 1.3.0

### Minor Changes

- f113d24: Added runtime module resolution system with import/export support, confident ternary operator (~?), and confident assignment operators (~+=, ~-=, ~\*=, ~/=). Updated validator to support new operators.

### Patch Changes

- @prism-lang/llm@1.2.3

## 1.2.2

### Patch Changes

- Fix peer dependency versions for npm publishing
- Updated dependencies
  - @prism-lang/llm@1.2.2

All notable changes to @prism-lang/core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.25] - 2024-12-17

### Added

- Added `runPrism` helper function for easy code execution
- Added `createPrismRuntime` helper for creating configured runtimes
- Added support for `default` branch in uncertain statements
- Improved infinite loop prevention in uncertain loops
- **NEW: Standard Named Functions** - Complete implementation of traditional function declarations
  - Function declaration syntax: `function name(params) { body }`
  - Optional confidence annotations: `function name() ~> 0.8 { ... }`
  - Return statements with early returns: `return value`
  - Rest parameters support: `function sum(...args) { ... }`
  - Function hoisting (functions can be called before declaration)
  - Proper scoping with local variable isolation
  - Integration with all existing Prism features (confidence expressions, uncertain control flow)
  - Support for recursive functions and closures
  - Comprehensive test coverage (33 test cases)
- **NEW: Variable Declaration Keywords** - const/let support with block scoping
  - `const` declarations: `const x = 10` (immutable, requires initializer)
  - `let` declarations: `let y = 20` (mutable, optional initializer)
  - Block scoping for both const and let
  - Redeclaration prevention in same scope
  - Mutability enforcement (const variables cannot be reassigned)
  - Destructuring support: `const [a, b] = array` and `const {x, y} = obj`
  - Seamless integration with existing assignment syntax
  - Comprehensive test coverage (28 test cases)
- **NEW: Block-Statement Lambda Functions** - Extended lambda expressions with block statement support
  - Block syntax: `x => { statements; return value; }`
  - Multi-statement lambda bodies with variable declarations
  - Return statement support with early returns
  - Full compatibility with existing expression-only lambdas
  - Proper scope isolation and closure support
  - Integration with array methods (map, filter, reduce)
  - Support for all control flow (loops, conditions, uncertain statements)
  - Comprehensive test coverage (26 test cases)

### Fixed

- Fixed infinite loop bug in uncertain while/for loops when no branch matches
- Fixed test issues with uncertain loops not resetting state between tests

### Changed

- Made `runPrism` the recommended way to execute Prism code
- Updated documentation to reflect actual implementation

## [1.0.24] - Previous Release

### Changed

- Initial monorepo migration
- Package renamed from `prism-uncertainty` to `@prism-lang/core`
