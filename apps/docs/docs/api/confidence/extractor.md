---
sidebar_position: 1
title: Extractor API
---

# Extractor API

The ConfidenceExtractor API provides sophisticated methods for extracting confidence scores from LLM responses and other sources.

## Overview

The extractor offers three levels of API:
1. **Simple**: Quick extraction with sensible defaults
2. **Controlled**: Choose extraction method with options
3. **Advanced**: Full control over extraction process

## ConfidenceExtractor Class

### Constructor

```typescript
class ConfidenceExtractor {
  constructor()
}
```

Creates a new confidence extractor instance.

## Level 1: Simple API

### extract()

```typescript
async extract(response: string | any): Promise<ConfidenceResult>
```

Extract confidence using automatic method selection.

**Parameters:**
- `response`: The response to analyze (typically a string)

**Returns:** `ConfidenceResult` with value and explanation

**Example:**
```typescript
import { ConfidenceExtractor } from '@prism/confidence';

const extractor = new ConfidenceExtractor();
const result = await extractor.extract(
  "I'm fairly certain the answer is 42."
);

console.log(result.value); // 0.75
console.log(result.explanation); // "Response analysis confidence: 75.0%..."
```

## Level 2: Controlled API

### extractWithOptions()

```typescript
async extractWithOptions(
  response: string | any,
  options: {
    method: 'consistency' | 'response_analysis' | 'structured';
    samples?: number;
    [key: string]: any;
  }
): Promise<ConfidenceResult>
```

Extract confidence with control over the method.

**Parameters:**
- `response`: The response or sampler function
- `options`: Extraction options
  - `method`: Extraction method to use
  - `samples`: Number of samples (for consistency method)
  - Additional method-specific options

**Example:**
```typescript
// Using response analysis
const result = await extractor.extractWithOptions(
  "Definitely the answer is 42.",
  { method: 'response_analysis' }
);

// Using consistency checking
const sampler = async () => llm("What is 6 * 7?");
const result2 = await extractor.extractWithOptions(
  sampler,
  { method: 'consistency', samples: 5 }
);
```

## Level 3: Advanced API

### fromConsistency()

```typescript
async fromConsistency(
  sampler: () => Promise<string>,
  options: ConsistencyOptions = {}
): Promise<ConfidenceResult>
```

Extract confidence by analyzing consistency across multiple samples.

**Parameters:**
- `sampler`: Async function that generates responses
- `options`: Consistency analysis options

**Options:**
```typescript
interface ConsistencyOptions {
  samples?: number;              // Default: 5
  temperature?: number | number[]; // Temperature settings
  timeout?: number;               // Max time per sample
  aggregation?: 'mean' | 'median' | 'mode' | 'weighted';
}
```

**Example:**
```typescript
const sampler = async () => {
  return await llm("Translate 'hello' to Spanish");
};

const result = await extractor.fromConsistency(sampler, {
  samples: 10,
  aggregation: 'median'
});

// High consistency = high confidence
console.log(result.value); // 0.95 if all samples agree
```

### fromResponseAnalysis()

```typescript
async fromResponseAnalysis(
  response: string,
  options: ResponseAnalysisOptions = {}
): Promise<ConfidenceResult>
```

Analyze linguistic features to determine confidence.

**Parameters:**
- `response`: The text response to analyze
- `options`: Analysis options

**Options:**
```typescript
interface ResponseAnalysisOptions {
  checkHedging?: boolean;        // Default: true
  checkCertainty?: boolean;      // Default: true
  checkSpecificity?: boolean;    // Default: true
  checkCompleteness?: boolean;   // Default: true
  customMarkers?: {
    high?: string[];   // High confidence phrases
    medium?: string[]; // Medium confidence phrases
    low?: string[];    // Low confidence phrases
  };
}
```

**Example:**
```typescript
const result = await extractor.fromResponseAnalysis(
  "I might be wrong, but possibly the answer could be around 42.",
  {
    checkHedging: true,
    customMarkers: {
      low: ['might be wrong', 'possibly']
    }
  }
);

console.log(result.value); // Low confidence due to hedging
```

### fromStructuredResponse()

```typescript
async fromStructuredResponse(
  response: string
): Promise<ConfidenceResult>
```

Extract confidence from structured response patterns.

**Parameters:**
- `response`: Response containing structured confidence indicators

**Supported Patterns:**
- `confidence: 85%`
- `confidence: 8.5/10`
- `certainty: high/medium/low`
- `(75% confident)`

**Example:**
```typescript
const response = `
The capital of France is Paris.
Confidence: 95%
`;

const result = await extractor.fromStructuredResponse(response);
console.log(result.value); // 0.95
console.log(result.explanation); // "Extracted from structured response: 'Confidence: 95%'"
```

### explain()

```typescript
explain(result: ConfidenceResult): string
```

Generate human-readable explanation for confidence score.

**Parameters:**
- `result`: The confidence result to explain

**Returns:** Detailed explanation string

**Example:**
```typescript
const result = await extractor.extract(response);
const explanation = extractor.explain(result);
console.log(explanation);
// "High confidence (85.0%): Response shows certainty markers..."
```

## Types and Interfaces

### ConfidenceResult

```typescript
interface ConfidenceResult {
  value: number;                    // 0-1 confidence score
  explanation?: string;             // Human-readable explanation
  provenance?: ConfidenceProvenance; // Detailed tracking
}
```

### ConfidenceProvenance

```typescript
interface ConfidenceProvenance {
  sources: Array<{
    method: 'consistency' | 'linguistic' | 'structured' | ...;
    contribution: number;      // Weight of this source
    raw_value: number;        // Original confidence
    adjusted_value: number;   // After adjustments
    reason: string;           // Why this value
  }>;
  adjustments: Array<{
    type: 'calibration' | 'temporal' | 'domain';
    delta: number;            // Adjustment amount
    reason: string;           // Why adjusted
  }>;
  timestamp: Date;
}
```

## Analysis Features

### Hedging Detection

Detects uncertainty markers:
- "might be", "possibly", "perhaps"
- "could be", "may be", "probably"
- "it seems", "appears to"
- "not sure", "hard to say"

### Certainty Analysis

Identifies confidence indicators:
- "definitely", "certainly", "absolutely"
- "clearly", "obviously", "undoubtedly"
- "without doubt", "for sure"

### Specificity Scoring

Rewards specific details:
- Numbers and percentages
- Quoted text
- Precise language
- Specific examples

### Completeness Assessment

Evaluates response thoroughness:
- Response length
- Sentence structure
- Detail level
- Coverage of topic

## Best Practices

### 1. Method Selection

```typescript
// Use consistency for non-deterministic queries
if (requiresCreativity) {
  result = await extractor.fromConsistency(sampler);
}

// Use response analysis for single responses
else if (haveOneResponse) {
  result = await extractor.fromResponseAnalysis(response);
}

// Use structured for formatted responses
else if (hasConfidenceMarkers) {
  result = await extractor.fromStructuredResponse(response);
}
```

### 2. Custom Markers

```typescript
// Domain-specific confidence markers
const medicalOptions = {
  customMarkers: {
    high: ['clinically proven', 'established', 'confirmed'],
    low: ['preliminary', 'anecdotal', 'unverified']
  }
};

const result = await extractor.fromResponseAnalysis(
  medicalResponse,
  medicalOptions
);
```

### 3. Combining Methods

```typescript
// Use multiple methods and aggregate
const results = await Promise.all([
  extractor.fromResponseAnalysis(response),
  extractor.fromStructuredResponse(response)
]);

const combined = {
  value: (results[0].value + results[1].value) / 2,
  explanation: 'Combined analysis and structured extraction'
};
```

## Performance Considerations

1. **Consistency Method**: Slowest (multiple LLM calls)
2. **Response Analysis**: Fast (text analysis only)
3. **Structured Extraction**: Fastest (pattern matching)

## Example: Complete Extraction Flow

```typescript
import { ConfidenceExtractor } from '@prism/confidence';

async function analyzeResponse(question: string) {
  const extractor = new ConfidenceExtractor();
  
  // Get initial response
  const response = await llm(question);
  
  // Try structured extraction first
  let result = await extractor.fromStructuredResponse(response);
  
  // Fall back to response analysis if no structure found
  if (result.value === undefined) {
    result = await extractor.fromResponseAnalysis(response);
  }
  
  // For critical decisions, verify with consistency
  if (isCritical && result.value > 0.7) {
    const sampler = async () => llm(question);
    const consistency = await extractor.fromConsistency(sampler);
    
    // Average the two methods
    result.value = (result.value + consistency.value) / 2;
    result.explanation = 'Verified with consistency checking';
  }
  
  return {
    answer: response,
    confidence: result
  };
}
```