# Confidence Extraction Library Proposal for Prism

## Overview

This document proposes a standard library for extracting confidence values from LLMs and other sources, to be developed as a separate package in the Prism ecosystem.

## Background

Currently, Prism provides excellent primitives for handling confidence values (`~>`, `<~`, `~||>`, etc.), but users must manually:
1. Extract confidence from LLM responses
2. Implement their own confidence estimation strategies
3. Calibrate confidence values for their domain

This leads to every user reinventing similar patterns.

## Proposed Architecture

### Repository Structure (Turbo Repo with pnpm workspaces)
```
prism-ts/
├── packages/
│   ├── prism-core/          # Core language (current src/)
│   ├── prism-confidence/    # Confidence extraction library
│   ├── prism-cli/           # CLI tool
│   └── prism-repl/          # REPL interface
├── examples/
├── docs/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Package: `@prism/confidence`

A TypeScript/JavaScript library that provides standardized patterns for confidence extraction, designed to work seamlessly with Prism.

## Important Limitation

**Most LLM providers (Anthropic, Google) do not provide log probabilities.** Only OpenAI currently supports this feature. This significantly impacts our confidence extraction strategies and makes consistency-based and heuristic approaches more important.

## Core Features

### 1. Consistency-Based Confidence (Primary Strategy)

```typescript
// TypeScript implementation
import { ConfidenceExtractor } from '@prism/confidence';

const extractor = new ConfidenceExtractor();

// Sample multiple times and measure consistency
const result = await extractor.fromConsistency(
  async () => llm("Is this code secure?"),
  { 
    samples: 5,
    temperature: [0.1, 0.3, 0.5, 0.7, 0.9]
  }
);
// Returns: { value: "No, SQL injection risk", confidence: 0.85 }
```

In Prism:
```prism
import confidence from "@prism/confidence"

samples = confidence.sample(
  prompt => llm(prompt),
  "Is this code secure?",
  n=5
)
conf = confidence.from_consistency(samples)
result = samples[0] ~> conf
```

### 2. Response-Based Heuristics (Since logprobs unavailable)

```typescript
// Extract confidence from response characteristics
const analyzer = new ResponseAnalyzer();

const confidence = analyzer.analyze(llmResponse, {
  factors: {
    length: true,           // Longer, detailed responses = higher confidence
    hedging: true,          // Look for uncertainty markers
    specificity: true,      // Specific details vs vague statements
    consistency: true       // Internal consistency of response
  }
});
```

In Prism:
```prism
response = llm("Analyze this code for security issues")
// Analyze response characteristics
conf = confidence.from_response_analysis(response, {
  check_hedging: true,  // "might be", "possibly", "could be"
  check_certainty: true // "definitely", "certainly", "absolutely"
})
result = response ~> conf
```

### 3. Structured Response Parsing

```typescript
// Parse confidence from structured LLM responses
const parser = new ConfidenceParser({
  patterns: [
    { regex: /confidence:\s*(\d+)%/, transform: (m) => parseInt(m[1]) / 100 },
    { regex: /certainty:\s*(high|medium|low)/, map: { high: 0.9, medium: 0.6, low: 0.3 } },
    { regex: /\((\d+)\/10\)/, transform: (m) => parseInt(m[1]) / 10 }
  ]
});

const result = await parser.parse(llmResponse);
```

In Prism:
```prism
response = llm("Rate safety 1-10: " + code)
{rating, reasoning} = confidence.parse_structured(response, {
  pattern: "rating: {number}/10, reason: {text}"
})
conf = rating / 10
result = reasoning ~> conf
```

### 4. Domain-Specific Calibration

```typescript
// Calibration based on historical accuracy
class SecurityConfidenceCalibrator extends DomainCalibrator {
  calibrationCurve = {
    'sql_injection': { baseConfidence: 0.95, adjustments: {...} },
    'xss': { baseConfidence: 0.85, adjustments: {...} },
    'race_condition': { baseConfidence: 0.60, adjustments: {...} }
  };

  async calibrate(raw: number, context: any): Promise<number> {
    // Apply domain-specific calibration
    return this.applyCurve(raw, context.vulnerability_type);
  }
}
```

In Prism:
```prism
// Load pre-trained calibration
calibrator = confidence.load_calibration("security-v1")

raw_conf = 0.8
calibrated = calibrator.calibrate(raw_conf, {type: "sql_injection"})
result = finding ~> calibrated
```

### 5. Ensemble Methods

```typescript
// Combine multiple confidence signals
const ensemble = new ConfidenceEnsemble({
  weights: {
    consistency: 0.35,
    perplexity: 0.25,
    self_assessment: 0.10,
    domain_specific: 0.30
  }
});

const finalConfidence = await ensemble.combine({
  consistency: await extractor.fromConsistency(...),
  perplexity: await extractor.fromPerplexity(...),
  self_assessment: await parser.parse(...),
  domain_specific: await calibrator.calibrate(...)
});
```

In Prism:
```prism
// Multiple confidence signals
signals = {
  consistency: confidence.from_consistency(samples),
  perplexity: confidence.from_perplexity(logprobs),
  self_assess: confidence.parse_self_assessment(response),
  domain: calibrator.score(response, context)
}

// Weighted combination
final_conf = confidence.ensemble(signals, {
  weights: [0.35, 0.25, 0.10, 0.30]
})
```

## Practical Strategies Without Logprobs

Since most LLM providers don't support logprobs, our library should focus on:

### 1. **Multi-Sampling Consistency** (Most Reliable)
- Run the same prompt multiple times with different temperatures
- Measure agreement between responses
- Higher agreement = higher confidence

### 2. **Linguistic Analysis**
- Detect hedging language ("might", "possibly", "perhaps")
- Detect certainty markers ("definitely", "clearly", "obviously")
- Analyze response structure and completeness

### 3. **Prompt Engineering for Confidence**
```prism
// Ask for explicit confidence
prompt = """
Analyze this code for security vulnerabilities.
For each issue found, rate your confidence (0-100%).
Format: [ISSUE] Confidence: X%
"""

response = llm(prompt)
parsed = confidence.parse_explicit_confidence(response)
```

### 4. **Task-Specific Calibration**
```prism
// Different confidence patterns for different tasks
classifier = confidence.create_classifier({
  task: "code_security",
  confidence_markers: {
    high: ["SQL injection", "buffer overflow", "XSS"],
    medium: ["potential race condition", "possible memory leak"],
    low: ["might be vulnerable", "could potentially"]
  }
})
```

### 5. **Response Quality Metrics**
- Response length and detail level
- Presence of examples or evidence
- Structured vs unstructured output
- Stop reason (natural end vs truncation)

## Implementation Plan

### Phase 1: Core Package Setup
1. Set up Turbo repo structure with pnpm workspaces
2. Move current code to `packages/prism-core`
3. Create `packages/prism-confidence` package
4. Set up build pipeline and dependencies

### Phase 2: Basic Extractors
1. Implement consistency-based extraction
2. Implement perplexity-based extraction
3. Create structured response parser
4. Add basic tests and documentation

### Phase 3: Advanced Features
1. Domain-specific calibration framework
2. Ensemble methods
3. Confidence explanation generation
4. Historical tracking and improvement

### Phase 4: Integration
1. Create Prism bindings for TypeScript library
2. Add syntactic sugar for common patterns
3. Update examples to use confidence library
4. Create tutorials and best practices guide

## Benefits

1. **Standardization**: Common patterns for confidence extraction
2. **Flexibility**: Multiple strategies for different use cases
3. **Evolution**: Can improve techniques without changing language
4. **Reusability**: TypeScript library usable outside Prism
5. **Modularity**: Clean separation of concerns

## Example Usage

### Security Analysis
```prism
import confidence from "@prism/confidence"
import security_calibrator from "@prism/confidence/domains/security"

// Analyze code for vulnerabilities
code = read_file("user_code.js")

// Multiple analysis passes
responses = [
  llm("Check for SQL injection: " + code),
  llm("Check for XSS vulnerabilities: " + code),
  llm("Check for authentication issues: " + code)
]

// Extract confidence using consistency
vuln_confidence = confidence.from_consistency(responses)

// Calibrate for security domain
calibrated = security_calibrator.calibrate(vuln_confidence, {
  code_complexity: measure_complexity(code),
  known_patterns: count_suspicious_patterns(code)
})

// Use in Prism's confidence-aware control flow
result = responses[0] ~> calibrated

uncertain if (result) {
  high {
    block_deployment()
    alert_security_team()
  }
  medium {
    require_manual_review()
  }
  low {
    log_for_monitoring()
  }
}
```

### Medical Diagnosis
```prism
import confidence from "@prism/confidence"
import medical_calibrator from "@prism/confidence/domains/medical"

symptoms = get_patient_symptoms()

// Get diagnosis from multiple models
diagnoses = [
  llm("Diagnose based on symptoms: " + symptoms, {model: "med-model-1"}),
  llm("Diagnose based on symptoms: " + symptoms, {model: "med-model-2"}),
  llm("Diagnose based on symptoms: " + symptoms, {model: "med-model-3"})
]

// Use ensemble method for critical decisions
ensemble_conf = confidence.ensemble({
  consistency: confidence.from_consistency(diagnoses),
  severity: medical_calibrator.severity_adjusted_confidence(diagnoses[0]),
  differential: confidence.differential_diagnosis_confidence(diagnoses)
})

diagnosis = most_likely_diagnosis(diagnoses) ~> ensemble_conf

// Confidence-aware medical decisions
uncertain if (diagnosis) {
  high {
    recommend_treatment(diagnosis.value)
  }
  medium {
    order_additional_tests()
    schedule_specialist_consultation()
  }
  low {
    refer_to_specialist_immediately()
    mark_as_uncertain_case()
  }
}
```

## Migration Path

1. Current Prism code continues to work unchanged
2. New confidence library is opt-in via import
3. Gradual migration of examples to show best practices
4. Eventually could add syntactic sugar to core language

## Open Questions

1. Should we provide pre-trained calibration curves for common domains?
2. How much should be in TypeScript vs. native Prism functions?
3. Should we support confidence extraction from non-LLM sources (sensors, APIs)?
4. What's the right abstraction level for the average user?

## Next Steps

1. Get feedback on this proposal
2. Set up Turbo repo structure
3. Create proof-of-concept implementation
4. Test with real-world use cases
5. Iterate based on user feedback

## Conclusion

By creating a dedicated confidence extraction library, we can:
- Keep the Prism language focused and clean
- Provide sophisticated confidence handling capabilities
- Allow the confidence extraction techniques to evolve independently
- Support both simple and advanced use cases

This positions Prism as not just a language for handling uncertainty, but a complete ecosystem for building confidence-aware applications.