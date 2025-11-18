# Runtime Scoping Notes

Updated after the January 2025 refactor to make scope handling explicit.

- `Environment#set` now throws `RuntimeError` when the identifier does not already exist in the current scope chain. Interpreter code must decide when a new binding should be introduced (e.g., via `Environment#define` in variable declarations or the fallback in `interpretAssignmentStatement` for legacy `x = value` assignments).
- Destructuring assignments (`[a, b] = array`, `{ x } = obj`) no longer create implicit bindings. Declare the identifiers first (`let a; let b;`) or perform a destructuring declaration.
- The fallback that creates a mutable binding on first naked assignment lives exclusively in `interpretAssignmentStatement` / `interpretAssignmentExpression`. This keeps backward compatibility for existing Prism scripts while preventing surprises inside nested scopes or deeper runtime helpers.
- Future work: update examples and diagnostics to nudge authors toward `let`/`const` so we can eventually drop the legacy fallback entirely.
- **Module resolution**: The runtime now resolves relative imports against the importing file, supports absolute paths, searches `node_modules`-style package roots (moving up parent directories), and automatically appends `.prism`/`index.prism` when omitted. Shared runtimes keep LLM providers/globals available across module boundaries.
- **Module cache management**: `Runtime` exposes `getModuleSystem()`, `invalidateModule(path, { invalidateDependents })`, and `reloadModule(path)` to let tooling invalidate a file and any dependents before re-running in the same interpreter. Use `createRuntime({ moduleSystem })` to share a preconfigured module system (custom file readers, virtual files) across runtimes without losing cache state.
