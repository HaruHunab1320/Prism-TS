---
sidebar_position: 4
title: Confidence Sources
---

# Confidence Sources

The `@prism-lang/confidence` package provides specialized extractors for deriving confidence from non-LLM sources like sensors and external APIs.

## Overview

While the main `ConfidenceExtractor` focuses on LLM responses, these source-specific extractors handle:
- **Sensor data** with calibration, environmental factors, and historical accuracy
- **API responses** with reliability tracking, latency monitoring, and provider reputation

## SensorConfidenceExtractor

Extract confidence from physical sensor readings based on device characteristics and environmental conditions.

### Import

```typescript
import { SensorConfidenceExtractor } from '@prism-lang/confidence';
```

### Constructor

```typescript
const sensorExtractor = new SensorConfidenceExtractor();
```

### fromSensor()

Calculate confidence for a single sensor reading.

```typescript
fromSensor(reading: any, params: SensorConfidenceParams): ConfidenceResult
```

**Parameters:**
- `reading`: The sensor reading value
- `params`: Sensor characteristics
  - `calibrationDate?`: Date of last calibration
  - `age`: Sensor age in days
  - `environment`: Environmental conditions object
  - `history`: Historical accuracy (0-1)

**Returns:** `ConfidenceResult` with aggregated confidence

**Example:**

```typescript
const sensorExtractor = new SensorConfidenceExtractor();

const result = sensorExtractor.fromSensor(23.5, {
  calibrationDate: new Date('2024-01-15'),
  age: 180, // 180 days old
  environment: {
    temperature: 22,
    humidity: 45,
    optimalTemperature: 20,
    optimalHumidity: 50
  },
  history: 0.92 // 92% historical accuracy
});

console.log(result.value); // 0.87
console.log(result.explanation);
// "Sensor confidence: 87.0% based on calibration: 85%, environment: 95%, history: 92%, age: 95%"
```

### fromMultipleSensors()

Aggregate confidence from multiple sensor readings.

```typescript
fromMultipleSensors(
  readings: Array<{
    sensor: string;
    value: any;
    params: SensorConfidenceParams;
  }>,
  options?: { aggregation?: 'mean' | 'median' | 'weighted' }
): ConfidenceResult
```

**Aggregation Methods:**
- `mean` (default): Average of all confidence values
- `median`: Middle value when sorted
- `weighted`: Weighted by historical accuracy

**Example:**

```typescript
const result = sensorExtractor.fromMultipleSensors([
  {
    sensor: 'temp-1',
    value: 23.5,
    params: { age: 100, history: 0.95, environment: {} }
  },
  {
    sensor: 'temp-2',
    value: 23.7,
    params: { age: 200, history: 0.88, environment: {} }
  },
  {
    sensor: 'temp-3',
    value: 23.4,
    params: { age: 50, history: 0.92, environment: {} }
  }
], { aggregation: 'weighted' });

console.log(result.value); // Weighted average confidence
console.log(result.explanation);
// "Aggregated confidence from 3 sensors: 91.2%"
```

### Confidence Factors

The sensor extractor considers four weighted factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| `history` | 35% | Historical accuracy of the sensor |
| `calibration` | 30% | Recency of calibration (decays over 1 year) |
| `environment` | 25% | Current environmental conditions |
| `age` | 10% | Physical age of sensor (10-year lifespan) |

### Environmental Conditions

The extractor adjusts confidence based on:

```typescript
environment: {
  temperature: 25,        // Current temperature
  optimalTemperature: 20, // Ideal operating temp (default: 20)
  humidity: 60,           // Current humidity %
  optimalHumidity: 50,    // Ideal humidity (default: 50)
  vibration: 2            // Vibration level 0-10
}
```

---

## APIConfidenceExtractor

Extract confidence from external API calls based on reliability history and provider reputation.

### Import

```typescript
import { APIConfidenceExtractor } from '@prism-lang/confidence';
```

### Constructor

```typescript
const apiExtractor = new APIConfidenceExtractor();
```

### fromAPIReliability()

Calculate confidence based on API characteristics.

```typescript
fromAPIReliability(params: APIReliabilityParams): ConfidenceResult
```

**Parameters:**
- `params`: API reliability parameters
  - `provider`: Provider name (e.g., 'openai', 'weather.com')
  - `historicalAccuracy`: Past success rate (0-1)
  - `latency?`: Response time in milliseconds
  - `lastFailure?`: Date of most recent failure

**Example:**

```typescript
const apiExtractor = new APIConfidenceExtractor();

const result = apiExtractor.fromAPIReliability({
  provider: 'openai',
  historicalAccuracy: 0.98,
  latency: 450,
  lastFailure: new Date('2024-01-01')
});

console.log(result.value); // 0.94
console.log(result.explanation);
// "API confidence for openai: 94.0% based on accuracy: 98%, latency: 91%, reliability: 100%, reputation: 95%"
```

### trackAPICall()

Track API calls for automatic reliability calculation.

```typescript
trackAPICall(provider: string, success: boolean, latency: number): void
```

**Example:**

```typescript
// Track successful calls
apiExtractor.trackAPICall('weather-api', true, 250);
apiExtractor.trackAPICall('weather-api', true, 180);
apiExtractor.trackAPICall('weather-api', false, 5000); // Failure

// Later, get calculated reliability
const reliability = apiExtractor.getProviderReliability('weather-api');
console.log(reliability);
// { provider: 'weather-api', historicalAccuracy: 0.67, latency: 215, lastFailure: Date }
```

### getProviderReliability()

Get calculated reliability parameters for a tracked provider.

```typescript
getProviderReliability(provider: string): APIReliabilityParams
```

Returns accumulated statistics from `trackAPICall()`. Unknown providers return 50% default accuracy.

### Confidence Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| `accuracy` | 40% | Historical success rate |
| `reliability` | 25% | Time since last failure (full confidence after 24h) |
| `latency` | 20% | Response speed (5 second max threshold) |
| `reputation` | 15% | Known provider reputation |

### Provider Reputations

Built-in reputation scores for known providers:

| Provider | Reputation |
|----------|------------|
| `openai` | 0.95 |
| `anthropic` | 0.95 |
| `google` | 0.93 |
| `weather.com` | 0.85 |
| `openweathermap` | 0.80 |
| `newsapi` | 0.75 |
| (unknown) | 0.70 |

---

## Integration with Prism

Use source extractors in Prism code:

```javascript
// sensor-monitor.prism
import {SensorConfidenceExtractor, APIConfidenceExtractor} from "@prism-lang/confidence"

const sensors = new SensorConfidenceExtractor()
const apis = new APIConfidenceExtractor()

// Get sensor reading with confidence
function readTemperature(sensorId, rawValue) {
  let result = sensors.fromSensor(rawValue, {
    age: getSensorAge(sensorId),
    history: getSensorHistory(sensorId),
    environment: getCurrentEnvironment()
  })

  return rawValue ~> result.value
}

// Get API data with confidence
async function fetchWeather(location) {
  let response = await weatherAPI.get(location)

  let reliability = apis.fromAPIReliability({
    provider: "openweathermap",
    historicalAccuracy: 0.85,
    latency: response.latency
  })

  return response.data ~> reliability.value
}

// Use in uncertain control flow
let temperature = readTemperature("sensor-1", 23.5)
let weather = await fetchWeather("NYC")

uncertain if (temperature) {
  high { logReading(temperature) }
  medium { flagForReview(temperature) }
  low { discardReading(temperature) }
}
```

---

## Type Definitions

```typescript
interface SensorConfidenceParams {
  calibrationDate?: Date;
  age: number;  // Days
  environment: {
    temperature?: number;
    optimalTemperature?: number;
    humidity?: number;
    optimalHumidity?: number;
    vibration?: number;
  };
  history: number;  // 0-1
}

interface APIReliabilityParams {
  provider: string;
  historicalAccuracy: number;  // 0-1
  latency?: number;  // Milliseconds
  lastFailure?: Date;
}

interface ConfidenceResult {
  value: number;  // 0-1
  explanation: string;
  provenance?: {
    sources: Array<{
      method: string;
      contribution: number;
      raw_value: number;
      adjusted_value: number;
      reason: string;
    }>;
    adjustments: Array<{
      type: string;
      delta: number;
      reason: string;
    }>;
    timestamp: Date;
  };
}
```
