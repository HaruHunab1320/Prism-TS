# 🌟 Prism-TS: AI Orchestration with Native Uncertainty

> A programming language designed for orchestrating Large Language Models with built-in confidence handling and uncertainty-aware control flow.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Jest](https://img.shields.io/badge/Jest-323330?style=for-the-badge&logo=Jest&logoColor=white)](https://jestjs.io/)

## 🚀 What is Prism?

Prism is a domain-specific programming language that makes working with AI models as natural as traditional programming. It treats **uncertainty as a first-class citizen**, allowing you to write code that naturally handles the probabilistic nature of AI responses.

### Key Features

- **🎯 Confidence-Aware Values**: Every value can carry confidence information (`100 ~> 0.85`)
- **🤔 Uncertain Control Flow**: Branch logic based on confidence levels (`uncertain if`)
- **🧠 Native LLM Integration**: Built-in `llm()` function with automatic confidence handling
- **⚡ Rich Operator Set**: Comprehensive uncertainty-aware operators (`~~`, `~??`, `~@>`, `~||>`, etc.)
- **📦 Context Management**: Isolated execution environments for complex AI workflows
- **🔗 Real AI Providers**: Support for Claude (Anthropic) and Gemini (Google)
- **✅ 100% Test Coverage**: Production-ready with comprehensive validation

## 📈 Current Status

**✅ v1.0 Production Ready** - 100% success rate on comprehensive test suite with real AI integration

- 22/22 tests passing with real Gemini API
- **Complete operator set**: 18 confidence-aware operators implemented and tested
- All language features fully implemented
- TypeScript runtime with complete AST
- Interactive REPL with live AI capabilities

### Implemented Operators

| Operator | Purpose | Example |
|----------|---------|---------|
| `~>` | Confidence assignment | `value ~> 0.85` |
| `<~` | Confidence extraction | `<~ confident_value` |
| `~~` | Confidence chaining | `input ~~ process ~~ output` |
| `~??` | Confidence coalesce | `uncertain ~?? fallback` |
| `~&&` | Confident AND | `condition1 ~&& condition2` |
| `~\|\|` | Confident OR | `option1 ~\|\| option2` |
| `~+`, `~-`, `~*`, `~/` | Confident arithmetic | `measurement1 ~+ measurement2` |
| `~==`, `~!=`, `~<`, `~>=`, `~<=` | Confident comparison | `sensor ~>= threshold` |
| `~.` | Confident property access | `object ~. property` |
| `~\|\|>` | Parallel confidence | `model1 ~\|\|> model2` |
| `~@>` | Threshold gate | `condition ~@> action` |

## 🏃‍♂️ Quick Start

### Installation

```bash
git clone https://github.com/your-username/prism-ts.git
cd prism-ts
npm install
```

### Configuration

Create a `.env` file for AI provider API keys:

```env
# Google Gemini (recommended for getting started)
GEMINI_API_KEY=your_gemini_api_key_here

# Anthropic Claude (optional)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Your First Prism Program

```prism
// Basic confidence assignment
measurement = 100 ~> 0.85

// LLM integration with uncertainty
analysis = llm("Analyze this measurement: " + measurement)

// Uncertainty-aware branching
uncertain if (analysis ~> 0.8) {
  high { 
    decision = "Proceed with confidence"
    priority = "HIGH"
  }
  medium { 
    decision = "Review manually"
    priority = "MEDIUM"
  }
  low { 
    decision = "Reject measurement"
    priority = "LOW"
  }
}

decision
```

### Run the REPL

```bash
npm run repl
```

```
🌟 Prism Language REPL v1.0
Type 'exit' to quit, 'help' for commands

prism> creative = llm("Write a haiku about programming")
Code flows, logic blooms,
Bugs in the night, a dark fight,
Triumph, dawn's new light. (~90.0%)

prism> uncertain if (creative ~> 0.8) {
  high { "Beautiful poetry!" }
  medium { "Not bad" }
  low { "Try again" }
}
Beautiful poetry!
```

## 🎓 Language Guide

### Confidence Values

Prism allows you to assign confidence to any value using the `~>` operator:

```prism
// Assign confidence to literals
temperature = 72.5 ~> 0.9

// Confidence propagates through operations
average = (temp1 + temp2) / 2  // Inherits minimum confidence

// Use variables as confidence values
data_quality = 0.85
processed = measurement ~> data_quality
```

### Confidence Operators

Prism provides a rich set of uncertainty-aware operators for sophisticated AI workflows:

#### Core Operators
```prism
// Confidence Extraction - Extract confidence level from values
confidence_level = <~ measurement  // Returns 0.9

// Confidence Chaining - Chain operations with confidence propagation
result = input ~~ process ~~ validate  // Chains with minimum confidence

// Confidence Coalesce - Fallback for low-confidence values
reliable = uncertain_data ~?? fallback_data  // Uses fallback if confidence < 0.5
```

#### Logical & Arithmetic
```prism
// Confident logical operations
decision = condition1 ~&& condition2  // AND with confidence propagation
choice = option1 ~|| option2          // OR with maximum confidence

// Confident arithmetic with uncertainty handling
total = measurement1 ~+ measurement2  // Addition with minimum confidence
average = sum ~/ count               // Division with confidence propagation
```

#### Comparison & Navigation
```prism
// Confident comparisons
valid = sensor_reading ~>= threshold  // Comparison with confidence
equal = expected ~== actual          // Equality with uncertainty

// Safe property access
property = object ~. field           // Confident navigation with fallback
```

#### Advanced Control Flow
```prism
// Parallel Confidence - Select highest confidence result
best = model1_prediction ~||> model2_prediction  // Ensemble selection

// Threshold Gate - Conditional execution based on confidence
action = high_confidence_condition ~@> risky_operation  // Execute only if confident
```

### LLM Integration

The `llm()` function is a built-in that calls your configured AI provider:

```prism
// Simple LLM call
response = llm("What is machine learning?")

// Use variables in prompts
topic = "quantum computing"
explanation = llm("Explain " + topic + " in simple terms")

// Chain LLM calls
overview = llm("Give me an overview of " + topic)
details = llm("Based on this: " + overview + " - What are the challenges?")
```

### Uncertain If Statements

Branch execution based on confidence levels:

```prism
diagnosis = llm("What could these symptoms indicate?")

uncertain if (diagnosis ~> 0.75) {
  high { 
    recommendation = "Schedule immediate consultation"
    urgency = "HIGH"
  }
  medium { 
    recommendation = "Monitor for 24-48 hours"
    urgency = "MEDIUM"
  }
  low { 
    recommendation = "Continue home care"
    urgency = "LOW"
  }
}
```

### Context Management

Organize complex workflows with isolated contexts:

```prism
in context DataAnalysis {
  raw_data = llm("Generate sample customer feedback")
  sentiment = llm("Analyze sentiment: " + raw_data)
}

in context ReportGeneration {
  summary = llm("Create executive summary from: " + sentiment)
  recommendations = llm("Generate action items from: " + summary)
}

final_report = summary + " | Actions: " + recommendations
```

## 🧪 Real-World Examples

### AI-Powered Decision System

```prism
// Medical triage system with confidence operators
symptoms = llm("Patient reports: fever, cough, fatigue. Assessment?")
confidence_check = llm("Rate diagnostic confidence 0-1 for: " + symptoms)

// Use confidence coalesce for fallback assessment
primary_assessment = symptoms ~?? "Unable to assess - insufficient data"

// Extract confidence for decision making
assessment_confidence = <~ primary_assessment

// Use threshold gate for automated vs manual routing
automated_decision = primary_assessment ~@> "Proceed with automated triage"

uncertain if (primary_assessment ~> 0.8) {
  high { 
    action = "Emergency consultation"
    timeframe = "Immediate"
  }
  medium { 
    action = "Schedule appointment" 
    timeframe = "24-48 hours"
  }
  low { 
    action = "Home monitoring"
    timeframe = "Continue care"
  }
}

report = "Assessment: " + primary_assessment + " | Confidence: " + assessment_confidence + " | Action: " + action
```

### Content Filtering Pipeline

```prism
content = "User submitted content here..."

// Multi-model ensemble for better accuracy
safety_model1 = llm("Rate content safety 0-1: " + content) 
safety_model2 = llm("Child-appropriate content check: " + content)
toxicity_check = llm("Detect toxic language in: " + content)

// Use parallel confidence to select best assessment
best_safety = safety_model1 ~||> safety_model2

// Combine with toxicity using confident AND
final_safety = best_safety ~&& toxicity_check

// Use confidence coalesce for fallback decision
safety_decision = final_safety ~?? "MANUAL_REVIEW: Unable to assess"

// Threshold gate for automated approval
auto_approve = final_safety ~@> "AUTO_APPROVED: High confidence safe content"

uncertain if (final_safety ~> 0.8) {
  high { filter_result = "APPROVED: Content is safe" }
  medium { filter_result = "REVIEW: Manual check needed" }
  low { filter_result = "BLOCKED: Content flagged" }
}

filter_result
```

### Multi-Step Research Workflow

```prism
research_question = "What is quantum computing?"

in context InitialResearch {
  overview = llm(research_question)
  key_concepts = llm("Extract 3 key concepts from: " + overview)
}

in context DeepDive {
  challenges = llm("What are the main challenges in: " + overview)
  applications = llm("What are practical applications of: " + key_concepts)
}

comprehensive_report = overview + " | Challenges: " + challenges + " | Applications: " + applications
```

## 🔧 Development

### Run Tests

```bash
npm test
```

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Real-World Testing

Run the comprehensive test suite with real AI APIs:

```bash
npm run test:real
```

This executes 22 comprehensive tests covering all language features with actual LLM providers.

## 🏗️ Architecture

Prism-TS is built with a clean, modular architecture:

```
src/
├── core/           # Language core (AST, Parser, Runtime)
├── confidence/     # Confidence value system
├── context/        # Context management
├── llm/           # LLM provider integrations
└── repl/          # Interactive REPL
```

### Key Components

- **AST**: Complete Abstract Syntax Tree with all language constructs
- **Parser**: Recursive descent parser with proper precedence
- **Runtime**: Environment-based interpreter with confidence propagation
- **Confidence System**: Mathematical confidence handling with level thresholds
- **LLM Providers**: Real API integrations (Claude, Gemini) with error handling

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/prism-ts.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/amazing-feature`
5. Make your changes and add tests
6. Run tests: `npm test`
7. Commit your changes: `git commit -m 'Add amazing feature'`
8. Push to your fork: `git push origin feature/amazing-feature`
9. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with TypeScript and modern Node.js
- Inspired by the need for uncertainty-aware AI programming
- Test-driven development ensuring production quality
- Real AI provider integrations for practical workflows

---

**Ready to orchestrate AI with confidence?** Get started with Prism today! 🚀