# @prism-lang/validator

## 3.0.0

### Major Changes

- ddfe397: Add `fn` as a reserved keyword alias for `function` in function declarations. This is a breaking change — any code using `fn` as a variable or identifier name will need to be renamed.

### Patch Changes

- Updated dependencies [ddfe397]
  - @prism-lang/core@4.0.0

## 2.0.2

### Patch Changes

- Updated dependencies [f207dbb]
  - @prism-lang/core@3.0.2

## 2.0.1

### Patch Changes

- Add dynamic object bracket access support (`object[key]`) to Prism runtime index evaluation, including confident object propagation.

  Improve validator `IndexAccess` type analysis to:

  - validate numeric indices for arrays,
  - validate string indices for objects,
  - report missing object properties for string-literal keys,
  - support dynamic string-key object indexing.

  Update core/validator changelogs and docs to document object index access syntax and behavior.

- Updated dependencies
  - @prism-lang/core@3.0.1

## Unreleased

### Fixed

- Improved `IndexAccess` type analysis to validate array index type (`number`) and object index type (`string`).
- Added object bracket-access checks for missing string-literal keys and inference for dynamic string keys.

## 2.0.0

### Major Changes

- Major release for core language and validation updates.

  - Added Rust-style `match` expressions with guards and nested patterns.
  - Added configurable runtime confidence strategy and provenance tracking.
  - Added built-in confidence helpers (`consensus`, `aggregate`).
  - Removed legacy `Agent` keyword requirement inside `agents` blocks.
  - Updated validator behavior/docs to align with current Prism syntax and confidence semantics.

### Patch Changes

- Updated dependencies
  - @prism-lang/core@3.0.0

## 1.4.0

### Minor Changes

- 90722f0: Diagnostics/streaming improvements across validator, CLI, REPL, and LLM provider integrations.

### Patch Changes

- Updated dependencies [90722f0]
  - @prism-lang/core@2.0.0

## 1.3.0

### Minor Changes

- f113d24: Added runtime module resolution system with import/export support, confident ternary operator (~?), and confident assignment operators (~+=, ~-=, ~\*=, ~/=). Updated validator to support new operators.

### Patch Changes

- Updated dependencies [f113d24]
  - @prism-lang/core@1.3.0

## 1.2.2

### Patch Changes

- Fix peer dependency versions for npm publishing
- Updated dependencies
  - @prism-lang/core@1.2.2
