---
sidebar_position: 4
title: Best Practices
---

# Best Practices

This guide covers best practices for developing applications with Prism, focusing on code organization, performance optimization, testing strategies, and production deployment.

## Code Organization

### 1. Project Structure

Organize your Prism projects with clear separation of concerns:

```
my-prism-app/
├── src/
│   ├── core/           # Core business logic
│   │   ├── models/     # Data models with confidence
│   │   ├── services/   # Business services
│   │   └── utils/      # Utility functions
│   ├── confidence/     # Confidence management
│   │   ├── extractors/ # Custom extractors
│   │   ├── calibrators/# Domain calibrators
│   │   └── contracts/  # Confidence contracts
│   ├── llm/           # LLM integration
│   │   ├── providers/  # Provider configurations
│   │   ├── prompts/    # Prompt templates
│   │   └── handlers/   # Response handlers
│   └── prism/         # Prism scripts
│       ├── rules/      # Business rules
│       ├── agents/     # Agent definitions
│       └── workflows/  # Complex workflows
├── test/              # Test files
├── config/            # Configuration files
└── scripts/           # Build and utility scripts
```

### 2. Modular Confidence Management

Create reusable confidence modules:

```typescript
// confidence/extractors/domain-extractor.ts
import { ConfidenceExtractor } from '@prism/confidence';

export class DomainSpecificExtractor extends ConfidenceExtractor {
  async extractFromDomainData(data: DomainData): Promise<ConfidenceResult> {
    // Domain-specific extraction logic
    const baseConfidence = await this.fromResponseAnalysis(data.description);
    
    // Apply domain rules
    if (data.source === 'verified') {
      baseConfidence.value *= 1.2;
    }
    
    return {
      ...baseConfidence,
      value: Math.min(1, baseConfidence.value)
    };
  }
}
```

### 3. Centralized Error Handling

Implement a centralized error handling system:

```typescript
// core/error-handler.ts
export class ErrorHandler {
  private static handlers = new Map<string, ErrorHandlerFunction>();
  
  static register(errorType: string, handler: ErrorHandlerFunction) {
    this.handlers.set(errorType, handler);
  }
  
  static async handle(error: Error, context?: any): Promise<void> {
    const handler = this.handlers.get(error.constructor.name) || 
                   this.handlers.get('default');
    
    if (handler) {
      await handler(error, context);
    } else {
      console.error('Unhandled error:', error);
    }
  }
}

// Register handlers
ErrorHandler.register('LLMError', async (error, context) => {
  // Log to monitoring service
  await logger.error('LLM Error', { error, context });
  
  // Notify if critical
  if (context?.critical) {
    await notifier.alert('Critical LLM failure', error);
  }
});
```

## Performance Optimization

### 1. Confidence Caching

Cache confidence calculations to avoid redundant processing:

```typescript
class ConfidenceCache {
  private cache = new Map<string, { value: number; timestamp: number }>();
  private ttl = 3600000; // 1 hour
  
  async getOrCompute(
    key: string,
    compute: () => Promise<number>
  ): Promise<number> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.value;
    }
    
    const value = await compute();
    this.cache.set(key, { value, timestamp: Date.now() });
    
    return value;
  }
  
  invalidate(pattern?: string) {
    if (pattern) {
      // Invalidate matching keys
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all
      this.cache.clear();
    }
  }
}
```

### 2. Batch LLM Requests

Optimize LLM usage with request batching:

```typescript
class LLMBatcher {
  private queue: Array<{
    request: LLMRequest;
    resolve: (response: LLMResponse) => void;
    reject: (error: Error) => void;
  }> = [];
  
  private batchSize = 5;
  private batchDelay = 100; // ms
  private timer?: NodeJS.Timeout;
  
  constructor(private provider: LLMProvider) {}
  
  async request(request: LLMRequest): Promise<LLMResponse> {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      
      if (this.queue.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.processBatch(), this.batchDelay);
      }
    });
  }
  
  private async processBatch() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    
    const batch = this.queue.splice(0, this.batchSize);
    if (batch.length === 0) return;
    
    try {
      // Process in parallel
      const responses = await Promise.all(
        batch.map(({ request }) => this.provider.complete(request))
      );
      
      // Resolve individual promises
      batch.forEach(({ resolve }, index) => {
        resolve(responses[index]);
      });
    } catch (error) {
      // Reject all in batch
      batch.forEach(({ reject }) => reject(error));
    }
  }
}
```

### 3. Lazy Confidence Evaluation

Defer confidence calculations until needed:

```typescript
class LazyConfidenceValue<T> {
  private _confidence?: number;
  private confidenceComputer?: () => Promise<number>;
  
  constructor(
    public value: T,
    confidence?: number | (() => Promise<number>)
  ) {
    if (typeof confidence === 'number') {
      this._confidence = confidence;
    } else {
      this.confidenceComputer = confidence;
    }
  }
  
  async getConfidence(): Promise<number> {
    if (this._confidence === undefined && this.confidenceComputer) {
      this._confidence = await this.confidenceComputer();
    }
    return this._confidence ?? 0.5;
  }
  
  // Only compute if needed
  async requireMinConfidence(min: number): Promise<boolean> {
    const conf = await this.getConfidence();
    return conf >= min;
  }
}
```

## Testing Strategies

### 1. Confidence-Aware Testing

Test with confidence variations:

```typescript
import { MockLLMProvider } from '@prism/llm';
import { ConfidenceExtractor } from '@prism/confidence';

describe('ConfidenceAwareService', () => {
  let mockLLM: MockLLMProvider;
  let extractor: ConfidenceExtractor;
  
  beforeEach(() => {
    mockLLM = new MockLLMProvider();
    extractor = new ConfidenceExtractor();
  });
  
  it('should handle high confidence responses', async () => {
    mockLLM.setMockResponse('Definitive answer', 0.9);
    
    const result = await service.process('query');
    
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.requiresReview).toBe(false);
  });
  
  it('should flag low confidence for review', async () => {
    mockLLM.setMockResponse('Maybe, possibly...', 0.4);
    
    const result = await service.process('query');
    
    expect(result.confidence).toBeLessThan(0.5);
    expect(result.requiresReview).toBe(true);
  });
  
  it('should degrade gracefully with failures', async () => {
    mockLLM.setFailureRate(0.5);
    
    const results = await Promise.all(
      Array(10).fill(null).map(() => service.process('query'))
    );
    
    const successRate = results.filter(r => r.success).length / 10;
    expect(successRate).toBeGreaterThan(0.3);
  });
});
```

### 2. Property-Based Testing

Use property-based testing for confidence properties:

```typescript
import fc from 'fast-check';

describe('Confidence Properties', () => {
  it('confidence should always be between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.string(),
        async (input) => {
          const result = await extractor.extract(input);
          return result.value >= 0 && result.value <= 1;
        }
      )
    );
  });
  
  it('ensemble should preserve ordering', () => {
    fc.assert(
      fc.property(
        fc.array(fc.float({ min: 0, max: 1 })),
        async (confidences) => {
          const results = confidences.map(c => ({ value: c }));
          const combined = await ensemble.combine(results);
          
          const min = Math.min(...confidences);
          const max = Math.max(...confidences);
          
          return combined.value >= min && combined.value <= max;
        }
      )
    );
  });
});
```

### 3. Integration Testing

Test complete confidence pipelines:

```typescript
describe('Confidence Pipeline Integration', () => {
  it('should process end-to-end with calibration', async () => {
    // Setup
    const pipeline = new ConfidencePipeline()
      .addExtractor(new ConfidenceExtractor())
      .addCalibrator(new DomainCalibrator({ domain: 'test' }))
      .addValidator(new ConfidenceContractManager({
        'minimum': 0.6
      }));
    
    // Execute
    const result = await pipeline.process('test input');
    
    // Verify each stage
    expect(result.stages).toHaveLength(3);
    expect(result.stages[0].name).toBe('extraction');
    expect(result.stages[1].name).toBe('calibration');
    expect(result.stages[2].name).toBe('validation');
    
    // Verify final result
    expect(result.final.confidence).toBeGreaterThan(0.6);
  });
});
```

## Common Pitfalls to Avoid

### 1. Confidence Inflation

❌ **Don't artificially inflate confidence:**

```typescript
// Bad - arbitrary boost
const boostedConfidence = originalConfidence * 1.5;
```

✅ **Do use proper calibration:**

```typescript
// Good - domain-specific calibration
const calibrated = await calibrator.calibrate(
  { value: originalConfidence },
  'category',
  context
);
```

### 2. Ignoring Confidence Decay

❌ **Don't ignore temporal aspects:**

```typescript
// Bad - using stale confidence
const oldResult = cache.get('key'); // Could be hours old
return oldResult.confidence;
```

✅ **Do implement temporal decay:**

```typescript
// Good - apply temporal decay
const temporal = new TemporalConfidence(24, 'exponential');
const aged = temporal.apply(cachedResult, ageInHours);
return aged.value;
```

### 3. Sequential Confidence Loss

❌ **Don't chain operations naively:**

```typescript
// Bad - confidence degrades too quickly
let result = input;
for (const operation of operations) {
  result = await operation(result);
  // Each operation reduces confidence
}
```

✅ **Do use confidence budgets:**

```typescript
// Good - manage confidence budget
const budget = new ConfidenceBudgetManager(0.6);
for (const operation of operations) {
  const opResult = await operation(input);
  budget.add(operation.name, opResult.confidence);
  
  if (!budget.isWithinBudget()) {
    throw new Error('Confidence budget exceeded');
  }
}
```

### 4. Missing Error Context

❌ **Don't lose error context:**

```typescript
// Bad - generic error handling
try {
  return await llm.complete(request);
} catch (error) {
  console.error('LLM failed');
  throw error;
}
```

✅ **Do preserve full context:**

```typescript
// Good - rich error context
try {
  return await llm.complete(request);
} catch (error) {
  const context = {
    request: request.prompt,
    provider: llm.name,
    timestamp: new Date(),
    attemptNumber: attempts,
    previousErrors: errorHistory
  };
  
  logger.error('LLM request failed', { error, context });
  
  throw new EnhancedError('LLM request failed', {
    cause: error,
    context
  });
}
```

## Production Deployment

### 1. Environment Configuration

Use environment-specific confidence thresholds:

```typescript
// config/confidence.ts
export const confidenceConfig = {
  development: {
    thresholds: {
      critical: 0.7,
      high: 0.6,
      medium: 0.5,
      low: 0.3
    },
    enableDebugLogging: true
  },
  staging: {
    thresholds: {
      critical: 0.85,
      high: 0.75,
      medium: 0.65,
      low: 0.5
    },
    enableDebugLogging: true
  },
  production: {
    thresholds: {
      critical: 0.95,
      high: 0.85,
      medium: 0.7,
      low: 0.5
    },
    enableDebugLogging: false
  }
};
```

### 2. Monitoring and Alerting

Implement comprehensive monitoring:

```typescript
class ConfidenceMonitor {
  private metrics: MetricsCollector;
  
  constructor() {
    this.metrics = new MetricsCollector();
    this.setupAlerts();
  }
  
  async trackOperation(
    name: string,
    operation: () => Promise<ConfidenceValue<any>>
  ) {
    const start = Date.now();
    
    try {
      const result = await operation();
      
      // Track metrics
      this.metrics.record('confidence', result.confidence, {
        operation: name,
        success: true
      });
      
      this.metrics.record('latency', Date.now() - start, {
        operation: name
      });
      
      // Check for anomalies
      if (result.confidence < 0.3) {
        await this.alert('low_confidence', {
          operation: name,
          confidence: result.confidence
        });
      }
      
      return result;
    } catch (error) {
      this.metrics.record('error', 1, {
        operation: name,
        errorType: error.constructor.name
      });
      
      throw error;
    }
  }
  
  private setupAlerts() {
    // Alert on sustained low confidence
    this.metrics.createAlert('sustained_low_confidence', {
      condition: 'avg(confidence) < 0.5',
      window: '5m',
      threshold: 3
    });
    
    // Alert on error rate
    this.metrics.createAlert('high_error_rate', {
      condition: 'sum(error) > 10',
      window: '1m',
      threshold: 1
    });
  }
}
```

### 3. Graceful Degradation

Implement circuit breakers for external services:

```typescript
class ConfidentCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold = 5,
    private timeout = 60000,
    private confidenceThreshold = 0.5
  ) {}
  
  async execute<T>(
    operation: () => Promise<ConfidenceValue<T>>,
    fallback: () => T
  ): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        return fallback();
      }
    }
    
    try {
      const result = await operation();
      
      // Check confidence
      if (result.confidence < this.confidenceThreshold) {
        this.recordFailure();
        return fallback();
      }
      
      // Success - reset on half-open
      if (this.state === 'half-open') {
        this.reset();
      }
      
      return result.value;
    } catch (error) {
      this.recordFailure();
      return fallback();
    }
  }
  
  private recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.warn('Circuit breaker opened due to failures');
    }
  }
  
  private reset() {
    this.failures = 0;
    this.state = 'closed';
    console.info('Circuit breaker reset');
  }
}
```

### 4. A/B Testing with Confidence

Compare different confidence strategies:

```typescript
class ConfidenceExperiment {
  constructor(
    private variantA: ConfidenceStrategy,
    private variantB: ConfidenceStrategy,
    private allocation = 0.5
  ) {}
  
  async process(input: any): Promise<ExperimentResult> {
    const useVariantA = Math.random() < this.allocation;
    const variant = useVariantA ? 'A' : 'B';
    const strategy = useVariantA ? this.variantA : this.variantB;
    
    const start = Date.now();
    const result = await strategy.execute(input);
    const duration = Date.now() - start;
    
    // Track metrics
    await this.trackMetrics({
      variant,
      confidence: result.confidence,
      duration,
      success: result.confidence > 0.7
    });
    
    return {
      ...result,
      experiment: {
        variant,
        duration
      }
    };
  }
  
  async getResults(): Promise<ExperimentAnalysis> {
    const metricsA = await this.getVariantMetrics('A');
    const metricsB = await this.getVariantMetrics('B');
    
    return {
      variantA: {
        avgConfidence: metricsA.avgConfidence,
        successRate: metricsA.successRate,
        avgDuration: metricsA.avgDuration,
        sampleSize: metricsA.count
      },
      variantB: {
        avgConfidence: metricsB.avgConfidence,
        successRate: metricsB.successRate,
        avgDuration: metricsB.avgDuration,
        sampleSize: metricsB.count
      },
      recommendation: this.computeRecommendation(metricsA, metricsB)
    };
  }
}
```

## Summary

Following these best practices will help you build robust, maintainable, and performant Prism applications:

1. **Organize code** with clear separation between confidence management, LLM integration, and business logic
2. **Optimize performance** through caching, batching, and lazy evaluation
3. **Test thoroughly** with confidence-aware testing strategies
4. **Avoid common pitfalls** like confidence inflation and context loss
5. **Deploy carefully** with proper monitoring, graceful degradation, and experimentation

Remember that confidence is not just a number—it's a critical aspect of your application's behavior that requires careful design and management throughout the development lifecycle.