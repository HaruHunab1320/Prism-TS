# @prism-lang/cli

Command-line interface for the Prism programming language.

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
```

### Start the REPL
```bash
prism repl
```

### Execute inline code
```bash
prism eval "x = 5 ~> 0.9; print(x)"
```

### Check version
```bash
prism --version
```

## Features

- **Run Prism files**: Execute `.prism` files from the command line
- **Interactive REPL**: Explore Prism interactively with confidence tracking
- **Inline evaluation**: Quick one-liners for testing
- **LLM Integration**: Built-in support for AI providers when configured

## Configuration

Set up LLM providers with environment variables:

```bash
# Anthropic Claude
export ANTHROPIC_API_KEY=your-key

# Google Gemini
export GOOGLE_GENERATIVE_AI_API_KEY=your-key

# OpenAI
export OPENAI_API_KEY=your-key
```

## Examples

```bash
# Run a file with AI safety checks
prism run safety-check.prism

# Start REPL with confidence tracking
prism repl

# Quick calculation with uncertainty
prism eval "temp = 72 ~> 0.95; print('Temperature:', temp)"
```

## Related Packages

- [`@prism-lang/core`](https://www.npmjs.com/package/@prism-lang/core) - Core language implementation
- [`@prism-lang/llm`](https://www.npmjs.com/package/@prism-lang/llm) - LLM provider integrations
- [`@prism-lang/confidence`](https://www.npmjs.com/package/@prism-lang/confidence) - Confidence extraction library

## License

MIT