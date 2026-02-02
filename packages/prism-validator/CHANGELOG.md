# @prism-lang/validator

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
