---
sidebar_position: 5
title: Examples
---

# Examples

This guide provides complete example implementations showcasing various Prism features and real-world applications.

## Basic Examples

### 1. Simple Confidence Assignment

```prism
// Basic confidence assignment
weather_prediction = "sunny" ~> 0.85
temperature = 72 ~> 0.95

// Confidence extraction
prediction_confidence = <~ weather_prediction  // 0.85

// Confidence operations
combined = weather_prediction ~*> temperature  // "sunny", 72 with confidence 0.8075
```

### 2. LLM Integration with Confidence

```typescript
import { createRuntime, parse } from '@prism-lang/core';
import { ClaudeProvider, LLMRequest } from '@prism-lang/llm';

// Setup
const runtime = createRuntime();
const provider = new ClaudeProvider(process.env.CLAUDE_API_KEY);
runtime.registerLLMProvider('claude', provider);
runtime.setDefaultLLMProvider('claude');

// Prism code with LLM
const code = `
  // Ask LLM for analysis
  analysis = llm("What is the weather forecast for tomorrow?")
  
  // Extract confidence
  confidence = <~ analysis
  
  // Decision based on confidence
  uncertain if (confidence > 0.8) {
    high { "Reliable forecast: " + analysis }
    medium { "Somewhat reliable: " + analysis }
    low { "Unreliable forecast, check other sources" }
  }
`;

const result = await runtime.execute(parse(code));
console.log(result);
```

### 3. Confidence Propagation

```prism
// Initial values with confidence
sensor1 = 23.5 ~> 0.9
sensor2 = 24.1 ~> 0.85
sensor3 = 22.8 ~> 0.95

// Average with confidence propagation
average = (sensor1 + sensor2 + sensor3) / 3
avg_confidence = <~ average  // Automatically calculated

// Threshold check
uncertain if (avg_confidence > 0.8) {
  high { "High confidence reading: " + average }
  medium { "Medium confidence, consider recalibration" }
  low { "Low confidence, sensor check required" }
}
```

## Modern Language Features

### 1. Variable Declarations and Block Scoping

```prism
// Using const/let with block scoping
function userProcessing() {
  const API_BASE = "https://api.example.com"
  let processedCount = 0
  
  if (users.length > 0) {
    const batchSize = 10
    let currentBatch = []
    
    for user in users {
      currentBatch.push(user)
      
      if (currentBatch.length >= batchSize) {
        // Process batch
        result = processBatch(currentBatch)
        processedCount += result.length
        
        // Clear batch for next iteration
        currentBatch = []
        
        print("Processed batch, total:", processedCount)
      }
    }
    
    // batchSize and currentBatch not accessible here
  }
  
  console.log("Final count:", processedCount)
  return processedCount
}
```

### 2. Named Functions with Returns

```prism
// Traditional function declarations with hoisting
function calculateRiskScore(transactions, userProfile) {
  // Early return for invalid input
  if (!transactions || transactions.length == 0) {
    return 0 ~> 0.1  // Low confidence for no data
  }
  
  const weights = {
    amount: 0.4,
    frequency: 0.3,
    pattern: 0.3
  }
  
  // Calculate component scores
  let amountScore = calculateAmountRisk(transactions)
  let frequencyScore = calculateFrequencyRisk(transactions)
  let patternScore = calculatePatternRisk(transactions, userProfile)
  
  // Weighted combination
  const totalScore = 
    (amountScore * weights.amount) +
    (frequencyScore * weights.frequency) +
    (patternScore * weights.pattern)
  
  // Return with confidence based on data quality
  const dataQuality = assessDataQuality(transactions)
  return totalScore ~> dataQuality
}

// Support functions
function calculateAmountRisk(transactions) {
  const amounts = transactions.map(t => t.amount)
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
  return avgAmount > 1000 ? 0.8 : 0.2
}

function calculateFrequencyRisk(transactions) {
  const timeSpan = getTimeSpan(transactions)
  const frequency = transactions.length / timeSpan
  return frequency > 5 ? 0.9 : 0.1
}

function calculatePatternRisk(transactions, profile) {
  // Pattern analysis implementation
  return 0.5  // Placeholder
}

function assessDataQuality(transactions) {
  const complete = transactions.filter(t => t.amount && t.date && t.description)
  return complete.length / transactions.length
}

// Usage - works due to hoisting
const userRisk = calculateRiskScore(userTransactions, userProfile)
console.log("Risk assessment:", userRisk)
```

### 3. Block-Statement Lambdas

```prism
// Complex data processing with block-statement lambdas
const users = [
  {name: "Alice", age: 28, score: 85},
  {name: "Bob", age: 34, score: 92},
  {name: "Carol", age: 23, score: 78}
]

// Block lambda for complex processing
const enhancedProcessor = user => {
  // Calculate age group
  let ageGroup = "young"
  if (user.age >= 30) {
    ageGroup = "mature"
  } else if (user.age >= 25) {
    ageGroup = "young-adult"
  }
  
  // Calculate performance tier
  let tier = "standard"
  if (user.score >= 90) {
    tier = "platinum"
  } else if (user.score >= 80) {
    tier = "gold"
  }
  
  // Generate confidence based on data completeness
  const confidence = (user.name && user.age && user.score) ? 0.95 : 0.6
  
  return {
    ...user,
    ageGroup,
    tier,
    processedAt: Date.now()
  } ~> confidence
}

// Use with array methods
const processed = users.map(enhancedProcessor)
print("Processed users:", processed.length)

// Block lambda with early returns for validation
const validator = data => {
  console.debug("Validating:", data)
  
  if (!data) {
    console.warn("No data provided")
    return false
  }
  
  if (typeof data !== "object") {
    console.error("Data must be an object")
    return false
  }
  
  const required = ["name", "email", "age"]
  for field in required {
    if (!data[field]) {
      console.error("Missing required field:", field)
      return false
    }
  }
  
  console.log("Validation passed")
  return true
}

// Block lambda with loops
const aggregator = items => {
  let totalValue = 0
  let validCount = 0
  const categories = {}
  
  for item in items {
    if (item.value && item.value > 0) {
      totalValue += item.value
      validCount += 1
      
      // Group by category
      const cat = item.category || "uncategorized"
      if (!categories[cat]) {
        categories[cat] = []
      }
      categories[cat].push(item)
    }
  }
  
  return {
    total: totalValue,
    average: validCount > 0 ? totalValue / validCount : 0,
    count: validCount,
    categories
  }
}
```

### 4. Parameterized Primitives and Pipeline Operations

```prism
// Create reusable, configurable functions
const highConfidenceFilter = threshold(0.8)
const scoreSorter = sortBy("score", "desc")
const categoryGrouper = groupBy("category")
const confidentProcessor = confidence(0.9)

// Data processing pipeline
const analysisData = [
  {name: "Analysis A", score: 85, category: "research"} ~> 0.9,
  {name: "Analysis B", score: 92, category: "research"} ~> 0.7,
  {name: "Analysis C", score: 78, category: "testing"} ~> 0.85,
  {name: "Analysis D", score: 88, category: "testing"} ~> 0.95
]

// Pipeline with parameterized functions
const result = analysisData
  |> highConfidenceFilter(_)           // Keep only high-confidence items
  |> scoreSorter(_)                    // Sort by score descending
  |> categoryGrouper(_)                // Group by category

print("Filtered and grouped results:", result)

// Create domain-specific processors
const createDataValidator = (minScore, requiredFields) => {
  return data => {
    // Check score threshold
    if (data.score < minScore) {
      return false
    }
    
    // Check required fields
    for field in requiredFields {
      if (!data[field]) {
        return false
      }
    }
    
    return true
  }
}

const researchValidator = createDataValidator(80, ["methodology", "sample_size"])
const productValidator = createDataValidator(90, ["version", "testing_complete"])

// Custom confidence wrapper for specific use case
const medicalConfidence = confidence(0.95)  // High threshold for medical data
const medicalAnalyzer = medicalConfidence(data => {
  // Medical analysis logic
  const riskFactors = data.symptoms.length + data.history.length
  return riskFactors > 5 ? "high-risk" : "low-risk"
})

// Chained parameterized operations
const qualityAnalysis = data
  |> threshold(0.85)(_)                    // High confidence only
  |> sortBy("timestamp", "desc")(_)        // Most recent first
  |> groupBy(item => item.priority)(_)     // Group by priority
  |> map(group => {                        // Process each group
      const summary = group.reduce((acc, item) => {
        acc.total += item.value
        acc.count += 1
        return acc
      }, {total: 0, count: 0})
      
      return {
        ...summary,
        average: summary.total / summary.count
      }
    })

console.log("Quality analysis complete:", qualityAnalysis)
```

### 5. Import/Export Module System

```prism
// math-utils.prism - Utility module
export const PI = 3.14159
export const E = 2.71828

export function circleArea(radius) {
  return PI * radius * radius
}

export function exponentialGrowth(initial, rate, time) {
  return initial * Math.pow(E, rate * time)
}

// Default export
export default function calculate(operation, ...args) {
  switch (operation) {
    case "area":
      return circleArea(args[0])
    case "growth":
      return exponentialGrowth(args[0], args[1], args[2])
    default:
      return 0
  }
}

// validation.prism - Validation utilities
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PHONE_REGEX = /^\+?[\d\s\-\(\)]+$/

export function validateEmail(email) {
  const isValid = EMAIL_REGEX.test(email)
  return isValid ~> (isValid ? 0.95 : 0.1)
}

export function validatePhone(phone) {
  const isValid = PHONE_REGEX.test(phone)
  return isValid ~> (isValid ? 0.9 : 0.1)
}

export function validateAge(age) {
  const isNumber = typeof age === "number"
  const inRange = age >= 0 && age <= 150
  const isValid = isNumber && inRange
  
  return isValid ~> (isValid ? 0.99 : 0.0)
}

// main.prism - Main application
import {PI, circleArea, exponentialGrowth} from "./math-utils.prism"
import {validateEmail, validatePhone, validateAge} from "./validation.prism"
import calculate from "./math-utils.prism"  // Default import

// Using imported functions
function processUserData(userData) {
  print("Processing user:", userData.name)
  
  // Validate input data
  const emailValid = validateEmail(userData.email)
  const phoneValid = validatePhone(userData.phone)
  const ageValid = validateAge(userData.age)
  
  console.log("Email validation:", emailValid)
  console.log("Phone validation:", phoneValid)
  console.log("Age validation:", ageValid)
  
  // Calculate some metrics
  if (userData.radius) {
    const area = circleArea(userData.radius)
    console.log("Circle area:", area)
  }
  
  // Use default export
  const result = calculate("growth", 100, 0.05, userData.age)
  console.log("Growth calculation:", result)
  
  // Overall confidence based on validations
  const overallConfidence = (emailValid + phoneValid + ageValid) / 3
  
  return {
    ...userData,
    validated: true,
    confidence: overallConfidence
  }
}

// Usage
const user = {
  name: "Alice Johnson",
  email: "alice@example.com",
  phone: "+1-555-123-4567",
  age: 28,
  radius: 5
}

const processed = processUserData(user)
print("Final result:", processed)
```

### 6. Debugging and Output

```prism
// Comprehensive debugging example
function debugDataProcessing(rawData) {
  console.debug("Starting data processing")
  console.debug("Input data length:", rawData.length)
  
  // Data cleaning phase
  print("=== Data Cleaning Phase ===")
  const cleaned = rawData.filter(item => {
    const isValid = item && item.value !== null && item.value !== undefined
    if (!isValid) {
      console.warn("Filtering out invalid item:", item)
    }
    return isValid
  })
  
  print("Cleaned data count:", cleaned.length)
  
  // Transformation phase  
  print("=== Transformation Phase ===")
  const transformed = cleaned.map((item, index) => {
    console.debug(`Processing item ${index + 1}/${cleaned.length}`)
    
    const confidence = item.confidence || 0.5
    const processed = {
      ...item,
      transformed: true,
      confidence
    }
    
    if (confidence < 0.7) {
      console.warn("Low confidence item:", processed.value, "confidence:", confidence)
    }
    
    return processed
  })
  
  // Aggregation phase
  print("=== Aggregation Phase ===")
  const stats = transformed.reduce((acc, item) => {
    acc.totalValue += item.value
    acc.count += 1
    acc.avgConfidence += item.confidence
    
    if (item.confidence > acc.maxConfidence) {
      acc.maxConfidence = item.confidence
      acc.mostConfident = item
    }
    
    return acc
  }, {
    totalValue: 0,
    count: 0,
    avgConfidence: 0,
    maxConfidence: 0,
    mostConfident: null
  })
  
  stats.average = stats.totalValue / stats.count
  stats.avgConfidence = stats.avgConfidence / stats.count
  
  console.log("Processing complete!")
  console.log("Statistics:", stats)
  
  print("=== Final Results ===")
  print("Average value:", stats.average)
  print("Average confidence:", stats.avgConfidence.toFixed(3))
  print("Most confident item:", stats.mostConfident.value)
  
  return {
    data: transformed,
    stats
  }
}

// Usage with sample data
const sampleData = [
  {value: 10, confidence: 0.9},
  {value: 20, confidence: 0.8},
  {value: null},  // Will be filtered out
  {value: 15, confidence: 0.6},  // Will trigger warning
  {value: 25, confidence: 0.95}
]

const results = debugDataProcessing(sampleData)
console.log("Final results:", results)
```

## Advanced Use Cases

### 1. Multi-Stage Decision Pipeline

```typescript
import { ConfidenceExtractor, DomainCalibrator, ConfidenceBudgetManager, ConfidenceEnsemble, ConfidenceResult } from '@prism-lang/confidence';
import { ClaudeProvider, GeminiProvider, LLMRequest } from '@prism-lang/llm';

interface DecisionResult {
  primary: string;
  secondary?: string;
  confidence: number;
  withinBudget: boolean;
  recommendation: string;
}

class DecisionPipeline {
  private extractor = new ConfidenceExtractor();
  private calibrator: DomainCalibrator;
  private budgetManager = new ConfidenceBudgetManager(0.7);
  private claude = new ClaudeProvider(process.env.CLAUDE_API_KEY);
  private gemini = new GeminiProvider(process.env.GEMINI_API_KEY);
  
  constructor(domain: string) {
    this.calibrator = new DomainCalibrator({ domain });
  }
  
  async analyze(query: string): Promise<DecisionResult> {
    // Stage 1: Initial analysis with primary LLM
    const primaryAnalysis = await this.claude.complete(
      new LLMRequest(`Analyze this query and provide structured analysis: ${query}`)
    );
    
    // Stage 2: Extract confidence
    const primaryConfidence = await this.extractor.fromResponseAnalysis(
      primaryAnalysis.content
    );
    
    // Stage 3: Get second opinion if confidence is medium
    let secondaryAnalysis = null;
    if (primaryConfidence.value < 0.8 && primaryConfidence.value > 0.5) {
      secondaryAnalysis = await this.gemini.complete(
        new LLMRequest(`Provide alternative analysis: ${query}`)
      );
    }
    
    // Stage 4: Combine and calibrate
    const combinedConfidence = secondaryAnalysis 
      ? await this.combineAnalyses(primaryAnalysis, secondaryAnalysis)
      : primaryConfidence;
    
    const calibrated = await this.calibrator.calibrate(
      combinedConfidence,
      'analysis',
      { query, hasSecondOpinion: !!secondaryAnalysis }
    );
    
    // Stage 5: Budget check
    this.budgetManager.add(query, calibrated.value);
    
    return {
      primary: primaryAnalysis.content,
      secondary: secondaryAnalysis?.content,
      confidence: calibrated.value,
      withinBudget: this.budgetManager.isWithinBudget(),
      recommendation: this.getRecommendation(calibrated.value)
    };
  }
  
  private async combineAnalyses(primary: any, secondary: any): Promise<ConfidenceResult> {
    // Implement ensemble logic
    const ensemble = new ConfidenceEnsemble({
      primary: 0.6,
      secondary: 0.4
    });
    
    return ensemble.combine([
      await this.extractor.fromResponseAnalysis(primary.content),
      await this.extractor.fromResponseAnalysis(secondary.content)
    ]);
  }
  
  private getRecommendation(confidence: number): string {
    if (confidence >= 0.9) return 'Proceed with high confidence';
    if (confidence >= 0.7) return 'Proceed with monitoring';
    if (confidence >= 0.5) return 'Proceed with caution';
    return 'Manual review recommended';
  }
}

// Usage
const pipeline = new DecisionPipeline('finance');
const result = await pipeline.analyze('Should we approve this loan application?');
```

### 2. Real-time Confidence Monitoring

```typescript
import { TemporalConfidence, SensorConfidenceExtractor } from '@prism-lang/confidence';

interface ConfidenceReading {
  timestamp: number;
  value: any;
  confidence: number;
  source: string;
}

interface SensorData {
  timestamp: number;
  value: any;
  source: string;
  environment: any;
  lastCalibration?: Date;
}

class RealTimeMonitor {
  private temporal = new TemporalConfidence(60, 'exponential'); // 60 min half-life
  private history: ConfidenceReading[] = [];
  
  async monitorStream(dataStream: AsyncIterable<SensorData>) {
    for await (const data of dataStream) {
      const reading = await this.processReading(data);
      this.history.push(reading);
      
      // Apply temporal decay to historical readings
      this.applyTemporalDecay();
      
      // Visualize current state
      this.visualizeConfidence();
      
      // Alert on anomalies
      await this.checkAnomalies();
    }
  }
  
  private async processReading(data: SensorData): Promise<ConfidenceReading> {
    const extractor = new SensorConfidenceExtractor();
    const confidence = await extractor.extract({
      age: Date.now() - data.timestamp,
      environment: data.environment,
      history: this.history.length,
      calibrationDate: data.lastCalibration
    });
    
    return {
      timestamp: Date.now(),
      value: data.value,
      confidence: confidence.value,
      source: data.source
    };
  }
  
  private applyTemporalDecay() {
    const now = Date.now();
    
    this.history = this.history.map(reading => ({
      ...reading,
      confidence: this.temporal.apply(
        { value: reading.confidence },
        (now - reading.timestamp) / 3600000 // hours
      ).value
    }));
  }
  
  private visualizeConfidence() {
    // Clear previous visualization
    console.clear();
    
    // Show last 10 readings
    const recent = this.history.slice(-10);
    
    console.log('📊 Confidence History:');
    console.log('='.repeat(50));
    
    recent.forEach(reading => {
      const bar = '█'.repeat(Math.round(reading.confidence * 20));
      const empty = '░'.repeat(20 - Math.round(reading.confidence * 20));
      const timestamp = new Date(reading.timestamp).toLocaleTimeString();
      
      console.log(
        `${reading.source.padEnd(10)} [${timestamp}] ${bar}${empty} ${(reading.confidence * 100).toFixed(1)}%`
      );
    });
    
    console.log('='.repeat(50));
  }
  
  private async checkAnomalies() {
    const recent = this.history.slice(-5);
    const avgConfidence = recent.reduce((sum, r) => sum + r.confidence, 0) / recent.length;
    
    if (avgConfidence < 0.5) {
      await this.alert('Low confidence detected', {
        average: avgConfidence,
        readings: recent
      });
    }
    
    // Check for sudden drops
    if (recent.length >= 2) {
      const drop = recent[recent.length - 2].confidence - recent[recent.length - 1].confidence;
      if (drop > 0.3) {
        await this.alert('Sudden confidence drop', {
          previous: recent[recent.length - 2].confidence,
          current: recent[recent.length - 1].confidence,
          drop
        });
      }
    }
  }
  
  private async alert(message: string, details: any) {
    console.log(`\n⚠️  ALERT: ${message}`);
    console.log('Details:', JSON.stringify(details, null, 2));
  }
}
```

### 3. Confidence-Aware Caching

```typescript
import { TemporalConfidence, ConfidenceExtractor } from '@prism-lang/confidence';
import { ClaudeProvider, LLMRequest } from '@prism-lang/llm';

interface CacheEntry<T> {
  value: T;
  confidence: number;
  timestamp: number;
}

interface ConfidenceValue<T> {
  value: T;
  confidence: number;
}

class ConfidenceCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private temporal = new TemporalConfidence(3600, 'linear'); // 1 hour
  
  async get(
    key: string,
    compute: () => Promise<ConfidenceValue<T>>,
    minConfidence = 0.7
  ): Promise<T> {
    const entry = this.cache.get(key);
    
    if (entry) {
      // Apply temporal decay
      const aged = this.temporal.apply(
        { value: entry.confidence },
        (Date.now() - entry.timestamp) / 1000 // seconds
      );
      
      // Check if still valid
      if (aged.value >= minConfidence) {
        console.log(`Cache hit for ${key} with confidence ${aged.value}`);
        return entry.value;
      }
      
      console.log(`Cache expired for ${key}, confidence degraded to ${aged.value}`);
    }
    
    // Compute new value
    console.log(`Computing new value for ${key}`);
    const result = await compute();
    
    // Only cache if confidence is high enough
    if (result.confidence >= minConfidence) {
      this.cache.set(key, {
        value: result.value,
        confidence: result.confidence,
        timestamp: Date.now()
      });
    }
    
    return result.value;
  }
  
  invalidate(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

// Usage
const cache = new ConfidenceCache<string>();
const llmProvider = new ClaudeProvider(process.env.CLAUDE_API_KEY);
const extractor = new ConfidenceExtractor();

const result = await cache.get(
  'weather-forecast',
  async () => {
    const response = await llmProvider.complete(
      new LLMRequest('What is the weather forecast?')
    );
    const confidence = await extractor.fromResponseAnalysis(response.content);
    return { value: response.content, confidence: confidence.value };
  },
  0.8 // Require 80% confidence for caching
);
```

## Real-World Applications

### 1. Medical Diagnosis Assistant

```typescript
import { createRuntime, parse } from '@prism-lang/core';
import { 
  ConfidenceExtractor, 
  DomainCalibrator, 
  SecurityCalibrator,
  ConfidenceContractManager 
} from '@prism-lang/confidence';

class MedicalDiagnosisAssistant {
  private runtime = createRuntime();
  private extractor = new ConfidenceExtractor();
  private medicalCalibrator: DomainCalibrator;
  private securityCalibrator = new SecurityCalibrator();
  private contracts: ConfidenceContractManager;
  
  constructor() {
    // Configure medical domain calibration
    this.medicalCalibrator = new DomainCalibrator({
      domain: 'medical',
      curves: {
        diagnosis: {
          baseConfidence: 0.6,
          adjustments: {
            'has_test_results': 0.2,
            'has_imaging': 0.15,
            'has_specialist_consult': 0.1,
            'conflicting_symptoms': -0.2
          }
        }
      }
    });
    
    // Set strict confidence requirements
    this.contracts = new ConfidenceContractManager({
      'critical_diagnosis': 0.95,
      'treatment_recommendation': 0.9,
      'medication_dosage': 0.98,
      'general_advice': 0.7
    });
  }
  
  async analyzeSymptomsWithPrism(symptoms: string[], testResults?: any) {
    const prismCode = `
      // Analyze symptoms
      symptoms = "${symptoms.join(', ')}"
      initial_analysis = llm("Analyze these symptoms: " + symptoms + ". Provide differential diagnosis.")
      
      // Get confidence
      analysis_confidence = <~ initial_analysis
      
      // Decision tree based on confidence
      uncertain if (analysis_confidence > 0.8) {
        high {
          diagnosis = llm("Based on high confidence, provide specific diagnosis for: " + symptoms)
          treatment = llm("Recommend treatment for: " + diagnosis)
          {
            diagnosis: diagnosis,
            treatment: treatment,
            confidence: "high",
            requiresReview: false
          }
        }
        medium {
          additional_tests = llm("What additional tests would help diagnose: " + symptoms)
          preliminary = llm("Provide preliminary assessment for: " + symptoms)
          {
            preliminary: preliminary,
            additional_tests: additional_tests,
            confidence: "medium",
            requiresReview: true
          }
        }
        low {
          referral = "Immediate specialist consultation recommended"
          safety_advice = llm("Provide general safety advice for symptoms: " + symptoms)
          {
            action: referral,
            safety_advice: safety_advice,
            confidence: "low",
            requiresReview: true
          }
        }
      }
    `;
    
    // Execute Prism code
    const result = await this.runtime.execute(parse(prismCode));
    
    // Apply domain calibration
    const calibrated = await this.medicalCalibrator.calibrate(
      { value: result.confidence || 0.5 },
      'diagnosis',
      {
        has_test_results: !!testResults,
        symptom_count: symptoms.length
      }
    );
    
    // Apply security calibration for medical context
    const secured = await this.securityCalibrator.calibrate(
      calibrated,
      { riskLevel: 'critical' }
    );
    
    // Validate against contracts
    const validation = this.contracts.validate({
      'critical_diagnosis': secured.value
    });
    
    return {
      ...result.value,
      finalConfidence: secured.value,
      meetsRequirements: validation.isValid,
      validation: validation
    };
  }
}

// Usage
const assistant = new MedicalDiagnosisAssistant();
const diagnosis = await assistant.analyzeSymptomsWithPrism(
  ['fever', 'cough', 'fatigue'],
  { bloodTest: { wbc: 12000 } }
);

console.log('Diagnosis:', diagnosis);
```

### 2. Financial Risk Assessment

```typescript
import { createRuntime, parse } from '@prism-lang/core';

interface LoanApplication {
  creditScore: number;
  annualIncome: number;
  debtToIncomeRatio: number;
  employmentYears: number;
}

class FinancialRiskAssessment {
  private runtime = createRuntime();
  
  async assessLoanApplication(application: LoanApplication) {
    const prismCode = `
      // Input data
      credit_score = ${application.creditScore} ~> 0.99
      income = ${application.annualIncome} ~> 0.95
      debt_ratio = ${application.debtToIncomeRatio} ~> 0.98
      employment_years = ${application.employmentYears} ~> 0.9
      
      // Calculate risk score with confidence
      risk_components = [
        (credit_score > 700) ~> 0.9,
        (income > 50000) ~> 0.85,
        (debt_ratio < 0.4) ~> 0.88,
        (employment_years > 2) ~> 0.8
      ]
      
      // Aggregate risk assessment
      positive_factors = risk_components.filter(c => c == true).length
      risk_confidence = risk_components.map(c => <~ c).reduce((a, b) => a * b)
      
      // LLM analysis for edge cases
      llm_assessment = llm("Analyze loan application risk: " + 
        "Credit: " + credit_score + 
        ", Income: " + income + 
        ", Debt ratio: " + debt_ratio + 
        ", Employment: " + employment_years + " years")
      
      llm_confidence = <~ llm_assessment
      
      // Combined decision
      final_confidence = (risk_confidence * 0.7) + (llm_confidence * 0.3)
      
      uncertain if (final_confidence > 0.85) {
        high {
          decision = "APPROVE"
          interest_rate = 3.5
          max_amount = income * 5
        }
        medium {
          decision = "CONDITIONAL_APPROVE"
          interest_rate = 4.5
          max_amount = income * 3
          conditions = ["Provide additional documentation", "Co-signer may be required"]
        }
        low {
          decision = "REFER_TO_UNDERWRITER"
          interest_rate = null
          max_amount = null
          reason = "Automated assessment confidence too low"
        }
      }
    `;
    
    const result = await this.runtime.execute(parse(prismCode));
    
    return {
      decision: result.value.decision,
      confidence: result.confidence,
      details: result.value,
      timestamp: new Date(),
      assessmentId: this.generateId()
    };
  }
  
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
```

### 3. Content Moderation System

```typescript
import { createRuntime, parse } from '@prism-lang/core';
import { ConfidenceEnsemble, ConfidenceExtractor, ConfidenceResult } from '@prism-lang/confidence';
import { ClaudeProvider, LLMRequest } from '@prism-lang/llm';

interface ModerationResult {
  action: string;
  confidence: number;
  breakdown: {
    toxicity: number;
    relevance: number;
    quality: number;
    safety: number;
  };
  reviewNeeded: boolean;
  flags: string[];
  explanation?: string;
}

class ContentModerationSystem {
  private runtime = createRuntime();
  private extractor = new ConfidenceExtractor();
  private ensemble: ConfidenceEnsemble;
  private claude = new ClaudeProvider(process.env.CLAUDE_API_KEY || '');
  
  constructor() {
    this.ensemble = new ConfidenceEnsemble({
      toxicity: 0.3,
      relevance: 0.3,
      quality: 0.2,
      safety: 0.2
    });
  }
  
  async moderateContent(content: string): Promise<ModerationResult> {
    // Parallel analysis with different aspects
    const [toxicity, relevance, quality, safety] = await Promise.all([
      this.analyzeToxicity(content),
      this.analyzeRelevance(content),
      this.analyzeQuality(content),
      this.analyzeSafety(content)
    ]);
    
    // Combine all aspects
    const combined = await this.ensemble.combine([
      toxicity,
      relevance,
      quality,
      safety
    ]);
    
    // Prism decision logic
    const prismCode = `
      combined_score = ${combined.value}
      
      uncertain if (combined_score > 0.8) {
        high {
          action = "APPROVE"
          review_needed = false
          flags = []
        }
        medium {
          action = "APPROVE_WITH_REVIEW"
          review_needed = true
          flags = ["Manual review recommended"]
        }
        low {
          action = "BLOCK"
          review_needed = true
          flags = ["Content blocked for manual review"]
        }
      }
    `;
    
    const decision = await this.runtime.execute(parse(prismCode));
    
    return {
      action: decision.value.action,
      confidence: combined.value,
      breakdown: {
        toxicity: toxicity.value,
        relevance: relevance.value,
        quality: quality.value,
        safety: safety.value
      },
      reviewNeeded: decision.value.review_needed,
      flags: decision.value.flags,
      explanation: combined.explanation
    };
  }
  
  private async analyzeToxicity(content: string): Promise<ConfidenceResult> {
    const response = await this.claude.complete(
      new LLMRequest(`Analyze toxicity level of: "${content}". 
       Rate from 0-1 where 0 is toxic and 1 is completely safe.`)
    );
    
    return this.extractor.fromStructuredResponse(response.content);
  }
  
  // Similar methods for relevance, quality, and safety...
}
```

## Integration Examples

### 1. Express.js API with Confidence

```typescript
import express from 'express';
import { createRuntime, parse } from '@prism-lang/core';
import { ConfidenceExtractor } from '@prism-lang/confidence';
import { ClaudeProvider } from '@prism-lang/llm';

const app = express();
app.use(express.json());

const runtime = createRuntime();
const provider = new ClaudeProvider(process.env.CLAUDE_API_KEY);
runtime.registerLLMProvider('claude', provider);
runtime.setDefaultLLMProvider('claude');

// Confidence middleware
const requireConfidence = (minConfidence: number) => {
  return async (req: any, res: any, next: any) => {
    if (!req.confidence || req.confidence < minConfidence) {
      return res.status(400).json({
        error: 'Insufficient confidence',
        required: minConfidence,
        actual: req.confidence || 0
      });
    }
    next();
  };
};

// Endpoint with confidence extraction
app.post('/api/analyze', async (req, res) => {
  try {
    const { query } = req.body;
    
    const prismCode = `
      analysis = llm("${query}")
      confidence = <~ analysis
      
      result = {
        analysis: analysis,
        confidence: confidence
      }
    `;
    
    const result = await runtime.execute(parse(prismCode));
    
    // Set confidence for middleware
    req.confidence = result.value.confidence;
    
    res.json({
      success: true,
      data: result.value,
      metadata: {
        confidence: result.confidence,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Protected endpoint requiring high confidence
app.post(
  '/api/execute', 
  requireConfidence(0.8),
  async (req, res) => {
    // Only reached if confidence >= 0.8
    res.json({
      success: true,
      message: 'High confidence operation executed'
    });
  }
);

app.listen(3000);
```

### 2. React Component with Confidence Display

```tsx
import React, { useState } from 'react';
import { createRuntime, parse } from '@prism-lang/core';
import { ClaudeProvider } from '@prism-lang/llm';

const ConfidenceAnalyzer: React.FC = () => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confidenceHistory, setConfidenceHistory] = useState<number[]>([]);
  
  const runtime = createRuntime();
  
  // Set up LLM provider (in real app, this would be done once at app initialization)
  React.useEffect(() => {
    const provider = new ClaudeProvider(process.env.REACT_APP_CLAUDE_API_KEY || '');
    runtime.registerLLMProvider('claude', provider);
    runtime.setDefaultLLMProvider('claude');
  }, []);
  
  const analyze = async () => {
    setLoading(true);
    
    try {
      const prismCode = `
        analysis = llm("${input}")
        confidence = <~ analysis
        
        uncertain if (confidence > 0.7) {
          high { 
            status = "High confidence"
            color = "green"
          }
          medium { 
            status = "Medium confidence"
            color = "yellow"
          }
          low { 
            status = "Low confidence"
            color = "red"
          }
        }
      `;
      
      const result = await runtime.execute(parse(prismCode));
      
      setResult(result.value);
      setConfidenceHistory([...confidenceHistory, result.confidence]);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
    
    setLoading(false);
  };
  
  const getConfidenceBar = (confidence: number) => {
    const percentage = confidence * 100;
    const color = confidence > 0.7 ? 'green' : confidence > 0.4 ? 'yellow' : 'red';
    
    return (
      <div className="confidence-bar">
        <div 
          className="confidence-fill"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
        <span>{percentage.toFixed(1)}%</span>
      </div>
    );
  };
  
  return (
    <div className="confidence-analyzer">
      <h2>Confidence Analyzer</h2>
      
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter text to analyze..."
      />
      
      <button onClick={analyze} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>
      
      {result && (
        <div className="result">
          <h3>Analysis Result</h3>
          <p className={`status ${result.color}`}>{result.status}</p>
          <p>{result.analysis}</p>
          {getConfidenceBar(result.confidence)}
        </div>
      )}
      
      {confidenceHistory.length > 0 && (
        <div className="history">
          <h3>Confidence History</h3>
          {confidenceHistory.map((conf, idx) => (
            <div key={idx}>{getConfidenceBar(conf)}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConfidenceAnalyzer;
```

## Complete Project Walkthrough

### Weather Prediction Service

A complete example of a weather prediction service using Prism:

```typescript
// src/weather-service.ts
import { createRuntime, parse } from '@prism-lang/core';
import { 
  ConfidenceExtractor, 
  TemporalConfidence,
  ConfidenceEnsemble,
  APIConfidenceExtractor 
} from '@prism-lang/confidence';
import { ClaudeProvider, GeminiProvider, LLMRequest } from '@prism-lang/llm';

interface WeatherPrediction {
  temperature: number;
  conditions: string;
  confidence: number;
  sources: string[];
}

class WeatherPredictionService {
  private runtime = createRuntime();
  private claude = new ClaudeProvider(process.env.CLAUDE_API_KEY);
  private gemini = new GeminiProvider(process.env.GEMINI_API_KEY);
  private extractor = new ConfidenceExtractor();
  private temporal = new TemporalConfidence(24, 'exponential'); // 24 hour half-life
  private cache = new Map<string, { prediction: WeatherPrediction; timestamp: number }>();
  
  constructor() {
    this.runtime.registerLLMProvider('claude', this.claude);
    this.runtime.registerLLMProvider('gemini', this.gemini);
    this.runtime.setDefaultLLMProvider('claude');
  }
  
  async predictWeather(location: string, date: Date): Promise<WeatherPrediction> {
    // Check cache first
    const cached = this.getCachedPrediction(location, date);
    if (cached && cached.confidence > 0.6) {
      return cached;
    }
    
    // Get predictions from multiple sources
    const [apiData, llmPrediction1, llmPrediction2] = await Promise.all([
      this.fetchWeatherAPI(location, date),
      this.getLLMPrediction(this.claude, location, date),
      this.getLLMPrediction(this.gemini, location, date)
    ]);
    
    // Combine predictions with Prism
    const prismCode = `
      // Weather data
      api_temp = ${apiData.temperature} ~> ${apiData.confidence}
      llm1_temp = ${llmPrediction1.temperature} ~> ${llmPrediction1.confidence}
      llm2_temp = ${llmPrediction2.temperature} ~> ${llmPrediction2.confidence}
      
      // Weighted average based on confidence
      total_confidence = <~ api_temp + <~ llm1_temp + <~ llm2_temp
      
      weighted_temp = (
        (api_temp * <~ api_temp) + 
        (llm1_temp * <~ llm1_temp) + 
        (llm2_temp * <~ llm2_temp)
      ) / total_confidence
      
      // Conditions aggregation
      conditions = llm("Based on these predictions, what are the weather conditions: " +
        "API: ${apiData.conditions}, " +
        "Model 1: ${llmPrediction1.conditions}, " +
        "Model 2: ${llmPrediction2.conditions}")
      
      // Final confidence
      final_confidence = total_confidence / 3
      
      // Uncertainty handling
      uncertain if (final_confidence > 0.8) {
        high {
          reliability = "High"
          advisory = "Reliable forecast"
        }
        medium {
          reliability = "Medium"
          advisory = "Check again closer to date"
        }
        low {
          reliability = "Low"
          advisory = "Multiple sources disagree, low confidence"
        }
      }
    `;
    
    const result = await this.runtime.execute(parse(prismCode));
    
    const prediction: WeatherPrediction = {
      temperature: result.value.weighted_temp,
      conditions: result.value.conditions,
      confidence: result.value.final_confidence,
      sources: ['WeatherAPI', 'Claude', 'Gemini']
    };
    
    // Cache the prediction
    this.cachePrediction(location, date, prediction);
    
    return prediction;
  }
  
  private getCachedPrediction(location: string, date: Date): WeatherPrediction | null {
    const key = `${location}-${date.toISOString()}`;
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Apply temporal decay
    const ageHours = (Date.now() - cached.timestamp) / 3600000;
    const aged = this.temporal.apply(
      { value: cached.prediction.confidence },
      ageHours
    );
    
    return {
      ...cached.prediction,
      confidence: aged.value
    };
  }
  
  private async fetchWeatherAPI(location: string, date: Date) {
    // Simulated API call
    const apiExtractor = new APIConfidenceExtractor();
    const confidence = await apiExtractor.extract({
      provider: 'weather-api',
      historicalAccuracy: 0.85,
      latency: 150
    });
    
    return {
      temperature: 72 + Math.random() * 10,
      conditions: 'Partly cloudy',
      confidence: confidence.value
    };
  }
  
  private async getLLMPrediction(provider: any, location: string, date: Date) {
    const response = await provider.complete(
      new LLMRequest(`Predict weather for ${location} on ${date.toDateString()}. 
       Provide temperature in Fahrenheit and conditions.`)
    );
    
    const confidence = await this.extractor.fromResponseAnalysis(response.content);
    
    // Parse temperature from response (simplified)
    const tempMatch = response.content.match(/(\d+)\s*°?F/);
    const temperature = tempMatch ? parseInt(tempMatch[1]) : 70;
    
    return {
      temperature,
      conditions: response.content,
      confidence: confidence.value
    };
  }
  
  private cachePrediction(location: string, date: Date, prediction: WeatherPrediction) {
    const key = `${location}-${date.toISOString()}`;
    this.cache.set(key, {
      prediction,
      timestamp: Date.now()
    });
  }
}

// Usage
const weatherService = new WeatherPredictionService();

async function main() {
  const prediction = await weatherService.predictWeather(
    'San Francisco',
    new Date('2024-12-25')
  );
  
  console.log('Weather Prediction:');
  console.log(`Temperature: ${prediction.temperature.toFixed(1)}°F`);
  console.log(`Conditions: ${prediction.conditions}`);
  console.log(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
  console.log(`Sources: ${prediction.sources.join(', ')}`);
}

main().catch(console.error);
```

## Summary

These examples demonstrate:

1. **Basic Usage**: Simple confidence operations and LLM integration
2. **Advanced Patterns**: Multi-stage pipelines, real-time monitoring, and caching
3. **Real Applications**: Medical diagnosis, financial assessment, and content moderation
4. **Integration**: Express.js APIs and React components with Prism
5. **Complete Projects**: Full implementation of a weather prediction service

Each example shows how Prism's confidence-aware programming model can be applied to build robust, uncertainty-aware applications that make intelligent decisions based on confidence levels.