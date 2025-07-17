# IDE Syntax Highlighting for Prism

The syntax highlighting we implemented is for the documentation website. To get Prism syntax highlighting in your IDE, you'll need to install/create an extension specific to your editor.

## VS Code

### Option 1: TextMate Grammar (Recommended)
Create a VS Code extension with a TextMate grammar file:

1. Create a new directory: `prism-vscode`
2. Add `package.json`:
```json
{
  "name": "prism-lang",
  "displayName": "Prism Language Support",
  "description": "Syntax highlighting for Prism programming language",
  "version": "0.1.0",
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": ["Programming Languages"],
  "contributes": {
    "languages": [{
      "id": "prism",
      "aliases": ["Prism", "prism"],
      "extensions": [".prism"],
      "configuration": "./language-configuration.json"
    }],
    "grammars": [{
      "language": "prism",
      "scopeName": "source.prism",
      "path": "./syntaxes/prism.tmLanguage.json"
    }]
  }
}
```

3. Create `syntaxes/prism.tmLanguage.json` with TextMate grammar
4. Install the extension locally or publish to VS Code marketplace

### Option 2: Quick File Association
For basic highlighting, you can associate `.prism` files with JavaScript:

1. Open VS Code settings (Cmd+,)
2. Search for "files.associations"
3. Add: `"*.prism": "javascript"`

This gives you basic syntax highlighting but won't recognize Prism-specific syntax.

## Other IDEs

### IntelliJ IDEA / WebStorm
1. Go to Settings → Editor → File Types
2. Create a new file type or associate `.prism` with JavaScript
3. For full support, create a custom language plugin

### Sublime Text
1. Create a `.sublime-syntax` file
2. Place in `Packages/User/`
3. Define syntax patterns similar to our Prism.js definition

### Atom
1. Generate a package with `apm init --package language-prism`
2. Create grammar in `grammars/prism.cson`
3. Install with `apm link`

### Neovim/Vim
1. Create syntax file: `~/.vim/syntax/prism.vim`
2. Add filetype detection: `~/.vim/ftdetect/prism.vim`
3. Or use Tree-sitter for better highlighting

## Quick Start: VS Code Extension

I can create a basic VS Code extension for you. Would you like me to:

1. Create a full TextMate grammar for VS Code (best highlighting)
2. Create a Language Server Protocol (LSP) implementation (highlighting + intellisense)
3. Create a simple file association config (quick but limited)

The TextMate grammar would provide:
- All confidence operators highlighted
- Uncertainty keywords (high/medium/low) with semantic colors
- Proper string interpolation
- Context and agent highlighting
- Dark/light theme support

Let me know which approach you'd prefer!