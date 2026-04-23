---
sidebar_position: 2
title: Confidence Operators
description: Master Prism's unique confidence operators for uncertainty handling. Learn how to attach, extract, propagate, and combine confidence values with arithmetic, comparison, and logical operators.
keywords: [confidence operators, uncertainty operators, prism operators, confidence propagation, threshold gate, confident arithmetic, uncertainty programming, confidence extraction, parallel confidence, confidence pipeline]
---

# Confidence Operators

Prism provides a rich set of operators for working with confidence values, enabling sophisticated uncertainty handling in your programs. These operators allow you to attach, extract, propagate, and combine confidence values throughout your computations.

## Basic Confidence Operations

### Confidence Annotation (`~>`)

The confidence annotation operator `~>` attaches a confidence value to any expression:

```javascript
// Attach confidence to values
let sensorReading = 23.5 ~> 0.92
let userInput = "verified data" ~> 0.85
let prediction = calculatePrediction() ~> modelConfidence

// Confidence values are in range [0, 1]
let highConfidence = "reliable" ~> 0.95
let mediumConfidence = "probable" ~> 0.6
let lowConfidence = "uncertain" ~> 0.3
```

### Confidence Extraction (`~`)

The tilde operator `~` extracts the confidence value from a confident expression:

```javascript
let data = "important" ~> 0.87
let confidence = ~data  // 0.87

// Works with any confident expression
let result = (10 * 5) ~> 0.9
let conf = ~result  // 0.9

// Non-confident values return 1.0
let plainValue = 42
let defaultConf = ~plainValue  // 1.0
```

### Value Extraction (`<~`)

The value extraction operator `<~` retrieves the underlying value without confidence:

```javascript
let confidentData = "hello" ~> 0.75
let plainData = <~ confidentData  // "hello"

// Useful for operations that need raw values
let measurement = 100 ~> 0.8
let doubled = (<~ measurement) * 2  // 200 (no confidence)
```

## Confident Arithmetic Operators

These operators perform arithmetic while propagating confidence values:

### Confident Addition (`~+`)

```javascript
let a = 10 ~> 0.9
let b = 20 ~> 0.8

// Confident addition takes minimum confidence
let result = a ~+ b  // 30 (~72.0%)

// Chain multiple operations
let c = 5 ~> 0.95
let total = a ~+ b ~+ c  // 35 (~72.0%)
```

### Confident Subtraction (`~-`)

```javascript
let x = 100 ~> 0.85
let y = 30 ~> 0.9

let result = x ~- y  // 70 (~85.0%)
```

### Confident Multiplication (`~*`)

```javascript
let price = 50 ~> 0.9
let quantity = 3 ~> 0.95

// Multiplication multiplies confidences
let total = price ~* quantity  // 150 (~85.5%)
```

### Confident Division (`~/`)

```javascript
let total = 1000 ~> 0.8
let count = 10 ~> 0.9

let average = total ~/ count  // 100 (~72.0%)
```

## Confident Comparison Operators

These operators compare values while considering their confidence:

```javascript
let a = 10 ~> 0.8
let b = 10 ~> 0.9

// Confident equality
a ~== b  // true (~72.0%)

// Confident inequality  
a ~!= b  // false (~72.0%)

// Confident comparisons
let x = 5 ~> 0.7
let y = 10 ~> 0.8

x ~< y   // true (~56.0%)
x ~<= y  // true (~56.0%)
x ~> y   // false (~56.0%)
x ~>= y  // false (~56.0%)
```

## Confident Property Access (`~.`)

Access properties while preserving confidence:

```javascript
let user = {name: "Alice", age: 30} ~> 0.85
let userName = user~.name  // "Alice" (~85.0%)

// Chaining confident access
let data = {
  user: {
    profile: {
      email: "alice@example.com"
    }
  }
} ~> 0.9

let email = data~.user~.profile~.email  // "alice@example.com" (~90.0%)

// Handles null gracefully
let nullData = null ~> 0.9
let result = nullData~.property  // Returns confident null
```

## Advanced Confidence Operators

### Parallel Confidence (`~||>`)

The parallel confidence operator selects the option with the highest confidence:

```javascript
// Model ensemble - select best prediction
let model1 = "rain" ~> 0.7
let model2 = "sunny" ~> 0.9
let model3 = "cloudy" ~> 0.8

let prediction = model1 ~||> model2 ~||> model3  // "sunny" (~90.0%)

// Fallback to non-confident value
let primary = "uncertain" ~> 0.3
let fallback = "default"
let result = primary ~||> fallback  // "default" (100% confidence)

// Complex decision making
let option1 = calculateOption1() ~> confidence1
let option2 = calculateOption2() ~> confidence2
let option3 = calculateOption3() ~> confidence3

let bestOption = option1 ~||> option2 ~||> option3
```

### Consensus & Aggregation Helpers

Prism also provides built-in helpers to combine multiple confident values:

```javascript
// Pick the highest-confidence value (default)
let winner = consensus([model1, model2, model3])

// Pick the lowest-confidence value
let pessimistic = consensus([model1, model2], { strategy: "min" })

// Aggregate a list into a combined confidence
let grouped = aggregate([model1, model2], { strategy: "average" })

// Aggregate with a custom combiner
let combined = aggregate([model1, model2], {
  strategy: "product",
  combine: values => values[0] + values[1]
})
```

### Confident Ternary (`~?`)

The confident ternary operator works like the regular ternary but propagates confidence from both the condition and the selected branch:

```javascript
// Regular ternary - ignores confidence
let condition = true ~> 0.8
let regular = condition ? "yes" : "no"  // Result: "yes" (no confidence)

// Confident ternary - propagates confidence
let confident = condition ~? "yes" : "no"  // Result: "yes" ~> 0.8

// Combines confidences from condition and branch
condition = true ~> 0.8
let yesOption = "YES" ~> 0.9
let noOption = "NO" ~> 0.7
let result = condition ~? yesOption : noOption  // Result: "YES" ~> 0.72 (0.8 * 0.9)

// Nested confident ternary
let a = true ~> 0.9
let b = false ~> 0.8
result = a ~? (b ~? "both" : "just a") : "neither"
// Result: "just a" ~> 0.72
```

### Confident Assignment Operators

Confident assignment operators provide syntactic sugar for updating variables while preserving confidence:

#### Addition Assignment (~+=)
```javascript
// Regular += with confident value
let balance = 1000 ~> 0.95
balance += 100  // 1100 ~> 0.95 (keeps original confidence)

// Confident += combines confidences
balance = 1000 ~> 0.95
let deposit = 100 ~> 0.8
balance ~+= deposit  // 1100 ~> 0.8 (min confidence)
```

#### Subtraction Assignment (~-=)
```javascript
let inventory = 500 ~> 0.9
let withdrawal = 50 ~> 0.85
inventory ~-= withdrawal  // 450 ~> 0.85
```

#### Multiplication Assignment (~*=)
```javascript
let price = 100 ~> 0.9
let taxRate = 1.2 ~> 0.99
price ~*= taxRate  // 120 ~> 0.9
```

#### Division Assignment (~/=)
```javascript
let total = 1000 ~> 0.9
let divisor = 4 ~> 0.95
total ~/= divisor  // 250 ~> 0.9
```

These operators are equivalent to:
- `x ~+= y` is the same as `x = x ~+ y`
- `x ~-= y` is the same as `x = x ~- y`
- `x ~*= y` is the same as `x = x ~* y`
- `x ~/= y` is the same as `x = x ~/ y`

They're particularly useful for accumulating values with confidence tracking:

```javascript
// Running total with confidence tracking
let total = 0 ~> 1.0
for measurement in measurements {
  total ~+= measurement  // Confidence degrades with each addition
}
// Final total has confidence of the least confident measurement
```

### Threshold Gate (`~@>`)

The threshold gate operator passes values only if they meet a confidence threshold:

```javascript
// Basic threshold gate
let data = "important" ~> 0.8
let threshold = 0.7

// Passes through if confidence >= threshold
let result = data ~@> threshold  // "important" (~80.0%)

// Blocks low confidence
let uncertain = "maybe" ~> 0.4
let filtered = uncertain ~@> 0.6  // null (blocked)

// Use in data pipelines
let processedData = rawData 
  |> validate 
  ~@> 0.8  // Only pass high-confidence results
  |> transform
```

### Confidence Pipeline (`~|>`)

Propagate confidence through function pipelines:

```javascript
// Functions that work with confidence
let addTax = x => x * 1.1
let applyDiscount = x => x * 0.9
let roundPrice = x => Math.round(x)

let price = 100 ~> 0.85

let finalPrice = price 
  ~|> addTax 
  ~|> applyDiscount 
  ~|> roundPrice  // Result maintains confidence
```

### Confidence Coalesce (`~??`)

Returns the first non-null value with its confidence:

```javascript
// Similar to ?? but confidence-aware
let primary = null ~> 0.9
let secondary = "backup" ~> 0.7
let tertiary = "default"

let result = primary ~?? secondary ~?? tertiary  // "backup" (~70.0%)

// Useful for configuration cascading
let userPref = null ~> 0.95
let systemDefault = "dark" ~> 0.8
let hardcoded = "light"

let theme = userPref ~?? systemDefault ~?? hardcoded
```

### Confident Logical Operators

```javascript
// Confident AND
let a = true ~> 0.8
let b = true ~> 0.9
let result = a ~&& b  // true (~72.0%)

// Confident OR  
let x = false ~> 0.7
let y = true ~> 0.9
result = x ~|| y  // true (~90.0%)
```

## Confidence Thresholds

Prism uses confidence thresholds to categorize values:

```javascript
// Default thresholds
// HIGH: >= 0.7
// MEDIUM: >= 0.5 and < 0.7  
// LOW: < 0.5

let highConf = "reliable" ~> 0.8     // HIGH confidence
let mediumConf = "probable" ~> 0.6   // MEDIUM confidence
let lowConf = "uncertain" ~> 0.3     // LOW confidence

// Used in uncertain control flow
let data = fetchData() ~> 0.75

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

```javascript
// Minimum confidence (default for most operations)
let a = 10 ~> 0.8
let b = 20 ~> 0.9
let sum = a ~+ b  // Uses min(0.8, 0.9) = 0.8

// Product confidence (for multiplication)
let x = 5 ~> 0.9
let y = 4 ~> 0.8
let product = x ~* y  // Uses 0.9 * 0.8 = 0.72

// Maximum confidence (parallel selection)
let opt1 = "A" ~> 0.6
let opt2 = "B" ~> 0.8
let best = opt1 ~||> opt2  // Selects opt2 with 0.8

// Average confidence (custom combination)
let conf1 = 0.7
let conf2 = 0.9
let avgConf = (conf1 + conf2) / 2  // 0.8
```

## Practical Examples

### Sensor Fusion

```javascript
// Multiple sensors measuring temperature
let sensor1 = 23.5 ~> 0.85
let sensor2 = 24.1 ~> 0.92
let sensor3 = 23.8 ~> 0.78

// Select most confident reading
let bestReading = sensor1 ~||> sensor2 ~||> sensor3  // 24.1 (~92.0%)

// Or average with confidence
let avgTemp = (sensor1 ~+ sensor2 ~+ sensor3) ~/ 3
```

### Data Validation Pipeline

```javascript
// Multi-stage validation with confidence
let validateEmail = email => {
  let hasAt = email.includes("@") ~> 0.9
  let hasDomain = email.includes(".") ~> 0.8
  let validFormat = hasAt ~&& hasDomain
  validFormat
}

let processUser = userData => {
  let validatedEmail = validateEmail(userData.email)
  
  // Only process high-confidence data
  validatedEmail ~@> 0.7 ~|> storeInDatabase
}
```

### Decision Making with Uncertainty

```javascript
// Investment decision based on multiple factors
let marketTrend = "bullish" ~> 0.7
let companyHealth = "strong" ~> 0.85
let economicOutlook = "stable" ~> 0.6

// Combine factors
let shouldInvest = marketTrend ~&& companyHealth ~&& economicOutlook

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

```javascript
// Combine predictions from multiple models
let predict = (input) => {
  // Different models with varying confidence
  let neuralNet = runNeuralNet(input) ~> 0.85
  let randomForest = runRandomForest(input) ~> 0.82
  let svm = runSVM(input) ~> 0.79
  
  // Select best prediction
  neuralNet ~||> randomForest ~||> svm
}

// Use threshold to ensure quality
let finalPrediction = predict(data) ~@> 0.8
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
