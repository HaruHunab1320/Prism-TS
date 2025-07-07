# Prism Language Guide

A comprehensive guide to programming in Prism - the AI orchestration language with native uncertainty handling.

## Table of Contents

1. [Introduction](#introduction)
2. [Basic Concepts](#basic-concepts)
3. [Data Types](#data-types)
4. [Confidence System](#confidence-system)
5. [Confidence Operators](#confidence-operators)
6. [Control Flow](#control-flow)
7. [LLM Integration](#llm-integration)
8. [Context Management](#context-management)
9. [Best Practices](#best-practices)
10. [Advanced Patterns](#advanced-patterns)
11. [Troubleshooting](#troubleshooting)

## Introduction

Prism is designed to make AI programming natural and intuitive. Unlike traditional programming languages, Prism treats uncertainty as a first-class citizen, allowing you to write code that elegantly handles the probabilistic nature of AI responses.

### Core Philosophy

- **Uncertainty is Natural**: AI responses are inherently uncertain, and Prism embraces this
- **Confidence Propagation**: Uncertainty propagates through operations automatically
- **Declarative AI Workflows**: Express what you want, not how to achieve it
- **Context Awareness**: Organize complex AI workflows with isolated execution environments

## Basic Concepts

### Variables and Assignment

```prism
// Simple assignment
name = "Alice"
age = 30
active = true

// Confidence assignment
measurement = 72.5 ~> 0.9

// Compound assignments
count = 10
count += 5   // count = count + 5 (now 15)
count -= 3   // count = count - 3 (now 12)
count *= 2   // count = count * 2 (now 24)
count /= 4   // count = count / 4 (now 6)
count %= 4   // count = count % 4 (now 2)

// String concatenation with +=
message = "Hello"
message += " World"  // message = "Hello World"
```

### Expressions

```prism
// Arithmetic
result = (10 + 5) * 2
remainder = 17 % 5  // Modulo operator: 2

// String concatenation and interpolation
greeting = "Hello, " + name  // Traditional concatenation
interpolated_greeting = "Hello, ${name}!"  // String interpolation
complex_interpolation = "User ${name} is ${age} years old"

// Boolean operations
is_valid = age > 18 && active

// Ternary operator
status = is_valid ? "approved" : "rejected"
greeting_type = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

// Lambda expressions
square = x => x * x
add = (a, b) => a + b
greet = name => "Hello, ${name}!"

// Using lambdas
result = square(5)  // 25
sum = add(3, 7)  // 10

// Array method examples
numbers = [1, 2, 3, 4, 5]

// Map - transform each element
squared = numbers.map(x => x * x)  // [1, 4, 9, 16, 25]
doubled = numbers.map(x => x * 2)  // [2, 4, 6, 8, 10]

// Filter - select elements that match condition
evens = numbers.filter(x => x % 2 == 0)  // [2, 4]
above_three = numbers.filter(x => x > 3)  // [4, 5]

// Reduce - aggregate to single value
sum = numbers.reduce((acc, x) => acc + x, 0)  // 15
product = numbers.reduce((acc, x) => acc * x, 1)  // 120

// Chaining array methods
result = numbers
  .filter(x => x % 2 == 0)  // Get evens: [2, 4]
  .map(x => x * x)           // Square them: [4, 16]
  .reduce((a, b) => a + b, 0) // Sum: 20

// Working with null values
data = [1, null, 3, null, 5]
clean_data = data.filter(x => x != null)  // [1, 3, 5]
safe_doubles = data.map(x => x != null ? x * 2 : 0)  // [2, 0, 6, 0, 10]
```

### Comments

```prism
// Single line comment
/* 
  Multi-line comment
  for longer explanations
*/
```

## Data Types

### Numbers

```prism
integer = 42
float = 3.14159
negative = -17
scientific = 1.23e-4
```

### Strings

```prism
simple = "Hello World"
escaped = "Line 1\nLine 2\tTabbed"
concatenated = "Hello" + " " + "World"
interpolated = "Age: ${age}"  // String interpolation with ${}

// Multiline strings with triple backticks
multiline = ```
  This is a multiline string
  that preserves formatting
  and line breaks
```
```

### Booleans

```prism
truth = true
falsehood = false
computed = 5 > 3  // true
```

### Null

```prism
// Null represents the explicit absence of a value
empty = null

// Null is falsy in conditionals
if (null) {
  // This won't execute
} else {
  // This will execute
}

// Null comparisons
value = null
isNull = value == null  // true
notNull = value != null // false
```

### Undefined

```prism
// Undefined represents a value that hasn't been assigned
unassigned = undefined

// Undefined is also falsy
if (undefined) {
  // This won't execute
} else {
  // This will execute
}

// Undefined is distinct from null
isNull = undefined == null      // false
isUndefined = undefined == undefined  // true

// Both are falsy but different
nullValue = null
undefinedValue = undefined
areSame = nullValue == undefinedValue  // false
```

### Arrays

```prism
numbers = [1, 2, 3, 4, 5]
strings = ["apple", "banana", "cherry"]
mixed = [42, "hello", true, 3.14]
empty_array = []

// Array access
first_item = numbers[0]  // 1
last_item = strings[strings.length - 1]  // "cherry"
```

### Objects

```prism
person = {
  name: "Alice",
  age: 30,
  active: true
}

// Object property access
person_name = person.name  // "Alice"
person_age = person["age"]  // 30

// Optional chaining - safe property access
user = { profile: null }
safeName = user?.profile?.name  // Returns null instead of throwing

// Works with undefined too
data = { value: undefined }
result = data?.value?.nested  // Returns null

// Nested objects
company = {
  name: "TechCorp",
  address: {
    street: "123 Main St",
    city: "San Francisco",
    zip: "94105"
  },
  employees: [person],
  website: null  // Can use null for missing values
}
```

### Confident Values

```prism
// Value with confidence
measurement = 100 ~> 0.85

// Accessing the value (automatic)
doubled = measurement * 2  // 200 (~85.0%)

// Accessing confidence explicitly
confidence_level = measurement.confidence
```

## Confidence System

### Understanding Confidence

Confidence in Prism represents how certain we are about a value, ranging from 0.0 (completely uncertain) to 1.0 (completely certain).

```prism
// High confidence
precise_measurement = 100.0 ~> 0.95

// Medium confidence  
estimated_value = 50 ~> 0.7

// Low confidence
rough_guess = 25 ~> 0.3
```

### Confidence Levels

Prism automatically categorizes confidence into three levels:

- **High**: ≥ 0.8 (80% or higher)
- **Medium**: 0.5 - 0.8 (50% to 80%)  
- **Low**: < 0.5 (below 50%)

### Confidence Propagation

When you operate on confident values, the uncertainty propagates:

```prism
sensor1 = 50 ~> 0.9   // High confidence
sensor2 = 30 ~> 0.6   // Medium confidence

// Result inherits the lower confidence
average = (sensor1 + sensor2) / 2  // 40 (~60.0%)
```

### Dynamic Confidence

You can use variables for confidence values:

```prism
data_quality = 0.8
measurement = sensor_reading ~> data_quality

// Confidence can be computed
reliability = calculate_reliability()
result = processed_data ~> reliability
```

## Confidence Operators

Prism provides a comprehensive set of operators designed specifically for uncertainty-aware programming. These operators allow you to manipulate, combine, and control the flow of confident values in sophisticated ways.

### Core Operators

#### Confidence Assignment (`~>`)

Assigns a confidence level to any value:

```prism
// Basic confidence assignment
measurement = 100 ~> 0.85
text_data = "analysis result" ~> 0.7

// Dynamic confidence from variables
quality_score = 0.9
processed = raw_data ~> quality_score

// Confidence from expressions
confidence_level = calculate_accuracy()
prediction = model_output ~> confidence_level
```

#### Confidence Extraction (`<~`)

Extracts the confidence level from confident values:

```prism
// Extract confidence as a number
measurement = 100 ~> 0.85
confidence_value = <~ measurement  // Returns 0.85

// Use extracted confidence in calculations
threshold = 0.8
is_reliable = (<~ measurement) >= threshold

// Extract from LLM responses
response = llm("Analyze this data")
response_confidence = <~ response
```

#### Confidence Chaining (`~~`)

Chains operations while propagating confidence using minimum confidence:

```prism
// Basic chaining
input = data ~> 0.9
processed = input ~~ transform ~~ validate  // Confidence: min(0.9, transform_conf, validate_conf)

// Multi-step processing pipeline
raw_data = sensor_reading ~> 0.8
analysis = raw_data ~~ clean ~~ normalize ~~ analyze

// Chaining with LLM calls
initial = llm("First analysis") 
refined = initial ~~ llm("Refine this analysis")
final = refined ~~ llm("Final conclusions")
```

#### Confidence Coalesce (`~??`)

Provides fallback for low-confidence values (threshold: 0.5):

```prism
// Basic coalesce - use backup if primary has low confidence
primary = uncertain_source ~> 0.3
backup = reliable_source ~> 0.9
result = primary ~?? backup  // Uses backup (primary confidence < 0.5)

// Chain multiple fallbacks
result = source1 ~?? source2 ~?? source3 ~?? "default value"

// LLM fallback pattern
ai_response = llm("Complex analysis")
fallback = "Analysis unavailable"
safe_result = ai_response ~?? fallback
```

### Logical Operators

#### Confident AND (`~&&`)

Logical AND with confidence propagation (minimum confidence):

```prism
// Both conditions must be true and confident
condition1 = check1 ~> 0.9
condition2 = check2 ~> 0.7
combined = condition1 ~&& condition2  // true with 70% confidence

// Multi-condition validation
valid_data = data_complete ~&& data_accurate ~&& data_recent

// Safety checks
safety_check = system_stable ~&& permissions_valid ~&& resources_available
```

#### Confident OR (`~||`)

Logical OR with confidence propagation (maximum confidence):

```prism
// At least one condition must be true
option1 = check1 ~> 0.6
option2 = check2 ~> 0.8
choice = option1 ~|| option2  // Uses higher confidence (80%)

// Multiple backup options
available = server1_up ~|| server2_up ~|| server3_up

// Decision alternatives
proceed = user_approved ~|| auto_approved ~|| emergency_override
```

### Arithmetic Operators

All arithmetic operators propagate confidence using minimum confidence:

#### Confident Addition (`~+`)

```prism
// Add measurements with uncertainty
temp1 = 20.5 ~> 0.9
temp2 = 22.1 ~> 0.8
average_temp = (temp1 ~+ temp2) ~/ 2  // Confidence: 80%

// Accumulate uncertain values
total = value1 ~+ value2 ~+ value3
```

#### Confident Subtraction (`~-`)

```prism
// Calculate differences with uncertainty
baseline = 100 ~> 0.9
measurement = 85 ~> 0.7
difference = measurement ~- baseline  // -15 (~70.0%)
```

#### Confident Multiplication (`~*`)

```prism
// Scale with uncertainty
base_value = 50 ~> 0.8
multiplier = 1.5 ~> 0.9
scaled = base_value ~* multiplier  // 75 (~80.0%)
```

#### Confident Division (`~/)

```prism
// Division with error propagation
distance = 120 ~> 0.9
time = 4 ~> 0.7
speed = distance ~/ time  // 30 (~70.0%)
```

### Comparison Operators

All comparison operators propagate confidence using minimum confidence:

```prism
// Confident equality
expected = 42 ~> 0.9
actual = 42 ~> 0.8
is_equal = expected ~== actual  // true (~80.0%)

// Confident inequality
is_different = value1 ~!= value2

// Confident ordering
is_greater = sensor_reading ~> threshold_value
is_valid = measurement ~>= minimum_required ~&& measurement ~<= maximum_allowed
```

### Navigation Operators

#### Optional Chaining (`?.`)

Safe property access that returns null instead of throwing errors:

```prism
// Basic optional chaining
user = null
name = user?.name  // Returns null (no error)

// Chained optional access
profile = { settings: null }
theme = profile?.settings?.theme  // Returns null

// Works with arrays
arr = null
length = arr?.length  // Returns null

// Mix with regular access
data = { user: { name: "Alice" } }
result = data.user?.name  // "Alice"

// Handles undefined too
obj = { value: undefined }
nested = obj?.value?.property  // Returns null
```

#### Confident Property Access (`~.`)

Safe property access with confidence reduction (90% factor):

```prism
// Safe navigation with uncertainty
user_data = fetch_user() ~> 0.9
user_name = user_data ~. name  // Confidence reduced to ~81%

// Chained property access
profile = user ~. profile ~. settings ~. theme

// Fallback pattern
display_name = user ~. profile ~. display_name ~?? user ~. username ~?? "Anonymous"
```

### Advanced Control Flow Operators

#### Parallel Confidence (`~||>`)

Selects the result with the highest confidence (ensemble pattern):

```prism
// AI model ensemble
model1_prediction = llm("Model 1 analysis: " + data) 
model2_prediction = llm("Model 2 analysis: " + data)
model3_prediction = llm("Model 3 analysis: " + data)

// Select best prediction
best_prediction = model1_prediction ~||> model2_prediction ~||> model3_prediction

// Multi-source data fusion
source1 = sensor1_reading ~> 0.7
source2 = sensor2_reading ~> 0.9
source3 = calculated_value ~> 0.6
most_reliable = source1 ~||> source2 ~||> source3  // Uses source2
```

#### Threshold Gate (`~@>`)

Conditional execution based on confidence threshold (70% default):

```prism
// Execute action only if condition is confident enough
condition = safety_check ~> 0.85
action = "proceed with operation"
result = condition ~@> action  // Executes action (85% > 70%)

// Automated decision making
ai_confidence = llm("Risk assessment") 
auto_approval = "automatically approved"
decision = ai_confidence ~@> auto_approval

// Multi-level gating
primary_check = validate_input()
secondary_check = primary_check ~@> verify_security()
final_action = secondary_check ~@> execute_operation()

// Threshold-based workflow
low_confidence_input = uncertain_data ~> 0.5
risky_operation = "dangerous action"
safe_result = low_confidence_input ~@> risky_operation  // Returns input with reduced confidence
```

### Operator Precedence

Prism operators follow this precedence order (highest to lowest):

1. **Property Access**: `.`, `~.`
2. **Unary**: `!`, `-`, `~`, `<~`
3. **Multiplicative**: `*`, `/`, `~*`, `~/`
4. **Additive**: `+`, `-`, `~+`, `~-`
5. **Comparison**: `<`, `<=`, `>`, `>=`, `~<`, `~<=`, `~>=`
6. **Equality**: `==`, `!=`, `~==`, `~!=`
7. **Logical AND**: `&&`, `~&&`
8. **Confidence Coalesce**: `~??`
9. **Logical OR**: `||`, `~||`, `~||>`
10. **Threshold Gate**: `~@>`
11. **Confidence Chaining**: `~~`
12. **Confidence Assignment**: `~>`

```prism
// Precedence example
result = a ~+ b ~* c ~> 0.8 ~?? fallback ~@> action
// Evaluates as: ((a ~+ (b ~* c)) ~> 0.8) ~?? fallback) ~@> action
```

### Operator Combinations

Combine operators for sophisticated uncertainty handling:

```prism
// Multi-stage processing with fallbacks
processed = (raw_data ~~ clean ~~ validate) ~?? backup_data ~@> final_action

// Ensemble with threshold control
best_model = (model1 ~||> model2 ~||> model3) ~@> production_deployment

// Confidence-aware aggregation
reliable_average = (sensor1 ~+ sensor2 ~+ sensor3) ~/ 3 ~@> control_system

// Safe navigation with fallbacks
user_preference = user ~. settings ~. theme ~?? "default" ~@> apply_theme()
```

## Control Flow

### Standard If Statements

```prism
if (temperature > 70) {
  comfort_level = "warm"
} else {
  comfort_level = "cool"
}
```

### Uncertain If Statements

The power of Prism lies in uncertainty-aware control flow:

```prism
diagnosis = llm("Analyze these symptoms: fever, cough")

uncertain if (diagnosis ~> 0.75) {
  high { 
    // Confidence ≥ 80%
    action = "Schedule immediate consultation"
    priority = "urgent"
  }
  medium { 
    // Confidence 50-80%
    action = "Monitor symptoms for 24 hours"
    priority = "moderate"
  }
  low { 
    // Confidence < 50%
    action = "Continue home care"
    priority = "low"
  }
}
```

### Nested Uncertain If

```prism
primary_diagnosis = llm("Primary assessment: " + symptoms)
secondary_check = llm("Confirm diagnosis: " + primary_diagnosis)

uncertain if (primary_diagnosis ~> 0.8) {
  high {
    uncertain if (secondary_check ~> 0.7) {
      high { confidence_level = "very_high" }
      medium { confidence_level = "high" }
      low { confidence_level = "moderate" }
    }
  }
  medium {
    confidence_level = "low"
  }
  low {
    confidence_level = "very_low"
  }
}
```

## LLM Integration

### Basic LLM Calls

```prism
// Simple question
answer = llm("What is machine learning?")

// The response is automatically wrapped with confidence
// answer contains both the text and confidence level
```

### Variable Prompts

```prism
topic = "quantum computing"
question = "Explain ${topic} in simple terms"  // Using string interpolation
explanation = llm(question)

// Complex prompt with multiple variables
user_level = "beginner"
language = "English"
prompt = "Explain ${topic} for a ${user_level} in ${language}"
result = llm(prompt)
```

### Prompt Engineering Patterns

#### Chain of Thought
```prism
problem = "Calculate the area of a circle with radius 5"
thinking = llm("Think step by step: ${problem}")
solution = llm("Based on this reasoning: ${thinking} - provide the final answer")
```

#### Few-Shot Examples
```prism
examples = ```
Example 1: Input 'happy' -> Output: positive
Example 2: Input 'sad' -> Output: negative
```
user_input = "I love this product!"
sentiment = llm("${examples}\nClassify: ${user_input} -> Output:")
```

#### Role-Based Prompting
```prism
role = "You are an expert financial advisor"
question = "Should I invest in tech stocks?"
advice = llm("${role}. A client asks: ${question}")
```

### Chained LLM Calls

```prism
// Research workflow
initial_research = llm("What is artificial intelligence?")
deep_dive = llm("Based on: ${initial_research} - what are the main challenges?")
solutions = llm("For these challenges: ${deep_dive} - what are potential solutions?")

// Combine results
comprehensive_report = "${initial_research} | Challenges: ${deep_dive} | Solutions: ${solutions}"

// Using array methods with LLM calls
topics = ["AI", "quantum computing", "blockchain"]
research_results = topics.map(topic => llm("Explain ${topic} in one paragraph"))
summary = research_results.reduce((acc, result) => "${acc}\n\n${result}", "")
```

### Confidence-Aware LLM Usage

```prism
response = llm("Analyze this financial data")

uncertain if (response ~> 0.8) {
  high {
    // High confidence - proceed with automated decision
    investment_decision = "proceed"
  }
  medium {
    // Medium confidence - require human review
    investment_decision = "review_required"
  }
  low {
    // Low confidence - reject or gather more data
    investment_decision = "insufficient_data"
  }
}
```

## Context Management

### Basic Context Usage

Contexts provide isolated execution environments for organizing complex workflows:

```prism
in context DataCollection {
  raw_data = llm("Generate sample customer feedback")
  cleaned_data = preprocess(raw_data)
}

in context Analysis {
  sentiment = llm("Analyze sentiment: " + cleaned_data)
  themes = llm("Extract key themes: " + cleaned_data)
}

// Variables from contexts are accessible
final_report = "Sentiment: ${sentiment} | Themes: ${themes}"
```

### Context Isolation

Variables defined in contexts persist and can be accessed later:

```prism
in context MedicalAssessment {
  symptoms = "fever, cough, fatigue"
  initial_diagnosis = llm("Assess these symptoms: " + symptoms)
}

in context TreatmentPlanning {
  // Can access variables from previous context
  treatment = llm("Recommend treatment for: " + initial_diagnosis)
  medication = llm("Suggest medication for: " + symptoms)
}

// Create comprehensive treatment plan
treatment_plan = "${initial_diagnosis} | Treatment: ${treatment} | Medication: ${medication}"
```

### Context Shifting

```prism
in context InitialState {
  data = "initial_value"
  processed = transform(data)
} -> FinalState

// Context shifts to FinalState after execution
```

### Nested Contexts

```prism
in context OuterContext {
  global_setting = "shared_value"
  
  in context InnerContext {
    local_data = llm("Process with: ${global_setting}")
    result = analyze(local_data)
  }
  
  final_result = combine(global_setting, result)
}
```

## Best Practices

### 1. Confidence Thresholds

Choose appropriate confidence thresholds for your use case:

```prism
// Medical applications - high threshold
uncertain if (diagnosis ~> 0.9) {
  high { proceed_with_treatment() }
  medium { seek_second_opinion() }
  low { gather_more_data() }
}

// Content filtering - medium threshold
uncertain if (safety_assessment ~> 0.7) {
  high { approve_content() }
  medium { flag_for_review() }
  low { reject_content() }
}
```

### 2. Error Handling

Always handle low-confidence scenarios:

```prism
analysis = llm("Complex analysis task")

uncertain if (analysis ~> 0.6) {
  high { 
    proceed_with_analysis()
  }
  medium { 
    request_clarification()
  }
  low { 
    // Always handle the low confidence case
    error_message = "Analysis inconclusive, manual review required"
    fallback_action()
  }
}
```

### 3. Prompt Design

Design clear, specific prompts:

```prism
// Good: Specific and clear
good_prompt = "Analyze the sentiment of this customer review and respond with exactly one word: positive, negative, or neutral. Review: ${review_text}"

// Using multiline strings for complex prompts
detailed_prompt = ```
You are a sentiment analysis expert. Analyze the following review:

${review_text}

Provide your analysis in the following format:
- Sentiment: [positive/negative/neutral]
- Confidence: [high/medium/low]
- Key factors: [list main factors]
```

// Avoid: Vague and ambiguous
bad_prompt = "What do you think about this?"
```

### 4. Context Organization

Use contexts to organize related operations:

```prism
// Good: Logical grouping
in context DataPreprocessing {
  cleaned_data = clean(raw_data)
  validated_data = validate(cleaned_data)
}

in context ModelInference {
  predictions = model.predict(validated_data)
  confidence_scores = calculate_confidence(predictions)
}

in context PostProcessing {
  filtered_results = filter_by_confidence(predictions, confidence_scores)
  final_output = format_results(filtered_results)
}
```

### 5. Confidence Propagation

Understand how confidence propagates through operations:

```prism
// Confidence decreases with each operation
high_confidence = 100 ~> 0.9
medium_step = process(high_confidence)    // ~90% -> ~81%
final_result = analyze(medium_step)       // ~81% -> ~73%

// Combine multiple sources (minimum confidence)
source1 = data1 ~> 0.9
source2 = data2 ~> 0.7
combined = source1 + source2  // Confidence: 70%
```

## Advanced Patterns

### 1. Multi-Step Validation

```prism
// Progressive confidence building
initial_assessment = llm("Initial analysis of data")
validation = llm("Validate this analysis: ${initial_assessment}")
cross_check = llm("Cross-check against known patterns: ${validation}")

// Combine confidences for final decision
final_confidence = combine_confidences(initial_assessment, validation, cross_check)

uncertain if (final_confidence ~> 0.8) {
  high { execute_automated_action() }
  medium { request_human_approval() }
  low { escalate_to_expert() }
}
```

### 2. AI Ensemble with Parallel Confidence

```prism
// Multiple AI model ensemble using parallel confidence
model1 = llm("GPT analysis: ${question}")
model2 = llm("Claude analysis: ${question}")  
model3 = llm("Gemini analysis: ${question}")

// Using array methods for ensemble
models = ["GPT", "Claude", "Gemini"]
analyses = models.map(model => llm("${model} analysis: ${question}"))
best_from_array = analyses.reduce((best, current) => 
  (<~ current) > (<~ best) ? current : best
)

// Or select best result automatically with operator
best_analysis = model1 ~||> model2 ~||> model3

// Chain with validation
validated = best_analysis ~~ llm("Validate this analysis: ${best_analysis}")

// Use threshold gate for automated vs manual processing
final_decision = validated ~@> "auto_process" ~?? "manual_review_required"

uncertain if (final_decision ~> 0.8) {
  high { automated_processing(final_decision) }
  medium { human_in_the_loop(final_decision) }
  low { escalate_to_expert(final_decision) }
}
```

### 3. Adaptive Prompting

```prism
initial_attempt = llm("Solve this problem: ${problem}")

uncertain if (initial_attempt ~> 0.7) {
  high {
    solution = initial_attempt
  }
  medium {
    // Try with more context
    enhanced_prompt = "Think step by step and solve: ${problem}"
    solution = llm(enhanced_prompt)
  }
  low {
    // Try with examples
    with_examples = "${examples}\nNow solve: ${problem}"
    solution = llm(with_examples)
  }
}
```

### 4. Advanced Operator Composition

```prism
// Sophisticated uncertainty handling with multiple operators
raw_sensor_data = collect_sensor_readings()

// Multi-step processing with confidence tracking
cleaned = raw_sensor_data ~~ data_cleaning_pipeline
validated = cleaned ~~ validation_checks
calibrated = validated ~~ calibration_adjustments

// Extract confidence for decision making
processing_confidence = <~ calibrated

// Parallel model ensemble for analysis
analysis1 = llm("Statistical analysis: ${calibrated}")
analysis2 = llm("ML model prediction: ${calibrated}") 
analysis3 = llm("Expert system analysis: ${calibrated}")

// Using lambda with array methods for dynamic analysis
analysis_types = ["Statistical", "ML model", "Expert system"]
analyses = analysis_types.map(type => 
  llm("${type} analysis: ${calibrated}")
)

// Select best analysis result
best_analysis = analysis1 ~||> analysis2 ~||> analysis3

// Combine processing and analysis confidence
combined_result = calibrated ~&& best_analysis

// Multi-level threshold gating
preliminary_decision = combined_result ~@> "preliminary_approval"
management_review = preliminary_decision ~@> "management_approved" 
final_authorization = management_review ~@> "fully_authorized"

// Confidence-aware fallback chain
reliable_decision = final_authorization ~?? preliminary_decision ~?? "manual_review_required"

// Extract final confidence for reporting
final_confidence = <~ reliable_decision

uncertain if (reliable_decision ~> 0.9) {
  high { 
    execute_automated_action(reliable_decision)
    log_high_confidence_decision(final_confidence)
  }
  medium { 
    schedule_human_review(reliable_decision)
    log_medium_confidence_decision(final_confidence)
  }
  low { 
    escalate_to_expert_panel(reliable_decision)
    log_low_confidence_decision(final_confidence)
  }
}
```

### 5. Confidence Cascading

```prism
// Start with high-level analysis
overview = llm("High-level analysis of: ${data}")

uncertain if (overview ~> 0.8) {
  high {
    // Proceed to detailed analysis
    detailed = llm("Detailed analysis based on: ${overview}")
    
    uncertain if (detailed ~> 0.7) {
      high { 
        final_recommendation = generate_recommendation(detailed)
      }
      medium {
        final_recommendation = generate_cautious_recommendation(detailed)
      }
      low {
        final_recommendation = "Insufficient detail for recommendation"
      }
    }
  }
  medium {
    final_recommendation = "Preliminary analysis only"
  }
  low {
    final_recommendation = "Analysis failed, manual review required"
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Low Confidence Results

**Problem**: LLM responses consistently have low confidence

**Solutions**:
```prism
// Be more specific in prompts
specific_prompt = "Answer with exactly one word: yes or no. Question: ${question}"

// Provide examples using multiline strings
few_shot_examples = ```
Example 1: Is 2+2=4? Answer: yes
Example 2: Is the sky green? Answer: no
```
few_shot_prompt = "${few_shot_examples}\nQuestion: ${question}"

// Use step-by-step reasoning
chain_of_thought = "Think step by step: ${question}"
```

#### 2. Context Variable Access

**Problem**: Variables not accessible outside contexts

**Solution**: Variables defined in contexts persist globally:
```prism
in context DataProcessing {
  processed_data = clean(raw_data)  // This persists
}

// Accessible here
final_result = analyze(processed_data)
```

#### 3. Confidence Propagation

**Problem**: Unexpected confidence levels

**Understanding**: Confidence uses minimum of operands:
```prism
high_conf = 100 ~> 0.9
low_conf = 50 ~> 0.3
result = high_conf + low_conf  // Confidence: 30%
```

#### 4. LLM Provider Issues

**Problem**: LLM calls failing

**Check**:
- API keys are set correctly
- Provider is registered with runtime
- Network connectivity

```prism
// Verify provider setup
provider_status = check_llm_provider()
if (!provider_status) {
  error("LLM provider not available")
}
```

### Debugging Tips

1. **Use smaller test cases**: Break complex workflows into smaller parts
2. **Check confidence levels**: Print intermediate confidence values
3. **Validate prompts**: Test prompts independently
4. **Context isolation**: Ensure contexts don't interfere with each other
5. **Provider testing**: Test with mock provider first

### Performance Considerations

1. **Minimize LLM calls**: Batch operations when possible
   ```prism
   // Instead of multiple calls
   result1 = llm("Analyze A")
   result2 = llm("Analyze B")
   result3 = llm("Analyze C")
   
   // Use array methods for batch processing
   items = ["A", "B", "C"]
   results = items.map(item => llm("Analyze ${item}"))
   ```

2. **Context reuse**: Reuse contexts for related operations
3. **Confidence caching**: Cache confident results
4. **Prompt optimization**: Use shorter, more focused prompts
5. **Array operations**: Use map, filter, reduce for efficient data processing

This guide covers the essential patterns and practices for effective Prism programming. For more examples and advanced use cases, see the examples directory and test files in the repository.