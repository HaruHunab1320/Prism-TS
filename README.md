# 🌟 Prism: Programming with Confidence in an Uncertain World

<div align="center">

[![npm version](https://img.shields.io/npm/v/@prism/core.svg?style=for-the-badge)](https://www.npmjs.com/package/@prism/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**A programming language where uncertainty is a first-class citizen.**

[Quick Start](#-quick-start) • [Packages](#-packages) • [Documentation](#-documentation) • [Examples](#-examples) • [Contributing](#-contributing)

</div>

---

## 📦 Important: Package Migration

> **If you're using `prism-uncertainty`, please migrate to `@prism/core`**
> 
> ```bash
> npm uninstall prism-uncertainty
> npm install @prism/core
> ```

## 🚀 Quick Start

Install using your preferred package manager:

```bash
# npm
npm install @prism/core
npm install @prism/confidence  # optional

# yarn
yarn add @prism/core
yarn add @prism/confidence     # optional

# pnpm
pnpm add @prism/core
pnpm add @prism/confidence     # optional

# Install CLI globally
npm install -g @prism/cli      # or yarn/pnpm
```

### Your First Prism Program

```typescript
import { parse, createRuntime } from '@prism/core';

const code = `
  // AI responses with confidence
  analysis = llm("Is this secure?") ~> 0.85
  
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
| [`@prism/core`](./packages/prism-core) | Core language implementation (parser, runtime, types) | ![npm](https://img.shields.io/npm/v/@prism/core.svg) |
| [`@prism/confidence`](./packages/prism-confidence) | Confidence extraction from LLMs and other sources | ![npm](https://img.shields.io/npm/v/@prism/confidence.svg) |
| [`@prism/llm`](./packages/prism-llm) | LLM provider integrations (Claude, Gemini, OpenAI) | ![npm](https://img.shields.io/npm/v/@prism/llm.svg) |
| [`@prism/cli`](./apps/cli) | Command-line interface | ![npm](https://img.shields.io/npm/v/@prism/cli.svg) |
| [`@prism/repl`](./apps/repl) | Interactive REPL | ![npm](https://img.shields.io/npm/v/@prism/repl.svg) |

## ✨ Why Prism?

Every AI application deals with uncertainty, but traditional languages pretend it doesn't exist. Prism makes uncertainty explicit and manageable.

### 🎯 Uncertainty as a First-Class Citizen

```prism
// Traditional approach: Uncertainty is hidden
result = llm_call()
if (result) { /* hope for the best */ }

// Prism: Uncertainty is explicit
result = llm_call() ~> 0.7
uncertain if (result) {
  high { proceed_with_confidence() }
  medium { add_human_review() }
  low { need_more_data() }
}
```

### 🧠 Built for the AI Era

```prism
// Ensemble multiple models with confidence
claude_says = llm("Analyze risk", model: "claude") ~> 0.9
gpt_says = llm("Analyze risk", model: "gpt4") ~> 0.8
gemini_says = llm("Analyze risk", model: "gemini") ~> 0.7

// Automatically use highest confidence result
best_analysis = claude_says ~||> gpt_says ~||> gemini_says

// Confidence-aware null coalescing
decision = best_analysis ~?? fallback_analysis ~?? "manual_review"
```

### 📊 Confidence Extraction Made Easy

With `@prism/confidence`:

```typescript
import { confidence } from '@prism/confidence';

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
  confident { /* >70% */ }
  attempt { /* 30-70% */ }
  abort { /* <30% */ }
}
```

### Modern Language Features
- First-class functions and lambdas
- Pattern matching with uncertainty
- Async/await with confidence propagation
- Destructuring with confidence preservation
- Type checking with `typeof` and `instanceof`

## 🛠️ Development

> **Note**: We use pnpm and Turborepo for development. You'll need pnpm installed to contribute.

```bash
# Clone the repository
git clone https://github.com/cjpais/prism.git
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

### For Users vs Contributors

**Users**: Install our packages with any package manager (npm, yarn, pnpm)
```bash
npm install @prism/core    # Works with npm, yarn, or pnpm!
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

- [Language Guide](./docs/LANGUAGE_GUIDE.md) - Complete language reference
- [API Documentation](./docs/API.md) - All operators and functions
- [Confidence Extraction](./packages/prism-confidence/README.md) - Using @prism/confidence
- [Examples](./examples/) - Real-world usage patterns

## 🌟 Examples

### AI Safety Analysis
```prism
code = read_file("user_submission.py")
safety = llm("Analyze for vulnerabilities: " + code)

uncertain if (safety) {
  high { 
    deploy_to_production()
    log("Deployed with confidence: " + (<~ safety))
  }
  medium {
    results = run_sandboxed_tests(code)
    if (results.pass) { deploy_to_staging() }
  }
  low {
    send_to_security_team(code, safety)
  }
}
```

### Multi-Model Consensus
```prism
question = "Will it rain tomorrow?"

// Get predictions from multiple sources
weather_api = fetch_weather_api() ~> 0.8
model1 = llm(question, model: "claude") ~> 0.9  
model2 = llm(question, model: "gemini") ~> 0.85
local_sensors = analyze_pressure() ~> 0.7

// Combine predictions with confidence weighting
consensus = (weather_api ~+ model1 ~+ model2 ~+ local_sensors) ~/ 4

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

## 📄 License

MIT - See [LICENSE](./LICENSE) for details.

---

<div align="center">

Built with ❤️ for the uncertain future of programming

[Report Bug](https://github.com/cjpais/prism/issues) • [Request Feature](https://github.com/cjpais/prism/issues) • [Join Discussion](https://github.com/cjpais/prism/discussions)

</div>