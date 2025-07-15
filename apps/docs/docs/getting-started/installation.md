---
sidebar_position: 1
title: Installation
---

# Installation

Get started with Prism in minutes. Choose your preferred package manager and installation method.

## Prerequisites

- Node.js 16.0 or higher
- npm, yarn, or pnpm

## Package Installation

### Core Package

The core Prism language implementation:

```bash
npm install @prism-lang/core
# or
yarn add @prism-lang/core
# or
pnpm add @prism-lang/core
```

### Optional Packages

#### Confidence Extraction
Advanced confidence extraction and calibration:
```bash
npm install @prism-lang/confidence
```

#### LLM Integrations
Support for Claude, Gemini, and OpenAI:
```bash
npm install @prism-lang/llm
```

#### CLI Tools
Command-line interface for running Prism files:
```bash
npm install -g @prism-lang/cli
```

## Quick Verification

Verify your installation:

```typescript
import { parse, createRuntime } from '@prism-lang/core';

const code = `
  greeting = "Hello, uncertain world!"
  confidence = greeting ~> 0.99
  confidence
`;

const ast = parse(code);
const runtime = createRuntime();
const result = await runtime.execute(ast);

console.log(result.toString()); // "Hello, uncertain world!" (99.0% confidence)
```

## Environment Setup

### API Keys

If you're using LLM features, set up your API keys:

```bash
# .env file
ANTHROPIC_API_KEY=your-claude-api-key
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
```

### TypeScript Configuration

For TypeScript projects, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true
  }
}
```

## VS Code Extension

Install the Prism VS Code extension for syntax highlighting and IntelliSense:

1. Open VS Code
2. Go to Extensions (Cmd/Ctrl + Shift + X)
3. Search for "Prism Language"
4. Click Install

## Next Steps

Now that you have Prism installed, you're ready to:

- [Write your first Prism program](./first-program)
- [Learn the language basics](../concepts/syntax)
- [Explore confidence operators](../concepts/confidence-operators)
- [Integrate with AI/LLMs](../guides/llm-integration)