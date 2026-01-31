---
sidebar_position: 2
title: Your First Program
---

# Your First Prism Program

Let's write a simple program that demonstrates Prism's unique features: confidence values and uncertainty-aware control flow.

## Hello, Uncertain World!

Create a file called `hello.prism`:

```javascript
// Basic confidence assignment
let greeting = "Hello, World!" ~> 0.95
console.log(greeting)

// Working with uncertainty
let temperature = 72.5 ~> 0.9
if (temperature > 70) {
  console.log("It's warm today!")
}
```

## Running Your Program

### Using the CLI

```bash
prism run hello.prism
```

### Using TypeScript/JavaScript

```typescript
import { parse, createRuntime } from '@prism-lang/core';
import { readFileSync } from 'fs';

const code = readFileSync('hello.prism', 'utf-8');
const ast = parse(code);
const runtime = createRuntime();

const result = await runtime.execute(ast);
console.log(result);
```

## A More Complex Example

Let's build a simple AI-powered decision maker:

```javascript
// AI Analysis with Confidence
let analysis = llm("Should we deploy this code to production?")
let confidence = <~ analysis  // Extract confidence from LLM response

// Multi-level decision making
let deploy_status = "blocked"
uncertain if (analysis ~> 0.8) {
  high {
    console.log("✅ High confidence - deploying to production")
    deploy_status = "approved"
  }
  medium {
    console.log("⚠️ Medium confidence - requesting human review")
    deploy_status = "review_required"
  }
  low {
    console.log("❌ Low confidence - deployment blocked")
    deploy_status = "blocked"
  }
}

// Confidence combination
let security_check = llm("Any security vulnerabilities?") ~> 0.85
let performance_check = llm("Performance impact acceptable?") ~> 0.9

// Parallel confidence selection (picks highest confidence)
let final_decision = security_check ~||> performance_check

console.log("Final deployment confidence: " + (<~ final_decision))
```

## Understanding the Output

When you run Prism programs, confidence values are displayed alongside results:

```
"Hello, World!" (95.0% confidence)
It's warm today!
⚠️ Medium confidence - requesting human review
Final deployment confidence: 90.0%
```

## Key Concepts Demonstrated

1. **Confidence Assignment** (`~>`): Attach confidence to any value
2. **Confidence Extraction** (`<~`): Get the confidence level of a value
3. **Uncertain Control Flow**: Make decisions based on confidence thresholds
4. **Parallel Selection** (`~||>`): Choose the option with highest confidence
5. **LLM Integration**: Native support for AI/LLM calls

## Exercises

Try modifying the program to:

1. Add a third check for code quality
2. Use different confidence thresholds
3. Implement a confidence budget (total confidence must exceed a threshold)
4. Create a weighted average of multiple confidence values

## Next Steps

Now that you've written your first Prism program, explore:

- [Language syntax and features](../concepts/syntax)
- [Confidence operators in depth](../concepts/confidence-operators)
- [Working with LLMs](../guides/llm-integration)
- [Real-world examples](../guides/examples)
