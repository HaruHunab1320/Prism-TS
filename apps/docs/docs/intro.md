---
sidebar_position: 1
title: Introduction
---

# Welcome to Prism

**Prism** is a programming language where uncertainty is a first-class citizen. In a world where AI responses, sensor readings, and complex computations carry inherent uncertainty, Prism makes this uncertainty explicit and manageable.

## Why Prism?

Traditional programming languages treat all values as certain. But in reality:
- AI/LLM responses have varying confidence levels
- Sensor readings contain noise and measurement errors
- Complex calculations propagate uncertainty
- Business decisions often depend on confidence thresholds

Prism solves this by making uncertainty a core language feature.

## Key Features

### 🎯 Confidence Values
Attach confidence levels to any value:
```prism
temperature = 72.5 ~> 0.95  // 72.5°F with 95% confidence
analysis = llm("Is this secure?") ~> 0.8
```

### 🔄 Uncertainty Propagation
Confidence automatically flows through calculations:
```prism
avg_temp = (temp1 ~> 0.9 + temp2 ~> 0.85) / 2
// Result carries combined uncertainty
```

### 🌊 Confidence-Based Control Flow
Make decisions based on confidence levels:
```prism
uncertain if (analysis ~> 0.7) {
  high { deploy_to_production() }
  medium { request_human_review() }
  low { reject_with_explanation() }
}
```

### 🤖 Built-in AI Integration
Native LLM support with automatic confidence extraction:
```prism
response = llm("Analyze this code for vulnerabilities")
confidence = <~ response  // Extract confidence
decision = response ~@> "approve"  // Threshold gate
```

## Getting Started

Ready to start programming with uncertainty? 

1. **[Install Prism](./getting-started/installation)** - Get the CLI and core packages
2. **[Set up your editor](./tools/vscode)** - Install VS Code extension for syntax highlighting
3. **[Write your first program](./getting-started/first-program)** - Learn the basics
4. **[Explore the REPL](./tools/repl)** - Experiment interactively

### Quick Install

```bash
# Install CLI globally
npm install -g @prism-lang/cli

# Install VS Code extension
curl -L https://github.com/HaruHunab1320/Prism-TS/releases/download/v0.1.0/prism-lang-0.1.0.vsix -o prism-lang.vsix
code --install-extension prism-lang.vsix
rm prism-lang.vsix

# Start coding!
prism
```

## Use Cases

Prism excels in domains where uncertainty matters:

- **AI/ML Applications**: Handle LLM responses with explicit confidence
- **IoT & Sensors**: Manage noisy sensor data with uncertainty bounds
- **Financial Systems**: Make risk-aware decisions with confidence thresholds
- **Security Analysis**: Evaluate threats with uncertainty quantification
- **Scientific Computing**: Propagate measurement errors through calculations

## Community & Support

- 📦 [npm package](https://www.npmjs.com/package/@prism-lang/core)
- 💬 [GitHub Discussions](https://github.com/HaruHunab1320/Prism-TS/discussions)
- 🐛 [Issue Tracker](https://github.com/HaruHunab1320/Prism-TS/issues)
- 📚 [Examples](https://github.com/HaruHunab1320/Prism-TS/tree/main/examples)

Join our community and help shape the future of uncertainty-aware programming!