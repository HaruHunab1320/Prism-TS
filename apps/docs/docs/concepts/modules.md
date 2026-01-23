---
sidebar_position: 8
title: Modules
description: Learn how to organize Prism code with modules, imports, and exports. Understand module resolution, circular dependencies, and best practices for structuring larger Prism applications.
keywords: [prism modules, imports, exports, module system, code organization, es modules, module resolution]
---

# Module System

Prism provides a modern module system inspired by ES modules, allowing you to organize code into reusable components. The module system supports imports, exports, and proper isolation between modules.

## Basic Usage

### Exporting from Modules

You can export values, functions, and variables from a module:

```javascript
// math.prism
export const PI = 3.14159
export const E = 2.71828

export square = x => x * x
export cube = x => x * x * x

export function circleArea(radius) {
  return PI * square(radius)
}

// Default export
export default {
  PI,
  E,
  square,
  cube,
  circleArea
}
```

### Importing into Modules

Import functionality from other modules using various patterns:

```javascript
// Named imports
import {PI, square} from "./math.prism"

// Default import
import math from "./math.prism"

// Namespace import
import * as mathUtils from "./math.prism"

// Renamed imports
import {square as sq, cube as cb} from "./math.prism"

// Mixed imports
import defaultMath, {PI, E} from "./math.prism"
```

## Export Patterns

### Named Exports

Export individual values with names:

```javascript
// Direct export
export const VERSION = "1.0.0"
export apiKey = "secret-key" ~> 0.9

// Export functions
export greet = name => "Hello, " + name
export function calculate(x, y) {
  return x * y
}

// Export after declaration
userId = 12345
userName = "Alice"
export {userId, userName}

// Export with renaming
internalFunction = () => "internal"
export {internalFunction as publicAPI}
```

### Default Exports

Each module can have one default export:

```javascript
// Export default object
export default {
  name: "MyModule",
  version: "1.0.0",
  initialize: () => console.log("Initialized")
}

// Export default function
export default function main() {
  return "Main module function"
}

// Export default value
export default 42
```

### Re-exports

Re-export from other modules:

```javascript
// Re-export specific items
export {helper1, helper2} from "./helpers.prism"

// Re-export with renaming
export {oldName as newName} from "./legacy.prism"

// Re-export all named exports
export * from "./utilities.prism"
```

## Module Resolution

### Relative Paths

Modules are resolved relative to the importing file:

```javascript
// Same directory
import {util} from "./utils.prism"

// Parent directory
import {shared} from "../shared.prism"

// Nested directories
import {component} from "./components/button.prism"
```

### File Extensions

The `.prism` extension is optional in imports:

```javascript
// Both work the same
import {data} from "./data.prism"
import {data} from "./data"
```

### Absolute Paths

When an import path starts with `/`, Prism resolves it from the filesystem root (or the virtual root used by your host environment):

```javascript
import settings from "/config/app-settings"
```

This is helpful for tooling that presents a virtual filesystem or for server-side projects with a known root directory.

### Package-style Imports

Bare specifiers (no `./`, `../`, or `/`) are resolved like Node.js: Prism looks for a `node_modules/<package>` directory starting from the importing file's folder and walking up parent directories. You can omit `.prism`; the runtime tries both `<package>.prism` and `<package>/index.prism`.

```javascript
import logger from "shared-logger"
import { formatNumber } from "@acme/prism-utils"
```

This allows sharing utilities between Prism projects without manual relative paths.

## Module Execution

### Import Hoisting

Imports are hoisted and processed before any other code:

```javascript
// This works even though import appears after usage
console.log("PI is", PI)
import {PI} from "./math.prism"
```

### Module Isolation

Each module has its own scope:

```javascript
// module-a.prism
secret = "module A secret"
export public = "module A public"

// module-b.prism
import {public} from "./module-a.prism"
console.log(public)  // "module A public"
console.log(secret)  // Error: undefined variable
```

### Single Evaluation

Modules are evaluated only once, even if imported multiple times:

```javascript
// counter.prism
console.log("Counter module loaded")
count = 0
export increment = () => ++count
export getCount = () => count

// main.prism
import {increment, getCount} from "./counter.prism"
import * as counter from "./counter.prism"

// "Counter module loaded" printed only once
increment()
console.log(getCount())        // 1
console.log(counter.getCount()) // 1 (same instance)
```

### Hot Reloading and Cache Invalidation

During development you may want to reload a module after editing it. The runtime exposes helpers for this:

```ts
import { createRuntime } from '@prism-lang/core';

const runtime = createRuntime();
// execute your entry module once
await runtime.getModuleSystem().loadModule('/app/main.prism', runtime);

// Later, when /shared/state.prism changes:
await runtime.reloadModule('/shared/state.prism');
```

`runtime.reloadModule(path)` internally invalidates the cached module (and all dependents by default) before re-running it with the existing interpreter, so globals/LLM providers remain intact. If you only want to evict a single file without touching dependents, call `runtime.invalidateModule(path, { invalidateDependents: false })` and then re-import it manually.

> Tip: `prism run --watch app.prism` uses the same APIs under the hood—when a file changes, the CLI invalidates the module, reloads it, and re-runs your entry module without tearing down the interpreter or LLM providers.

## Confidence in Modules

Confidence values are preserved through imports and exports:

```javascript
// sensor.prism
export temperature = 23.5 ~> 0.92
export humidity = 65 ~> 0.88

export async function readSensor() {
  // Simulate sensor reading
  value = await getSensorValue()
  return value ~> 0.9
}

// main.prism
import {temperature, readSensor} from "./sensor.prism"

// Confidence is preserved
console.log(temperature)  // 23.5 ~> 0.92

reading = await readSensor()
// Confidence flows through function calls
```

## Async Modules

Modules can use async/await at the top level:

```javascript
// data-loader.prism
const data = await fetchData("/api/config")
export config = data.config
export settings = data.settings

// main.prism
import {config, settings} from "./data-loader.prism"
// Module waits for async operations before exporting
```

## Best Practices

### 1. Single Responsibility

Keep modules focused on a single concern:

```javascript
// Good: math-utils.prism
export add = (a, b) => a + b
export multiply = (a, b) => a * b
export average = nums => nums.reduce(add, 0) / nums.length

// Avoid: utilities.prism with mixed concerns
```

### 2. Clear Exports

Be explicit about what you export:

```javascript
// Good: Clear public API
internal = "private implementation"
helper = x => x * 2

export function publicFunction() {
  return helper(internal)
}

// Only publicFunction is accessible
```

### 3. Consistent Naming

Use consistent naming for modules and exports:

```javascript
// user-service.prism
export function getUser(id) { /* ... */ }
export function updateUser(id, data) { /* ... */ }
export function deleteUser(id) { /* ... */ }

// Import with clear context
import * as userService from "./user-service.prism"
const user = userService.getUser(123)
```

### 4. Avoid Circular Dependencies

Structure modules to avoid circular imports:

```javascript
// Bad: Circular dependency
// a.prism: import {b} from "./b.prism"
// b.prism: import {a} from "./a.prism"

// Good: Extract shared code
// shared.prism: export common = "shared"
// a.prism: import {common} from "./shared.prism"
// b.prism: import {common} from "./shared.prism"
```

### 5. Index Modules

Create index modules for cleaner imports:

```javascript
// utils/index.prism
export * from "./math.prism"
export * from "./string.prism"
export * from "./array.prism"

// Clean import
import {add, capitalize, unique} from "./utils"
```

## Common Patterns

### Factory Modules

Export factory functions:

```javascript
// logger.prism
export function createLogger(name) {
  return {
    log: msg => console.log(`[${name}] ${msg}`),
    error: msg => console.error(`[${name}] ERROR: ${msg}`),
    warn: msg => console.warn(`[${name}] WARN: ${msg}`)
  }
}

// usage.prism
import {createLogger} from "./logger.prism"
const logger = createLogger("MyApp")
logger.log("Application started")
```

### Configuration Modules

Centralize configuration:

```javascript
// config.prism
export default {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3,
  features: {
    analytics: true,
    debug: false
  }
}

// app.prism
import config from "./config.prism"
if (config.features.debug) {
  console.log("Debug mode enabled")
}
```

### Service Modules

Organize related functionality:

```javascript
// api-service.prism
baseUrl = "https://api.example.com"

export async function get(endpoint) {
  response = await fetch(baseUrl + endpoint)
  return response.json()
}

export async function post(endpoint, data) {
  response = await fetch(baseUrl + endpoint, {
    method: "POST",
    body: JSON.stringify(data)
  })
  return response.json()
}

// usage.prism
import * as api from "./api-service.prism"
const users = await api.get("/users")
const newUser = await api.post("/users", {name: "Bob"})
```

## Limitations

Currently, the Prism module system has some limitations:

1. **No Dynamic Imports**: All imports must be static
2. **Limited Circular Dependencies**: Circular dependencies are partially supported:
   - ✅ Functions can reference each other across circular imports
   - ❌ Values cannot be used during module initialization in circular dependencies
   - Example that works:
     ```prism
     // a.prism
     import {funcB} from "./b.prism"
     export funcA = () => "A"
     export callB = () => funcB()
     
     // b.prism
     import {funcA} from "./a.prism"
     export funcB = () => "B"
     export callA = () => funcA()
     ```
   - Example that doesn't work:
     ```prism
     // a.prism
     import {valueB} from "./b.prism"
     export valueA = "A"
     
     // b.prism
     import {valueA} from "./a.prism"
     export valueB = "B uses " + valueA  // valueA is undefined here
     ```
3. **File System Based**: Modules must exist as files (no virtual modules)
4. **No Import Maps**: No support for import maps or module aliasing

These limitations may be addressed in future versions of Prism.
