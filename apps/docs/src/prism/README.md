# Prism Language Syntax Highlighting

This directory contains the syntax highlighting definition for the Prism programming language.

## Features

The syntax highlighter supports all Prism language features:

### Token Types
- **Comments** - Single-line comments with `//`
- **Strings** - Regular and interpolated strings with `${expressions}`
- **Numbers** - Integers, decimals, and scientific notation
- **Keywords** - All 25+ keywords including `uncertain`, `high`, `medium`, `low`, `context`, `agents`
- **Operators** - 40+ operators including all confidence operators
- **Functions** - Function names and built-in functions like `llm()`
- **Identifiers** - Variables and properties

### Confidence Operators
Special highlighting for Prism's unique confidence operators:
- `~>` - Confidence assignment
- `<~` - Confidence extraction
- `~~` - Confidence chaining
- `~||>` - Parallel confidence
- `~@>` - Threshold gate
- `~+`, `~-`, `~*`, `~/` - Confident arithmetic
- `~==`, `~!=`, `~<`, `~>` - Confident comparisons
- `~&&`, `~||` - Confident logical operations
- And more...

### Themes
The highlighter includes both light and dark themes with:
- Distinct colors for confidence operators
- Semantic coloring for uncertainty levels (high=green, medium=orange, low=red)
- Special styling for context and agent blocks
- Proper contrast ratios for accessibility

## Files

- `prism-language.js` - The Prism.js language definition
- `README.md` - This documentation file

## Usage

The syntax highlighter is automatically loaded by Docusaurus for any code block marked with the `prism` language:

````markdown
```prism
// Your Prism code here
value = 42 ~> 0.9
```
````

## Customization

To modify the syntax highlighting:

1. Edit `prism-language.js` to change token patterns
2. Edit `../css/prism-theme.css` to change colors and styles
3. Rebuild the documentation site

## Adding New Tokens

To add support for new syntax:

1. Add the token pattern to `prism-language.js`
2. Add corresponding styles to `prism-theme.css`
3. Test with example code
4. Update this README

## Testing

View the [Syntax Highlighting Demo](/docs/concepts/syntax-highlighting-demo) to see all features in action.