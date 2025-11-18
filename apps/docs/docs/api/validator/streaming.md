---
sidebar_position: 5
title: Streaming Validation
---

# Streaming Validation

The streaming validator enables real-time validation of Prism code as it's being written or generated, making it ideal for integration with LLMs and code editors.

## Overview

```typescript
import { StreamingValidator } from '@prism-lang/validator';

const validator = new StreamingValidator();

// Reset state for new session
validator.reset();

// Validate code chunks as they arrive
const result1 = validator.validatePartial("const x = ");
const result2 = validator.validatePartial("llm(");
const result3 = validator.validatePartial("\"What is");
```

## Core Features

### 1. Incremental Parsing
The validator maintains parsing state across chunks:

```typescript
validator.reset();

// Chunk 1: Incomplete but valid so far
let result = validator.validatePartial("const result = ");
console.log(result.valid);  // true
console.log(validator.isComplete()); // false

// Chunk 2: Complete statement
result = validator.validatePartial("42");
console.log(result.valid);  // true
console.log(validator.isComplete()); // true
```

### 2. Intelligent Completions
Get context-aware completions for partial code:

```typescript
validator.reset();
validator.validatePartial("uncertain if (x) {");
validator.validatePartial("  high { }");

const completions = validator.getCompletions();
// Returns: ["medium {", "low {", "default {"]
```

### 3. Error Recovery
The validator can recover from errors and continue:

```typescript
// Even with an error, it continues tracking
validator.validatePartial("const x = ");
const errored = validator.validatePartial("@#!");  // Invalid
validator.validatePartial(" // Fixed: const x = 42");

console.log(errored.valid); // false
console.log(errored.errors[0].message);
```

## LLM Integration

:::tip
Use `runtime.streamLLM(prompt, { structuredOutput: false })` (or `prism llm --stream "prompt"`) to get a cancellable async stream of tokens that you can feed directly into `StreamingValidator` or the higher-level `validateStream` helper.
:::

### Code Generation Validation
```typescript
async function generatePrismCode(prompt: string) {
  const runtime = createRuntime();
  const session = runtime.streamLLM(prompt, { structuredOutput: false });
  const validator = new StreamingValidator();
  let fullCode = '';

await validateStream(session.chunks, {
  validator,
  extractText: chunk => {
    if (chunk.type === 'text' && chunk.content) {
      fullCode += chunk.content;
      return chunk.content;
    }
    return '';
  },
  onUpdate(validation) {
    if (!validation.valid && validation.errors.length > 0) {
      console.warn('Syntax issue detected:', validation.errors[0].message);
    }
  }
});

  await session.response;
  return fullCode;
}
```

Prefer direct notifications? `validateStream` accepts an `onUpdate` callback that receives each `StreamingValidationResult`:

```typescript
import { validateStream } from '@prism-lang/validator';

await validateStream(session.chunks, {
  extractText: chunk => (chunk.type === 'text' ? chunk.content : ''),
  onUpdate(validation) {
    console.log('Expected next tokens:', validation.expectedNext);
  }
});
```

### Guided Generation
```typescript
// Use completions to guide LLM
const validator = new StreamingValidator();
validator.reset();

async function guidedGeneration() {
  let code = "";
  
  // Start with a partial statement
  code += "uncertain if (";
  validator.validatePartial(code);
  
  // Get valid completions
  const completions = validator.getStreamingCompletions();
  // e.g., ["condition)", "~result > 0.5)"]
  
  // Use LLM to pick best completion
  const chosen = await llm.selectBest(completions, context);
  code += chosen;
  validator.validateStreaming(chosen);
  
  return code;
}
```

## Editor Integration

### Real-time Validation
```typescript
class PrismEditor {
  private validator = new StreamingValidator();
  private lastSnapshot = '';
  
  onTextChange(newText: string) {
    const diff = this.findDiff(this.lastSnapshot, newText);
    
    if (diff.isAppend) {
      const result = this.validator.validatePartial(diff.added);
      this.updateErrorMarkers(result.errors);
    } else {
      this.validator.reset();
      this.validator.validatePartial(newText);
    }
    
    this.lastSnapshot = newText;
  }
}
```

### Autocomplete Provider
```typescript
class PrismAutocomplete {
  private validator = new StreamingValidator();
  
  async provideCompletions(
    document: TextDocument,
    position: Position
  ) {
    const textUntilPosition = document.getText(
      new Range(0, 0, position.line, position.character)
    );
    
    this.validator.reset();
    this.validator.validatePartial(textUntilPosition);
    
    const completions = this.validator.getCompletions();
    
    return completions.map(text => ({
      label: text,
      kind: CompletionItemKind.Snippet,
      insertText: text
    }));
  }
}
```

## API Reference

### StreamingValidator Methods

```typescript
interface StreamingValidator {
  // Reset validator state
  resetStreaming(): void;
  
  // Validate a chunk of code
  validateStreaming(chunk: string): StreamingResult;
  
  // Get possible completions
  getStreamingCompletions(): string[];
  
  // Get current state
  getStreamingState(): StreamingState;
  
  // Get accumulated code
  getAccumulatedCode(): string;
}
```

### StreamingResult

```typescript
interface StreamingResult {
  isValid: boolean;
  isComplete: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  expectedTokens?: string[];
  ast?: PartialAST;
}
```

### StreamingState

```typescript
interface StreamingState {
  inString: boolean;
  inComment: boolean;
  openBrackets: number;
  openBraces: number;
  hasErrors: boolean;
  canRecover: boolean;
  currentContext: 'statement' | 'expression' | 'block';
}
```

## Performance Considerations

1. **Chunk Size**: Larger chunks are more efficient
2. **Reset Frequency**: Reset only when necessary
3. **Memory Usage**: Old chunks are compressed
4. **Completion Cache**: Completions are cached

```typescript
// Optimal chunk size: ~100-500 characters
const CHUNK_SIZE = 200;

// Process in batches
for (let i = 0; i < code.length; i += CHUNK_SIZE) {
  const chunk = code.slice(i, i + CHUNK_SIZE);
  validator.validateStreaming(chunk);
}
```

## Best Practices

1. **Reset on New Context**: Always reset when starting new code
2. **Handle Incompleteness**: Check `isComplete` before final validation
3. **Use Completions**: Guide generation with valid completions
4. **Monitor State**: Track parser state for better error recovery

```typescript
// Example: Robust streaming validation
function validateStream(codeStream: AsyncIterable<string>) {
  const validator = new StreamingValidator();
  validator.resetStreaming();
  
  let lastValid = "";
  
  for await (const chunk of codeStream) {
    const result = validator.validateStreaming(chunk);
    
    if (result.isValid && result.isComplete) {
      lastValid = validator.getAccumulatedCode();
    }
    
    if (result.errors.length > 0 && !result.canRecover) {
      // Rollback to last valid state
      validator.resetStreaming();
      validator.validateStreaming(lastValid);
    }
  }
  
  return validator.getAccumulatedCode();
}
```
