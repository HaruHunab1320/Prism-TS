---
sidebar_position: 0
---

# Developer Tools

Prism provides a comprehensive set of tools for developing, testing, and deploying uncertainty-aware applications.

## 🛠️ Available Tools

### [Command Line Interface (CLI)](./cli)
The primary way to run Prism programs and interact with the language.

```bash
npm install -g @prism-lang/cli
prism run my-script.prism
```

**Features:**
- Execute `.prism` files
- Hot reload via `prism run --watch`
- Evaluate expressions directly
- Launch interactive REPL
- Configure LLM providers

### [Interactive REPL](./repl)
Experiment with Prism code in real-time with immediate feedback.

```bash
prism repl
# or just
prism
```

**Features:**
- Interactive evaluation
- Variable persistence
- Command history
- Session statistics
- Multi-line input

### [VS Code Extension](./vscode)
Full language support in Visual Studio Code with syntax highlighting and themes.

```bash
# Install from GitHub release
curl -L https://github.com/HaruHunab1320/Prism-TS/releases/download/v0.1.0/prism-lang-0.1.0.vsix -o prism-lang.vsix
code --install-extension prism-lang.vsix
```

**Features:**
- Syntax highlighting for all Prism features
- Semantic colors for confidence operators
- Light and dark themes
- Auto-indentation and bracket matching

## 🚀 Quick Start

1. **Install the CLI**
   ```bash
   npm install -g @prism-lang/cli
   ```

2. **Install VS Code Extension**
   ```bash
   curl -L https://github.com/HaruHunab1320/Prism-TS/releases/download/v0.1.0/prism-lang-0.1.0.vsix -o prism-lang.vsix
   code --install-extension prism-lang.vsix
   rm prism-lang.vsix
   ```

3. **Create your first program**
   ```prism
   // hello.prism
   greeting = llm("Say hello!") ~> 0.9
   console.log(greeting)
   ```

4. **Run it**
   ```bash
   prism run hello.prism
   prism run --watch hello.prism  # hot reload
   ```

## 🔧 Configuration

### Environment Variables

Configure LLM providers for AI capabilities:

```bash
# .env file
CLAUDE_API_KEY=your-claude-key
GEMINI_API_KEY=your-gemini-key
PRISM_DEFAULT_LLM=claude
```

### VS Code Settings

```json
{
  "files.associations": {
    "*.prism": "prism"
  },
  "[prism]": {
    "editor.formatOnSave": true
  }
}
```

## 📚 Tool Integration

The tools work seamlessly together:

1. **Write code** in VS Code with syntax highlighting
2. **Test expressions** in the REPL
3. **Run programs** with the CLI
4. **Debug** using console output and confidence tracking

## 🎯 Use Cases

### Development Workflow
```bash
# 1. Start REPL for experimentation
prism

# 2
