# 🌟 Prism: Programming with Confidence in an Uncertain World

<div align="center">

<img src="https://docs.prismlang.dev/img/prism-logo-v1.png" width="220" alt="Prism logo" />

[![npm version](https://img.shields.io/npm/v/@prism-lang/core.svg?style=for-the-badge)](https://www.npmjs.com/package/@prism-lang/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**A programming language where uncertainty is a first-class citizen.**

[Documentation](https://docs.prismlang.dev/) • [Quick Start](#-quick-start) • [Packages](#-packages) • [Examples](#-examples) • [Contributing](#-contributing)

</div>

---

## 📦 Important: Package Migration

> **If you're using `prism-uncertainty`, please migrate to `@prism-lang/core`**
> 
> ```bash
> npm uninstall prism-uncertainty
> npm install @prism-lang/core
> ```

## 🚀 Quick Start

Install using your preferred package manager:

```bash
# npm
npm install @prism-lang/core
npm install @prism-lang/confidence  # optional

# yarn
yarn add @prism-lang/core
yarn add @prism-lang/confidence     # optional

# pnpm
pnpm add @prism-lang/core
pnpm add @prism-lang/confidence     # optional

# Install CLI globally
npm install -g @prism-lang/cli      # or yarn/pnpm
```

### 🎨 VS Code Extension

Get syntax highlighting and language support for VS Code:

```bash
# Download and install the extension
curl -L https://github.com/HaruHunab1320/Prism-TS/releases/download/v0.1.0/prism-lang-0.1.0.vsix -o prism-lang.vsix
code --install-extension prism-lang.vsix
rm prism-lang.vsix
```

Features:
- ✨ Full syntax highlighting for all Prism features
- 🎨 Semantic colors for confidence operators
- 🌈 Light and dark themes optimized for Prism
- 📝 Auto-indentation and bracket matching

### Your First Prism Program

#### Using the CLI (Recommended)

Create a file `hello.prism`:

```prism
// hello.prism
const name = "World"
const greeting = llm("Create a friendly greeting for ${name}")

console.log(greeting)

// Make decisions based on confidence
let response = llm("Should we proceed?") ~> 0.75
uncertain if (response) {
  high { console.log("✅ Proceeding with confidence!") }
  medium { console.log("⚠️ Proceeding with caution...") }
  low { console.log("❌ Too uncertain, aborting.") }
}
```

Run it:

```bash
# Execute a Prism file
prism run hello.prism
prism run --watch hello.prism  # hot reload while editing

# Stream a one-off LLM prompt (Ctrl+C to cancel)
prism llm --provider claude --model claude-3-haiku --temperature 0.2 --stream "Summarize today's status update"

# Or use the REPL for interactive development
prism

# Evaluate expressions directly
prism eval "2 + 2 ~> 0.99"

# Advanced CLI flags:
#   --model <id>               Override the provider model
#   --timeout <ms>             Abort long-running prompts
#   --include-reasoning        Request reasoning metadata when the provider supports it
#   --no-structured-output     Force plain text responses (required for streaming)
```

Inside the REPL, use `:stream <prompt>` to watch tokens arrive in real time (press `Ctrl+C` to cancel).

#### Using as a TypeScript Library

```typescript
import { parse, createRuntime } from '@prism-lang/core';

const code = `
  // AI responses with confidence
  const analysis = llm("Is this secure?") ~> 0.85
  
  // Confidence-aware decisions
  uncertain if (analysis) {
    high { deploy() }
    medium { review() }
    low { abort() }
  }
`;

const ast = parse(code);
const runtime = createRuntime();
const result = await runtime.execute(ast);
```

## 📚 Packages

Prism is organized as a monorepo with focused, modular packages:

| Package | Description | Version |
|---------|-------------|---------|
| [`@prism-lang/core`](./packages/prism-core) | Core language implementation (parser, runtime, types) | ![npm](https://img.shields.io/npm/v/@prism-lang/core.svg) |
| [`@prism-lang/confidence`](./packages/prism-confidence) | Confidence extraction from LLMs and other sources | ![npm](https://img.shields.io/npm/v/@prism-lang/confidence.svg) |
| [`@prism-lang/llm`](./packages/prism-llm) | LLM provider integrations (Claude, Gemini, OpenAI) | ![npm](https://img.shields.io/npm/v/@prism-lang/llm.svg) |
| [`@prism-lang/cli`](./apps/cli) | Command-line interface | ![npm](https://img.shields.io/npm/v/@prism-lang/cli.svg) |
| [`@prism-lang/repl`](./apps/repl) | Interactive REPL | ![npm](https://img.shields.io/npm/v/@prism-lang/repl.svg) |

## ✨ Why Prism?

Every AI application deals with uncertainty, but traditional languages pretend it doesn't exist. Prism makes uncertainty explicit and manageable.

### 🎯 Uncertainty as a First-Class Citizen

```prism
// Traditional approach: Uncertainty is hidden
let result = llm_call()
if (result) { /* hope for the best */ }

// Prism: Uncertainty is explicit
let result = llm_call() ~> 0.7
uncertain if (result) {
  high { proceed_with_confidence() }
  medium { add_human_review() }
  low { need_more_data() }
}
```

### 🧠 Built for the AI Era

```prism
// Ensemble multiple models with confidence
const claude_says = llm("Analyze risk", { provider: "claude" }) ~> 0.9
const gpt_says = llm("Analyze risk", { provider: "gpt4" }) ~> 0.8
const gemini_says = llm("Analyze risk", { provider: "gemini" }) ~> 0.7

// Automatically use highest confidence result
let best_analysis = claude_says ~||> gpt_says ~||> gemini_says

// Confidence-aware null coalescing
let decision = best_analysis ~?? fallback_analysis ~?? "manual_review"
```

### ⚙️ Configurable LLM Calls

Need a different provider, model, or temperature for a specific prompt? Pass an options object to `llm()`:

```prism
const structured = llm("Summarize the findings", {
  provider: "claude",
  model: "claude-3-sonnet",
  temperature: 0.2,
  maxTokens: 400
})

const recalibrated = llm("Explain this reasoning chain", {
  extractor: response => response.confidence * 0.8
})
```

Supported fields: `provider`, `model`, `temperature`, `maxTokens`, `topP`, `timeout`, `structuredOutput`, `includeReasoning`, `confidenceExtractor` (used by providers like `@prism-lang/llm`), and an `extractor` function that can override the returned confidence by inspecting the raw response object.

### 🔊 Streaming Inside Prism

Use `stream_llm()` to process tokens as they arrive:

```prism
let handle = stream_llm("Draft a haiku about autumn rain", { provider: "claude", structuredOutput: false })

let chunk = await handle.next()
while (chunk != null) {
  console.log(chunk.text)
  chunk = await handle.next()
}

let final = await handle.result()
console.log("Final confidence:", <~ final)
```

Call `handle.cancel()` to abort mid-stream (e.g., when a human takes over).

### 📊 Confidence Extraction Made Easy

With `@prism-lang/confidence`:

```typescript
import { confidence } from '@prism-lang/confidence';

// Extract confidence from any LLM response
const response = await llm("Is this safe?");
const conf = await confidence.extract(response);

// Multiple strategies available
const ensemble = await confidence.fromConsistency(
  () => llm("Analyze this"),
  { samples: 5 }
);

// Domain-specific calibration
const calibrated = await confidence.calibrators.security
  .calibrate(conf, { type: 'sql_injection' });
```

Note: confidence extraction is currently heuristic for most providers (due to limited log-prob access), so treat scores as decision-support signals rather than strict probabilities.

## 🔧 Language Features

### Confidence Operators
- `~>` - Assign confidence
- `<~` - Extract confidence  
- `~*`, `~/`, `~+`, `~-` - Confidence-preserving arithmetic
- `~==`, `~!=`, `~>`, `~<` - Confidence comparisons
- `~&&`, `~||` - Confidence logical operations
- `~??` - Confidence null coalescing
- `~||>` - Parallel confidence (ensemble)

### Control Flow
```prism
// Uncertain conditionals
uncertain if (measurement) {
  high { /* >70% confidence */ }
  medium { /* 30-70% confidence */ }
  low { /* <30% confidence */ }
}

// Uncertain loops
uncertain while (condition) {
  high { /* >70% */ }
  medium { /* 30-70% */ }
  low { /* <30% */ }
  default { /* fallback */ }
}

// Deterministic do/while
let count = 0
do {
  count = count + 1
} while (count < 3)
```

### Modern Language Features
- First-class functions and lambdas
- Async/await with confidence propagation
- Module system with `import`/`export`
- Confident ternary (`~?`) and confident assignment operators (`~+=`, `~-=`, `~*=`, `~/=`)
- Destructuring with confidence preservation
- Rust-style `match` expressions with guards and patterns
- Type checking with `typeof` and `instanceof`
- `try`/`catch`/`finally` error handling

## 🛠️ Development

> **Note**: We use pnpm and Turborepo for development. You'll need pnpm installed to contribute.

```bash
# Clone the repository
git clone https://github.com/HaruHunab1320/Prism-TS.git
cd prism

# Install pnpm if you don't have it
npm install -g pnpm

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start development mode
pnpm dev
```

### 📦 Publishing Packages

We use [changesets](https://github.com/changesets/changesets) to manage versioning and publishing. This ensures all packages stay in sync and peer dependencies are correctly managed.

#### Release Workflow

1. **Make your changes** and commit them
2. **Create a changeset** to describe your changes:
   ```bash
   pnpm changeset
   # or
   pnpm release:create
   ```
   - Select which packages changed
   - Choose the bump type (patch/minor/major)
   - Write a description for the changelog

3. **Check what will be released**:
   ```bash
   pnpm release:check
   ```

4. **Version the packages** (updates package.json files and changelogs):
   ```bash
   pnpm release:version
   ```
   This automatically commits the version changes.

5. **Publish to npm**:
   ```bash
   pnpm release:publish
   ```
   This builds all packages, publishes them, and pushes git tags.

#### Important Notes

- **Never use** `pnpm publish` directly - it won't handle workspace protocols correctly
- All @prism-lang/* packages use **fixed versioning** - they move together
- Changesets automatically handles peer dependency version updates
- The `workspace:*` protocol is used for local development and automatically replaced during publishing

### For Users vs Contributors

**Users**: Install our packages with any package manager (npm, yarn, pnpm)
```bash
npm install @prism-lang/core    # Works with npm, yarn, or pnpm!
```

**Contributors**: Development requires pnpm for workspace management
```bash
pnpm install              # Must use pnpm for development
```

### Repository Structure
```
prism/
├── packages/
│   ├── prism-core/        # Core language implementation
│   ├── prism-confidence/  # Confidence extraction library
│   └── prism-llm/         # LLM provider integrations
├── apps/
│   ├── cli/               # Command-line interface
│   └── repl/              # Interactive REPL
├── examples/              # Example Prism programs
├── docs/                  # Documentation
├── pnpm-workspace.yaml    # pnpm workspace configuration
└── turbo.json            # Turborepo configuration
```

## 📖 Documentation

**[📚 Full Documentation](https://docs.prismlang.dev/)**

- [Getting Started](https://docs.prismlang.dev/docs/intro) - Quick start guide
- [Language Guide](https://docs.prismlang.dev/docs/language-guide/) - Complete language reference
- [API Reference](https://docs.prismlang.dev/docs/api/core/parser) - All functions and operators
- [Confidence Extraction](https://docs.prismlang.dev/docs/confidence/) - Using @prism-lang/confidence
- [Examples](https://docs.prismlang.dev/docs/examples/) - Real-world usage patterns

## 🌟 Examples

### AI Safety Analysis
```prism
let code = read_file("user_submission.py")
let safety = llm("Analyze for vulnerabilities: " + code)

uncertain if (safety) {
  high { 
    deploy_to_production()
    log("Deployed with confidence: " + (<~ safety))
  }
  medium {
    let results = run_sandboxed_tests(code)
    if (results.pass) { deploy_to_staging() }
  }
  low {
    send_to_security_team(code, safety)
  }
}
```

### Multi-Model Consensus
```prism
let question = "Will it rain tomorrow?"

// Get predictions from multiple sources
let weather_api = fetch_weather_api() ~> 0.8
let model1 = llm(question, { provider: "claude" }) ~> 0.9  
let model2 = llm(question, { provider: "gemini" }) ~> 0.85
let local_sensors = analyze_pressure() ~> 0.7

// Combine predictions with confidence weighting
let consensus = (weather_api ~+ model1 ~+ model2 ~+ local_sensors) ~/ 4

uncertain if (consensus) {
  high { "Definitely bring an umbrella! ☔" }
  medium { "Maybe pack a raincoat 🧥" }
  low { "Enjoy the sunshine! ☀️" }
}
```

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](./CONTRIBUTING.md) for details.

### Key areas for contribution:
- Language features and operators
- Confidence extraction strategies
- LLM provider integrations
- Documentation and examples
- Testing and benchmarks

### R&D
- Lumina — confidence-native model architecture (R&D)

## 📄 License

MIT - See [LICENSE](./LICENSE) for details.

---

<div align="center">

Built with ❤️ for the uncertain future of programming

[Report Bug](https://github.com/HaruHunab1320/Prism-TS/issues) • [Request Feature](https://github.com/HaruHunab1320/Prism-TS/issues) • [Join Discussion](https://github.com/HaruHunab1320/Prism-TS/discussions)

</div>
