# Prism Validator Deep Dive

_Date: 2025-02-14_

## Overview
`packages/prism-validator` provides lightweight syntax/streaming validation for editor integrations. After the recent runtime/LLM work it falls behind in several areas. Below summarizes the current behavior and the gaps we need to close before shipping a polished developer experience.

## Key Findings

1. **Tokenizer Drift (`src/streaming.ts`)**
   - The streaming validator tries to call `tokenize()` from `@prism-lang/core`, but when tokenization fails it falls back to a hand-written token splitter that only knows about a small subset of tokens (e.g. `uncertain`, `if`, braces, `~>`).
   - This fallback is unaware of new syntax (imports/exports, optional chaining, `stream_llm`, async constructs, etc.), so completions and “expected next token” guidance become misleading as soon as modern features appear.
   - It also ignores actual line/column positions; all errors are reported at `line: 1, column: 1`.

2. **No AST-Level Validation**
   - The validator only counts bracket depth and checks for a couple of token pairs (double equals). It never attempts to parse partial ASTs or re-use the real parser’s error messages.
   - As a result it cannot detect issues like unterminated pipelines, missing `await`, invalid export syntax, etc., even though the runtime already knows how to flag them.

3. **Streaming Guidance Not Wired to Real Streaming**
   - Documentation demonstrates `llm.streamCompletion`, but the validator itself has no helper that accepts streamed tokens; users have to chunk manually.
   - There is no guidance on how to integrate the new runtime-level `stream_llm`/`Runtime.streamLLM` APIs with the validator (e.g., when to cancel, how to flush buffer).

4. **Diagnostics Are Minimal**
   - Errors are simple strings without spans, context lines, or hints. They don’t support the richer, Rust-like diagnostics we want across the toolchain.
   - Completions are generic (“identifier or expression”) with no awareness of actual parser state.

## Proposed Work

1. **Tokenization Refresh**
   - Remove the bespoke fallback tokenizer; instead, teach `tokenize()` to operate in “partial” mode (optionally exposed from `@prism-lang/core`) so the validator can stay in sync with the language grammar.
   - Until that API exists, at least copy the keyword/operator tables from `packages/prism-core/src/tokenizer.ts` so new keywords (`stream`, `async`, module syntax) don’t appear as unknown tokens.

2. **Parser-Aware Streaming Validation**
   - Introduce an incremental parser (or expose hooks from the real parser) to validate partially-typed code. Track AST stack to provide precise completions (“expecting `)` to close `if` condition”).
   - Surface actual line/column information from tokens back into `StreamingValidationResult`.

3. **First-Class Streaming Helpers**
   - Ship a helper that accepts an `AsyncIterable<string>` (e.g., from `runtime.streamLLM`) and feeds it through `StreamingValidator`, handling cancellation and error propagation.
   - Update docs and examples to use the new `Runtime.streamLLM`/`stream_llm` APIs instead of the outdated `llm.streamCompletion`.

4. **Diagnostics Roadmap**
   - Define a shared `Diagnostic` shape (message, span, notes) that both the validator and runtime can emit. Use this to deliver Rust-like, multi-line errors in editors and CLI output.
   - Reuse the new diagnostic renderer for validator warnings so users see consistent formatting everywhere.

## Next Steps

1. Add unit/integration tests in `packages/prism-validator/test` covering modern syntax (imports, optional chaining, async/await, `stream_llm`). These will fail with the current fallback tokenizer, proving the gaps.
2. Expose a partial-tokenization API from `@prism-lang/core` (or port the tokenizer tables) to eliminate the bespoke lexer.
3. Prototype a queue-based streaming helper (`validateStream(asyncIterable)`) that can be wired directly to `Runtime.streamLLM`.
4. Align documentation (`apps/docs/docs/api/validator/*.md`) with the new APIs once the above work lands.
