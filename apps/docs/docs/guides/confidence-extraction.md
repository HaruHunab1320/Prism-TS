---
sidebar_position: 2
title: Confidence Extraction
---

# Confidence Extraction

The `@prism/confidence` package provides comprehensive tools for extracting, calibrating, and managing confidence values from various sources including LLM responses, sensors, and APIs. This guide covers all aspects of confidence extraction in Prism.

## Installation

```bash
npm install @prism/confidence
# or
yarn add @prism/confidence
# or
pnpm add @prism/confidence
```

## Quick Start

```typescript
import { confidence, smartExtract } from '@prism/confidence';

// Simple extraction from text
const result = await confidence.extract("I'm fairly certain Paris is the capital of France.");
console.log(result.value); // 0.75
console.log(result.explanation); // "Response analysis confidence: 75.0% based on hedging: 85%, certainty: 80%, specificity: 70%, completeness: 65%"

// Smart extraction (auto-detects best method)
const conf = await smartExtract("The answer is definitely 42.");
console.log(conf); // 0.9
```

## Three Levels of API

The confidence extraction library provides three levels of API complexity:

### Level 1: Dead Simple

```typescript
import { ConfidenceExtractor } from '@prism/confidence';

const extractor = new ConfidenceExtractor();
const result = await extractor.extract("I think the answer might be 42");
console.log(result.value); // 0.65
```

### Level 2: Some Control

```typescript
const result = await extractor.extractWithOptions(
  "The answer is definitely 42",
  {
    method: 'response_analysis',
    checkHedging: true,
    checkCertainty: true
  }
);
```

### Level 3: Full Control

```typescript
// Use specific extraction methods directly
const consistencyResult = await extractor.fromConsistency(
  async () => llm.complete("What is 2+2?"),
  { samples: 5, aggregation: 'mean' }
);

const analysisResult = await extractor.fromResponseAnalysis(
  "I'm absolutely certain the answer is 4",
  {
    checkHedging: true,
    checkCertainty: true,
    checkSpecificity: true,
    checkCompleteness: true
  }
);

const structuredResult = await extractor.fromStructuredResponse(
  "The answer is 4 (confidence: 95%)"
);
```

## Extraction Methods

### 1. Consistency-Based Extraction

Extract confidence by analyzing consistency across multiple samples:

```typescript
const result = await extractor.fromConsistency(
  async () => {
    // Your sampling function
    return await llm.complete("Explain quantum mechanics");
  },
  {
    samples: 5,              // Number of samples to collect
    aggregation: 'mean',     // How to aggregate: mean, median, mode, weighted
    timeout: 30000          // Optional timeout
  }
);

console.log(result.value);       // 0.72
console.log(result.explanation); // "Moderate confidence (72.0%): 4/5 samples agreed. 2 unique variations found."
```

### 2. Response Analysis

Analyze linguistic features to determine confidence:

```typescript
const result = await extractor.fromResponseAnalysis(
  "I believe this might possibly be correct, though I'm not entirely sure.",
  {
    checkHedging: true,      // Look for hedging phrases
    checkCertainty: true,    // Look for certainty markers
    checkSpecificity: true,  // Check for specific details
    checkCompleteness: true, // Evaluate response completeness
    customMarkers: {
      low: ['possibly', 'might be', 'could be'],
      high: ['definitely', 'certainly', 'absolutely']
    }
  }
);
```

**Built-in Hedging Phrases** (lower confidence):
- might be, possibly, perhaps, could be, may be
- it seems, appears to, suggests that, likely
- probably, uncertain, not sure, hard to say

**Built-in Certainty Phrases** (higher confidence):
- definitely, certainly, absolutely, clearly
- obviously, without doubt, for sure, undoubtedly
- conclusively, unquestionably

### 3. Structured Response Extraction

Extract confidence from structured formats in responses:

```typescript
const result = await extractor.fromStructuredResponse(
  "The capital of France is Paris (confidence: 98%)"
);
// Automatically detects and extracts: 0.98

// Supported patterns:
// - "confidence: 85%"
// - "confidence: 8.5/10"
// - "certainty: high/medium/low"
// - "(90% confident)"
```

## Calibration

### Domain-Specific Calibration

Adjust confidence based on domain expertise:

```typescript
import { DomainCalibrator } from '@prism/confidence';

const calibrator = new DomainCalibrator({
  domain: 'medical',
  curves: {
    diagnosis: {
      baseConfidence: 0.7,
      adjustments: {
        'has_lab_results': 0.15,
        'has_imaging': 0.1,
        'multiple_symptoms': -0.1
      }
    },
    treatment: {
      baseConfidence: 0.8,
      adjustments: {
        'fda_approved': 0.1,
        'off_label': -0.2
      }
    }
  }
});

const calibrated = await calibrator.calibrate(
  { value: 0.75 },
  'diagnosis',
  { has_lab_results: true }
);
console.log(calibrated.value); // 0.9 (0.75 + 0.15)
```

### Security Calibration

Adjust confidence for security-critical operations:

```typescript
import { SecurityCalibrator } from '@prism/confidence';

const secCalibrator = new SecurityCalibrator();

// Reduces confidence for high-risk operations
const result = await secCalibrator.calibrate(
  { value: 0.9 },
  { riskLevel: 'high' }
);
console.log(result.value); // 0.72 (reduced by 20%)

// Risk levels: low (no change), medium (-10%), high (-20%), critical (-30%)
```

### Interactive Calibration

Learn from user feedback:

```typescript
import { InteractiveCalibrator } from '@prism/confidence';

const interactiveCalibrator = new InteractiveCalibrator();

// Record feedback
interactiveCalibrator.recordFeedback(
  { value: 0.8, provenance: { sources: [{ method: 'linguistic' }] } },
  true // Was the prediction correct?
);

// Use learned calibration
const calibrated = await interactiveCalibrator.calibrate({ value: 0.8 });
```

## Ensemble Methods

Combine multiple confidence sources:

```typescript
import { ConfidenceEnsemble } from '@prism/confidence';

const ensemble = new ConfidenceEnsemble({
  consistency: 0.4,
  linguistic: 0.3,
  structured: 0.3
});

const combined = await ensemble.combine([
  { value: 0.8, provenance: { sources: [{ method: 'consistency' }] } },
  { value: 0.7, provenance: { sources: [{ method: 'linguistic' }] } },
  { value: 0.9, provenance: { sources: [{ method: 'structured' }] } }
]);

console.log(combined.value); // 0.8 (weighted average)
```

## Advanced Patterns

### Confidence Budget Management

Ensure minimum confidence across a set of operations:

```typescript
import { ConfidenceBudgetManager } from '@prism/confidence';

const budgetManager = new ConfidenceBudgetManager(0.7); // Minimum 70% total

budgetManager.add('step1', 0.9);
budgetManager.add('step2', 0.8);
budgetManager.add('step3', 0.85);

console.log(budgetManager.isWithinBudget()); // true
console.log(budgetManager.getTotalConfidence()); // 0.612 (0.9 * 0.8 * 0.85)
console.log(budgetManager.getWeakestLink()); // { value: 'step2', confidence: 0.8 }
```

### Confidence Contracts

Define and validate confidence requirements:

```typescript
import { ConfidenceContractManager } from '@prism/confidence';

const contract = new ConfidenceContractManager({
  'data_quality': 0.8,
  'model_accuracy': 0.75,
  'input_validation': 0.9
});

const validation = contract.validate({
  'data_quality': 0.85,
  'model_accuracy': 0.7,  // Below threshold!
  'input_validation': 0.95
});

console.log(validation.isValid); // false
console.log(validation.failures); // ['model_accuracy: 0.7 < 0.75']
```

### Differential Confidence

Track confidence across multiple aspects:

```typescript
import { DifferentialConfidenceManager } from '@prism/confidence';

const diffManager = new DifferentialConfidenceManager();

const result = diffManager.calculate({
  'accuracy': 0.9,
  'completeness': 0.7,
  'timeliness': 0.8
});

console.log(result.average); // 0.8
console.log(result.variance); // 0.007
console.log(result.min); // { aspect: 'completeness', value: 0.7 }
console.log(result.recommendation); // "Focus on improving completeness (current: 0.7)"
```

### Temporal Confidence

Model confidence decay over time:

```typescript
import { TemporalConfidence } from '@prism/confidence';

const temporal = new TemporalConfidence(
  24, // 24 hour half-life
  'exponential'
);

const aged = temporal.apply(
  { value: 0.9 },
  12 // 12 hours old
);

console.log(aged.value); // 0.636 (0.9 * 0.707)
```

## Source-Specific Extractors

### Sensor Confidence

```typescript
import { SensorConfidenceExtractor } from '@prism/confidence';

const sensorExtractor = new SensorConfidenceExtractor();

const confidence = await sensorExtractor.extract({
  age: 5,        // 5 minutes old
  environment: { temperature: 25, humidity: 0.6 },
  history: 100,  // 100 previous readings
  calibrationDate: new Date('2024-01-01')
});
```

### API Confidence

```typescript
import { APIConfidenceExtractor } from '@prism/confidence';

const apiExtractor = new APIConfidenceExtractor();

const confidence = await apiExtractor.extract({
  provider: 'weather-api',
  historicalAccuracy: 0.92,
  latency: 150, // ms
  lastFailure: new Date('2024-01-15')
});
```

## Real-World Examples

### Example 1: LLM Response with Confidence

```typescript
import { ConfidenceExtractor } from '@prism/confidence';
import { ClaudeProvider, LLMRequest } from '@prism/llm';

const llm = new ClaudeProvider(process.env.CLAUDE_API_KEY);
const extractor = new ConfidenceExtractor();

async function queryWithConfidence(prompt: string) {
  // Get LLM response
  const response = await llm.complete(new LLMRequest(prompt));
  
  // Extract confidence from response
  const confidence = await extractor.fromResponseAnalysis(response.content);
  
  return {
    answer: response.content,
    confidence: confidence.value,
    explanation: confidence.explanation
  };
}

const result = await queryWithConfidence("What causes rain?");
console.log(`Answer: ${result.answer}`);
console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
```

### Example 2: Multi-Source Confidence

```typescript
import { ConfidenceEnsemble, ConfidenceExtractor } from '@prism/confidence';

async function robustQuery(prompt: string) {
  const extractor = new ConfidenceExtractor();
  
  // Method 1: Consistency across multiple runs
  const consistencyConf = await extractor.fromConsistency(
    async () => llm.complete(prompt),
    { samples: 3 }
  );
  
  // Method 2: Single response analysis
  const singleResponse = await llm.complete(prompt);
  const analysisConf = await extractor.fromResponseAnalysis(singleResponse.content);
  
  // Method 3: Check for structured confidence
  const structuredConf = await extractor.fromStructuredResponse(singleResponse.content);
  
  // Combine using ensemble
  const ensemble = new ConfidenceEnsemble({
    consistency: 0.5,
    linguistic: 0.3,
    structured: 0.2
  });
  
  const combined = await ensemble.combine([
    consistencyConf,
    analysisConf,
    structuredConf
  ]);
  
  return {
    answer: singleResponse.content,
    confidence: combined.value,
    sources: combined.provenance.sources
  };
}
```

### Example 3: Production Pipeline with Calibration

```typescript
import { 
  ConfidenceExtractor, 
  DomainCalibrator, 
  ConfidenceBudgetManager,
  SecurityCalibrator 
} from '@prism/confidence';

class ProductionPipeline {
  private extractor = new ConfidenceExtractor();
  private domainCalibrator = new DomainCalibrator({ domain: 'finance' });
  private securityCalibrator = new SecurityCalibrator();
  private budgetManager = new ConfidenceBudgetManager(0.8);
  
  async processQuery(query: string, context: any) {
    // Step 1: Get initial response and confidence
    const response = await llm.complete(query);
    const initialConf = await this.extractor.extract(response.content);
    
    // Step 2: Domain calibration
    const domainCalibrated = await this.domainCalibrator.calibrate(
      initialConf,
      'trading',
      context
    );
    
    // Step 3: Security calibration if needed
    const finalConf = context.sensitive 
      ? await this.securityCalibrator.calibrate(domainCalibrated, { riskLevel: 'high' })
      : domainCalibrated;
    
    // Step 4: Add to budget
    this.budgetManager.add(query, finalConf.value);
    
    // Step 5: Check if we're still confident enough
    if (!this.budgetManager.isWithinBudget()) {
      throw new Error('Confidence budget exceeded - manual review required');
    }
    
    return {
      response: response.content,
      confidence: finalConf.value,
      requiresReview: finalConf.value < 0.7
    };
  }
}
```

## Best Practices

### 1. Choose the Right Method

```typescript
// For consistent operations, use consistency-based
const conf1 = await extractor.fromConsistency(sampler, { samples: 5 });

// For one-off analysis, use response analysis
const conf2 = await extractor.fromResponseAnalysis(text);

// For structured responses, use structured extraction
const conf3 = await extractor.fromStructuredResponse(text);
```

### 2. Always Calibrate for Production

```typescript
// Domain-specific calibration
const calibrated = await domainCalibrator.calibrate(raw, category, context);

// Security calibration for sensitive operations
const secured = await securityCalibrator.calibrate(calibrated, { riskLevel });
```

### 3. Use Ensemble for Critical Decisions

```typescript
const ensemble = new ConfidenceEnsemble({
  primary: 0.6,
  secondary: 0.3,
  tertiary: 0.1
});

const robust = await ensemble.combine(multipleResults);
```

### 4. Track Confidence Over Time

```typescript
// For time-sensitive data
const temporal = new TemporalConfidence(48, 'exponential');
const current = temporal.apply(original, hoursElapsed);

// For learning systems
const calibrator = new InteractiveCalibrator();
calibrator.recordFeedback(result, wasCorrect);
```

### 5. Set Appropriate Thresholds

```typescript
// Define confidence requirements
const contract = new ConfidenceContractManager({
  'critical_operation': 0.95,
  'standard_operation': 0.8,
  'experimental_feature': 0.6
});

// Validate before proceeding
const validation = contract.validate(actualConfidences);
if (!validation.isValid) {
  console.error('Confidence requirements not met:', validation.failures);
}
```

## Troubleshooting

### Low Confidence Scores

```typescript
// Debug low confidence
const result = await extractor.fromResponseAnalysis(text, {
  checkHedging: true,
  checkCertainty: true,
  checkSpecificity: true,
  checkCompleteness: true
});

console.log('Confidence breakdown:', result.provenance);
// Shows which factors contributed to low confidence
```

### Inconsistent Results

```typescript
// Use consistency check
const consistency = await extractor.fromConsistency(
  sampler,
  { samples: 10, aggregation: 'median' }
);

if (consistency.value < 0.6) {
  console.warn('High variance in results - consider increasing samples');
}
```

### Calibration Issues

```typescript
// Validate calibration curves
const testCases = [
  { input: 0.5, expected: 0.6 },
  { input: 0.8, expected: 0.85 }
];

for (const test of testCases) {
  const result = await calibrator.calibrate({ value: test.input });
  console.log(`Input: ${test.input}, Output: ${result.value}, Expected: ${test.expected}`);
}
```