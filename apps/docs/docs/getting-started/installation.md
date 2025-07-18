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
Support for Claude and Gemini:
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
CLAUDE_API_KEY=your-claude-api-key
GEMINI_API_KEY=your-gemini-api-key
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

Get full syntax highlighting and language support in VS Code:

```bash
# Download and install the extension
curl -L https://github.com/HaruHunab1320/Prism-TS/releases/download/v0.1.0/prism-lang-0.1.0.vsix -o prism-lang.vsix
code --install-extension prism-lang.vsix
rm prism-lang.vsix
```

Or manually:
1. Download [prism-lang-0.1.0.vsix](https://github.com/HaruHunab1320/Prism-TS/releases/download/v0.1.0/prism-lang-0.1.0.vsix)
2. Open VS Code → Extensions → "..." → Install from VSIX
3. Select the downloaded file

Features:
- 🎨 Complete syntax highlighting for all Prism features
- 🌈 Semantic colors for confidence operators
- 🎯 Light and dark themes optimized for Prism
- 📝 Auto-indentation and bracket matching

[Learn more about the VS Code extension →](../tools/vscode)

## Next Steps

Now that you have Prism installed, you're ready to:

- [Write your first Prism program](./first-program)
- [Learn the language basics](../concepts/syntax)
- [Explore confidence operators](../concepts/confidence-operators)
- [Integrate with AI/LLMs](../guides/llm-integration)