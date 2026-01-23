---
sidebar_position: 3
title: VS Code Extension
description: Get full Prism language support in Visual Studio Code with syntax highlighting, custom themes, and confidence operator highlighting. Install the extension for enhanced development experience.
keywords: [VS Code extension, syntax highlighting, prism language, code editor, IDE support, confidence operators, custom themes, developer tools, visual studio code, prism-lang extension]
---

# VS Code Extension

Get full language support for Prism in Visual Studio Code with syntax highlighting, themes, and more.

## Installation

### From GitHub Release

```bash
# Download and install
curl -L https://github.com/HaruHunab1320/Prism-TS/releases/download/v0.1.0/prism-lang-0.1.0.vsix -o prism-lang.vsix
code --install-extension prism-lang.vsix
rm prism-lang.vsix
```

### Manual Installation

1. Download `prism-lang-0.1.0.vsix` from [GitHub Releases](https://github.com/HaruHunab1320/Prism-TS/releases)
2. Open VS Code
3. Go to Extensions view (`Cmd+Shift+X`)
4. Click "..." → "Install from VSIX..."
5. Select the downloaded file

## Features

### 🎨 Comprehensive Syntax Highlighting

The extension provides highlighting for all Prism language features:

#### Token Types
- **Comments** - Single-line with `//`
- **Strings** - Regular and interpolated with `${expressions}`
- **Numbers** - Integers, decimals, scientific notation
- **Keywords** - All 25+ keywords including uncertainty-specific ones
- **Operators** - 40+ operators with special confidence operator highlighting
- **Functions** - Built-in and user-defined functions

#### Confidence Operators

Special highlighting for Prism's unique confidence operators:

| Operator | Description | Color Theme |
|----------|-------------|-------------|
| `~>` | Confidence assignment | Cyan |
| `<~` | Confidence extraction | Cyan |
| `~~` | Confidence chaining | Green |
| `~\|\|>` | Parallel confidence | Purple |
| `~@>` | Threshold gate | Green |
| `~+`, `~-`, `~*`, `~/` | Confident arithmetic | Cyan |
| `~==`, `~!=`, `~<`, `~>` | Confident comparisons | Cyan |
| `~&&`, `~\|\|` | Confident logical | Cyan |
| `~??` | Confidence coalesce | Green |
| `~.` | Confident property access | Green |

#### Semantic Highlighting

Uncertainty levels have semantic colors:
- **`high`** - Green (success/proceed)
- **`medium`** - Orange (caution)
- **`low`** - Red (danger/stop)
- **`default`** - Gray (fallback)

### 🌈 Custom Themes

Two themes optimized for Prism development:

#### Prism Dark
Based on Dracula with confidence-aware colors:
- Dark background for reduced eye strain
- High contrast for confidence operators
- Clear distinction between regular and confidence operations

#### Prism Light
Based on GitHub theme with confidence-aware colors:
- Light background for daytime coding
- Subtle highlighting that doesn't distract
- Professional appearance

To switch themes:
1. Press `Cmd+K Cmd+T` (Mac) or `Ctrl+K Ctrl+T` (Windows/Linux)
2. Select "Prism Dark" or "Prism Light"

### ⚙️ Language Configuration

- **Auto-closing pairs** - Brackets, quotes, and parentheses
- **Bracket matching** - Highlights matching brackets
- **Comment toggling** - `Cmd+/` to toggle comments
- **Smart indentation** - Automatic indentation for blocks
- **Code folding** - Collapse/expand code regions

## Code Examples

### Basic Syntax
```javascript
// Variables and operations
name = "Prism"
version = 1.0
isAwesome = true

// Confidence operations
temperature = 72 ~> 0.95
humidity = 65 ~> 0.87

// String interpolation
message = "Welcome to ${name} v${version}!"
```

### Uncertainty Control Flow
```javascript
uncertain if (analysis) {
  high {        // Green highlighting
    deploy()
  }
  medium {      // Orange highlighting
    review()
  }
  low {         // Red highlighting
    abort()
  }
  default {     // Gray highlighting
    log_error()
  }
}
```

### LLM Integration
```javascript
// LLM calls with confidence
response = llm("Analyze security") ~> 0.9
summary = llm("Summarize: ${text}") ~> 0.85

// Confidence propagation
combined = response ~&& summary
fallback = response ~?? backup_analysis
```

### Advanced Features
```javascript
// Pipeline operations
result = data
  |> validate
  |> transform
  |> optimize

// Context blocks
in context Security {
  scan = analyze(code)
} shifting to Deployment {
  deploy(scan)
}

// Agent declarations
agents {
  analyzer: Agent { 
    confidence: 0.9,
    model: "claude"
  }
}
```

## Configuration

### File Associations

By default, the extension activates for `.prism` files. To add more file types:

1. Open VS Code settings (`Cmd+,`)
2. Search for "files.associations"
3. Add custom associations:
```json
{
  "files.associations": {
    "*.prism": "prism",
    "*.prsm": "prism"
  }
}
```

### Theme Customization

Override specific colors in your settings:

```json
{
  "editor.tokenColorCustomizations": {
    "[Prism Dark]": {
      "textMateRules": [
        {
          "scope": "keyword.operator.confidence.arrow.prism",
          "settings": {
            "foreground": "#00ff00"
          }
        }
      ]
    }
  }
}
```

## Tips and Tricks

### 1. Quick Theme Toggle
Create a keyboard shortcut for quick theme switching:
```json
{
  "key": "cmd+shift+t",
  "command": "workbench.action.selectTheme"
}
```

### 2. Confidence Operator Snippets
Coming soon: Code snippets for common patterns:
- `unc` → `uncertain if (...) { high { } medium { } low { } }`
- `conf` → `value ~> 0.9`
- `llm` → `llm("${1:prompt}") ~> ${2:0.8}`

### 3. Format on Save
Enable auto-formatting when Prism formatter is available:
```json
{
  "[prism]": {
    "editor.formatOnSave": true
  }
}
```

## Troubleshooting

### Extension Not Working

1. **Check file extension** - Ensure files end with `.prism`
2. **Reload window** - `Cmd+R` or `Ctrl+R` in VS Code
3. **Check installation** - Run `code --list-extensions | grep prism`
4. **Reinstall** - Remove and reinstall the extension

### Colors Look Wrong

1. **Check theme** - Ensure you're using Prism Dark/Light or a compatible theme
2. **Disable other extensions** - Some extensions may override colors
3. **Reset settings** - Remove custom token color customizations

### Performance Issues

1. **Large files** - Syntax highlighting may be slow on very large files
2. **Complex expressions** - Deep nesting may impact performance
3. **Other extensions** - Disable unnecessary extensions

## Coming Soon

### Language Server Protocol (LSP)
- IntelliSense / Auto-completion
- Go to definition
- Find references
- Hover information
- Error diagnostics

### Code Snippets
- Common patterns
- Boilerplate generation
- LLM prompt templates

### Debugging Support
- Breakpoints
- Variable inspection
- Confidence tracking

### Formatter Integration
- Auto-formatting
- Customizable style rules
- Format on save

## Contributing

The VS Code extension is open source! Contribute at:
https://github.com/HaruHunab1320/Prism-TS/tree/main/vscode-extension

### Development Setup

```bash
# Clone the repository
git clone https://github.com/HaruHunab1320/Prism-TS.git
cd Prism-TS/vscode-extension/prism-lang

# Install dependencies
npm install

# Open in VS Code
code .

# Press F5 to launch extension development host
```

## Changelog

### v0.1.0 (Current)
- Initial release
- Complete syntax highlighting for all Prism features
- Prism Dark and Light themes
- Basic language configuration
- Support for confidence operators
- Semantic highlighting for uncertainty levels