# Prism Language Support for VS Code

Syntax highlighting and editor support for Prism in Visual Studio Code.

<div align="center">
  <img src="https://docs.prismlang.dev/img/prism-logo-v1.png" width="160" alt="Prism logo" />
</div>

## Features

- Syntax highlighting for Prism keywords, expressions, and confidence operators
- Semantic coloring for `high` / `medium` / `low` confidence branches
- String interpolation highlighting (`"... ${expr} ..."`)
- Bracket matching, comment toggling, and indentation defaults
- Included Prism light/dark themes

## Confidence Operators Highlighted

- `~>` confidence assignment
- `<~` confidence extraction
- `~||>` confidence fallback/selection
- `~+`, `~-`, `~*`, `~/` confidence-aware arithmetic
- `~??` confidence-aware nullish fallback
- Additional confidence operators defined by the grammar

## Installation

### VSIX

1. Build/package: `vsce package`
2. Install: `code --install-extension prism-lang-<version>.vsix`

### Development Mode

1. Open this folder in VS Code
2. Press `F5` to launch an Extension Development Host
3. Open a `.prism` file

## Example

```prism
const temperature = 72 ~> 0.95

uncertain if (temperature) {
  high { console.log("safe") }
  medium { console.log("review") }
  low { console.log("hold") }
}

const action = match (temperature) {
  t if <~ t >= 0.9 => "ship",
  _ => "pause"
}
```

## Development

To change tokenization/colors:

1. Edit `syntaxes/prism.tmLanguage.json`
2. Reload the extension host
3. Verify with real `.prism` examples

## License

MIT
