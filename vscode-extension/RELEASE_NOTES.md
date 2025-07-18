# Prism VS Code Extension v0.1.0

First release of the official Prism language support for Visual Studio Code!

## Features

### 🎨 Comprehensive Syntax Highlighting
- All 100+ Prism tokens supported
- ~20 unique confidence operators with distinct colors
- Semantic highlighting for uncertainty levels (high=green, medium=orange, low=red)
- String interpolation support
- Context and agent keyword highlighting

### 🌈 Included Themes
- **Prism Dark** - Optimized dark theme for Prism development
- **Prism Light** - Clean light theme with confidence-aware colors

### ⚙️ Language Configuration
- Auto-closing brackets and quotes
- Intelligent indentation
- Comment toggling (Cmd+/)
- Code folding support

## Installation

1. Download `prism-lang-0.1.0.vsix` from the releases
2. Run: `code --install-extension prism-lang-0.1.0.vsix`
3. Open any `.prism` file to see syntax highlighting

## Examples

```prism
// Confidence operators highlighted distinctly
value = data ~> 0.9
result = tasks ~||> processAll

// Semantic colors for uncertainty
uncertain if (analysis) {
  high { deploy() }     // green
  medium { review() }   // orange
  low { reject() }      // red
}
```

## What's Next

- Language Server Protocol support (intellisense, go-to-definition)
- Code snippets
- Debugging support
- Formatter integration

---

**Note**: VS Code Marketplace publishing pending (awaiting publisher verification). For now, please use the manual installation method.