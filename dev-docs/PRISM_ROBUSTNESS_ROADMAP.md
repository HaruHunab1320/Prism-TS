# Prism Robustness Roadmap

Status snapshot derived from repository docs (`README.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`) and implementation review (`packages/prism-core/src/**/*.ts`, `packages/prism-confidence`, `packages/prism-llm`). Use the checklists below to track progress as we reconcile the documented vision with the actual runtime.

## 1. Align Spec & Implementation

- [ ] Confirm which “context”, “agent”, “consensus”, and `do … while` constructs are part of the MVP spec (`DEVELOPMENT.md:69-149`).
- [ ] Add tokenizer keywords/tokens for approved constructs (`packages/prism-core/src/tokenizer.ts`).
- [ ] Extend AST, parser, and runtime semantics/tests for each construct (see `packages/prism-core/src/{ast,parser,runtime}.ts` and `/test` suites).
- [ ] Update docs to match the final scope (vision, README, patterns guide).

## 2. Strengthen Runtime Semantics

- [ ] Replace implicit global assignments with strict lexical scoping + TDZ errors (`packages/prism-core/src/runtime.ts:329-378`).
- [ ] Define a formal execution model covering async evaluation, control flow, and side effects (new doc + runtime updates).
- [x] Design a shared module runtime so imports reuse environments/LLM providers instead of spawning isolated runtimes (`packages/prism-core/src/module-system.ts:61-210`).
- [ ] Add deterministic module resolution (package roots, browser-safe loaders) with tests.

## 3. Elevate Confidence Handling

- [ ] Decide on confidence metadata schema (value + provenance + calibration strategy) leveraging `packages/prism-confidence/src`.
- [ ] Expose strategy selection per operator (min/max/avg/product/custom) instead of hard-coded `min` in `applyBinaryOperatorWithConfidence` (`packages/prism-core/src/runtime.ts:1525-1890`).
- [ ] Wire in calibration/ensemble utilities (`packages/prism-confidence/src/{calibration,ensemble}.ts`) and document best practices.
- [ ] Publish guidance/tests for confidence propagation, destructuring thresholds, and uncertainty-aware collections.

## 4. Expand LLM & Ecosystem Hooks

- [x] Extend built-in `llm()` to accept structured options (provider name, model, temperature, extractor) instead of just a string prompt (`packages/prism-core/src/runtime.ts:402-436`).
- [ ] Unify core LLM types with `@prism-lang/llm` to avoid duplicate definitions (`packages/prism-core/src/llm-types.ts` vs `packages/prism-llm/src/provider-ai-sdk.ts`).
- [x] Support streaming responses, cancellation, and per-call provider overrides in the runtime + CLI/REPL.
- [ ] Document how to register multiple providers, share them across modules, and mock them in tests.

## 5. Tooling, Distribution & Ecosystem

- [ ] Finish VS Code extension polish and publish to Marketplace (`LANGUAGE_ECOSYSTEM.md` tasks).
- [ ] Build an LSP server (syntax, diagnostics, hover, completion) reusable by VS Code/Neovim/etc.
- [ ] Provide formatter, debugger hooks, and inspection tooling for confidence flows.
- [ ] Define a package/module distribution story (registry layout, stdlib, dependency resolver).
- [ ] Integrate testing & CI guidance (confidence-focused property tests, integration suites).

## 6. Roadmap to “language we’d want to use”

1. **Spec Lock & Runtime Hardening**  
   - Resolve Section 1+2 items so the language definition matches behavior and has predictable scoping, modules, and async semantics.
2. **Confidence & LLM Depth**  
   - Complete Sections 3+4 to make uncertainty handling and AI orchestration materially better than vanilla JS wrappers.
3. **Tooling & Ecosystem**  
   - Execute Section 5 to provide first-class developer ergonomics (LSP, formatter, CLI polish, package distribution).

Each milestone should end with: updated docs/tutorials, regression tests, and (ideally) an example `.prism` program demonstrating the new capability end to end.

---

_Last updated: <!-- TODO: keep current when editing -->_
