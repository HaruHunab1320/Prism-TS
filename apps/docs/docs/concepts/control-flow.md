---
sidebar_position: 4
title: Control Flow
---

# Control Flow

Prism extends traditional control flow constructs with confidence-aware capabilities, enabling programs to make decisions based on uncertainty levels. This guide covers all control flow mechanisms, from basic conditionals to advanced uncertain branching.

## Traditional Control Flow

### If Statements

Standard if statements work as expected:

```javascript
// Basic if
let status = "cool"
if temperature > 30 {
  status = "hot"
}

// If-else
let result = "fail"
if score >= 60 {
  result = "pass"
}

// If-else if-else chains
let grade = "F"
if score >= 90 {
  grade = "A"
} else if score >= 80 {
  grade = "B"
} else if score >= 70 {
  grade = "C"
} else if score >= 60 {
  grade = "D"
}

// Nested conditions
if user.isAuthenticated {
  if user.hasPermission("admin") {
    showAdminPanel()
  } else {
    showUserDashboard()
  }
} else {
  redirectToLogin()
}
```

### Ternary Operator

For simple conditional expressions:

```javascript
// Basic ternary
let status = temperature > 30 ? "hot" : "cool"

// Nested ternary (use sparingly)
let grade = score >= 90 ? "A" : 
        score >= 80 ? "B" : 
        score >= 70 ? "C" : "F"

// With confident values
let result = (confidence > 0.8) ? 
  processHighConfidence(data) : 
  requestManualReview(data)
```

### Pattern Matching

Use `match` to branch on structure with guards and confidence thresholds:

```javascript
let outcome = match input {
  0 => "zero",
  [x, y, ...rest] => rest,
  {type: "error", message} => message,
  x if x > 10 => "large",
  _ => "fallback"
}
```

For full pattern syntax, see the [Pattern Matching](./pattern-matching) guide.

## Loops

### For Loops

```javascript
// Traditional for loop
for let i = 0; i < 10; i = i + 1 {
  console.log(i)
}

// With break
for let i = 0; i < 100; i = i + 1 {
  if i == 50 {
    break
  }
  process(i)
}

// With continue
for let i = 0; i < 100; i = i + 1 {
  if i % 2 == 0 {
    continue  // Skip even numbers
  }
  processOdd(i)
}
```

### For-In Loops

Iterate over collections:

```javascript
// Iterate over array values
let numbers = [1, 2, 3, 4, 5]
for num in numbers {
  console.log(num * 2)
}

// With index
for value, index in numbers {
  console.log(`Index ${index}: ${value}`)
}

// Iterate over object properties
let person = {name: "Alice", age: 30, city: "NYC"}
for key in person {
  console.log(`${key}: ${person[key]}`)
}

// Destructuring in loops
let points = [{x: 1, y: 2}, {x: 3, y: 4}, {x: 5, y: 6}]
for {x, y} in points {
  let distance = Math.sqrt(x * x + y * y)
  console.log(`Distance: ${distance}`)
}
```

### While Loops

```javascript
// Basic while loop
let count = 0
while count < 10 {
  console.log(count)
  count = count + 1
}

// With complex condition
let temperature = readSensor()
let time = 0
while temperature > threshold && time < maxTime {
  adjustCooling()
  temperature = readSensor()
  time = time + 1
}

// Infinite loop with break
while true {
  let input = getUserInput()
  if input == "exit" {
    break
  }
  processInput(input)
}
```

### Do-While Loops

Execute at least once:

```javascript
// Basic do-while
let attempts = 0
do {
  let success = tryOperation()
  attempts = attempts + 1
} while !success && attempts < maxAttempts

// User input validation
do {
  let value = promptUser("Enter a positive number:")
} while value <= 0
```

## Uncertain Control Flow

### Uncertain If Statements

Branch based on confidence levels:

```javascript
// Basic uncertain if
let data = fetchSensorData() ~> 0.75

uncertain if data {
  high {
    // Executes when confidence >= 0.7 (default threshold)
    storeInDatabase(data)
  }
  medium {
    // Executes when 0.5 <= confidence < 0.7
    validateAndStore(data)
  }
  low {
    // Executes when confidence < 0.5
    logForManualReview(data)
  }
}

// With explicit threshold
let prediction = model.predict(input) ~> confidence

uncertain if prediction > 0.8 {  // Custom threshold
  high {
    executeTrade(prediction)
  }
  medium {
    alertTrader(prediction)
  }
  low {
    // Do nothing - too uncertain
  }
}

// With default branch (like switch statement default)
let analysis = llm("Analyze this") ~> customConfidence

uncertain if analysis {
  high {
    deploy()
  }
  medium {
    review()
  }
  low {
    reject()
  }
  default {
    // Executes when confidence doesn't match any threshold
    // Useful for custom confidence levels or edge cases
    log("Unexpected confidence level: ${customConfidence}")
    requestHumanIntervention()
  }
}

// Conditional confidence checking
let result = complexCalculation() ~> calcConfidence

uncertain if result {
  high {
    let finalResult = result
  }
  low {
    // Fallback calculation with different method
    finalResult = simpleCalculation() ~> 0.9
  }
}
```

### Uncertain Loops

Loops that behave differently based on confidence:

```javascript
// Uncertain for loop
uncertain for let i = 0; i < dataPoints.length; i = i + 1 {
  high {
    // Process with full algorithm
    results[i] = complexAnalysis(dataPoints[i])
  }
  medium {
    // Process with simplified algorithm
    results[i] = quickAnalysis(dataPoints[i])
  }
  low {
    // Skip or use default
    results[i] = defaultValue
  }
}

// Uncertain while loop with default
let attempts = 0
uncertain while (attempts < maxAttempts) ~> 0.9 {
  high {
    let result = tryRiskyOperation()
    if result.success {
      break
    }
    attempts = attempts + 1
  }
  medium {
    result = trySafeOperation()
    attempts = attempts + 1
  }
  low {
    // Too uncertain, abort
    result = abortWithDefault()
    break
  }
  default {
    // Handle unexpected confidence levels
    log("Unexpected confidence in loop")
    attempts = attempts + 1
  }
}
```

### Default Branch

The `default` branch in uncertain constructs acts like a switch statement's default case, executing when the confidence level doesn't match any of the standard thresholds:

```javascript
// Use cases for default branch
uncertain if (apiResponse) {
  high { processNormally() }
  medium { validateFirst() }
  low { reject() }
  default {
    // Handles edge cases like:
    // - Custom confidence thresholds
    // - Undefined confidence
    // - NaN confidence values
    // - Confidence calculation errors
    handleUnexpectedCase()
  }
}

// Adaptive threshold adjustment
let threshold = 0.7
uncertain if (measurement) {
  high { 
    // Confidence >= threshold
    accept() 
  }
  default {
    // Confidence < threshold but not low enough for 'low'
    // Adjust threshold for next iteration
    threshold = threshold - 0.1
    retry()
  }
}

// Data gathering pattern
uncertain if (prediction) {
  high { execute() }
  low { abort() }
  default {
    // Medium confidence - gather more data
    let additionalData = gatherMoreInfo()
    reanalyze(additionalData)
  }
}
```

The default branch ensures your uncertainty-aware code can gracefully handle all possible confidence scenarios.

### Confidence in Conditions

Using confident values in conditions:

```javascript
// Confident comparison
let temp1 = 25 ~> 0.9
let temp2 = 26 ~> 0.85

if temp1 ~< temp2 {
  // Comparison considers confidence
  console.log("temp1 is less than temp2")
}

// Confidence extraction in conditions
let measurement = readSensor() ~> sensorConfidence

if ~measurement > 0.8 {
  // Check if confidence is high enough
  processMeasurement(measurement)
}

// Combining confident conditions
let condition1 = checkCondition1() ~> 0.9
let condition2 = checkCondition2() ~> 0.8

if condition1 ~&& condition2 {
  // Both conditions true with combined confidence
  proceed()
}
```

## Advanced Control Flow Patterns

### Confidence-Based State Machines

```javascript
// State machine with confidence transitions
let currentState = "idle"
let confidence = 1.0

let processEvent = (event) => {
  uncertain if event ~> confidence {
    high {
      // Confident state transitions
      if currentState == "idle" && event.type == "start" {
        currentState = "active"
      } else if currentState == "active" && event.type == "complete" {
        currentState = "done"
      }
    }
    medium {
      // Cautious transitions
      if currentState == "idle" && event.type == "start" {
        currentState = "pending_confirmation"
      }
    }
    low {
      // No state change on low confidence
      logUncertainEvent(event)
    }
  }
}
```

### Early Exit Patterns

```javascript
// Confidence gates for early exit
let processData = (data) => {
  // Check confidence at entry
  if ~data < 0.5 {
    return null  // Too uncertain
  }
  
  // Progressive validation
  let validated = validate(data)
  if ~validated < 0.7 {
    return fallbackProcess(data)
  }
  
  // Full processing only for high confidence
  return fullProcess(validated)
}

// Multiple exit points
let analyzeReading = (reading) => {
  // Quick confidence check
  if ~reading < 0.3 {
    return {status: "rejected", reason: "too uncertain"}
  }
  
  // Validate range
  if reading < minValue || reading > maxValue {
    return {status: "out_of_range", value: reading}
  }
  
  // Process based on confidence
  uncertain if reading {
    high {
      return {status: "processed", result: complexAnalysis(reading)}
    }
    medium {
      return {status: "processed", result: simpleAnalysis(reading)}
    }
    low {
      return {status: "queued", reason: "needs review"}
    }
  }
}
```

### Nested Uncertain Control Flow

```javascript
// Nested uncertain structures
let mainProcess = (input) => {
  let primaryResult = primaryModel(input) ~> 0.8
  
  uncertain if primaryResult {
    high {
      // High confidence in primary
      return primaryResult
    }
    medium {
      // Try secondary model
      let secondaryResult = secondaryModel(input) ~> 0.7
      
      uncertain if secondaryResult {
        high {
          return secondaryResult
        }
        low {
          return combineResults(primaryResult, secondaryResult)
        }
      }
    }
    low {
      // Fallback to ensemble
      return ensembleModel(input) ~> 0.9
    }
  }
}
```

## Practical Examples

### Sensor Reading Validation

```javascript
// Multi-stage sensor validation with confidence
let validateSensorReading = (reading) => {
  // Stage 1: Range check
  let inRange = (reading >= minTemp && reading <= maxTemp) ~> 0.95
  
  // Stage 2: Rate of change check
  let changeRate = abs(reading - lastReading) / timeInterval
  let validChange = (changeRate < maxChangeRate) ~> 0.9
  
  // Stage 3: Cross-validation with other sensors
  let nearbyAvg = getNearbySensorAverage()
  let deviation = abs(reading - nearbyAvg)
  let consistent = (deviation < threshold) ~> 0.85
  
  // Combined validation
  let valid = inRange ~&& validChange ~&& consistent
  
  uncertain if valid {
    high {
      updateReading(reading)
      let lastReading = reading
    }
    medium {
      // Additional verification needed
      if confirmWithRedundantSensor(reading) {
        updateReading(reading)
        lastReading = reading
      }
    }
    low {
      // Reject reading, use interpolation
      let interpolated = (lastReading + nextExpected) / 2
      updateReading(interpolated ~> 0.7)
    }
  }
}
```

### Adaptive Algorithm Selection

```javascript
// Choose algorithm based on data confidence
let processDataAdaptively = (data) => {
  let dataQuality = assessQuality(data) ~> 0.85
  
  uncertain if dataQuality {
    high {
      // Use sophisticated ML model
      let model = loadComplexModel()
      let result = model.process(data)
      
      // Verify result confidence
      if ~result > 0.9 {
        return result
      } else {
        // Even complex model uncertain, try ensemble
        return ensembleProcess(data)
      }
    }
    medium {
      // Use robust statistical methods
      let cleaned = robustClean(data)
      result = statisticalAnalysis(cleaned)
      return result ~> 0.7
    }
    low {
      // Use simple heuristics
      for rule in simpleRules {
        if rule.matches(data) {
          return rule.result ~> 0.5
        }
      }
      return defaultResult ~> 0.3
    }
  }
}
```

### Retry Logic with Confidence Decay

```javascript
// Retry with decreasing confidence
let reliableOperation = (params) => {
  let maxRetries = 5
  let initialConfidence = 0.95
  let decayFactor = 0.15
  
  for let attempt = 0; attempt < maxRetries; attempt = attempt + 1 {
    let confidence = initialConfidence * (1 - decayFactor * attempt)
    
    let result = attemptOperation(params) ~> confidence
    
    uncertain if result {
      high {
        // Success with high confidence
        return result
      }
      medium {
        // Partial success, maybe retry
        if attempt < maxRetries - 1 {
          wait(retryDelay * (attempt + 1))
          continue
        }
        return result  // Accept medium confidence on last try
      }
      low {
        // Failed, definitely retry
        if attempt < maxRetries - 1 {
          adjustParams(params)
          wait(retryDelay * (attempt + 1))
          continue
        }
        return null ~> 0.1  // Give up
      }
    }
  }
}
```

### Decision Tree with Confidence

```javascript
// Medical diagnosis decision tree
let diagnose = (symptoms) => {
  // Check primary symptom
  if symptoms.fever ~> 0.9 {
    uncertain if symptoms.fever > 38.5 {
      high {
        // High fever with high confidence
        if symptoms.cough ~> 0.8 {
          return "possible flu" ~> 0.85
        } else if symptoms.rash ~> 0.9 {
          return "possible infection" ~> 0.8
        }
      }
      medium {
        // Moderate confidence in fever
        return "monitor temperature" ~> 0.6
      }
      low {
        // Uncertain about fever
        return "recheck temperature" ~> 0.4
      }
    }
  }
  
  // Check secondary symptoms
  uncertain if symptoms.fatigue ~> 0.7 {
    high {
      if symptoms.jointPain ~> 0.8 {
        return "possible arthritis" ~> 0.75
      }
    }
    low {
      return "general checkup recommended" ~> 0.5
    }
  }
  
  return "no clear diagnosis" ~> 0.3
}
```

## Best Practices

1. **Use uncertain control flow for genuine uncertainty**: Don't overuse uncertain if/loops
   ```prism
   // Good - actual uncertainty in data
   uncertain if sensorReading {
     high { processNormally() }
     low { requestCalibration() }
   }
   
   // Avoid - no real uncertainty
   uncertain if userAge > 18 {
     high { allowAccess() }  // This is just a regular condition
   }
   ```

2. **Set appropriate confidence thresholds**: Customize based on your domain
   ```prism
   // Medical application - high threshold
   uncertain if diagnosis > 0.9 {
     high { recommendTreatment() }
     low { requireSecondOpinion() }
   }
   
   // Recommendation system - lower threshold
   uncertain if suggestion > 0.6 {
     high { showToUser() }
     low { skipSuggestion() }
   }
   ```

3. **Handle all confidence levels**: Always provide low confidence handling
   ```prism
   uncertain if data {
     high {
       process()
     }
     medium {
       validateAndProcess()
     }
     low {
       // Don't leave empty - handle uncertainty
       logForReview()
       useDefault()
     }
   }
   ```

4. **Combine confidence checks efficiently**: Avoid redundant checks
   ```prism
   // Good - single confidence evaluation
   result = complexCalculation() ~> confidence
   uncertain if result {
     high { useResult() }
     low { recalculate() }
   }
   
   // Avoid - multiple evaluations
   if ~result > 0.7 {
     if ~result > 0.9 {
       // ...
     }
   }
   ```

5. **Document confidence decisions**: Explain threshold choices
   ```prism
   // Investment decision - 0.85 threshold chosen based on
   // historical accuracy of predictions above this level
   uncertain if prediction > 0.85 {
     high {
       invest(amount * 0.8)  // 80% position size
     }
     medium {
       invest(amount * 0.3)  // 30% position size
     }
     low {
       // No investment below 50% confidence
       logMissedOpportunity()
     }
   }
   ```
