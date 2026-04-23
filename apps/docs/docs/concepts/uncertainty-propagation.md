---
sidebar_position: 3
title: Uncertainty Propagation
---

# Uncertainty Propagation

Uncertainty propagation is a fundamental concept in Prism that determines how confidence values flow through computations. Understanding these rules helps you write programs that accurately track and manage uncertainty throughout their execution.

## Core Principles

### Automatic Confidence Tracking

Prism automatically tracks confidence values through all operations:

```javascript
// Initial values with confidence
let measurement1 = 100 ~> 0.9
let measurement2 = 50 ~> 0.85

// Confidence propagates automatically
let sum = measurement1 + measurement2  // 150 with implicit confidence tracking

// Explicit confidence operations
let confidentSum = measurement1 ~+ measurement2  // 150 (~85.0%)
```

### Default Confidence Values

Non-confident values have an implicit confidence of 1.0:

```javascript
let plainValue = 42
let confidence = ~plainValue  // 1.0

// Mixing confident and non-confident values
let confident = 10 ~> 0.8
let plain = 5

let result = confident ~+ plain  // 15 (~80.0%)
```

## Propagation Rules by Operation Type

### Arithmetic Operations

Different arithmetic operations use different confidence propagation strategies:

#### Addition and Subtraction (Minimum Strategy)

```javascript
// Takes the minimum confidence of operands
let a = 100 ~> 0.9
let b = 50 ~> 0.8

let sum = a ~+ b         // 150 (~80.0%) - min(0.9, 0.8)
let difference = a ~- b  // 50 (~80.0%)  - min(0.9, 0.8)

// Rationale: Sum is only as reliable as its least reliable component
```

#### Multiplication and Division (Product Strategy)

```javascript
// Multiplies confidence values
let x = 10 ~> 0.9
let y = 5 ~> 0.8

let product = x ~* y    // 50 (~72.0%)  - 0.9 * 0.8
let quotient = x ~/ y   // 2 (~72.0%)   - 0.9 * 0.8

// Rationale: Multiplicative uncertainty compounds
```

#### Chain Operations

```javascript
// Confidence degrades through chains
let a = 100 ~> 0.95
let b = 50 ~> 0.9
let c = 25 ~> 0.85

// Each operation applies its rule
let result1 = a ~+ b ~* c
// First: b ~* c = 1250 (~76.5%) - product rule
// Then: a ~+ 1250 = 1350 (~76.5%) - minimum rule

let result2 = (a ~+ b) ~* c
// First: a ~+ b = 150 (~90.0%) - minimum rule
// Then: 150 ~* c = 3750 (~76.5%) - product rule
```

### Comparison Operations

Comparisons propagate confidence using the minimum strategy:

```javascript
let val1 = 100 ~> 0.9
let val2 = 100 ~> 0.85

// All comparisons use minimum confidence
let equal = val1 ~== val2      // true (~85.0%)
let notEqual = val1 ~!= val2   // false (~85.0%)
let greater = val1 ~> val2     // false (~85.0%)
let less = val1 ~< val2        // false (~85.0%)
```

### Logical Operations

#### AND Operations (Minimum Strategy)

```javascript
let cond1 = true ~> 0.8
let cond2 = true ~> 0.9

let result = cond1 ~&& cond2  // true (~80.0%)

// AND requires both conditions, so limited by weakest
```

#### OR Operations (Maximum Strategy)

```javascript
let option1 = false ~> 0.7
let option2 = true ~> 0.9

let result = option1 ~|| option2  // true (~90.0%)

// OR succeeds with best available option
```

### Function Calls

Confidence propagates through function applications:

```javascript
// Simple function
let double = x => x * 2

let value = 10 ~> 0.85
let result = double(value)  // 20 (confidence preserved in context)

// Using confident pipeline
let processChain = value 
  ~|> double 
  ~|> addTen 
  ~|> validate  // Confidence flows through
```

## Complex Propagation Patterns

### Object and Array Operations

```javascript
// Object with confident values
let data = {
  temperature: 23.5 ~> 0.92,
  humidity: 65 ~> 0.88,
  pressure: 1013 ~> 0.95
}

// Accessing preserves individual confidence
let temp = data.temperature  // 23.5 (~92.0%)

// Confident object access
let confidentData = data ~> 0.8
let reading = confidentData~.temperature  // 23.5 (~80.0%) - uses object confidence

// Array operations
let measurements = [10 ~> 0.9, 20 ~> 0.85, 30 ~> 0.95]
let first = measurements[0]  // 10 (~90.0%)
```

### Destructuring with Confidence

```javascript
// Array destructuring preserves confidence
let values = [100 ~> 0.9, 200 ~> 0.85, 300 ~> 0.8]
let [a, b, c] = values
// a = 100 (~90.0%), b = 200 (~85.0%), c = 300 (~80.0%)

// Object destructuring
let sensor = {
  reading: 42 ~> 0.88,
  status: "ok" ~> 0.95
}
let {reading, status} = sensor
// reading = 42 (~88.0%), status = "ok" (~95.0%)

// Confidence thresholds in destructuring
let [x, y] = riskyData ~> 0.6
// x and y inherit appropriate confidence
```

### Conditional Propagation

```javascript
// Ternary preserves branch confidence
let condition = true ~> 0.9
let valueIfTrue = 100 ~> 0.85
let valueIfFalse = 200 ~> 0.8

let result = condition ? valueIfTrue : valueIfFalse
// Result is 100 (~85.0%) - takes confidence from selected branch

// Uncertain if propagates based on confidence level
let data = fetchData() ~> 0.75

uncertain if data {
  high {
    // Executes with high confidence
    let processedData = transform(data)  // Maintains confidence
  }
  medium {
    let validatedData = validate(data) ~> 0.6  // Can modify confidence
  }
  low {
    let fallbackData = getDefault() ~> 0.9  // New confidence
  }
}
```

## Special Propagation Cases

### Null Handling

```javascript
// Confident null
let nullValue = null ~> 0.9

// Operations on null preserve confidence
let result1 = nullValue?.property  // null (maintains confidence context)
let result2 = nullValue ?? "default"  // "default" 

// Confident property access on null
let obj = null ~> 0.9
let prop = obj~.someProperty  // Special null handling with confidence
```

### Error Propagation

```javascript
// Errors can carry confidence information
let riskyOperation = () => {
  if Math.random() > 0.5 {
    throw Error("Operation failed") ~> 0.7
  }
  return "success" ~> 0.9
}

// Handle with confidence awareness
try {
  let result = riskyOperation()
} catch (error) {
  // Error confidence available for decision making
  let errorConfidence = ~error
}
```

## Confidence Algebra

### Combining Independent Sources

```javascript
// Independent measurements
let sensor1 = 23.5 ~> 0.85
let sensor2 = 24.1 ~> 0.90
let sensor3 = 23.8 ~> 0.82

// Average with confidence (custom combination)
let avgValue = (sensor1 + sensor2 + sensor3) / 3
let avgConfidence = (0.85 + 0.90 + 0.82) / 3  // 0.857

let combinedReading = avgValue ~> avgConfidence
```

### Confidence Decay Over Time

```javascript
// Model confidence decay
let initialReading = 100 ~> 0.95
let decayRate = 0.01  // 1% per time unit

let updateConfidence = (value, time) => {
  let currentConf = ~value
  let newConf = currentConf * (1 - decayRate * time)
  (<~ value) ~> Math.max(0.1, newConf)  // Floor at 10%
}

// After 10 time units
let agedReading = updateConfidence(initialReading, 10)  // 100 (~85.5%)
```

### Bayesian-style Updates

```javascript
// Update confidence based on new evidence
let prior = "hypothesis" ~> 0.6
let evidence = "supporting data" ~> 0.8

// Simple Bayesian update
let updateBelief = (prior, evidence) => {
  let priorConf = ~prior
  let evidenceConf = ~evidence
  
  // Simplified update rule
  let posterior = priorConf * evidenceConf / 
    (priorConf * evidenceConf + (1 - priorConf) * (1 - evidenceConf))
  
  (<~ prior) ~> posterior
}

let updated = updateBelief(prior, evidence)  // "hypothesis" (~80.0%)
```

## Practical Examples

### Sensor Fusion with Weighted Average

```javascript
// Multiple sensors with different reliabilities
let sensors = [
  {value: 23.5, confidence: 0.9},
  {value: 24.1, confidence: 0.85},
  {value: 23.8, confidence: 0.92}
]

// Weighted average by confidence
let weightedAverage = () => {
  let totalWeight = 0
  let weightedSum = 0
  
  for sensor in sensors {
    let weight = sensor.confidence
    totalWeight = totalWeight + weight
    weightedSum = weightedSum + (sensor.value * weight)
  }
  
  let avgValue = weightedSum / totalWeight
  let avgConfidence = totalWeight / sensors.length
  
  avgValue ~> avgConfidence
}

let fusedReading = weightedAverage()  // ~23.75 (~89.0%)
```

### Multi-stage Processing Pipeline

```javascript
// Each stage can affect confidence
let rawData = fetchFromSensor() ~> 0.95

// Stage 1: Calibration (high confidence process)
let calibrated = calibrate(rawData) ~> 0.98

// Stage 2: Filtering (may reduce confidence)
let filtered = applyFilter(calibrated) ~> 0.9

// Stage 3: Validation (confidence gate)
let validated = filtered ~@> 0.85  // Only pass if confidence >= 85%

// Stage 4: Final processing
let final = process(validated) ~> 0.88

// Overall confidence tracked through pipeline
```

### Decision Tree with Confidence

```javascript
// Decision nodes with confidence
let makeDecision = (input) => {
  // First decision point
  if (input.temperature ~> 0.9) > 25 {
    // Hot path
    if (input.humidity ~> 0.85) > 70 {
      return "activate_cooling" ~> 0.76  // 0.9 * 0.85
    } else {
      return "monitor" ~> 0.9
    }
  } else {
    // Cold path
    if (input.temperature ~< 10) ~> 0.88 {
      return "activate_heating" ~> 0.88
    } else {
      return "standby" ~> 0.95
    }
  }
}

let action = makeDecision(sensorData)
```

## Best Practices

1. **Understand propagation rules**: Know how each operation affects confidence
   ```prism
   // Addition/subtraction: minimum
   // Multiplication/division: product
   // Logical AND: minimum
   // Logical OR: maximum
   ```

2. **Monitor confidence decay**: Track how confidence degrades through long chains
   ```prism
   // Long chain - confidence degrades
   result = data
     ~|> step1  // 95%
     ~|> step2  // 90%
     ~|> step3  // 85%
     ~|> step4  // 80%
   
   // Consider intermediate validation
   result = data
     ~|> step1
     ~|> step2
     ~@> 0.85  // Gate
     ~|> step3
     ~|> step4
   ```

3. **Use appropriate combination strategies**: Choose the right method for your use case
   ```prism
   // Redundant systems: use maximum (OR-like)
   backup = primary ~||> secondary ~||> tertiary
   
   // Required conditions: use minimum (AND-like)
   ready = systemA ~&& systemB ~&& systemC
   
   // Measurements: use weighted average
   estimate = weightedAvg(measurements)
   ```

4. **Document confidence assumptions**: Make propagation rules explicit
   ```prism
   // Sensor fusion using inverse variance weighting
   // Higher confidence = lower variance = higher weight
   fuseSensors = (readings) => {
     // ... implementation
   }
   ```

5. **Handle edge cases**: Consider boundary conditions
   ```prism
   // Protect against confidence collapse
   safePropagate = (conf1, conf2) => {
     result = conf1 * conf2
     Math.max(0.1, result)  // Minimum 10% confidence
   }
   ```
