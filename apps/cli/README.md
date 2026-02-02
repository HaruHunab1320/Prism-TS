# @prism-lang/cli

Command-line interface for the Prism programming language.

<div align="center">
  <img src="https://docs.prismlang.dev/img/prism-logo-v1.png" width="160" alt="Prism logo" />
</div>

📚 **[Full Documentation](https://docs.prismlang.dev/)** | 🚀 **[Getting Started](https://docs.prismlang.dev/docs/intro)** | 💻 **[CLI Guide](https://docs.prismlang.dev/docs/cli)**

## Installation

```bash
# Install globally
npm install -g @prism-lang/cli

# Or use with npx
npx @prism-lang/cli
```

## Usage

### Run a Prism file
```bash
prism run myfile.prism

# Hot reload on changes
prism run --watch myfile.prism
```

### Start the REPL
```bash
prism repl
```

### Execute inline code
```bash
prism eval "x = 5 ~> 0.9; x"
```

### Send an LLM prompt
```bash
# Stream tokens from a specific provider/model
prism llm --provider claude --model claude-3-haiku --stream "Draft a haiku about autumn rain"

# Request reasoning metadata and disable structured output
prism llm --include-reasoning --no-structured-output "Explain why the sky is blue"
```

### Check version
```bash
prism --version
```

## Features

- **Run Prism files**: Execute `.prism` files from the command line (with optional `--watch` hot reload)
- **Interactive REPL**: Explore Prism interactively with confidence tracking
- **Inline evaluation**: Quick one-liners for testing
- **LLM Integration**: Built-in support for AI providers with per-command overrides (provider, model, temperature, tokens, reasoning, structured output)

## Configuration

Set up LLM providers with environment variables:

```bash
# Anthropic Claude
export CLAUDE_API_KEY=your-key

# Google Gemini
export GEMINI_API_KEY=your-key
```

## Examples

```bash
# Run a file with AI safety checks
prism run safety-check.prism

# Enable hot reload for local development
prism run --watch app.prism

# Start REPL with confidence tracking
prism repl

# Quick calculation with uncertainty
prism eval "temp = 72 ~> 0.95; <~ temp"
```

## Related Packages

- [`@prism-lang/core`](https://www.npmjs.com/package/@prism-lang/core) - Core language implementation
- [`@prism-lang/llm`](https://www.npmjs.com/package/@prism-lang/llm) - LLM provider integrations
- [`@prism-lang/confidence`](https://www.npmjs.com/package/@prism-lang/confidence) - Confidence extraction utilities
- [`@prism-lang/validator`](https://www.npmjs.com/package/@prism-lang/validator) - Validation toolkit
- [`@prism-lang/repl`](https://www.npmjs.com/package/@prism-lang/repl) - Interactive REPL

## License

MIT
