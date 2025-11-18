---
sidebar_position: 2
title: Interactive REPL
description: Explore the Prism REPL (Read-Eval-Print Loop) for interactive experimentation. Learn REPL commands, multi-line input, LLM integration, and advanced features for testing Prism code.
keywords: [prism REPL, interactive programming, read-eval-print loop, prism commands, interactive shell, LLM testing, confidence tracking, developer tools, prism repl commands]
---

# Interactive REPL

The Prism REPL (Read-Eval-Print Loop) provides an interactive environment for experimenting with Prism code.

## Accessing the REPL

```bash
# Launch the REPL
prism

# Or explicitly
prism repl
```

## Features

### Interactive Evaluation

Type expressions and see immediate results with confidence tracking:

```
prism> 2 + 3
5 (number)

prism> "Hello" + " World"
Hello World (string)

prism> 42 ~> 0.85
42 (~0.85) (confident)

prism> x = 10
10 (number)

prism> x * 2
20 (number)
```

### Multi-line Input

The REPL automatically detects incomplete expressions:

```
prism> result = {
...>   value: 42,
...>   confidence: 0.9
...> }
{ value: 42, confidence: 0.9 } (object)

prism> uncertain if (result.confidence > 0.8) {
...>   high { "Very confident" }
...>   low { "Not confident" }
...> }
Very confident (string)
```

### Variable Persistence

Variables persist across REPL sessions:

```
prism> name = "Alice"
Alice (string)

prism> score = 95 ~> 0.9
95 (~0.9) (confident)

prism> greeting = "Hello, ${name}! Your score is ${score}"
Hello, Alice! Your score is 95 (string)
```

## REPL Commands

### `:help`

Display available commands and shortcuts:

```
prism> :help

🌟 Prism REPL Commands 🌟

:help     - Show this help message
:vars     - Display all variables in current session
:clear    - Clear all variables and reset session
:history  - Show command history
:stats    - Display session statistics
:llm      - Show LLM provider status
:exit     - Exit the REPL (or use Ctrl+D)

Tips:
- Use TAB for auto-completion (coming soon)
- Use UP/DOWN arrows for command history
- Multi-line expressions are supported
- Confidence values are shown as (~n.n)
```

### `:vars`

Show all variables in the current session:

```
prism> x = 10
10 (number)

prism> y = 20 ~> 0.8
20 (~0.8) (confident)

prism> name = "Prism"
Prism (string)

prism> :vars
Session Variables:
  x: 10
  y: 20 (~80.0%)
  name: Prism
```

### `:clear`

Reset the session and clear all variables:

```
prism> x = 42
42 (number)

prism> :clear
Session cleared.

prism> x
❌ Error: Undefined variable: x
```

### `:history`

View command history from the current session:

```
prism> :history
Command History:
  1. x = 10
  2. y = 20
  3. x + y
  4. llm("Hello")
  5. :history
```

### `:stats`

Display session statistics:

```
prism> :stats
Session Statistics:
  Total Evaluations: 15
  Successful: 13
  Errors: 2
  Variables: 5
  Uptime: 3m 42s
```

### `:llm`

Check LLM provider status:

```
prism> :llm
LLM Provider Status:
  Active Providers: claude, gemini
  Default Provider: claude
  
Available models:
  - claude: Claude 3 Opus
  - gemini: Gemini Pro
  - mock: Mock Provider (for testing)
```

### `:stream <prompt>`

Stream an LLM response without writing Prism code. Streaming can be cancelled with `Ctrl+C`.

```
prism> :stream Draft a haiku about autumn rain
Drafting a gentle haiku about the autumn rain...
Soft rain threads the dusk
Amber leaves whisper on stone
Evening sips the mist

Confidence: 0.86
```

### `:exit`

Exit the REPL:

```
prism> :exit
Goodbye! Thanks for using Prism. 🚀
```

You can also use `Ctrl+D` to exit.

## LLM Integration

The REPL fully supports LLM calls:

```
prism> response = llm("What is 2 + 2?")
The answer to 2 + 2 is 4. (confident)

prism> analysis = llm("Analyze sentiment: 'Great product!'") ~> 0.9
The sentiment is positive - the phrase "Great product!" expresses satisfaction and enthusiasm. (~0.9) (confident)

prism> uncertain if (analysis) {
...>   high { "Positive sentiment confirmed" }
...>   medium { "Likely positive" }
...>   low { "Unclear sentiment" }
...> }
Positive sentiment confirmed (string)
```

## Advanced Usage

### Confidence Propagation

Watch how confidence flows through operations:

```
prism> a = 100 ~> 0.9
100 (~0.9) (confident)

prism> b = 50 ~> 0.8
50 (~0.8) (confident)

prism> a + b
150 (~0.8) (confident)  // Uses minimum confidence

prism> a ~+ b
150 (~0.72) (confident) // Multiplies confidences
```

### Pipeline Operations

```
prism> data = "hello world"
hello world (string)

prism> data |> toUpperCase |> split(" ") |> join("-")
HELLO-WORLD (string)

prism> [1, 2, 3, 4, 5] |> filter(n => n > 2) |> map(n => n * 2)
[6, 8, 10] (array)
```

### Error Recovery

The REPL gracefully handles errors:

```
prism> x = 
❌ Error: Expected expression after '='

prism> invalid syntax here
❌ Error: Unexpected token 'syntax'

prism> 2 + 2  // REPL continues working
4 (number)
```

## Configuration

### Setting Default LLM Provider

```
prism> runtime.setDefaultLLMProvider("gemini")
Default LLM provider set to: gemini

prism> llm("test")  // Now uses Gemini
This is a test response from Gemini. (confident)
```

### Custom Prompts

```
prism> prompt = "You are a helpful assistant. "
You are a helpful assistant.  (string)

prism> llm(prompt + "What is Prism?")
Prism is a programming language designed for uncertainty-aware computing... (confident)
```

## Tips and Tricks

1. **Quick Testing**: Use the REPL to test expressions before adding them to scripts
2. **Confidence Experiments**: Try different confidence values to see how they propagate
3. **LLM Debugging**: Test LLM prompts interactively before using in production
4. **Variable Inspection**: Use `:vars` frequently to track your session state
5. **History Navigation**: Use arrow keys to recall and modify previous commands

## Integration with VS Code

If you have the Prism VS Code extension installed, you can:

1. Send selections from `.prism` files to the REPL
2. Save REPL sessions as `.prism` files
3. Get syntax highlighting in REPL output (coming soon)

## Programmatic Usage

The REPL can also be used programmatically:

```typescript
import { PrismREPL } from '@prism-lang/repl';

const repl = new PrismREPL();

// Evaluate expressions
const result = await repl.evaluate('2 + 2');
console.log(result); 
// { success: true, value: '4', type: 'number' }

// Check variables
const vars = repl.getVariables();

// Get session stats
const stats = repl.getSessionStats();
```
