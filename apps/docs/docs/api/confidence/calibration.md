---
sidebar_position: 2
title: Calibration API
---

# Calibration API

The Calibration API provides domain-specific confidence adjustment and learning-based calibration to improve confidence accuracy over time.

## Overview

Calibration helps ensure that confidence scores accurately reflect real-world probabilities by:
- Applying domain-specific knowledge
- Adjusting for temporal decay
- Learning from feedback
- Handling conditional adjustments

## DomainCalibrator Class

### Constructor

```typescript
abstract class DomainCalibrator {
  constructor(config: DomainCalibrationConfig)
}
```

Base class for all domain calibrators.

**Parameters:**
- `config`: Domain-specific calibration configuration

### Methods

#### calibrate()

```typescript
async calibrate(
  rawConfidence: number,
  context: any
): Promise<number>
```

Adjust raw confidence based on domain knowledge and context.

**Parameters:**
- `rawConfidence`: Initial confidence score (0-1)
- `context`: Domain-specific context information

**Returns:** Calibrated confidence score (0-1)

**Example:**
```typescript
const calibrator = new SecurityCalibrator();
const calibrated = await calibrator.calibrate(0.8, {
  type: 'sql_injection',
  codeFeatures: ['parameterized', 'orm'],
  timestamp: new Date()
});
console.log(calibrated); // 0.88 (boosted by security features)
```

#### explainCalibration()

```typescript
async explainCalibration(
  rawConfidence: number,
  context: any
): Promise<string>
```

Generate human-readable explanation of calibration adjustments.

**Parameters:**
- `rawConfidence`: Initial confidence score
- `context`: Domain context

**Returns:** Explanation string

**Example:**
```typescript
const explanation = await calibrator.explainCalibration(0.8, context);
console.log(explanation);
// "Calibrated from 80.0% to 88.0% (+8.0%). Category: sql_injection."
```

### Abstract Methods

#### categorize()

```typescript
protected abstract categorize(context: any): string | null
```

Determine category from context (must be implemented by subclasses).

## Configuration Types

### DomainCalibrationConfig

```typescript
interface DomainCalibrationConfig {
  domain: string;
  curves: {
    [category: string]: CalibrationCurve;
  };
  temporalDecay?: {
    halfLife: string;  // e.g., "30"
    unit: 'hours' | 'days' | 'weeks' | 'months';
  };
}
```

### CalibrationCurve

```typescript
interface CalibrationCurve {
  baseConfidence: number;  // Base multiplier
  adjustments: {
    [condition: string]: number;  // Conditional adjustments
  };
}
```

## Built-in Calibrators

### SecurityCalibrator

```typescript
class SecurityCalibrator extends DomainCalibrator {
  constructor()
}
```

Specialized calibrator for security vulnerability detection.

**Categories:**
- `sql_injection`: SQL injection vulnerabilities
- `xss`: Cross-site scripting vulnerabilities  
- `authentication`: Authentication-related issues

**Example Configuration:**
```typescript
{
  domain: 'security',
  curves: {
    'sql_injection': {
      baseConfidence: 0.95,
      adjustments: {
        'has_parameterized_queries': 0.05,  // Boost
        'uses_orm': 0.03,                   // Boost
        'complex_query': -0.1,              // Reduce
        'dynamic_query_building': -0.15     // Reduce
      }
    }
  },
  temporalDecay: {
    halfLife: '30',
    unit: 'days'
  }
}
```

**Usage Example:**
```typescript
const security = new SecurityCalibrator();

// Calibrate SQL injection detection
const result = await security.calibrate(0.85, {
  type: 'sql_injection',
  codeFeatures: ['parameterized', 'orm'],
  queryComplexity: 3,
  timestamp: new Date()
});

console.log(result); // 0.93 (boosted by security features)
```

### InteractiveCalibrator

```typescript
class InteractiveCalibrator extends DomainCalibrator {
  constructor(domain: string)
}
```

Learning calibrator that improves over time with feedback.

#### feedback()

```typescript
feedback(prediction: any, actualOutcome: any): void
```

Provide feedback to improve calibration.

**Parameters:**
- `prediction`: The original prediction
- `actualOutcome`: What actually happened

#### save()

```typescript
save(name: string): string
```

Save learned calibration data.

**Returns:** Serialized calibration data

#### load()

```typescript
static load(data: string): InteractiveCalibrator
```

Load previously saved calibration.

**Example:**
```typescript
const calibrator = new InteractiveCalibrator('weather');

// Make prediction with confidence
const prediction = { temp: 72, conditions: 'sunny' };
const confidence = 0.8;

// Later, provide feedback
const actual = { temp: 68, conditions: 'cloudy' };
calibrator.feedback(prediction, actual);

// Save learned calibration
const saved = calibrator.save('weather_model_v1');

// Load in another session
const loaded = InteractiveCalibrator.load(saved);
```

## Temporal Decay

Confidence naturally decays over time as information becomes stale:

```typescript
// Exponential decay formula
decayFactor = Math.pow(0.5, age / halfLife)
calibrated = original * decayFactor + 0.5 * (1 - decayFactor)
```

**Example:**
```typescript
const config: DomainCalibrationConfig = {
  domain: 'market_prediction',
  curves: {},
  temporalDecay: {
    halfLife: '7',
    unit: 'days'
  }
};

// Fresh prediction: 90% confidence
// After 7 days: 70% confidence (halfway to 50%)
// After 14 days: 60% confidence
// After 21 days: 55% confidence
```

## Custom Calibrator Implementation

### Example: Weather Calibrator

```typescript
class WeatherCalibrator extends DomainCalibrator {
  constructor() {
    super({
      domain: 'weather',
      curves: {
        'short_term': {
          baseConfidence: 0.9,
          adjustments: {
            'stable_pattern': 0.05,
            'changing_season': -0.1,
            'extreme_weather': -0.15
          }
        },
        'long_term': {
          baseConfidence: 0.6,
          adjustments: {
            'historical_accuracy': 0.1,
            'climate_model': 0.05
          }
        }
      },
      temporalDecay: {
        halfLife: '3',
        unit: 'days'
      }
    });
  }

  protected categorize(context: any): string | null {
    const days = context.forecastDays || 0;
    return days <= 3 ? 'short_term' : 'long_term';
  }

  protected checkCondition(condition: string, context: any): boolean {
    switch (condition) {
      case 'stable_pattern':
        return context.pressureStable && !context.frontsNearby;
      case 'changing_season':
        const month = new Date().getMonth();
        return month === 2 || month === 5 || month === 8 || month === 11;
      case 'extreme_weather':
        return context.severeWeatherPossible || false;
      default:
        return false;
    }
  }
}
```

### Usage

```typescript
const weather = new WeatherCalibrator();

// Short-term forecast with stable conditions
const shortTerm = await weather.calibrate(0.85, {
  forecastDays: 2,
  pressureStable: true,
  frontsNearby: false,
  timestamp: new Date()
});
console.log(shortTerm); // 0.81 (0.85 * 0.9 + 0.05 adjustment)

// Long-term forecast
const longTerm = await weather.calibrate(0.7, {
  forecastDays: 10,
  historicalAccuracy: 0.75,
  timestamp: new Date()
});
console.log(longTerm); // 0.52 (reduced by base confidence)
```

## Calibration Strategies

### 1. Conservative Calibration

Reduce overconfidence in predictions:

```typescript
class ConservativeCalibrator extends DomainCalibrator {
  protected applyCurve(value: number, curve: CalibrationCurve): number {
    // Push high confidence toward center
    const adjusted = super.applyCurve(value, curve);
    return 0.5 + (adjusted - 0.5) * 0.8;
  }
}
```

### 2. Expertise-Based Calibration

Boost confidence for expert systems:

```typescript
class ExpertCalibrator extends DomainCalibrator {
  constructor(private expertiseLevel: number) {
    super({ /* config */ });
  }

  async calibrate(raw: number, context: any): Promise<number> {
    const base = await super.calibrate(raw, context);
    // Boost based on expertise
    return base + (1 - base) * this.expertiseLevel * 0.2;
  }
}
```

### 3. Ensemble Calibration

Combine multiple calibrators:

```typescript
class EnsembleCalibrator {
  constructor(private calibrators: DomainCalibrator[]) {}

  async calibrate(raw: number, context: any): Promise<number> {
    const results = await Promise.all(
      this.calibrators.map(c => c.calibrate(raw, context))
    );
    
    // Average the calibrations
    return results.reduce((a, b) => a + b) / results.length;
  }
}
```

## Best Practices

1. **Start Conservative**: Begin with lower base confidence and adjust up
2. **Track Performance**: Monitor calibration accuracy over time
3. **Domain Expertise**: Involve domain experts in setting adjustments
4. **Regular Updates**: Recalibrate based on new data
5. **Context Matters**: Include relevant context for accurate calibration

## Performance Considerations

- Calibration is typically fast (< 1ms)
- Caching can improve repeated calibrations
- Learning calibrators need periodic retraining
- Temporal decay calculations are lightweight

## Validation Example

```typescript
// Validate calibrator accuracy
async function validateCalibrator(
  calibrator: DomainCalibrator,
  testCases: Array<{ context: any; expected: number }>
) {
  const results = [];
  
  for (const test of testCases) {
    const calibrated = await calibrator.calibrate(0.5, test.context);
    const error = Math.abs(calibrated - test.expected);
    results.push({ 
      calibrated, 
      expected: test.expected, 
      error 
    });
  }
  
  const avgError = results.reduce((sum, r) => sum + r.error, 0) / results.length;
  console.log(`Average calibration error: ${(avgError * 100).toFixed(1)}%`);
  
  return results;
}
```