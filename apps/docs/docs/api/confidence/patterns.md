---
sidebar_position: 3
title: Patterns API
---

# Patterns API

The Patterns API provides specialized confidence management patterns for complex scenarios including budgets, contracts, differential confidence, and temporal decay.

## Overview

Confidence patterns help manage:
- Confidence budgets for high-stakes decisions
- Confidence contracts with requirements
- Multi-aspect differential confidence
- Time-aware confidence with decay

## ConfidenceBudgetManager

Manage confidence budgets for decisions requiring minimum total confidence.

### Constructor

```typescript
class ConfidenceBudgetManager {
  constructor(minTotal: number)
}
```

**Parameters:**
- `minTotal`: Minimum total confidence required

### Methods

#### add()

```typescript
add(value: any, confidence: number): void
```

Add an item to the confidence budget.

**Parameters:**
- `value`: The value or decision component
- `confidence`: Confidence score (0-1)

#### met()

```typescript
met(): boolean
```

Check if the budget requirement is satisfied.

**Returns:** true if total confidence meets minimum

#### getTotal()

```typescript
getTotal(): number
```

Get current total confidence.

#### getRemaining()

```typescript
getRemaining(): number
```

Get confidence still needed to meet budget.

#### getStatus()

```typescript
getStatus(): {
  met: boolean;
  total: number;
  required: number;
  remaining: number;
  items: number;
}
```

Get comprehensive budget status.

### Example: Medical Diagnosis

```typescript
import { ConfidenceBudgetManager } from '@prism-lang/confidence';

// Require 2.5 total confidence for diagnosis
const diagnosisBudget = new ConfidenceBudgetManager(2.5);

// Add evidence
diagnosisBudget.add('blood_test_positive', 0.9);
diagnosisBudget.add('symptoms_match', 0.8);
diagnosisBudget.add('family_history', 0.6);

const status = diagnosisBudget.getStatus();
console.log(status);
// {
//   met: false,
//   total: 2.3,
//   required: 2.5,
//   remaining: 0.2,
//   items: 3
// }

// Need more evidence
diagnosisBudget.add('imaging_confirms', 0.85);
console.log(diagnosisBudget.met()); // true
```

## ConfidenceContractManager

Define and verify confidence requirements for multiple checks.

### Constructor

```typescript
class ConfidenceContractManager {
  constructor(requirements: { [check: string]: number })
}
```

**Parameters:**
- `requirements`: Map of check names to required confidence levels

### Methods

#### verify()

```typescript
verify(results: {
  [check: string]: { value: any; confidence: number }
}): {
  passed: boolean;
  failures: Array<{ check: string; required: number; actual: number }>;
}
```

Verify results against contract requirements.

**Parameters:**
- `results`: Map of check results with confidence

**Returns:** Verification result with any failures

#### checkRequirement()

```typescript
checkRequirement(check: string, confidence: number): boolean
```

Check if single requirement is met.

#### getSummary()

```typescript
getSummary(): string
```

Get human-readable contract summary.

### Example: Security Audit

```typescript
import { ConfidenceContractManager } from '@prism-lang/confidence';

// Define security requirements
const securityContract = new ConfidenceContractManager({
  'authentication': 0.95,
  'authorization': 0.90,
  'encryption': 0.99,
  'input_validation': 0.85
});

console.log(securityContract.getSummary());
// "Confidence contract requiring: authentication: 95%, authorization: 90%, encryption: 99%, input_validation: 85%"

// Verify scan results
const scanResults = {
  'authentication': { value: 'OAuth2', confidence: 0.96 },
  'authorization': { value: 'RBAC', confidence: 0.88 },  // Fails!
  'encryption': { value: 'AES-256', confidence: 0.99 },
  'input_validation': { value: 'Sanitized', confidence: 0.92 }
};

const verification = securityContract.verify(scanResults);
console.log(verification);
// {
//   passed: false,
//   failures: [{
//     check: 'authorization',
//     required: 0.90,
//     actual: 0.88
//   }]
// }
```

## DifferentialConfidenceManager

Manage confidence across multiple aspects of a prediction.

### Constructor

```typescript
class DifferentialConfidenceManager {
  constructor()
}
```

### Methods

#### setAspect()

```typescript
setAspect(aspect: string, confidence: number): void
```

Set confidence for specific aspect.

#### getAspect()

```typescript
getAspect(aspect: string): number
```

Get confidence for specific aspect.

#### getAllAspects()

```typescript
getAllAspects(): DifferentialConfidence
```

Get all aspects and their confidence levels.

#### getHighest()

```typescript
getHighest(): { aspect: string; confidence: number } | null
```

Get aspect with highest confidence.

#### getLowest()

```typescript
getLowest(): { aspect: string; confidence: number } | null
```

Get aspect with lowest confidence.

#### getAverage()

```typescript
getAverage(): number
```

Get average confidence across all aspects.

### Example: Multi-Model Prediction

```typescript
import { DifferentialConfidenceManager } from '@prism-lang/confidence';

const weatherPrediction = new DifferentialConfidenceManager();

// Different models have different confidence
weatherPrediction.setAspect('temperature', 0.92);
weatherPrediction.setAspect('precipitation', 0.78);
weatherPrediction.setAspect('wind_speed', 0.85);
weatherPrediction.setAspect('humidity', 0.88);

console.log(weatherPrediction.getSummary());
// "Differential confidence: temperature: 92%, humidity: 88%, wind_speed: 85%, precipitation: 78%"

const highest = weatherPrediction.getHighest();
console.log(`Most confident: ${highest.aspect} at ${highest.confidence}`);
// "Most confident: temperature at 0.92"

const avg = weatherPrediction.getAverage();
console.log(`Overall confidence: ${(avg * 100).toFixed(1)}%`);
// "Overall confidence: 85.8%"
```

## TemporalConfidence

Confidence that automatically decays over time.

### Constructor

```typescript
class TemporalConfidence {
  constructor(value: number, options?: {
    halfLife?: number;
    unit?: 'hours' | 'days' | 'weeks' | 'months';
    timestamp?: Date;
  })
}
```

**Parameters:**
- `value`: Initial confidence (0-1)
- `options`: Decay configuration
  - `halfLife`: Time for 50% decay (default: 30)
  - `unit`: Time unit (default: 'days')
  - `timestamp`: Start time (default: now)

### Methods

#### getCurrent()

```typescript
getCurrent(): number
```

Get current confidence after decay.

#### getAge()

```typescript
getAge(): number
```

Get age in configured time units.

#### isStale()

```typescript
istale(threshold?: number): boolean
```

Check if confidence has decayed below threshold.

**Parameters:**
- `threshold`: Staleness threshold (default: 0.6)

#### getDecayExplanation()

```typescript
getDecayExplanation(): string
```

Get human-readable decay explanation.

### Example: Market Prediction

```typescript
import { TemporalConfidence } from '@prism-lang/confidence';

// Stock prediction with 7-day half-life
const prediction = new TemporalConfidence(0.85, {
  halfLife: 7,
  unit: 'days',
  timestamp: new Date('2024-01-01')
});

// Check after 3 days
const current = prediction.getCurrent();
console.log(`Current confidence: ${(current * 100).toFixed(1)}%`);
// "Current confidence: 76.4%"

console.log(prediction.getDecayExplanation());
// "Original: 85.0%, Current: 76.4% (10.1% decay after 3.0 days)"

// Check if still reliable
if (prediction.isStale(0.7)) {
  console.log("Prediction needs refresh");
}
```

## Pattern Combinations

### Budget + Contract Pattern

Combine budget and contract for complex requirements:

```typescript
// Loan approval system
const loanBudget = new ConfidenceBudgetManager(3.0);
const loanContract = new ConfidenceContractManager({
  'credit_score': 0.8,
  'income_verification': 0.9,
  'debt_ratio': 0.7
});

// Collect evidence
const evidence = {
  'credit_score': { value: 750, confidence: 0.95 },
  'income_verification': { value: 'verified', confidence: 0.92 },
  'debt_ratio': { value: 0.3, confidence: 0.88 },
  'employment_history': { value: '5 years', confidence: 0.85 }
};

// Check contract
const contractResult = loanContract.verify(evidence);

// Add to budget
for (const [check, result] of Object.entries(evidence)) {
  loanBudget.add(check, result.confidence);
}

// Both must pass
const approved = contractResult.passed && loanBudget.met();
console.log(`Loan approved: ${approved}`);
```

### Differential + Temporal Pattern

Track multi-aspect confidence over time:

```typescript
class TimedDifferentialConfidence {
  private aspects: Map<string, TemporalConfidence> = new Map();
  
  setAspect(aspect: string, confidence: number, halfLife: number = 30) {
    this.aspects.set(aspect, new TemporalConfidence(confidence, {
      halfLife,
      unit: 'days'
    }));
  }
  
  getCurrentAspects(): DifferentialConfidence {
    const current: DifferentialConfidence = {};
    for (const [aspect, temporal] of this.aspects) {
      current[aspect] = temporal.getCurrent();
    }
    return current;
  }
  
  getStaleAspects(threshold: number = 0.6): string[] {
    return Array.from(this.aspects.entries())
      .filter(([_, temporal]) => temporal.isStale(threshold))
      .map(([aspect, _]) => aspect);
  }
}

// Usage
const forecast = new TimedDifferentialConfidence();
forecast.setAspect('temperature', 0.95, 7);    // 7-day half-life
forecast.setAspect('precipitation', 0.8, 3);   // 3-day half-life
forecast.setAspect('wind', 0.85, 5);          // 5-day half-life

// Check which aspects need updating
const stale = forecast.getStaleAspects();
if (stale.length > 0) {
  console.log(`Need to update: ${stale.join(', ')}`);
}
```

## Best Practices

1. **Budget Sizing**: Set realistic minimums based on decision criticality
2. **Contract Design**: Include all critical checks with appropriate thresholds
3. **Differential Tracking**: Use for multi-faceted predictions
4. **Temporal Decay**: Choose half-life based on domain volatility
5. **Pattern Selection**: Match pattern to use case complexity

## Performance Considerations

- All pattern operations are O(1) or O(n) where n is number of items
- Temporal calculations are lightweight date arithmetic
- No external dependencies or async operations
- Memory usage scales linearly with tracked items

## Example: Complete Decision System

```typescript
import {
  ConfidenceBudgetManager,
  ConfidenceContractManager,
  DifferentialConfidenceManager,
  TemporalConfidence
} from '@prism-lang/confidence';

class InvestmentDecisionSystem {
  private budget = new ConfidenceBudgetManager(4.0);
  private contract = new ConfidenceContractManager({
    'market_analysis': 0.8,
    'risk_assessment': 0.85,
    'timing': 0.7
  });
  private aspects = new DifferentialConfidenceManager();
  private predictions: Map<string, TemporalConfidence> = new Map();
  
  async analyze(investment: any) {
    // Gather predictions
    const marketAnalysis = await this.analyzeMarket(investment);
    const riskAssessment = await this.assessRisk(investment);
    const timing = await this.analyzeTiming(investment);
    
    // Store with temporal decay
    this.predictions.set('market', new TemporalConfidence(
      marketAnalysis.confidence, { halfLife: 7, unit: 'days' }
    ));
    
    // Check contract
    const results = {
      'market_analysis': marketAnalysis,
      'risk_assessment': riskAssessment,
      'timing': timing
    };
    
    const contractCheck = this.contract.verify(results);
    
    // Add to budget
    for (const result of Object.values(results)) {
      this.budget.add(result.value, result.confidence);
    }
    
    // Track aspects
    this.aspects.setAspect('profitability', marketAnalysis.confidence);
    this.aspects.setAspect('safety', riskAssessment.confidence);
    this.aspects.setAspect('timing', timing.confidence);
    
    return {
      decision: contractCheck.passed && this.budget.met() ? 'INVEST' : 'PASS',
      contract: contractCheck,
      budget: this.budget.getStatus(),
      aspects: this.aspects.getSummary()
    };
  }
  
  // ... analysis methods
}
```