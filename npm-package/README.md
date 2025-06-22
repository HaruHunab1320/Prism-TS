# prism-uncertainty

The official npm package for Prism - the language where AI meets certainty.

**Latest: v1.0.2** - Fixed documentation links

## Installation

```bash
npm install prism-uncertainty
```

## Quick Start

### As a Library

```javascript
import { Prism } from 'prism-uncertainty';

const prism = new Prism({
  geminiApiKey: 'your-api-key' // or set GEMINI_API_KEY env var
});

// Execute Prism code
const result = await prism.execute(`
  temperature = 22.5 ~> 0.9
  weather = llm("Is " + temperature + "°C good for outdoor activities?")
  decision = weather ~@> "Go outside!" ~?? "Stay indoors"
  decision
`);

console.log(result); // "Go outside!" (with confidence)
```

### As a CLI

```bash
# Install globally
npm install -g prism-uncertainty

# Run a Prism file
prism run weather-analysis.prism

# Start the REPL
prism repl

# Evaluate an expression
prism eval "42 ~> 0.9"
```

## API Reference

### `new Prism(options?)`

Create a new Prism instance.

Options:
- `geminiApiKey`: Google Gemini API key
- `anthropicApiKey`: Anthropic Claude API key

### `prism.execute(code: string): Promise<any>`

Execute Prism code and return the result.

### `prism.executeFile(filePath: string): Promise<any>`

Execute a Prism file.

### `runPrism(code: string, options?): Promise<any>`

Convenience function for one-off execution.

## Features

- 🎯 18 uncertainty-aware operators
- 🧠 Native LLM integration
- 🌊 Uncertainty-aware control flow
- 🔗 Automatic confidence propagation
- ⚡ 69% less code than traditional approaches

## Example: AI Model Ensemble

```javascript
import { runPrism } from 'prism-uncertainty';

const result = await runPrism(`
  // Run multiple models and pick the most confident result
  gpt_result = llm("Analyze this data with GPT")
  claude_result = llm("Analyze this data with Claude") 
  gemini_result = llm("Analyze this data with Gemini")
  
  // Parallel confidence operator selects highest confidence
  best_model = gpt_result ~||> claude_result ~||> gemini_result
  
  // Threshold gate: only proceed if highly confident
  decision = best_model ~@> "auto_approve" ~?? "manual_review"
  
  decision
`);

console.log(result); // "auto_approve" or "manual_review"
```

## Documentation

Full documentation: https://github.com/HaruHunab1320/Prism-TS

## License

MIT