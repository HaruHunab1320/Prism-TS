# Prism Language Ecosystem Distribution

## Current State: Manual Installation
Right now, users need to manually install the VS Code extension. This is typical for new/experimental languages.

## Path to Wide Adoption

### 1. **VS Code Marketplace (Immediate - 1 week)**
The fastest way to reach users:

```bash
# Prerequisites
npm install -g @vscode/vsce

# In vscode-extension/prism-lang directory
vsce package  # Creates prism-lang-0.1.0.vsix
vsce publish  # Publishes to marketplace
```

Once published, users can simply:
1. Open VS Code
2. Search "Prism" in Extensions
3. Click Install

**Benefits:**
- One-click installation
- Automatic updates
- Discoverability
- User reviews/ratings

### 2. **Package Manager Integration (1-3 months)**

#### npm Package
```json
// package.json
{
  "name": "@prism-lang/vscode",
  "version": "0.1.0",
  "scripts": {
    "postinstall": "node install-vscode-extension.js"
  }
}
```

Users could then:
```bash
npm install -g @prism-lang/cli
# Automatically installs VS Code extension
```

#### Homebrew (macOS)
```ruby
class PrismLang < Formula
  desc "Prism programming language"
  homepage "https://prismlang.dev"
  
  def install
    # Install CLI
    system "npm", "install", "--prefix", libexec
    # Install VS Code extension if VS Code is present
    if File.exist?("/Applications/Visual Studio Code.app")
      system "code", "--install-extension", "prism-lang.vsix"
    end
  end
end
```

### 3. **Language Server Protocol (LSP) (3-6 months)**
Create a language server that works with ANY editor:

```typescript
// prism-language-server/src/server.ts
import { 
  createConnection,
  TextDocuments,
  ProposedFeatures
} from 'vscode-languageserver/node';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize(() => {
  return {
    capabilities: {
      textDocumentSync: TextDocuments.syncKind.Incremental,
      completionProvider: { resolveProvider: true },
      hoverProvider: true,
      definitionProvider: true,
      diagnosticProvider: true
    }
  };
});
```

**Benefits:**
- Works with VS Code, Neovim, Sublime, Emacs, etc.
- Provides intellisense, go-to-definition, error checking
- Single implementation for all editors

### 4. **Editor-Specific Packages (6-12 months)**

#### Neovim (Tree-sitter)
```lua
-- nvim-treesitter configuration
require'nvim-treesitter.configs'.setup {
  ensure_installed = { "prism" },
  highlight = { enable = true }
}
```

#### Sublime Text
- Package Control submission
- Users: `Install Package > Prism`

#### JetBrains IDEs
- Plugin marketplace submission
- Built-in language support

### 5. **GitHub Linguist Recognition (6-12 months)**
Get GitHub to recognize `.prism` files:

1. Submit PR to github/linguist
2. Provide sample files and statistics
3. Once merged, GitHub shows syntax highlighting

### 6. **CDN Distribution (Immediate)**
For web-based editors:

```html
<!-- Prism.js syntax highlighting -->
<script src="https://unpkg.com/@prism-lang/highlight@latest/prism.js"></script>
<link href="https://unpkg.com/@prism-lang/highlight@latest/prism.css" rel="stylesheet">
```

## Recommended Distribution Strategy

### Phase 1: Foundation (Now)
- [x] VS Code extension (local)
- [ ] Publish to VS Code Marketplace
- [ ] Create installation script
- [ ] Add to main README

### Phase 2: Package Integration (Month 1-2)
- [ ] NPM postinstall script
- [ ] Homebrew formula
- [ ] Installation one-liner:
  ```bash
  curl -fsSL https://prismlang.dev/install.sh | sh
  ```

### Phase 3: Universal Support (Month 3-6)
- [ ] Language Server Protocol
- [ ] Tree-sitter grammar
- [ ] Submit to GitHub Linguist

### Phase 4: Ecosystem Growth (Month 6-12)
- [ ] Package manager integrations
- [ ] Online playground with highlighting
- [ ] Documentation search integration

## Installation Script Example

```bash
#!/bin/bash
# install.sh - Installs Prism and editor support

echo "Installing Prism Language..."

# Install CLI
npm install -g @prism-lang/cli

# Detect and install editor support
if command -v code &> /dev/null; then
    echo "Installing VS Code extension..."
    code --install-extension prism-lang
fi

if [ -d "$HOME/.config/nvim" ]; then
    echo "Installing Neovim support..."
    # Install tree-sitter grammar
fi

if [ -d "$HOME/.config/sublime-text" ]; then
    echo "Installing Sublime Text support..."
    # Copy syntax files
fi

echo "✅ Prism installed! Create a .prism file to get started."
```

## Marketing the Language

### Documentation
```markdown
## Editor Support

Prism has first-class support for popular editors:

### VS Code (Recommended)
```bash
# Install from marketplace
code --install-extension prism-lang

# Or search "Prism" in Extensions
```

### Other Editors
- **Neovim**: via tree-sitter-prism
- **Sublime**: via Package Control  
- **Atom**: via atom-language-prism
- **Emacs**: via prism-mode
- **Web**: via Prism.js
```

### Community Building
1. **prism-lang/awesome-prism** - Curated resources
2. **Syntax highlighting bounties** - Pay for implementations
3. **Editor plugin hackathon** - Community event
4. **Corporate sponsors** - Companies using Prism

## Success Metrics

Track adoption through:
- VS Code extension installs
- npm weekly downloads
- GitHub stars on syntax repos
- Number of editors supported
- Files on GitHub using .prism extension

## Timeline Example

**Month 1**: VS Code Marketplace ✓
**Month 2**: npm integration, install script
**Month 3**: LSP implementation starts
**Month 6**: 5+ editors supported
**Year 1**: GitHub recognizes .prism files
**Year 2**: Native support in major IDEs

The key is making installation as frictionless as possible while building community momentum!