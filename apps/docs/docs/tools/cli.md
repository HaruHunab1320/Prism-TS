---
sidebar_position: 1
title: Command Line Interface (CLI)
description: Complete guide to the Prism CLI for developing and running Prism programs. Learn how to execute files, evaluate expressions, use the interactive REPL, and configure LLM providers.
keywords: [prism CLI, command line interface, prism run, prism eval, prism REPL, interactive development, LLM configuration, prism-lang/cli, developer tools]
---

# Command Line Interface (CLI)

The Prism CLI provides a complete environment for developing and running Prism programs.

## Installation

```bash
# Install globally with npm
npm install -g @prism-lang/cli

# Or with yarn
yarn global add @prism-lang/cli

# Or with pnpm
pnpm add -g @prism-lang/cli
```

## Commands

### `prism run [--watch] <file>`

Execute a Prism program from a file.

```bash
# Run a Prism file
prism run script.prism

# Enable hot reload (invalidates the changed module + dependents)
prism run --watch script.prism

# Example output
🚀 Running script.prism...

Result: Hello from Prism! (~0.85)
```

**Features:**
- Executes `.prism` files
- Optional `--watch` flag for hot reload (uses the runtime module reloader so imports are refreshed in-place)
- Shows confidence values in output
- Supports all Prism language features
- Configures LLM providers from environment

### `prism eval <code>`

Evaluate Prism expressions directly from the command line.

```bash
# Simple expression
prism eval "2 + 2"
# Output: 4

# With confidence
prism eval "42 ~> 0.9"
# Output: 42 (~0.9)

# Multi-word expressions
prism eval "x = 10; x * 2"
# Output: 20

# LLM calls
prism eval 'llm("Hello AI!")'
# Output: Hello! How can I help you today? (~0.85)
```

### `prism llm [options] <prompt>`

Send a one-off LLM prompt directly from the terminal. Add `--stream` to see tokens as they arrive.

```bash
# Simple completion
prism llm "Generate three product names"

# Stream output with provider override
prism llm --provider claude --stream "Summarize today's status update"
```

**Useful flags:**
- `--provider, -p <name>` – choose a configured provider (default environment selection)
- `--stream` / `--no-stream` – toggle live streaming (Ctrl+C to cancel)
- `--temperature <value>` – adjust sampling temperature
- `--maxTokens <value>` / `--topP <value>` – advanced sampling controls
- `--model <id>` – override the model for this invocation
- `--timeout <ms>` – abort the request after the given time budget
- `--include-reasoning` / `--no-include-reasoning` – ask providers to attach reasoning traces
- `--structured-output` / `--no-structured-output` – force JSON-style output or plain text (streaming requires `--no-structured-output`)

### `prism` or `prism repl`

Launch the interactive REPL (Read-Eval-Print Loop).

```bash
prism
# Welcome to Prism REPL v1.0.23
# Type expressions and see results with confidence tracking
# Commands: :help, :vars, :clear, :exit
# 
# prism> 
```

**REPL Features:**
- Interactive expression evaluation
- Variable persistence across commands
- Command history
- Special commands (`:help`, `:vars`, etc.)
- Multi-line input support

### `prism --version` or `prism -v`

Display the installed version.

```bash
prism --version
# Prism v1.0.23
```

### `prism --help` or `prism -h`

Show help information and available commands.

## Configuration

### LLM Provider Setup

The CLI automatically configures LLM providers from environment variables:

```bash
# Claude (Anthropic)
export CLAUDE_API_KEY=your-api-key

# Google Gemini
export GEMINI_API_KEY=your-api-key

# Default provider (optional)
export PRISM_DEFAULT_LLM=claude  # or 'gemini'
```

### Environment Files

The CLI loads `.env` files automatically if present:

```bash
# .env file in your project
CLAUDE_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
PRISM_DEFAULT_LLM=claude
```

## Examples

### Basic Script

```javascript
// analyze.prism
data = "User feedback: The product is amazing but shipping was slow"

sentiment = llm("Analyze sentiment: ${data}") ~> 0.9
entities = llm("Extract entities: ${data}") ~> 0.85

console.log("Sentiment:", sentiment)
console.log("Entities:", entities)

uncertain if (sentiment) {
  high { 
    console.log("✅ Positive feedback detected")
  }
  medium { 
    console.log("⚠️ Mixed feedback detected")
  }
  low { 
    console.log("❌ Negative feedback detected")
  }
}
```

Run with: `prism run analyze.prism`

### Interactive Development

```bash
$ prism
Welcome to Prism REPL v1.0.23

prism> x = 10 ~> 0.95
10 (~0.95) (confident)

prism> y = 20 ~> 0.90
20 (~0.9) (confident)

prism> x + y
30 (~0.9) (confident)

prism> :vars
Session Variables:
  x: 10 (~95.0%)
  y: 20 (~90.0%)

prism> analysis = llm("What is ${x} + ${y}?")
The sum of 10 + 20 equals 30. (confident)

prism> :exit
Goodbye! 👋
```

### Pipeline Processing

```bash
# Process data through multiple transformations
prism eval 'data = "raw text" |> clean |> analyze |> summarize'

# With confidence tracking
prism eval 'result = input ~> 0.8 |> process ~> 0.9 |> validate ~> 0.95'
```

## Error Handling

The CLI provides clear error messages:

```bash
# Syntax errors
prism eval "x = "
❌ Error: Expected expression after '='

# Runtime errors
prism run nonexistent.prism
❌ Error: File not found: nonexistent.prism

# LLM configuration
prism eval 'llm("test")'
⚠️  Only mock LLM provider available. Set CLAUDE_API_KEY or GEMINI_API_KEY for real AI integration.
```

## Tips

1. **Use the REPL for experimentation** - Test expressions interactively before adding to scripts
2. **Check confidence values** - The CLI always shows confidence in output
3. **Set up LLM providers** - Export API keys for real AI capabilities
4. **Use `.env` files** - Keep API keys secure and out of scripts
5. **Leverage multi-line input** - The CLI handles complex expressions naturally

## Troubleshooting

### LLM Provider Not Working

```bash
# Check available providers
prism eval ":llm"

# Verify environment variables
echo $CLAUDE_API_KEY
echo $GEMINI_API_KEY
```

### Command Not Found

```bash
# Verify installation
npm list -g @prism-lang/cli

# Reinstall if needed
npm install -g @prism-lang/cli
```

### File Encoding Issues

Ensure `.prism` files are saved with UTF-8 encoding for proper string handling.
#### Watch Mode

Use `--watch` (or `-w`) to keep the same runtime alive while editing files. When a watched file changes, Prism invalidates that module, re-runs it (plus any dependents), and logs the results without restarting the CLI. This is ideal for multi-module projects or long-lived runtimes that keep LLM providers in memory.
