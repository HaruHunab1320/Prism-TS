# @prism-lang/confidence Test Coverage

## Overview

The @prism-lang/confidence package has comprehensive test coverage including unit tests and integration tests with real LLM outputs.

## Unit Tests

### 1. Extractor Tests (`test/extractor.test.ts`)
- ✅ Simple extraction API
- ✅ Response analysis (hedging detection, certainty markers, custom markers)
- ✅ Structured response parsing (JSON, XML, percentages, ratios)
- ✅ Consistency-based extraction
- ✅ Provenance tracking
- ✅ Explanation generation

### 2. Calibration Tests (`test/calibration.test.ts`)
- ✅ Domain-specific calibration (medical, financial, security)
- ✅ Interactive calibration with feedback learning
- ✅ Temporal decay
- ✅ Calibration curves and adjustments

### 3. Ensemble Tests (`test/ensemble.test.ts`)
- ✅ Combining multiple confidence sources
- ✅ Weighted averaging
- ✅ Voting mechanisms
- ✅ Custom aggregation functions
- ✅ Weight updates based on performance

### 4. Patterns Tests (`test/patterns.test.ts`)
- ✅ Confidence budgets
- ✅ Confidence contracts
- ✅ Differential confidence tracking
- ✅ Temporal confidence with decay

### 5. Sources Tests (`test/sources.test.ts`)
- ✅ Sensor confidence extraction
- ✅ API reliability confidence
- ✅ Multi-sensor aggregation
- ✅ Provider tracking

## Integration Tests

### 1. Basic Integration (`test/integration.test.ts`)
Tests with real Gemini API responses:
- ✅ Hedging detection on factual statements
- ✅ Uncertainty detection in predictions
- ✅ Qualified statement handling
- ✅ JSON/XML structured response parsing
- ✅ Consistency analysis across multiple samples
- ✅ Combined extraction methods
- ✅ Edge cases (short responses, mixed confidence)

### 2. Comprehensive Integration (`test/integration-comprehensive.test.ts`)
Tests ALL package features with real LLM outputs:
- ✅ **Calibration**: Security calibrator, Interactive calibrator with feedback
- ✅ **Ensemble Methods**: Combining sources, weight adaptation
- ✅ **Confidence Patterns**: Budgets, contracts, differential tracking, temporal decay
- ✅ **Non-LLM Sources**: Sensor data, API reliability
- ✅ **Smart Extract**: Intelligent extraction from various input types

## LLM Integration Tests

### @prism-lang/llm Integration (`../prism-llm/test/integration-with-confidence.test.ts`)
- ✅ Structured output vs extracted confidence comparison
- ✅ Different extraction methods (response analysis, consistency)
- ✅ Real-world scenarios (documentation, code generation)
- ✅ Ambiguous request handling
- ✅ Error handling and graceful failures

## Key Testing Insights

1. **Confidence Scoring Calibration**:
   - Direct factual answers (e.g., "Paris") get high confidence (0.89)
   - Uncertain predictions get lower confidence (0.65-0.75)
   - Single-word answers are recognized as high confidence
   - Math equations get implicit certainty boost

2. **Real LLM Behavior**:
   - Self-reported confidence often differs from extracted confidence
   - LLMs may be confident about needing more information
   - Consistency varies significantly for subjective topics

3. **Integration Points**:
   - All extraction methods work with real LLM outputs
   - Calibration successfully adjusts raw confidence values
   - Ensemble methods effectively combine multiple signals
   - Temporal decay works as expected for time-sensitive confidence

## Coverage Summary

- **Unit Test Coverage**: All major classes and methods tested
- **Integration Coverage**: All features tested with real LLM data
- **Edge Cases**: Short responses, malformed input, extreme values
- **Real-world Scenarios**: Technical documentation, code generation, security topics

The test suite ensures the confidence extraction library works reliably with both synthetic and real-world data, providing accurate confidence assessments across various use cases.