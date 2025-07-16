---
sidebar_position: 4
title: Control Flow
---

# Control Flow

Prism extends traditional control flow constructs with confidence-aware capabilities, enabling programs to make decisions based on uncertainty levels. This guide covers all control flow mechanisms, from basic conditionals to advanced uncertain branching.

## Traditional Control Flow

### If Statements

Standard if statements work as expected:

```prism
// Basic if
if temperature > 30 {
  status = "hot"
}

// If-else
if score >= 60 {
  result = "pass"
} else {
  result = "fail"
}

// If-else if-else chains
if score >= 90 {
  grade = "A"
} else if score >= 80 {
  grade = "B"
} else if score >= 70 {
  grade = "C"
} else if score >= 60 {
  grade = "D"
} else {
  grade = "F"
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

```prism
// Basic ternary
status = temperature > 30 ? "hot" : "cool"

// Nested ternary (use sparingly)
grade = score >= 90 ? "A" : 
        score >= 80 ? "B" : 
        score >= 70 ? "C" : "F"

// With confident values
result = (confidence > 0.8) ? 
  processHighConfidence(data) : 
  requestManualReview(data)
```

## Loops

### For Loops

```prism
// Traditional for loop
for i = 0; i < 10; i = i + 1 {
  console.log(i)
}

// With break
for i = 0; i < 100; i = i + 1 {
  if i == 50 {
    break
  }
  process(i)
}

// With continue
for i = 0; i < 100; i = i + 1 {
  if i % 2 == 0 {
    continue  // Skip even numbers
  }
  processOdd(i)
}
```

### For-In Loops

Iterate over collections:

```prism
// Iterate over array values
numbers = [1, 2, 3, 4, 5]
for num in numbers {
  console.log(num * 2)
}

// With index
for value, index in numbers {
  console.log(`Index ${index}: ${value}`)
}

// Iterate over object properties
person = {name: "Alice", age: 30, city: "NYC"}
for key in person {
  console.log(`${key}: ${person[key]}`)
}

// Destructuring in loops
points = [{x: 1, y: 2}, {x: 3, y: 4}, {x: 5, y: 6}]
for {x, y} in points {
  distance = Math.sqrt(x * x + y * y)
  console.log(`Distance: ${distance}`)
}
```

### While Loops

```prism
// Basic while loop
count = 0
while count < 10 {
  console.log(count)
  count = count + 1
}

// With complex condition
while temperature > threshold && time < maxTime {
  adjustCooling()
  temperature = readSensor()
  time = time + 1
}

// Infinite loop with break
while true {
  input = getUserInput()
  if input == "exit" {
    break
  }
  processInput(input)
}
```

### Do-While Loops

Execute at least once:

```prism
// Basic do-while
attempts = 0
do {
  success = tryOperation()
  attempts = attempts + 1
} while !success && attempts < maxAttempts

// User input validation
do {
  value = promptUser("Enter a positive number:")
} while value <= 0
```

## Uncertain Control Flow

### Uncertain If Statements

Branch based on confidence levels:

```prism
// Basic uncertain if
data = fetchSensorData() ~> 0.75

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
prediction = model.predict(input) ~> confidence

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

// Conditional confidence checking
result = complexCalculation() ~> calcConfidence

uncertain if result {
  high {
    finalResult = result
  }
  low {
    // Fallback calculation with different method
    finalResult = simpleCalculation() ~> 0.9
  }
}
```

### Uncertain Loops

Loops that behave differently based on confidence:

```prism
// Uncertain for loop
uncertain for i = 0; i < dataPoints.length; i = i + 1 {
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

// Uncertain while loop
attempts = 0
uncertain while (attempts < maxAttempts) ~> 0.9 {
  high {
    result = tryRiskyOperation()
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
}
```

### Confidence in Conditions

Using confident values in conditions:

```prism
// Confident comparison
temp1 = 25 ~> 0.9
temp2 = 26 ~> 0.85

if temp1 ~< temp2 {
  // Comparison considers confidence
  console.log("temp1 is less than temp2")
}

// Confidence extraction in conditions
measurement = readSensor() ~> sensorConfidence

if ~measurement > 0.8 {
  // Check if confidence is high enough
  processMeasurement(measurement)
}

// Combining confident conditions
condition1 = checkCondition1() ~> 0.9
condition2 = checkCondition2() ~> 0.8

if condition1 ~&& condition2 {
  // Both conditions true with combined confidence
  proceed()
}
```

## Advanced Control Flow Patterns

### Confidence-Based State Machines

```prism
// State machine with confidence transitions
currentState = "idle"
confidence = 1.0

processEvent = (event) => {
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

```prism
// Confidence gates for early exit
processData = (data) => {
  // Check confidence at entry
  if ~data < 0.5 {
    return null  // Too uncertain
  }
  
  // Progressive validation
  validated = validate(data)
  if ~validated < 0.7 {
    return fallbackProcess(data)
  }
  
  // Full processing only for high confidence
  return fullProcess(validated)
}

// Multiple exit points
analyzeReading = (reading) => {
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

```prism
// Nested uncertain structures
mainProcess = (input) => {
  primaryResult = primaryModel(input) ~> 0.8
  
  uncertain if primaryResult {
    high {
      // High confidence in primary
      return primaryResult
    }
    medium {
      // Try secondary model
      secondaryResult = secondaryModel(input) ~> 0.7
      
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

```prism
// Multi-stage sensor validation with confidence
validateSensorReading = (reading) => {
  // Stage 1: Range check
  inRange = (reading >= minTemp && reading <= maxTemp) ~> 0.95
  
  // Stage 2: Rate of change check
  changeRate = abs(reading - lastReading) / timeInterval
  validChange = (changeRate < maxChangeRate) ~> 0.9
  
  // Stage 3: Cross-validation with other sensors
  nearbyAvg = getNearbySensorAverage()
  deviation = abs(reading - nearbyAvg)
  consistent = (deviation < threshold) ~> 0.85
  
  // Combined validation
  valid = inRange ~&& validChange ~&& consistent
  
  uncertain if valid {
    high {
      updateReading(reading)
      lastReading = reading
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
      interpolated = (lastReading + nextExpected) / 2
      updateReading(interpolated ~> 0.7)
    }
  }
}
```

### Adaptive Algorithm Selection

```prism
// Choose algorithm based on data confidence
processDataAdaptively = (data) => {
  dataQuality = assessQuality(data) ~> 0.85
  
  uncertain if dataQuality {
    high {
      // Use sophisticated ML model
      model = loadComplexModel()
      result = model.process(data)
      
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
      cleaned = robustClean(data)
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

```prism
// Retry with decreasing confidence
reliableOperation = (params) => {
  maxRetries = 5
  initialConfidence = 0.95
  decayFactor = 0.15
  
  for attempt = 0; attempt < maxRetries; attempt = attempt + 1 {
    confidence = initialConfidence * (1 - decayFactor * attempt)
    
    result = attemptOperation(params) ~> confidence
    
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

```prism
// Medical diagnosis decision tree
diagnose = (symptoms) => {
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