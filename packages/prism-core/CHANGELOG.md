# Changelog

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