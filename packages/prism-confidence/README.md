# @prism-lang/confidence

Confidence extraction library for Prism - standardized patterns for extracting confidence values from LLMs and other sources.

## Overview

Since most LLM providers (except OpenAI) don't provide log probabilities, this library focuses on practical confidence extraction methods:

- **Consistency-based extraction** - Sample multiple times and measure agreement
- **Response analysis** - Detect hedging language and certainty markers
- **Structured parsing** - Extract explicit confidence values from responses
- **Domain calibration** - Adjust confidence based on domain-specific knowledge
- **Ensemble methods** - Combine multiple confidence signals

## Installation

```bash
npm install @prism-lang/confidence
```

## Quick Start

### Level 1: Simple API

```typescript
import { confidence } from '@prism-lang/confidence';

// Extract confidence from any response
const response = "I'm fairly certain this is a SQL injection vulnerability.";
const result = await confidence.extract(response);
console.log(result.value); // 0.72
console.log(result.explanation); // "Response analysis confidence: 72.0% based on..."
```

### Level 2: Controlled Extraction

```typescript
import { confidence } from '@prism-lang/confidence';

// Specify extraction method
const result = await confidence.extractWithOptions(response, {
  method: 'response_analysis',
  checkHedging: true,
  checkCertainty: true
});
```

### Level 3: Full Control

```typescript
import { ConfidenceExtractor, ConfidenceEnsemble, SecurityCalibrator } from '@prism-lang/confidence';

const extractor = new ConfidenceExtractor();
const ensemble = new ConfidenceEnsemble({ 
  weights: { consistency: 0.4, analysis: 0.3, structured: 0.3 } 
});

// Multiple extraction methods
const signals = {
  consistency: await extractor.fromConsistency(async () => llm(prompt), { samples: 5 }),
  analysis: await extractor.fromResponseAnalysis(response),
  structured: await extractor.fromStructuredResponse(response)
};

// Combine signals
const combined = ensemble.combine(signals);

// Apply domain calibration
const calibrator = new SecurityCalibrator();
const final = await calibrator.calibrate(combined.value, { 
  type: 'sql_injection',
  codeFeatures: ['parameterized_queries'] 
});
```

## Core Features

### 1. Consistency-Based Extraction

```typescript
const sampler = async () => llm("Is this code secure?");
const result = await extractor.fromConsistency(sampler, {
  samples: 5,
  temperature: [0.1, 0.3, 0.5, 0.7, 0.9]
});
```

### 2. Response Analysis

```typescript
const result = await extractor.fromResponseAnalysis(llmResponse, {
  checkHedging: true,     // "might be", "possibly"
  checkCertainty: true,   // "definitely", "certainly"
  checkSpecificity: true, // Specific details vs vague
  checkCompleteness: true // Response length and structure
});
```

### 3. Structured Response Parsing

```typescript
// Automatically detects patterns like:
// - "confidence: 85%"
// - "certainty: high"
// - "7/10 confident"
const result = await extractor.fromStructuredResponse(response);
```

### 4. Domain Calibration

```typescript
// Pre-built calibrators
import { calibrators } from '@prism-lang/confidence';

const calibrated = await calibrators.security.calibrate(0.8, {
  type: 'sql_injection',
  codeComplexity: 'high'
});

// Custom calibrator
class MyCalibrator extends DomainCalibrator {
  // ... implement domain-specific logic
}
```

### 5. Confidence Patterns

#### Confidence Budgets
```typescript
const budget = new ConfidenceBudgetManager(2.5); // Require total confidence of 2.5

budget.add(result1, 0.8);
budget.add(result2, 0.9);

if (!budget.met()) {
  const result3 = await getThirdOpinion();
  budget.add(result3, 0.9);
}
```

#### Confidence Contracts
```typescript
const contract = new ConfidenceContractManager({
  security_check: 0.9,
  performance_check: 0.7,
  style_check: 0.5
});

const verification = contract.verify(results);
if (!verification.passed) {
  console.log('Failed checks:', verification.failures);
}
```

#### Differential Confidence
```typescript
const differential = new DifferentialConfidenceManager();
differential.setAspect('disease_identification', 0.9);
differential.setAspect('severity_assessment', 0.6);
differential.setAspect('treatment_selection', 0.4);

const highest = differential.getHighest();
// Use appropriate confidence for each decision
```

### 6. Non-LLM Sources

#### Sensor Confidence
```typescript
const sensorExtractor = new SensorConfidenceExtractor();
const confidence = sensorExtractor.fromSensor(reading, {
  age: sensor.daysSinceCalibration(),
  environment: { temperature: 25, humidity: 60 },
  history: 0.95 // Historical accuracy
});
```

#### API Reliability
```typescript
const apiExtractor = new APIConfidenceExtractor();
const confidence = apiExtractor.fromAPIReliability({
  provider: 'weather.com',
  historicalAccuracy: 0.85,
  latency: 250,
  lastFailure: new Date('2024-01-01')
});
```

## Using with Prism

```prism
import confidence from "@prism-lang/confidence"

// Simple extraction
response = llm("Analyze this code")
conf = confidence.extract(response)
result = response ~> conf

// Consistency-based
samples = confidence.sample(
  prompt => llm(prompt),
  "Is this secure?",
  n=5
)
conf = confidence.from_consistency(samples)
result = samples[0] ~> conf

// With calibration
calibrator = confidence.calibrators.security
raw_conf = confidence.extract(response)
calibrated = calibrator.calibrate(raw_conf, {type: "sql_injection"})
result = response ~> calibrated

// Confidence-aware control flow
uncertain if (result) {
  high { deploy() }
  medium { require_review() }
  low { escalate() }
}
```

## Examples

See the `/examples` directory for complete examples including:
- Security vulnerability analysis with confidence
- Medical diagnosis with differential confidence
- Sensor fusion with temporal decay
- API response validation

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT