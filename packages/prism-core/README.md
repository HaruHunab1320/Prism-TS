# @prism-lang/core

Core implementation of the Prism programming language - a language designed for expressing and managing uncertainty in computational systems.

📚 **[Full Documentation](https://docs.prismlang.dev/)** | 🚀 **[Getting Started](https://docs.prismlang.dev/docs/intro)** | 📖 **[API Reference](https://docs.prismlang.dev/docs/api/core/parser)**

## Installation

```bash
npm install @prism-lang/core
```

## Quick Start

### Simple Usage

```javascript
import { runPrism } from '@prism-lang/core';

// Run Prism code directly
const result = await runPrism('x = 5 ~> 0.9; x * 2');
console.log(result); // { value: 10, confidence: 0.9 }

// With custom globals
const result2 = await runPrism('PI * radius * radius', {
  globals: { PI: 3.14159, radius: 5 }
});

// With LLM provider
import { MockLLMProvider } from '@prism-lang/llm';

const provider = new MockLLMProvider();
const result3 = await runPrism('response = llm("Hello"); response', {
  llmProvider: provider
});
```

> **Note**: The `globals` option currently only supports primitive values (numbers, strings, booleans) and simple objects. Functions cannot be injected as globals due to runtime limitations.

### Advanced Usage

```javascript
import { parse, createRuntime } from '@prism-lang/core';

const code = `
  // Confidence values
  prediction = "rain" ~> 0.8
  temperature = 72 ~> 0.95
  
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
- **LLM Integration**: Built-in `llm()` function with automatic confidence
- **Functional Programming**: Lambdas, array methods, destructuring
- **Pipeline Operator**: Chain operations with `|>` for cleaner code

## Language Guide

### Basic Confidence

```prism
// Assign confidence
value = 100 ~> 0.9

// Extract confidence
conf = <~ value

// Confidence operations
doubled = value ~* 2  // Maintains confidence
combined = value1 ~||> value2  // Picks highest confidence
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
response = llm("Is this safe?")
conf = <~ response  // Automatic confidence extraction

// With confidence threshold
safe = response ~> 0.9
if (<~ safe >= 0.9) {
  proceed()
}
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
- `createRuntime(): Runtime` - Create a new runtime instance
- `runtime.execute(ast: Program): Promise<Value>` - Execute AST
- `runtime.registerLLMProvider(name: string, provider: LLMProvider)` - Register LLM provider
- `runtime.setDefaultLLMProvider(name: string)` - Set default LLM provider

### Value Types
- `NumberValue`, `StringValue`, `BooleanValue`
- `ArrayValue`, `ObjectValue`, `FunctionValue`
- `ConfidenceValue` - Wraps any value with confidence
- `NullValue`, `UndefinedValue`

### Built-in Functions
- `llm(prompt: string, options?: object)` - Make LLM calls (requires provider setup)
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

See the [examples directory](https://github.com/uncertainty-lang/prism/tree/main/examples) for more complex examples.

## Related Packages

- [`@prism-lang/llm`](https://www.npmjs.com/package/@prism-lang/llm) - LLM provider integrations
- [`@prism-lang/confidence`](https://www.npmjs.com/package/@prism-lang/confidence) - Confidence extraction utilities
- [`@prism-lang/cli`](https://www.npmjs.com/package/@prism-lang/cli) - Command-line interface
- [`@prism-lang/repl`](https://www.npmjs.com/package/@prism-lang/repl) - Interactive REPL

## License

MIT