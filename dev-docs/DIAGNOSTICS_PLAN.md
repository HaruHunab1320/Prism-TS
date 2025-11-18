# Rich Diagnostics Plan

_Date: 2025-02-14_

## Goal
Deliver Rust-style, informative diagnostics (multi-line snippets, labels, suggestions) across the Prism toolchain (parser, runtime, CLI, validator, editor integrations).

## Current State
- Parser errors (`ParseError`) include source and a caret, but only for the offending token and without notes.
- Runtime errors (`RuntimeError`) often lack spans or context; many throw generic messages.
- CLI/REPL simply print the `.message` string—no color, no snippets, no hints.
- Validator errors are plain strings (see `dev-docs/VALIDATOR_AUDIT.md`).

## Proposed Architecture

1. **Diagnostic Data Model**
   - Introduce a shared `Diagnostic` interface:
     ```ts
     interface Diagnostic {
       level: 'error' | 'warning' | 'note';
       code?: string;
       message: string;
       span?: { file?: string; start: { line: number; column: number }; end: { line: number; column: number } };
       labels?: Array<{ message?: string; span: ...; kind: 'primary' | 'secondary' }>;
       notes?: string[];
       help?: string;
     }
     ```
   - Parser/runtime should throw objects carrying this payload (or wrap existing errors with it).

2. **Source Mapping**
   - Ensure the parser tracks node spans (`startToken`, `endToken`) and stores them on AST nodes (`node.location` already exists but only line/column). Extend to include end positions.
   - Runtime statements should propagate AST node references into errors so we can emit spans for runtime failures (e.g., division by zero points to `left / right` expression).

3. **Renderer**
   - Build a renderer similar to `miette`/`codespan` that accepts `Diagnostic` + source text and prints:
     ```
     error[E0001]: division by zero
        --> main.prism:4:12
         |
       4 | result = value / 0
         |            ^^^^^^ cannot divide by zero
     ```
   - Hook renderer into CLI/REPL (with ANSI colors) and provide a plaintext fallback for logs/tests.

4. **Integration Steps**
   1. **Parser**
      - Replace direct `throw new ParseError` calls with `throw new DiagnosticError(diag)` where `diag` uses the new interface.
      - Unit-test parser errors to ensure spans are accurate.
   2. **Runtime**
      - Update hotspots (`interpretBinaryExpression`, `interpretAwaitExpression`, etc.) to attach AST nodes to `RuntimeError`.
      - Wrap asynchronous failures (LLM, streaming) with diagnostics referencing the originating call site.
   3. **Validator/CLI**
      - Update validator to emit `Diagnostic` objects.
      - Modify CLI/REPL to catch `DiagnosticError` and render via the new renderer.

5. **Migration Strategy**
   - Phase 1: Introduce `Diagnostic` interface, renderer, and helper constructors. Adapt parser errors first (least runtime impact).
   - Phase 2: Gradually annotate runtime errors with spans (start with arithmetic, destructuring, control flow). Provide utilities (`raise(node, message, code?)`) to standardize.
   - Phase 3: Replace ad-hoc CLI logging with the renderer. Update docs with screenshots/examples.

## Estimated Effort
- **Phase 1 (Parser + Renderer):** ~2–3 days (span plumbing + tests).
- **Phase 2 (Runtime instrumentation):** staged over multiple PRs; each major subsystem (expressions, control flow, modules) ~1–2 days.
- **Phase 3 (Tooling integration):** 1 day for CLI/REPL, plus validator work tracked separately.

Deliverables per phase should include doc updates and before/after comparisons so contributors see the value immediately.
