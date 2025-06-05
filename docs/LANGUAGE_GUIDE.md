# Prism Language Guide

A comprehensive guide to programming in Prism - the AI orchestration language with native uncertainty handling.

## Table of Contents

1. [Introduction](#introduction)
2. [Basic Concepts](#basic-concepts)
3. [Data Types](#data-types)
4. [Confidence System](#confidence-system)
5. [Control Flow](#control-flow)
6. [LLM Integration](#llm-integration)
7. [Context Management](#context-management)
8. [Best Practices](#best-practices)
9. [Advanced Patterns](#advanced-patterns)
10. [Troubleshooting](#troubleshooting)

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
```

### Expressions

```prism
// Arithmetic
result = (10 + 5) * 2

// String concatenation
greeting = "Hello, " + name

// Boolean operations
is_valid = age > 18 && active
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
interpolated = "Age: " + age
```

### Booleans

```prism
truth = true
falsehood = false
computed = 5 > 3  // true
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
question = "Explain " + topic + " in simple terms"
explanation = llm(question)
```

### Prompt Engineering Patterns

#### Chain of Thought
```prism
problem = "Calculate the area of a circle with radius 5"
thinking = llm("Think step by step: " + problem)
solution = llm("Based on this reasoning: " + thinking + " - provide the final answer")
```

#### Few-Shot Examples
```prism
examples = "Example 1: Input 'happy' -> Output: positive\nExample 2: Input 'sad' -> Output: negative"
user_input = "I love this product!"
sentiment = llm(examples + "\nClassify: " + user_input + " -> Output:")
```

#### Role-Based Prompting
```prism
role = "You are an expert financial advisor"
context = role + ". A client asks: "
question = "Should I invest in tech stocks?"
advice = llm(context + question)
```

### Chained LLM Calls

```prism
// Research workflow
initial_research = llm("What is artificial intelligence?")
deep_dive = llm("Based on: " + initial_research + " - what are the main challenges?")
solutions = llm("For these challenges: " + deep_dive + " - what are potential solutions?")

// Combine results
comprehensive_report = initial_research + " | Challenges: " + deep_dive + " | Solutions: " + solutions
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
final_report = "Sentiment: " + sentiment + " | Themes: " + themes
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
treatment_plan = initial_diagnosis + " | Treatment: " + treatment + " | Medication: " + medication
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
    local_data = llm("Process with: " + global_setting)
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
good_prompt = "Analyze the sentiment of this customer review and respond with exactly one word: positive, negative, or neutral. Review: " + review_text

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
validation = llm("Validate this analysis: " + initial_assessment)
cross_check = llm("Cross-check against known patterns: " + validation)

// Combine confidences for final decision
final_confidence = combine_confidences(initial_assessment, validation, cross_check)

uncertain if (final_confidence ~> 0.8) {
  high { execute_automated_action() }
  medium { request_human_approval() }
  low { escalate_to_expert() }
}
```

### 2. Confidence Voting

```prism
// Multiple AI opinions
opinion1 = llm("Expert 1 perspective: " + question)
opinion2 = llm("Expert 2 perspective: " + question)  
opinion3 = llm("Expert 3 perspective: " + question)

// Aggregate opinions
consensus = llm("Synthesize these expert opinions: " + opinion1 + " | " + opinion2 + " | " + opinion3)

uncertain if (consensus ~> 0.8) {
  high { high_confidence_decision() }
  medium { moderate_confidence_decision() }
  low { seek_additional_opinions() }
}
```

### 3. Adaptive Prompting

```prism
initial_attempt = llm("Solve this problem: " + problem)

uncertain if (initial_attempt ~> 0.7) {
  high {
    solution = initial_attempt
  }
  medium {
    // Try with more context
    enhanced_prompt = "Think step by step and solve: " + problem
    solution = llm(enhanced_prompt)
  }
  low {
    // Try with examples
    with_examples = examples + "\nNow solve: " + problem
    solution = llm(with_examples)
  }
}
```

### 4. Confidence Cascading

```prism
// Start with high-level analysis
overview = llm("High-level analysis of: " + data)

uncertain if (overview ~> 0.8) {
  high {
    // Proceed to detailed analysis
    detailed = llm("Detailed analysis based on: " + overview)
    
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
specific_prompt = "Answer with exactly one word: yes or no. Question: " + question

// Provide examples
few_shot_prompt = examples + "\nQuestion: " + question

// Use step-by-step reasoning
chain_of_thought = "Think step by step: " + question
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
2. **Context reuse**: Reuse contexts for related operations
3. **Confidence caching**: Cache confident results
4. **Prompt optimization**: Use shorter, more focused prompts

This guide covers the essential patterns and practices for effective Prism programming. For more examples and advanced use cases, see the examples directory and test files in the repository.