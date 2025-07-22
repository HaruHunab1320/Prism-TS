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
validator.resetStreaming();

// Validate code chunks as they arrive
const result1 = validator.validateStreaming("const x = ");
const result2 = validator.validateStreaming("llm(");
const result3 = validator.validateStreaming("\"What is");
```

## Core Features

### 1. Incremental Parsing
The validator maintains parsing state across chunks:

```typescript
validator.resetStreaming();

// Chunk 1: Incomplete but valid so far
let result = validator.validateStreaming("const result = ");
console.log(result.isValid);  // true
console.log(result.isComplete); // false

// Chunk 2: Complete statement
result = validator.validateStreaming("42");
console.log(result.isValid);  // true
console.log(result.isComplete); // true
```

### 2. Intelligent Completions
Get context-aware completions for partial code:

```typescript
validator.resetStreaming();
validator.validateStreaming("uncertain if (x) {");
validator.validateStreaming("  high { }");

const completions = validator.getStreamingCompletions();
// Returns: ["medium {", "low {", "default {"]
```

### 3. Error Recovery
The validator can recover from errors and continue:

```typescript
// Even with an error, it continues tracking
validator.validateStreaming("const x = ");
validator.validateStreaming("@#!");  // Invalid
validator.validateStreaming(" // Fixed: const x = 42");

const state = validator.getStreamingState();
console.log(state.hasErrors); // true
console.log(state.canRecover); // true
```

## LLM Integration

### Code Generation Validation
```typescript
async function generatePrismCode(prompt: string) {
  const validator = new StreamingValidator();
  validator.resetStreaming();
  
  const stream = await llm.streamCompletion(prompt);
  let fullCode = "";
  
  for await (const chunk of stream) {
    fullCode += chunk;
    const validation = validator.validateStreaming(chunk);
    
    if (!validation.isValid) {
      // Provide feedback to LLM
      const error = validation.errors[0];
      const correction = await llm.complete(
        `Fix this Prism syntax error: ${error.message}\nCode: ${fullCode}`
      );
      fullCode += correction;
      validator.validateStreaming(correction);
    }
  }
  
  return fullCode;
}
```

### Guided Generation
```typescript
// Use completions to guide LLM
const validator = new StreamingValidator();
validator.resetStreaming();

async function guidedGeneration() {
  let code = "";
  
  // Start with a partial statement
  code += "uncertain if (";
  validator.validateStreaming(code);
  
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
  private lastValidCode = "";
  
  onTextChange(newText: string) {
    // Find the change
    const diff = this.findDiff(this.lastValidCode, newText);
    
    if (diff.isAppend) {
      // Validate only the new chunk
      const result = this.validator.validateStreaming(diff.added);
      this.updateErrorMarkers(result.errors);
    } else {
      // Reset for non-append changes
      this.validator.resetStreaming();
      this.validator.validateStreaming(newText);
    }
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
    // Get code up to cursor
    const textUntilPosition = document.getText(
      new Range(0, 0, position.line, position.character)
    );
    
    this.validator.resetStreaming();
    this.validator.validateStreaming(textUntilPosition);
    
    const completions = this.validator.getStreamingCompletions();
    
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