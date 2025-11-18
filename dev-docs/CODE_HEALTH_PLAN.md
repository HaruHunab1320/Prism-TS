# Prism Code Health Plan

Focus: elevate existing implementation quality before pursuing new language features. Each section lists specific “bad patterns” we observed in `packages/prism-core` and related packages, plus the cleanup actions required to make the codebase friendlier for top-tier contributors.

## 1. Runtime Structure & Readability

- [ ] Split `packages/prism-core/src/runtime.ts` (>3k LOC) into cohesive modules (`values.ts`, `environment.ts`, `interpreter.ts`, `builtins/`, `control-flow.ts`, etc.) with dedicated exports.
- [ ] Introduce unit tests for any newly extracted module boundaries (environment, values, builtins).
- [ ] Ensure shared helpers (e.g., `looseEquals`, `toNumber`) relocate to a utility module with coverage.

## 2. State & Scope Management

- [x] Replace implicit variable creation (`Environment.set` creates globals when identifiers are missing) with strict lexical scoping + descriptive diagnostics; update docs/examples/tests to use `let`/`const` as needed.
- [ ] Add Temporal Dead Zone behavior for `let`/`const` (reads before declaration throw).
- [ ] Provide explicit APIs for injecting globals instead of relying on implicit assignment from user code.

## 3. Module Loading & Sharing

- [x] Refactor `packages/prism-core/src/module-system.ts` so imports reuse a shared interpreter/environment rather than spinning up a brand-new runtime for every module (preserve provider/context state).
- [ ] Introduce module cache invalidation hooks plus deterministic resolution (package lookup / browser stubs) with tests.
- [ ] Document lifecycle guarantees (singletons, circular dependencies, side effects).

## 4. Confidence Infrastructure

- [ ] Consolidate confidence math so `packages/prism-core/src/confidence/*` delegates to `@prism-lang/confidence` primitives, avoiding duplicated logic.
- [ ] Introduce provenance/strategy metadata (min/max/avg/product/custom) instead of hard-coded `min` combination in `applyBinaryOperatorWithConfidence`.
- [ ] Add regression tests covering destructuring thresholds, confident property access, and operator-level propagation.

## 5. LLM Integration Consistency

- [ ] Remove duplicate LLM type definitions (`packages/prism-core/src/llm-types.ts` mirrors `packages/prism-llm/src/provider-ai-sdk.ts`); import shared interfaces instead.
- [x] Expand `llm()` built-in to accept structured options (provider/model/temperature/extractor). Existing scripts should continue to work with a string prompt.
- [ ] Provide mocking utilities + tests to ensure deterministic behavior without network calls.

## 6. Tooling & Dev Ergonomics (existing scope only)

- [ ] Enforce consistent lint/format in all packages (ESLint config + CI).
- [ ] Ensure every exported helper/function has TypeScript types and inline docs.
- [ ] Add CONTRIBUTING note describing coding standards, module boundaries, and testing expectations for Prism core.

---

_Use this checklist to drive cleanup PRs. Once the items here are green we can resume feature work with confidence._ 
