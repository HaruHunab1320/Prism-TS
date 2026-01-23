---
sidebar_position: 5
---

# Syntax Highlighting Demo

This page demonstrates Prism's comprehensive syntax highlighting with support for all language features, including confidence operators, uncertainty constructs, and special keywords.

## Basic Syntax

```javascript
// Variables and basic operations
name = "Prism"
version = 1.0
isAwesome = true

// Numbers and arithmetic
result = (42 + 8) * 2.5 / 5
power = 2 ** 10  // 1024

// Strings with interpolation
greeting = "Hello, ${name} v${version}!"
multiline = "This is a
multiline string"
```

## Confidence Operators

Prism's unique confidence operators are highlighted with distinct colors to make confidence flow clear:

```javascript
// Basic confidence assignment
temperature = 72 ~> 0.95
humidity = 65 ~> 0.87

// Confidence extraction
conf = temperature <~  // Extracts 0.95

// Confidence chaining
result = data ~~ transform ~~ validate ~~ process

// Confidence arithmetic
total = temperature ~+ humidity  // Confident addition
average = total ~/ 2             // Confident division

// Confidence comparison
isHot = temperature ~> 0.9 ~>= 80  // Confident comparison

// Confidence logical operations
needsAction = isHot ~&& (humidity ~> 0.8 ~> 70)
alternative = lowConfidence ~|| highConfidence

// Advanced confidence operators
parallel = tasks ~||> processAll   // Parallel confidence
filtered = data ~@> 0.8           // Threshold gate
piped = input ~|> transform       // Confidence pipeline
```

## Uncertainty Control Flow

The uncertainty keywords are highlighted to show the different confidence branches:

```javascript
// Basic uncertain if
uncertain if (analysis) {
  high {
    console.log("High confidence: Deploy to production")
    deployToProduction()
  }
  medium {
    console.log("Medium confidence: Request review")
    requestHumanReview()
  }
  low {
    console.log("Low confidence: Block deployment")
    blockDeployment()
  }
  default {
    console.log("No confidence: Investigate")
  }
}

// Uncertain loops
uncertain for item in items {
  high { process(item) }
  medium { review(item) }
  low { skip(item) }
}

uncertain while (condition) {
  high { continueProcessing() }
  low { break }
}
```

## Context and Agents

Context switching and agent declarations have special highlighting:

```javascript
// Context switching
in context Medical {
  diagnosis = analyzeSymptoms(patient)
  confidence = assessDiagnosis(diagnosis)
} shifting to Treatment {
  plan = createTreatmentPlan(diagnosis)
  schedule = planSchedule(plan)
}

// Agent declarations
agents {
  researcher: Agent {
    confidence: 0.9,
    role: "research",
    model: "claude-3"
  }
  writer: Agent {
    confidence: 0.85,
    role: "writing",
    style: "technical"
  }
}

// Using agents
result = researcher.analyze(data)
summary = writer.summarize(result)
```

## Functions and Lambdas

```javascript
// Function declarations
function calculateRisk(value, threshold) {
  risk = value / threshold
  return risk ~> assessConfidence(risk)
}

// Lambda expressions
filter = (x) => x > 10
mapper = (x) => x * 2
reducer = (acc, val) => acc + val

// Higher-order functions
results = data
  |> filter(_, x => x.confidence > 0.5)
  |> map(_, x => x ~> increaseConfidence(x))
  |> reduce(_, (a, b) => a ~+ b, 0)

// Destructuring in lambdas
process = ({name, value}) => "${name}: ${value}"
extractFirst = ([first, ...rest]) => first
```

## Advanced Features

```javascript
// Pipeline operator
processed = rawData
  |> validate(_)
  |> transform(_)
  |> optimize(_)
  |> finalize(_)

// Spread operator
combined = [...array1, ...array2, newItem]
merged = {...defaults, ...userConfig, override: true}

// Nullish coalescing
value = userInput ?? defaultValue
safeAccess = object?.property?.nested ?? "fallback"

// Array and object destructuring
[first, second, ...remaining] = results
{name, age, ...details} = person

// Complex destructuring with confidence
[
  header ~> 0.9,
  body ~> 0.8,
  footer ~> 0.7
] = parseDocument(content) ~> 0.85

// Placeholder usage
doubled = map(numbers, _ * 2)
filtered = filter(data, _ > threshold)
```

## LLM Integration

```javascript
// Basic LLM calls
response = llm("Analyze this text: ${input}")
summary = llm("Summarize in 3 bullets: ${article}")

// LLM with confidence handling
analysis = llm("Is this safe to deploy?") ~> 0.9
uncertain if (analysis) {
  high { approve() }
  low { reject() }
}

// Complex LLM pipeline
result = document
  |> llm("Extract key points: ${_}")
  |> llm("Categorize topics: ${_}")
  |> llm("Generate summary: ${_}")
  |> formatOutput(_)
```

## Complete Example

Here's a complete example showcasing many features together:

```javascript
// Content moderation system with confidence handling
function moderateContent(content) {
  // Parallel analysis with different aspects
  analyses = {
    toxicity: llm("Rate toxicity level: ${content}") ~> 0.9,
    spam: llm("Is this spam? ${content}") ~> 0.85,
    quality: llm("Rate content quality: ${content}") ~> 0.8
  }
  
  // Extract confidence scores
  confidences = {
    toxicity: analyses.toxicity <~,
    spam: analyses.spam <~,
    quality: analyses.quality <~
  }
  
  // Calculate overall confidence
  overallConfidence = (
    confidences.toxicity ~+ 
    confidences.spam ~+ 
    confidences.quality
  ) ~/ 3
  
  // Make decision based on confidence
  uncertain if (overallConfidence) {
    high {
      // High confidence in all analyses
      return {
        status: "approved",
        confidence: overallConfidence,
        details: analyses
      }
    }
    medium {
      // Medium confidence - needs review
      flaggedItems = []
      
      if (confidences.toxicity < 0.7) {
        flaggedItems = [...flaggedItems, "toxicity"]
      }
      if (confidences.spam < 0.7) {
        flaggedItems = [...flaggedItems, "spam"]
      }
      
      return {
        status: "review_required",
        confidence: overallConfidence,
        flagged: flaggedItems,
        details: analyses
      }
    }
    low {
      // Low confidence - reject or escalate
      return {
        status: "rejected",
        confidence: overallConfidence,
        reason: "Low confidence in analysis",
        details: analyses
      }
    }
    default {
      // Fallback
      return {
        status: "error",
        message: "Unable to analyze content"
      }
    }
  }
}

// Usage
content = "This is a sample post to moderate"
result = moderateContent(content)

console.log("Moderation result:", result)
console.log("Decision confidence:", result.confidence <~)
```

## Theme Features

The syntax highlighting theme provides:

- **Distinct confidence operator colors** - Each type of confidence operator has its own color
- **Semantic highlighting** - `high`, `medium`, `low` keywords use appropriate colors
- **Context awareness** - Special styling for `context`, `agents`, and related keywords
- **Interpolation support** - Clear highlighting within string interpolations
- **Dark mode support** - Automatically adapts to light/dark theme preferences
- **Monospace font** - Uses Fira Code for better code readability
- **Operator ligatures** - Beautiful rendering of multi-character operators