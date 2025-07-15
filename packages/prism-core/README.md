# @prism-lang/core

Core implementation of the Prism programming language - a language designed for expressing and managing uncertainty in computational systems.

## Installation

```bash
npm install @prism-lang/core
```

## Quick Start

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
- **Uncertain Control Flow**: `uncertain if` with high/medium/low branches
- **LLM Integration**: Built-in `llm()` function with automatic confidence
- **Functional Programming**: Lambdas, array methods, destructuring
- **Pattern Matching**: Powerful pattern matching with confidence support

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
    // 0.3 <= confidence < 0.7
    request_human_review()
  }
  low {
    // confidence < 0.3
    abort_and_log()
  }
}
```

### LLM Integration

```prism
response = llm("Is this safe?", { model: "claude" })
conf = <~ response  // Automatic confidence extraction

// With confidence threshold
safe = response ~> 0.9
if (<~ safe >= 0.9) {
  proceed()
}
```

## API Reference

### Parser
- `parse(code: string): Program` - Parse Prism code into AST

### Runtime
- `createRuntime(): Runtime` - Create a new runtime instance
- `runtime.execute(ast: Program): Promise<Value>` - Execute AST

### Value Types
- `NumberValue`, `StringValue`, `BooleanValue`
- `ArrayValue`, `ObjectValue`, `FunctionValue`
- `ConfidenceValue` - Wraps any value with confidence
- `NullValue`, `UndefinedValue`

## Examples

See the [examples directory](https://github.com/uncertainty-lang/prism/tree/main/examples) for more complex examples.

## Related Packages

- [`@prism-lang/llm`](https://www.npmjs.com/package/@prism-lang/llm) - LLM provider integrations
- [`@prism-lang/confidence`](https://www.npmjs.com/package/@prism-lang/confidence) - Confidence extraction utilities
- [`@prism-lang/cli`](https://www.npmjs.com/package/@prism-lang/cli) - Command-line interface
- [`@prism-lang/repl`](https://www.npmjs.com/package/@prism-lang/repl) - Interactive REPL

## License

MIT