# @prism-lang/core

Core implementation of the Prism programming language - a language designed for expressing and managing uncertainty in computational systems.

<div align="center">
  <img src="https://docs.prismlang.dev/img/prism-logo-v1.png" width="160" alt="Prism logo" />
</div>

📚 **[Full Documentation](https://docs.prismlang.dev/)** | 🚀 **[Getting Started](https://docs.prismlang.dev/docs/intro)** | 📖 **[API Reference](https://docs.prismlang.dev/docs/api/core/parser)**

## Installation

```bash
npm install @prism-lang/core
```

## Quick Start

The easiest way to run Prism code is using the `runPrism` helper function, which handles parsing and runtime setup for you.

### Simple Usage

```javascript
import { runPrism } from '@prism-lang/core';

// Run Prism code directly
const result = await runPrism('const x = 5 ~> 0.9; x * 2');
console.log(result); // ConfidenceValue { value: 10, confidence: 0.9 }

// Access the actual value
console.log(result.value); // 10
console.log(result.confidence); // 0.9

// With custom globals
const result2 = await runPrism('const area = PI * radius * radius; area', {
  globals: { PI: 3.14159, radius: 5 }
});
console.log(result2); // 78.53975

// With LLM provider
import { MockLLMProvider } from '@prism-lang/llm';

const provider = new MockLLMProvider();
provider.setMockResponse('Hello! How can I help?', 0.85);

const result3 = await runPrism('const response = llm("Hello"); response', {
  llmProvider: provider
});
console.log(result3.value); // "Hello! How can I help?"
console.log(result3.confidence); // 0.85
```

> **Note**: The `globals` option currently only supports primitive values (numbers, strings, booleans) and simple objects. Functions cannot be injected as globals due to runtime limitations.

### Advanced Usage

```javascript
import { parse, createRuntime } from '@prism-lang/core';

const code = `
  // Confidence values
  const prediction = "rain" ~> 0.8
  const temperature = 72 ~> 0.95
  
  // Confidence-aware control flow
  uncertain if (prediction) {
    high { "definitely raining" }
    medium { "might rain" }
    low { "probably sunny" }
  }
`;

const ast = parse(code);
const runtime = createRuntime();
const result = await runtime.execute(ast);
```

## Features

- **Confidence Values**: First-class support for uncertainty with the `~>` operator
- **Confidence Operators**: Extract (`<~`), multiply (`~*`), combine (`~||>`)
- **Uncertain Control Flow**: `uncertain if/while/for` with high/medium/low/default branches
- **Adaptive Confidence**: Default branches for confidence recalibration and fallback logic
- **Pattern Matching**: Rust-style `match` expressions with guards and nested patterns
- **Confidence Helpers**: Built-in `consensus()` and `aggregate()` helpers
- **LLM Integration**: Built-in `llm()` function with automatic confidence
- **Functional Programming**: Lambdas, array methods, destructuring
- **Pipeline Operator**: Chain operations with `|>` for cleaner code

## Language Guide

### Basic Confidence

```prism
// Assign confidence
const value = 100 ~> 0.9

// Extract confidence
const conf = <~ value

// Confidence operations
const doubled = value ~* 2  // Maintains confidence
const combined = value1 ~||> value2  // Picks highest confidence
```

### Uncertain Control Flow

```prism
uncertain if (measurement) {
  high {
    // confidence >= 0.7
    perform_critical_action()
  }
  medium {
    // 0.5 <= confidence < 0.7
    request_human_review()
  }
  low {
    // confidence < 0.5
    abort_and_log()
  }
}

// With default branch for unmatched cases
uncertain while (sensor_reading ~> confidence) {
  high {
    process_automatically()
  }
  low {
    skip_reading()
  }
  default {
    // Handle cases where branch is missing
    // or confidence needs recalibration
    confidence = recalibrate_sensor()
    if (confidence < 0.1) break
  }
}
```

### LLM Integration

```prism
// Note: llm() requires provider setup first
const response = llm("Is this safe?")
const conf = <~ response  // Automatic confidence extraction

// With confidence threshold
const safe = response ~> 0.9
if (<~ safe >= 0.9) {
  proceed()
}
```

`llm(prompt, options?)` accepts per-call configuration. Pass `{ provider, model, temperature, maxTokens, topP, timeout, structuredOutput, includeReasoning, confidenceExtractor }` to tweak the `LLMRequest`, or supply an `extractor` function that receives the raw response object and returns a custom confidence (number or confident value).

Need live tokens? Use `stream_llm()`:

```prism
handle = stream_llm("Summarize the incident report", { provider: "claude", structuredOutput: false })

chunk = await handle.next()
while (chunk) {
  console.log(chunk.text)
  chunk = await handle.next()
}

final = await handle.result()
console.log("Summary:", final.value)
```

```prism
const analysis = llm("Assess rollout risk", {
  provider: "claude",
  model: "claude-3-sonnet",
  temperature: 0.25,
  extractor: response => response.confidence * 0.9
})
```

## API Reference

### Helper Functions
- `runPrism(code: string, options?: RunPrismOptions): Promise<Value>` - Run Prism code directly
  - `options.globals` - Object with global variables to inject
  - `options.llmProvider` - LLM provider instance
  - `options.defaultProviderName` - Name for the LLM provider (default: 'default')

### Parser
- `parse(code: string): Program` - Parse Prism code into AST

### Runtime
- `createRuntime(options?: RuntimeOptions): Runtime` - Create a new runtime. Pass `{ moduleSystem }` to share a preconfigured module loader (custom file readers, caches) across runtimes, and `{ confidence }` to tune confidence propagation/provenance.
- `runtime.execute(ast: Program): Promise<Value>` - Execute AST
- `runtime.registerLLMProvider(name: string, provider: LLMProvider)` - Register LLM provider
- `runtime.setDefaultLLMProvider(name: string)` - Set default LLM provider
- `runtime.getModuleSystem(): ModuleSystem` - Access the module system used by the runtime
- `runtime.invalidateModule(path: string, options?: { invalidateDependents?: boolean })` - Drop a module (and optionally its dependents) from the cache
- `runtime.reloadModule(path: string, options?: { invalidateDependents?: boolean }): Promise<Module>` - Convenience helper that invalidates the module, reloads it, and returns the new `Module` object (useful for hot reload tools)

`RuntimeOptions`
```ts
interface RuntimeOptions {
  moduleSystem?: ModuleSystem; // defaults to a new ModuleSystem()
  confidence?: {
    strategy?: {
      combineMode?: 'average' | 'min' | 'max' | 'multiply';
      consensus?: 'max' | 'min' | 'average';
    };
    trackProvenance?: boolean;
  };
}
```

### Value Types
- `NumberValue`, `StringValue`, `BooleanValue`
- `ArrayValue`, `ObjectValue`, `FunctionValue`
- `ConfidenceValue` - Wraps any value with confidence
- `NullValue` (the `undefined` keyword maps to `null`)

### Built-in Functions
- `llm(prompt: string, options?: LLMCallOptions)` - Make LLM calls (requires provider setup). `options` supports `{ provider, model, temperature, maxTokens, topP, timeout, structuredOutput, includeReasoning, confidenceExtractor, extractor }`.
- `stream_llm(prompt: string, options?: LLMCallOptions)` - Return a stream handle with `next()`, `cancel()`, and `result()` helpers for incremental output.
- `consensus(values: Array<value>, options?: { strategy?: 'max' | 'min' | 'average' })` - Pick a representative confident value from multiple candidates.
- `aggregate(values: Array<value>, options?: { mode?: 'average' | 'min' | 'max' | 'multiply' })` - Combine confidence from multiple candidates.
- `map(array: Array, fn: Function)` - Map over array elements
- `filter(array: Array, fn: Function)` - Filter array elements
- `reduce(array: Array, fn: Function, initial?: any)` - Reduce array to single value
- `max(...values: number[])` - Find maximum value
- `min(...values: number[])` - Find minimum value
- Array and Object methods are available as built-in functions
- Note: Use `console.log()` for output (no built-in `print` function)

### Array Methods
Arrays support the following methods:
- `.map(fn)` - Transform elements
- `.filter(fn)` - Filter elements
- `.reduce(fn, initial?)` - Reduce to single value
- `.push(...items)` - Add elements
- `.forEach(fn)` - Iterate over elements
- `.join(separator?)` - Join elements as string
- `.length` - Get array length

## Examples

See [`packages/prism-examples`](https://github.com/HaruHunab1320/Prism-TS/tree/main/packages/prism-examples) for more complex examples.

## Related Packages

- [`@prism-lang/llm`](https://www.npmjs.com/package/@prism-lang/llm) - LLM provider integrations
- [`@prism-lang/confidence`](https://www.npmjs.com/package/@prism-lang/confidence) - Confidence extraction utilities
- [`@prism-lang/validator`](https://www.npmjs.com/package/@prism-lang/validator) - Validation toolkit
- [`@prism-lang/cli`](https://www.npmjs.com/package/@prism-lang/cli) - Command-line interface
- [`@prism-lang/repl`](https://www.npmjs.com/package/@prism-lang/repl) - Interactive REPL

## License

MIT
