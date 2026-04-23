# Runtime Scoping Notes

Updated after the January 2026 strict scoping + TDZ pass.

- `Environment#set` throws `RuntimeError` if the identifier does not exist or is still uninitialized. New bindings must be introduced via `Environment#define` (or `Environment#declare` + initialization for `let`/`const`).
- `let`/`const` are now required for new bindings. Naked assignments (`x = value`) only work when `x` is already declared in scope.
- `let`/`const` are predeclared per block to enforce TDZ semantics: reads or writes before initialization throw.
- Destructuring assignments (`[a, b] = array`, `{ x } = obj`) no longer create implicit bindings. Use destructuring declarations (`let [a, b] = ...`) or predeclare identifiers.
- `for` loop initializers accept `let`/`const`. `for-in` loop variables are defined per-iteration inside the loop scope.
- **Module resolution**: The runtime resolves relative imports against the importing file, supports absolute paths, searches `node_modules`-style package roots (moving up parent directories), and automatically appends `.prism`/`index.prism` when omitted. Shared runtimes keep LLM providers/globals available across module boundaries.
- **Module cache management**: `Runtime` exposes `getModuleSystem()`, `invalidateModule(path, { invalidateDependents })`, and `reloadModule(path)` to let tooling invalidate a file and any dependents before re-running in the same interpreter. Use `createRuntime({ moduleSystem })` to share a preconfigured module system (custom file readers, virtual files) across runtimes without losing cache state.
