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
measurement1 = 100 ~> 0.9
measurement2 = 50 ~> 0.85

// Confidence propagates automatically
sum = measurement1 + measurement2  // 150 with implicit confidence tracking

// Explicit confidence operations
confidentSum = measurement1 ~+ measurement2  // 150 (~85.0%)
```

### Default Confidence Values

Non-confident values have an implicit confidence of 1.0:

```javascript
plainValue = 42
confidence = ~plainValue  // 1.0

// Mixing confident and non-confident values
confident = 10 ~> 0.8
plain = 5

result = confident ~+ plain  // 15 (~80.0%)
```

## Propagation Rules by Operation Type

### Arithmetic Operations

Different arithmetic operations use different confidence propagation strategies:

#### Addition and Subtraction (Minimum Strategy)

```javascript
// Takes the minimum confidence of operands
a = 100 ~> 0.9
b = 50 ~> 0.8

sum = a ~+ b         // 150 (~80.0%) - min(0.9, 0.8)
difference = a ~- b  // 50 (~80.0%)  - min(0.9, 0.8)

// Rationale: Sum is only as reliable as its least reliable component
```

#### Multiplication and Division (Product Strategy)

```javascript
// Multiplies confidence values
x = 10 ~> 0.9
y = 5 ~> 0.8

product = x ~* y    // 50 (~72.0%)  - 0.9 * 0.8
quotient = x ~/ y   // 2 (~72.0%)   - 0.9 * 0.8

// Rationale: Multiplicative uncertainty compounds
```

#### Chain Operations

```javascript
// Confidence degrades through chains
a = 100 ~> 0.95
b = 50 ~> 0.9
c = 25 ~> 0.85

// Each operation applies its rule
result1 = a ~+ b ~* c
// First: b ~* c = 1250 (~76.5%) - product rule
// Then: a ~+ 1250 = 1350 (~76.5%) - minimum rule

result2 = (a ~+ b) ~* c
// First: a ~+ b = 150 (~90.0%) - minimum rule
// Then: 150 ~* c = 3750 (~76.5%) - product rule
```

### Comparison Operations

Comparisons propagate confidence using the minimum strategy:

```javascript
val1 = 100 ~> 0.9
val2 = 100 ~> 0.85

// All comparisons use minimum confidence
equal = val1 ~== val2      // true (~85.0%)
notEqual = val1 ~!= val2   // false (~85.0%)
greater = val1 ~> val2     // false (~85.0%)
less = val1 ~< val2        // false (~85.0%)
```

### Logical Operations

#### AND Operations (Minimum Strategy)

```javascript
cond1 = true ~> 0.8
cond2 = true ~> 0.9

result = cond1 ~&& cond2  // true (~80.0%)

// AND requires both conditions, so limited by weakest
```

#### OR Operations (Maximum Strategy)

```javascript
option1 = false ~> 0.7
option2 = true ~> 0.9

result = option1 ~|| option2  // true (~90.0%)

// OR succeeds with best available option
```

### Function Calls

Confidence propagates through function applications:

```javascript
// Simple function
double = x => x * 2

value = 10 ~> 0.85
result = double(value)  // 20 (confidence preserved in context)

// Using confident pipeline
processChain = value 
  ~|> double 
  ~|> addTen 
  ~|> validate  // Confidence flows through
```

## Complex Propagation Patterns

### Object and Array Operations

```javascript
// Object with confident values
data = {
  temperature: 23.5 ~> 0.92,
  humidity: 65 ~> 0.88,
  pressure: 1013 ~> 0.95
}

// Accessing preserves individual confidence
temp = data.temperature  // 23.5 (~92.0%)

// Confident object access
confidentData = data ~> 0.8
reading = confidentData~.temperature  // 23.5 (~80.0%) - uses object confidence

// Array operations
measurements = [10 ~> 0.9, 20 ~> 0.85, 30 ~> 0.95]
first = measurements[0]  // 10 (~90.0%)
```

### Destructuring with Confidence

```javascript
// Array destructuring preserves confidence
values = [100 ~> 0.9, 200 ~> 0.85, 300 ~> 0.8]
[a, b, c] = values
// a = 100 (~90.0%), b = 200 (~85.0%), c = 300 (~80.0%)

// Object destructuring
sensor = {
  reading: 42 ~> 0.88,
  status: "ok" ~> 0.95
}
{reading, status} = sensor
// reading = 42 (~88.0%), status = "ok" (~95.0%)

// Confidence thresholds in destructuring
[x, y] = riskyData ~> 0.6
// x and y inherit appropriate confidence
```

### Conditional Propagation

```javascript
// Ternary preserves branch confidence
condition = true ~> 0.9
valueIfTrue = 100 ~> 0.85
valueIfFalse = 200 ~> 0.8

result = condition ? valueIfTrue : valueIfFalse
// Result is 100 (~85.0%) - takes confidence from selected branch

// Uncertain if propagates based on confidence level
data = fetchData() ~> 0.75

uncertain if data {
  high {
    // Executes with high confidence
    processedData = transform(data)  // Maintains confidence
  }
  medium {
    validatedData = validate(data) ~> 0.6  // Can modify confidence
  }
  low {
    fallbackData = getDefault() ~> 0.9  // New confidence
  }
}
```

## Special Propagation Cases

### Null and Undefined Handling

```javascript
// Confident null/undefined
nullValue = null ~> 0.9
undefinedValue = undefined ~> 0.85

// Operations on null/undefined preserve confidence
result1 = nullValue?.property  // undefined (maintains confidence context)
result2 = undefinedValue ?? "default"  // "default" 

// Confident property access on null
obj = null ~> 0.9
prop = obj~.someProperty  // Special null handling with confidence
```

### Error Propagation

```javascript
// Errors can carry confidence information
riskyOperation = () => {
  if Math.random() > 0.5 {
    throw Error("Operation failed") ~> 0.7
  }
  return "success" ~> 0.9
}

// Handle with confidence awareness
try {
  result = riskyOperation()
} catch (error) {
  // Error confidence available for decision making
  errorConfidence = ~error
}
```

## Confidence Algebra

### Combining Independent Sources

```javascript
// Independent measurements
sensor1 = 23.5 ~> 0.85
sensor2 = 24.1 ~> 0.90
sensor3 = 23.8 ~> 0.82

// Average with confidence (custom combination)
avgValue = (sensor1 + sensor2 + sensor3) / 3
avgConfidence = (0.85 + 0.90 + 0.82) / 3  // 0.857

combinedReading = avgValue ~> avgConfidence
```

### Confidence Decay Over Time

```javascript
// Model confidence decay
initialReading = 100 ~> 0.95
decayRate = 0.01  // 1% per time unit

updateConfidence = (value, time) => {
  currentConf = ~value
  newConf = currentConf * (1 - decayRate * time)
  (<~ value) ~> Math.max(0.1, newConf)  // Floor at 10%
}

// After 10 time units
agedReading = updateConfidence(initialReading, 10)  // 100 (~85.5%)
```

### Bayesian-style Updates

```javascript
// Update confidence based on new evidence
prior = "hypothesis" ~> 0.6
evidence = "supporting data" ~> 0.8

// Simple Bayesian update
updateBelief = (prior, evidence) => {
  priorConf = ~prior
  evidenceConf = ~evidence
  
  // Simplified update rule
  posterior = priorConf * evidenceConf / 
    (priorConf * evidenceConf + (1 - priorConf) * (1 - evidenceConf))
  
  (<~ prior) ~> posterior
}

updated = updateBelief(prior, evidence)  // "hypothesis" (~80.0%)
```

## Practical Examples

### Sensor Fusion with Weighted Average

```javascript
// Multiple sensors with different reliabilities
sensors = [
  {value: 23.5, confidence: 0.9},
  {value: 24.1, confidence: 0.85},
  {value: 23.8, confidence: 0.92}
]

// Weighted average by confidence
weightedAverage = () => {
  totalWeight = 0
  weightedSum = 0
  
  for sensor in sensors {
    weight = sensor.confidence
    totalWeight = totalWeight + weight
    weightedSum = weightedSum + (sensor.value * weight)
  }
  
  avgValue = weightedSum / totalWeight
  avgConfidence = totalWeight / sensors.length
  
  avgValue ~> avgConfidence
}

fusedReading = weightedAverage()  // ~23.75 (~89.0%)
```

### Multi-stage Processing Pipeline

```javascript
// Each stage can affect confidence
rawData = fetchFromSensor() ~> 0.95

// Stage 1: Calibration (high confidence process)
calibrated = calibrate(rawData) ~> 0.98

// Stage 2: Filtering (may reduce confidence)
filtered = applyFilter(calibrated) ~> 0.9

// Stage 3: Validation (confidence gate)
validated = filtered ~@> 0.85  // Only pass if confidence >= 85%

// Stage 4: Final processing
final = process(validated) ~> 0.88

// Overall confidence tracked through pipeline
```

### Decision Tree with Confidence

```javascript
// Decision nodes with confidence
makeDecision = (input) => {
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

action = makeDecision(sensorData)
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