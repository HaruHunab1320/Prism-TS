---
sidebar_position: 2
title: Confidence Operators
---

# Confidence Operators

Prism provides a rich set of operators for working with confidence values, enabling sophisticated uncertainty handling in your programs. These operators allow you to attach, extract, propagate, and combine confidence values throughout your computations.

## Basic Confidence Operations

### Confidence Annotation (`~>`)

The confidence annotation operator `~>` attaches a confidence value to any expression:

```prism
// Attach confidence to values
sensorReading = 23.5 ~> 0.92
userInput = "verified data" ~> 0.85
prediction = calculatePrediction() ~> modelConfidence

// Confidence values are in range [0, 1]
highConfidence = "reliable" ~> 0.95
mediumConfidence = "probable" ~> 0.6
lowConfidence = "uncertain" ~> 0.3
```

### Confidence Extraction (`~`)

The tilde operator `~` extracts the confidence value from a confident expression:

```prism
data = "important" ~> 0.87
confidence = ~data  // 0.87

// Works with any confident expression
result = (10 * 5) ~> 0.9
conf = ~result  // 0.9

// Non-confident values return 1.0
plainValue = 42
defaultConf = ~plainValue  // 1.0
```

### Value Extraction (`<~`)

The value extraction operator `<~` retrieves the underlying value without confidence:

```prism
confidentData = "hello" ~> 0.75
plainData = <~ confidentData  // "hello"

// Useful for operations that need raw values
measurement = 100 ~> 0.8
doubled = (<~ measurement) * 2  // 200 (no confidence)
```

## Confident Arithmetic Operators

These operators perform arithmetic while propagating confidence values:

### Confident Addition (`~+`)

```prism
a = 10 ~> 0.9
b = 20 ~> 0.8

// Confident addition takes minimum confidence
result = a ~+ b  // 30 (~72.0%)

// Chain multiple operations
c = 5 ~> 0.95
total = a ~+ b ~+ c  // 35 (~72.0%)
```

### Confident Subtraction (`~-`)

```prism
x = 100 ~> 0.85
y = 30 ~> 0.9

result = x ~- y  // 70 (~85.0%)
```

### Confident Multiplication (`~*`)

```prism
price = 50 ~> 0.9
quantity = 3 ~> 0.95

// Multiplication multiplies confidences
total = price ~* quantity  // 150 (~85.5%)
```

### Confident Division (`~/`)

```prism
total = 1000 ~> 0.8
count = 10 ~> 0.9

average = total ~/ count  // 100 (~72.0%)
```

## Confident Comparison Operators

These operators compare values while considering their confidence:

```prism
a = 10 ~> 0.8
b = 10 ~> 0.9

// Confident equality
a ~== b  // true (~72.0%)

// Confident inequality  
a ~!= b  // false (~72.0%)

// Confident comparisons
x = 5 ~> 0.7
y = 10 ~> 0.8

x ~< y   // true (~56.0%)
x ~<= y  // true (~56.0%)
x ~> y   // false (~56.0%)
x ~>= y  // false (~56.0%)
```

## Confident Property Access (`~.`)

Access properties while preserving confidence:

```prism
user = {name: "Alice", age: 30} ~> 0.85
userName = user~.name  // "Alice" (~85.0%)

// Chaining confident access
data = {
  user: {
    profile: {
      email: "alice@example.com"
    }
  }
} ~> 0.9

email = data~.user~.profile~.email  // "alice@example.com" (~90.0%)

// Handles null/undefined gracefully
nullData = null ~> 0.9
result = nullData~.property  // Returns confident null
```

## Advanced Confidence Operators

### Parallel Confidence (`~||>`)

The parallel confidence operator selects the option with the highest confidence:

```prism
// Model ensemble - select best prediction
model1 = "rain" ~> 0.7
model2 = "sunny" ~> 0.9
model3 = "cloudy" ~> 0.8

prediction = model1 ~||> model2 ~||> model3  // "sunny" (~90.0%)

// Fallback to non-confident value
primary = "uncertain" ~> 0.3
fallback = "default"
result = primary ~||> fallback  // "default" (100% confidence)

// Complex decision making
option1 = calculateOption1() ~> confidence1
option2 = calculateOption2() ~> confidence2
option3 = calculateOption3() ~> confidence3

bestOption = option1 ~||> option2 ~||> option3
```

### Threshold Gate (`~@>`)

The threshold gate operator passes values only if they meet a confidence threshold:

```prism
// Basic threshold gate
data = "important" ~> 0.8
threshold = 0.7

// Passes through if confidence >= threshold
result = data ~@> threshold  // "important" (~80.0%)

// Blocks low confidence
uncertain = "maybe" ~> 0.4
filtered = uncertain ~@> 0.6  // null (blocked)

// Use in data pipelines
processedData = rawData 
  |> validate 
  ~@> 0.8  // Only pass high-confidence results
  |> transform
```

### Confidence Pipeline (`~|>`)

Propagate confidence through function pipelines:

```prism
// Functions that work with confidence
addTax = x => x * 1.1
applyDiscount = x => x * 0.9
roundPrice = x => Math.round(x)

price = 100 ~> 0.85

finalPrice = price 
  ~|> addTax 
  ~|> applyDiscount 
  ~|> roundPrice  // Result maintains confidence
```

### Confidence Coalesce (`~??`)

Returns the first non-null/undefined value with its confidence:

```prism
// Similar to ?? but confidence-aware
primary = null ~> 0.9
secondary = "backup" ~> 0.7
tertiary = "default"

result = primary ~?? secondary ~?? tertiary  // "backup" (~70.0%)

// Useful for configuration cascading
userPref = null ~> 0.95
systemDefault = "dark" ~> 0.8
hardcoded = "light"

theme = userPref ~?? systemDefault ~?? hardcoded
```

### Confident Logical Operators

```prism
// Confident AND
a = true ~> 0.8
b = true ~> 0.9
result = a ~&& b  // true (~72.0%)

// Confident OR  
x = false ~> 0.7
y = true ~> 0.9
result = x ~|| y  // true (~90.0%)
```

## Confidence Thresholds

Prism uses confidence thresholds to categorize values:

```prism
// Default thresholds
// HIGH: >= 0.7
// MEDIUM: >= 0.5 and < 0.7  
// LOW: < 0.5

highConf = "reliable" ~> 0.8     // HIGH confidence
mediumConf = "probable" ~> 0.6   // MEDIUM confidence
lowConf = "uncertain" ~> 0.3     // LOW confidence

// Used in uncertain control flow
data = fetchData() ~> 0.75

uncertain if data {
  high {
    // Executes when confidence >= 0.7
    processHighConfidenceData(data)
  }
  medium {
    // Executes when 0.5 <= confidence < 0.7
    validateAndProcess(data)
  }
  low {
    // Executes when confidence < 0.5
    requestManualReview(data)
  }
}
```

## Combining Multiple Confidences

When working with multiple confident values, Prism provides various strategies:

```prism
// Minimum confidence (default for most operations)
a = 10 ~> 0.8
b = 20 ~> 0.9
sum = a ~+ b  // Uses min(0.8, 0.9) = 0.8

// Product confidence (for multiplication)
x = 5 ~> 0.9
y = 4 ~> 0.8
product = x ~* y  // Uses 0.9 * 0.8 = 0.72

// Maximum confidence (parallel selection)
opt1 = "A" ~> 0.6
opt2 = "B" ~> 0.8
best = opt1 ~||> opt2  // Selects opt2 with 0.8

// Average confidence (custom combination)
conf1 = 0.7
conf2 = 0.9
avgConf = (conf1 + conf2) / 2  // 0.8
```

## Practical Examples

### Sensor Fusion

```prism
// Multiple sensors measuring temperature
sensor1 = 23.5 ~> 0.85
sensor2 = 24.1 ~> 0.92
sensor3 = 23.8 ~> 0.78

// Select most confident reading
bestReading = sensor1 ~||> sensor2 ~||> sensor3  // 24.1 (~92.0%)

// Or average with confidence
avgTemp = (sensor1 ~+ sensor2 ~+ sensor3) ~/ 3
```

### Data Validation Pipeline

```prism
// Multi-stage validation with confidence
validateEmail = email => {
  hasAt = email.includes("@") ~> 0.9
  hasDomain = email.includes(".") ~> 0.8
  validFormat = hasAt ~&& hasDomain
  validFormat
}

processUser = userData => {
  validatedEmail = validateEmail(userData.email)
  
  // Only process high-confidence data
  validatedEmail ~@> 0.7 ~|> storeInDatabase
}
```

### Decision Making with Uncertainty

```prism
// Investment decision based on multiple factors
marketTrend = "bullish" ~> 0.7
companyHealth = "strong" ~> 0.85
economicOutlook = "stable" ~> 0.6

// Combine factors
shouldInvest = marketTrend ~&& companyHealth ~&& economicOutlook

uncertain if shouldInvest {
  high {
    invest("large amount")
  }
  medium {
    invest("moderate amount")
  }
  low {
    waitAndObserve()
  }
}
```

### Model Ensemble

```prism
// Combine predictions from multiple models
predict = (input) => {
  // Different models with varying confidence
  neuralNet = runNeuralNet(input) ~> 0.85
  randomForest = runRandomForest(input) ~> 0.82
  svm = runSVM(input) ~> 0.79
  
  // Select best prediction
  neuralNet ~||> randomForest ~||> svm
}

// Use threshold to ensure quality
finalPrediction = predict(data) ~@> 0.8
```

## Best Practices

1. **Choose appropriate confidence values**: Use realistic confidence values that reflect actual uncertainty
   ```prism
   // Good - reflects real measurement uncertainty
   temperature = 23.5 ~> 0.92
   
   // Avoid arbitrary values
   data = "something" ~> 0.5  // Why 0.5?
   ```

2. **Use the right operator for the task**:
   - `~>` for attaching confidence
   - `~||>` for selecting best option
   - `~@>` for filtering by confidence
   - `~+`, `~*` etc. for arithmetic with uncertainty

3. **Document confidence sources**: Explain where confidence values come from
   ```prism
   // Confidence from sensor specifications
   reading = sensorValue ~> 0.95  // ±5% accuracy per datasheet
   
   // Confidence from validation
   userInput = input ~> validationScore
   ```

4. **Handle confidence degradation**: Be aware that confidence typically decreases through operations
   ```prism
   // Confidence decreases through chain
   a = 100 ~> 0.9
   b = 50 ~> 0.8
   c = 25 ~> 0.85
   
   result = a ~+ b ~+ c  // Confidence will be min(0.9, 0.8, 0.85) = 0.8
   ```

5. **Use threshold gates strategically**: Filter out low-confidence data early
   ```prism
   pipeline = rawData
     |> preprocess
     ~@> 0.6      // Early filtering
     |> expensive_computation
     ~@> 0.8      // Final quality gate
   ```