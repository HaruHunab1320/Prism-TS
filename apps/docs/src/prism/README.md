# Prism Language Syntax Highlighting

Prism.js language definition used by the docs site.

<div align="center">
  <img src="https://docs.prismlang.dev/img/prism-logo-v1.png" width="140" alt="Prism logo" />
</div>

## Coverage

The highlighter covers current Prism syntax, including:

- Core keywords (`let`, `const`, `if`, `uncertain`, `match`, etc.)
- Confidence operators (`~>`, `<~`, `~||>`, `~??`, `~+`, `~-`, `~*`, `~/`)
- String interpolation (`${...}`)
- Function calls and built-ins (including `llm()`)
- Arrays, objects, property/index access, and comments

## Files

- `prism-language.js` - Prism.js language definition
- `README.md` - Notes for maintainers

## Usage

Any fenced block marked as `prism` in docs will use this grammar:

````markdown
```prism
const result = llm("Rate this output") ~> 0.82
console.log(<~ result)
```
````

## Updating the Grammar

1. Edit `prism-language.js`
2. Adjust theme tokens in `../css/prism-theme.css` when needed
3. Rebuild docs and review the syntax demo page
