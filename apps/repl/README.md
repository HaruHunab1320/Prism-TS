# @prism-lang/repl

Interactive REPL (Read-Eval-Print Loop) for the Prism programming language. Provides a command-line interface for experimenting with Prism code interactively.

<div align="center">
  <img src="https://docs.prismlang.dev/img/prism-logo-v1.png" width="160" alt="Prism logo" />
</div>

📚 **[Full Documentation](https://docs.prismlang.dev/)** | 🚀 **[Getting Started](https://docs.prismlang.dev/docs/intro)** | 🖥️ **[CLI Usage](https://docs.prismlang.dev/docs/cli)**

## Installation

The REPL is typically installed as part of the CLI package:

```bash
npm install -g @prism-lang/cli
```

## Usage

Start the REPL by running:

```bash
prism
# or
prism repl
```

## Features

- **Interactive Evaluation**: Execute Prism code line by line
- **Multi-line Input**: Support for functions and complex expressions
- **Session Management**: Track variables and execution history
- **LLM Integration**: Automatic provider detection from environment
- **Confidence Formatting**: Visual representation of confidence values
- **Built-in Commands**: Special REPL commands for session control

## REPL Commands

All REPL commands start with `:` (colon):

| Command | Description |
|---------|-------------|
| `:help` | Show available commands and examples |
| `:vars` | Display all variables in current session |
| `:clear` | Clear session (reset all variables) |
| `:history` | Show command history |
| `:stats` | Display session statistics |
| `:llm` | Show LLM provider status |
| `:stream <prompt>` | Stream token output from the default LLM provider |
| `:exit` | Exit the REPL (also Ctrl+D) |

## Examples

### Basic Usage

```prism
prism> 2 + 3
5 (number)

prism> x = 42 ~> 0.9
42 (~90.0%) (confident)

prism> greeting = "Hello, " + "World!"
"Hello, World!" (string)

prism> [1, 2, 3].map(n => n * 2)
[2, 4, 6] (array)
```

### Confidence Values

```prism
prism> prediction = "rain" ~> 0.8
"rain" (~80.0%) (confident)

prism> conf = <~ prediction
0.8 (number)

prism> certain = 100 ~> 0.99
100 (~99.0%) (confident)
```

### Functions

```prism
prism> add = (a, b) => a + b
[Function: add] (function)

prism> add(5, 3)
8 (number)

prism> greet = (name) => "Hello, " + name + "!"
[Function: greet] (function)

prism> greet("Alice")
"Hello, Alice!" (string)
```

### LLM Integration

```prism
prism> response = llm("What is the capital of France?")
"The capital of France is Paris." (~85.0%) (confident)

prism> analysis = llm("Is this code secure?", { temperature: 0.2 })
"Based on my analysis..." (~75.0%) (confident)
```

### Uncertain Control Flow

```prism
prism> value = 50 ~> 0.6
50 (~60.0%) (confident)

prism> uncertain if (value) {
...>   high { "High confidence" }
...>   medium { "Medium confidence" }
...>   low { "Low confidence" }
...> }
"Medium confidence" (string)
```

## Session Management

The REPL maintains state between commands:

```prism
prism> :vars
Session Variables:
  x: 42 (~90.0%)
  greeting: "Hello, World!"
  prediction: "rain" (~80.0%)
  add: [Function: add]

prism> :stats
Session Statistics:
  Commands executed: 8
  Successful: 7
  Failed: 1
  Session duration: 2m 15s
  Average execution time: 125ms

prism> :clear
Session cleared.

prism> :vars
Session Variables:
  (empty)
```

## Multi-line Input

The REPL automatically detects when more input is needed:

```prism
prism> function factorial(n) {
...>   if (n <= 1) {
...>     return 1
...>   }
...>   return n * factorial(n - 1)
...> }
[Function: factorial] (function)

prism> factorial(5)
120 (number)
```

## Error Handling

The REPL provides helpful error messages:

```prism
prism> x + y
❌ Error: Variable 'y' is not defined

prism> 1 / 0
Infinity (number)

prism> llm()
❌ Error: Function 'llm' expects at least 1 argument, got 0
```

## Environment Configuration

The REPL automatically detects LLM providers from environment variables:

```bash
export CLAUDE_API_KEY=your-claude-key
export GEMINI_API_KEY=your-gemini-key

prism
🚀 Prism REPL v1.0.0
🤖 LLM providers: claude, gemini, mock (default: claude)
Type :help for commands or :exit to quit

prism>
```

Without API keys:

```bash
prism
🚀 Prism REPL v1.0.0
⚠️  Only mock LLM provider available. Set CLAUDE_API_KEY or GEMINI_API_KEY for real AI integration.
Type :help for commands or :exit to quit

prism>
```

## API Reference

### PrismREPL Class

The main REPL implementation class:

```typescript
class PrismREPL {
  constructor()
  
  // Evaluate a line of input
  async evaluate(input: string): Promise<REPLResult>
  
  // Register an LLM provider
  registerLLMProvider(name: string, provider: LLMProvider): void
  
  // Set the default LLM provider
  setDefaultLLMProvider(name: string): void
  
  // Get welcome message
  getWelcomeMessage(): string
  
  // Get current variables
  getVariables(): Record<string, any>
  
  // Clear session
  clearSession(): void
  
  // Get session statistics
  getStatistics(): SessionStats
}
```

### REPLResult Interface

```typescript
interface REPLResult {
  success: boolean;
  value?: any;
  error?: string;
  type?: string;
  shouldExit?: boolean;
}
```

## Integration

The REPL is designed to be embedded in other applications:

```javascript
import { PrismREPL } from '@prism-lang/repl';
import { MockLLMProvider } from '@prism-lang/llm';

// Create REPL instance
const repl = new PrismREPL();

// Set up providers
const provider = new MockLLMProvider();
repl.registerLLMProvider('mock', provider);
repl.setDefaultLLMProvider('mock');

// Evaluate code
const result = await repl.evaluate('x = 42 ~> 0.9');
console.log(result.value); // 42 (~90.0%)
```

## Related Packages

- [`@prism-lang/core`](https://www.npmjs.com/package/@prism-lang/core) - Core language implementation
- [`@prism-lang/llm`](https://www.npmjs.com/package/@prism-lang/llm) - LLM provider integrations
- [`@prism-lang/confidence`](https://www.npmjs.com/package/@prism-lang/confidence) - Confidence extraction utilities
- [`@prism-lang/validator`](https://www.npmjs.com/package/@prism-lang/validator) - Validation toolkit
- [`@prism-lang/cli`](https://www.npmjs.com/package/@prism-lang/cli) - Command-line interface

## License

MIT
