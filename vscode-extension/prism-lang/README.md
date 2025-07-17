# Prism Language Support for VS Code

Syntax highlighting and language support for the Prism programming language in Visual Studio Code.

## Features

### Comprehensive Syntax Highlighting
- **All 100+ token types** with distinct colors
- **~20 confidence operators** with special highlighting
- **Uncertainty keywords** (`high`, `medium`, `low`) with semantic colors
- **Context and agent** keywords with unique styling
- **String interpolation** support
- **Built-in functions** like `llm()` highlighted

### Confidence Operators
Special highlighting for Prism's unique confidence operators:
- `~>` - Confidence assignment (cyan)
- `<~` - Confidence extraction (cyan)
- `~~` - Confidence chaining (green)
- `~||>` - Parallel confidence (purple)
- `~@>` - Threshold gate (green)
- `~+`, `~-`, `~*`, `~/` - Confident arithmetic (cyan)
- And many more...

### Theme Support
Includes both light and dark themes optimized for Prism:
- **Prism Dark** - Based on Dracula theme with confidence-aware colors
- **Prism Light** - Based on GitHub theme with confidence-aware colors

### Language Configuration
- Auto-closing brackets and quotes
- Intelligent indentation
- Comment toggling with `Cmd+/`
- Code folding support

## Installation

### Method 1: Install from File
1. Download this extension folder
2. Copy to VS Code extensions directory:
   - Windows: `%USERPROFILE%\.vscode\extensions`
   - macOS/Linux: `~/.vscode/extensions`
3. Restart VS Code

### Method 2: Install from VSIX
1. Package the extension: `vsce package`
2. Install in VS Code: `code --install-extension prism-lang-0.1.0.vsix`

### Method 3: Development Mode
1. Open this folder in VS Code
2. Press `F5` to launch a new VS Code window with the extension loaded
3. Open any `.prism` file to see syntax highlighting

## Usage

1. Create or open a file with `.prism` extension
2. VS Code will automatically apply Prism syntax highlighting
3. Optionally switch to Prism Dark/Light theme:
   - `Cmd+K Cmd+T` (Mac) or `Ctrl+K Ctrl+T` (Windows/Linux)
   - Select "Prism Dark" or "Prism Light"

## Examples

```prism
// Confidence operators are highlighted distinctly
temperature = 72 ~> 0.95
analysis = llm("Analyze: ${data}") ~> 0.8

// Uncertainty keywords have semantic colors
uncertain if (analysis) {
  high { deploy() }      // Green
  medium { review() }    // Orange  
  low { reject() }       // Red
}

// Context and agents have special styling
in context Medical {
  diagnosis = analyze(patient)
} shifting to Treatment {
  plan = createPlan(diagnosis)
}
```

## Color Reference

### Dark Theme
- Comments: Gray italic
- Strings: Yellow
- Numbers: Purple
- Keywords: Pink
- Functions: Green
- Confidence operators: Cyan/Green/Purple
- High confidence: Green
- Medium confidence: Orange
- Low confidence: Red

### Light Theme
- Comments: Gray italic
- Strings: Dark blue
- Numbers: Blue
- Keywords: Red
- Functions: Purple
- Confidence operators: Blue/Green/Purple
- High confidence: Dark green
- Medium confidence: Orange
- Low confidence: Red

## Development

To modify the syntax highlighting:
1. Edit `syntaxes/prism.tmLanguage.json`
2. Reload VS Code window (`Cmd+R` in development host)
3. Test with `.prism` files

## License

MIT License - Same as Prism language