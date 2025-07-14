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

Ready to start programming with uncertainty? Head to our [Quick Start Guide](./getting-started/installation) to install Prism and write your first uncertainty-aware program.

## Use Cases

Prism excels in domains where uncertainty matters:

- **AI/ML Applications**: Handle LLM responses with explicit confidence
- **IoT & Sensors**: Manage noisy sensor data with uncertainty bounds
- **Financial Systems**: Make risk-aware decisions with confidence thresholds
- **Security Analysis**: Evaluate threats with uncertainty quantification
- **Scientific Computing**: Propagate measurement errors through calculations

## Community & Support

- 📦 [npm package](https://www.npmjs.com/package/prism-uncertainty)
- 💬 [GitHub Discussions](https://github.com/HaruHunab1320/Prism-TS/discussions)
- 🐛 [Issue Tracker](https://github.com/HaruHunab1320/Prism-TS/issues)
- 📚 [Examples](https://github.com/HaruHunab1320/Prism-TS/tree/main/examples)

Join our community and help shape the future of uncertainty-aware programming!