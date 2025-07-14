---
sidebar_position: 3
title: Error Handling
---

# Error Handling

Prism provides comprehensive error handling mechanisms for dealing with both deterministic and probabilistic errors. This guide covers error handling patterns, working with uncertain results, and implementing robust fallback strategies.

## Error Types

### Runtime Errors

Prism's runtime throws structured errors with location information:

```typescript
// RuntimeError - General runtime errors
try {
  const result = prism.evaluate('unknownVariable + 1');
} catch (error) {
  if (error instanceof RuntimeError) {
    console.error(`Error at line ${error.line}, column ${error.column}: ${error.message}`);
  }
}
```

### LLM Errors

When working with LLM providers, handle specific error types:

```typescript
import { LLMError } from '@prism/llm';

try {
  const response = await llm.complete(request);
} catch (error) {
  if (error instanceof LLMError) {
    switch (error.code) {
      case 'TIMEOUT':
        console.error('Request timed out');
        break;
      case 'HTTP_429':
        console.error('Rate limit exceeded');
        break;
      case 'MISSING_API_KEY':
        console.error('API key not configured');
        break;
      default:
        console.error(`LLM Error: ${error.message}`);
    }
  }
}
```

### Confidence-Related Errors

Handle uncertainty explicitly in your error handling:

```typescript
import { ConfidenceValue } from '@prism/core';

function processResult(result: ConfidenceValue<string>) {
  if (result.confidence < 0.5) {
    throw new Error(`Low confidence result: ${result.confidence}`);
  }
  
  if (result.confidence < 0.7) {
    console.warn(`Medium confidence: ${result.confidence}. Result may be unreliable.`);
  }
  
  return result.value;
}
```

## Error Handling Patterns

### 1. Try-Catch with Confidence

Wrap uncertain operations with confidence-aware error handling:

```typescript
import { prism } from '@prism/core';

async function safeEvaluate(expression: string) {
  try {
    const result = await prism.evaluate(expression);
    
    // Check confidence before using result
    if (result.confidence < 0.6) {
      return {
        success: false,
        error: 'Low confidence result',
        confidence: result.confidence,
        fallback: true
      };
    }
    
    return {
      success: true,
      value: result.value,
      confidence: result.confidence
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      confidence: 0,
      fallback: true
    };
  }
}
```

### 2. Fallback Chains

Implement fallback strategies for uncertain operations:

```typescript
async function robustQuery(query: string) {
  const strategies = [
    // Strategy 1: Primary LLM with high temperature
    async () => {
      const result = await primaryLLM.complete(query, { temperature: 0.3 });
      if (result.confidence >= 0.8) return result;
      throw new Error('Confidence too low');
    },
    
    // Strategy 2: Secondary LLM with different prompt
    async () => {
      const enhancedQuery = `Please provide a detailed answer: ${query}`;
      const result = await secondaryLLM.complete(enhancedQuery);
      if (result.confidence >= 0.7) return result;
      throw new Error('Confidence still too low');
    },
    
    // Strategy 3: Ensemble approach
    async () => {
      const results = await Promise.all([
        llm1.complete(query),
        llm2.complete(query),
        llm3.complete(query)
      ]);
      
      // Use highest confidence result
      return results.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
    },
    
    // Strategy 4: Default fallback
    async () => ({
      content: 'Unable to provide a confident answer',
      confidence: 0.1
    })
  ];
  
  for (const strategy of strategies) {
    try {
      return await strategy();
    } catch (error) {
      continue; // Try next strategy
    }
  }
}
```

### 3. Uncertain Control Flow

Handle errors in uncertain control flow:

```prism
// Prism code with uncertain control flow
uncertain if (condition) {
  // This might execute based on confidence
  riskyOperation()
} else {
  // Fallback path
  safeOperation()
}
```

```typescript
// TypeScript handler
try {
  const result = prism.evaluate(`
    uncertain if (dataQuality > 0.8) {
      processHighQualityData()
    } else {
      requestManualReview()
    }
  `);
  
  // Check which path was taken
  if (result.metadata?.pathTaken === 'uncertain') {
    console.log('Uncertain path taken with confidence:', result.confidence);
  }
} catch (error) {
  // Handle complete failure
  console.error('Control flow failed:', error);
}
```

### 4. Error Recovery with Confidence

Implement confidence-based error recovery:

```typescript
class ConfidentProcessor {
  private confidenceBudget = 1.0;
  private minConfidence = 0.6;
  
  async process(tasks: Task[]) {
    const results = [];
    
    for (const task of tasks) {
      try {
        const result = await this.executeTask(task);
        
        // Update confidence budget
        this.confidenceBudget *= result.confidence;
        
        if (this.confidenceBudget < this.minConfidence) {
          throw new Error('Confidence budget exhausted');
        }
        
        results.push(result);
      } catch (error) {
        // Try recovery strategies
        const recovered = await this.recover(task, error);
        if (recovered) {
          results.push(recovered);
        } else {
          // Log and continue with degraded confidence
          console.error(`Task ${task.id} failed:`, error);
          this.confidenceBudget *= 0.8; // Penalty for failure
        }
      }
    }
    
    return {
      results,
      finalConfidence: this.confidenceBudget,
      reliable: this.confidenceBudget >= this.minConfidence
    };
  }
  
  private async recover(task: Task, error: Error) {
    // Try simpler version of task
    if (task.complexity === 'high') {
      const simplifiedTask = { ...task, complexity: 'low' };
      return this.executeTask(simplifiedTask);
    }
    
    // Try with relaxed constraints
    if (task.constraints) {
      const relaxedTask = { ...task, constraints: this.relaxConstraints(task.constraints) };
      return this.executeTask(relaxedTask);
    }
    
    return null;
  }
}
```

## Working with Uncertain Results

### Confidence Thresholds

Define and enforce confidence thresholds:

```typescript
interface ConfidenceThresholds {
  critical: number;    // 0.95 - Financial transactions, medical decisions
  high: number;        // 0.85 - Important business logic
  medium: number;      // 0.70 - Standard operations
  low: number;         // 0.50 - Experimental features
}

class ThresholdManager {
  private thresholds: ConfidenceThresholds = {
    critical: 0.95,
    high: 0.85,
    medium: 0.70,
    low: 0.50
  };
  
  validateResult<T>(
    result: ConfidenceValue<T>, 
    requiredLevel: keyof ConfidenceThresholds
  ): T {
    const threshold = this.thresholds[requiredLevel];
    
    if (result.confidence < threshold) {
      throw new Error(
        `Confidence ${result.confidence} below required ${threshold} for ${requiredLevel} operation`
      );
    }
    
    return result.value;
  }
  
  async executeWithThreshold<T>(
    operation: () => Promise<ConfidenceValue<T>>,
    level: keyof ConfidenceThresholds,
    fallback?: T
  ): Promise<T> {
    try {
      const result = await operation();
      return this.validateResult(result, level);
    } catch (error) {
      if (fallback !== undefined) {
        console.warn(`Using fallback value due to: ${error.message}`);
        return fallback;
      }
      throw error;
    }
  }
}
```

### Confidence Propagation

Track how errors affect confidence through operations:

```typescript
class ConfidencePropagator {
  private confidenceHistory: number[] = [];
  
  async executeChain(operations: Array<() => Promise<ConfidenceValue<any>>>) {
    let cumulativeConfidence = 1.0;
    const results = [];
    
    for (const [index, operation] of operations.entries()) {
      try {
        const result = await operation();
        
        // Propagate confidence
        cumulativeConfidence *= result.confidence;
        this.confidenceHistory.push(cumulativeConfidence);
        
        // Check if confidence is too low to continue
        if (cumulativeConfidence < 0.3) {
          throw new Error(`Confidence degraded to ${cumulativeConfidence} at step ${index}`);
        }
        
        results.push({
          ...result,
          cumulativeConfidence
        });
      } catch (error) {
        // Analyze confidence history to determine best recovery point
        const recoveryPoint = this.findRecoveryPoint();
        
        if (recoveryPoint >= 0) {
          console.log(`Recovering from step ${recoveryPoint}`);
          // Retry from recovery point
          return this.executeChainFrom(operations, recoveryPoint);
        }
        
        throw error;
      }
    }
    
    return {
      results,
      finalConfidence: cumulativeConfidence,
      history: this.confidenceHistory
    };
  }
  
  private findRecoveryPoint(): number {
    // Find last point where confidence was above 0.7
    for (let i = this.confidenceHistory.length - 1; i >= 0; i--) {
      if (this.confidenceHistory[i] > 0.7) {
        return i;
      }
    }
    return -1;
  }
}
```

## Debugging Techniques

### 1. Confidence Logging

Implement comprehensive confidence logging:

```typescript
class ConfidenceLogger {
  private logs: Array<{
    timestamp: Date;
    operation: string;
    confidence: number;
    details: any;
  }> = [];
  
  log(operation: string, result: ConfidenceValue<any>, details?: any) {
    const entry = {
      timestamp: new Date(),
      operation,
      confidence: result.confidence,
      details: {
        ...details,
        value: result.value,
        metadata: result.metadata
      }
    };
    
    this.logs.push(entry);
    
    // Console output for debugging
    if (result.confidence < 0.5) {
      console.warn(`Low confidence in ${operation}:`, entry);
    } else if (result.confidence < 0.7) {
      console.info(`Medium confidence in ${operation}:`, entry);
    }
  }
  
  analyze() {
    const avgConfidence = this.logs.reduce((sum, log) => sum + log.confidence, 0) / this.logs.length;
    const lowConfidenceOps = this.logs.filter(log => log.confidence < 0.5);
    
    return {
      totalOperations: this.logs.length,
      averageConfidence: avgConfidence,
      lowConfidenceCount: lowConfidenceOps.length,
      lowConfidenceOperations: lowConfidenceOps.map(op => op.operation),
      confidenceDistribution: this.getDistribution()
    };
  }
  
  private getDistribution() {
    const ranges = { high: 0, medium: 0, low: 0, veryLow: 0 };
    
    this.logs.forEach(log => {
      if (log.confidence >= 0.8) ranges.high++;
      else if (log.confidence >= 0.6) ranges.medium++;
      else if (log.confidence >= 0.4) ranges.low++;
      else ranges.veryLow++;
    });
    
    return ranges;
  }
}
```

### 2. Error Context Tracking

Track context for better error diagnosis:

```typescript
class ErrorContextTracker {
  private context: Map<string, any> = new Map();
  
  setContext(key: string, value: any) {
    this.context.set(key, value);
  }
  
  async executeWithContext<T>(
    operation: () => Promise<T>,
    contextData: Record<string, any>
  ): Promise<T> {
    // Store current context
    const previousContext = new Map(this.context);
    
    // Add new context
    Object.entries(contextData).forEach(([key, value]) => {
      this.context.set(key, value);
    });
    
    try {
      return await operation();
    } catch (error) {
      // Enhance error with context
      const enhancedError = new Error(error.message);
      enhancedError['context'] = Object.fromEntries(this.context);
      enhancedError['stack'] = error.stack;
      
      // Log detailed error information
      console.error('Error with context:', {
        message: error.message,
        context: enhancedError['context'],
        timestamp: new Date().toISOString()
      });
      
      throw enhancedError;
    } finally {
      // Restore previous context
      this.context = previousContext;
    }
  }
}
```

### 3. Confidence Visualization

Debug confidence flow through your application:

```typescript
class ConfidenceVisualizer {
  private trace: Array<{
    step: string;
    confidence: number;
    timestamp: number;
  }> = [];
  
  record(step: string, confidence: number) {
    this.trace.push({
      step,
      confidence,
      timestamp: Date.now()
    });
  }
  
  visualize() {
    console.log('\nConfidence Flow Visualization:');
    console.log('==============================');
    
    let maxStepLength = Math.max(...this.trace.map(t => t.step.length));
    
    this.trace.forEach((entry, index) => {
      const bar = '█'.repeat(Math.round(entry.confidence * 20));
      const spaces = ' '.repeat(maxStepLength - entry.step.length);
      const indicator = this.getIndicator(entry.confidence);
      
      console.log(
        `${entry.step}${spaces} ${indicator} ${bar} ${(entry.confidence * 100).toFixed(1)}%`
      );
      
      if (index < this.trace.length - 1) {
        const nextConfidence = this.trace[index + 1].confidence;
        const delta = nextConfidence - entry.confidence;
        if (Math.abs(delta) > 0.1) {
          console.log(`${''.padStart(maxStepLength + 1)}${delta > 0 ? '↑' : '↓'} ${(delta * 100).toFixed(1)}%`);
        }
      }
    });
    
    console.log('==============================\n');
  }
  
  private getIndicator(confidence: number): string {
    if (confidence >= 0.8) return '✓';
    if (confidence >= 0.6) return '~';
    if (confidence >= 0.4) return '?';
    return '✗';
  }
}
```

## Best Practices

### 1. Always Handle Low Confidence

```typescript
async function safeOperation<T>(
  operation: () => Promise<ConfidenceValue<T>>,
  options: {
    minConfidence?: number;
    onLowConfidence?: (confidence: number) => void;
    fallback?: T;
  } = {}
): Promise<T> {
  const { minConfidence = 0.7, onLowConfidence, fallback } = options;
  
  try {
    const result = await operation();
    
    if (result.confidence < minConfidence) {
      onLowConfidence?.(result.confidence);
      
      if (fallback !== undefined) {
        return fallback;
      }
      
      throw new Error(`Confidence ${result.confidence} below minimum ${minConfidence}`);
    }
    
    return result.value;
  } catch (error) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}
```

### 2. Chain Error Handlers

```typescript
class ErrorChain {
  private handlers: Array<(error: Error) => Promise<boolean>> = [];
  
  addHandler(handler: (error: Error) => Promise<boolean>) {
    this.handlers.push(handler);
    return this;
  }
  
  async handle(error: Error): Promise<void> {
    for (const handler of this.handlers) {
      try {
        const handled = await handler(error);
        if (handled) return;
      } catch (handlerError) {
        console.error('Handler failed:', handlerError);
      }
    }
    
    // No handler could handle the error
    throw error;
  }
}

// Usage
const errorChain = new ErrorChain()
  .addHandler(async (error) => {
    if (error.message.includes('timeout')) {
      console.log('Retrying after timeout...');
      return true;
    }
    return false;
  })
  .addHandler(async (error) => {
    if (error.message.includes('confidence')) {
      console.log('Falling back due to low confidence...');
      return true;
    }
    return false;
  });
```

### 3. Test Error Scenarios

```typescript
import { MockLLMProvider } from '@prism/llm';

describe('Error Handling', () => {
  it('should handle low confidence gracefully', async () => {
    const mock = new MockLLMProvider();
    mock.setMockResponse('uncertain answer', 0.3);
    
    const result = await safeOperation(
      () => mock.complete('question'),
      { minConfidence: 0.5, fallback: 'default answer' }
    );
    
    expect(result).toBe('default answer');
  });
  
  it('should retry on failure', async () => {
    const mock = new MockLLMProvider();
    mock.setFailureRate(0.5); // 50% failure rate
    
    let attempts = 0;
    const result = await retry(
      async () => {
        attempts++;
        return mock.complete('question');
      },
      { maxAttempts: 3 }
    );
    
    expect(attempts).toBeGreaterThan(1);
    expect(result).toBeDefined();
  });
});
```

## Summary

Effective error handling in Prism requires:

1. **Understanding confidence**: Treat confidence as a first-class concern in error handling
2. **Graceful degradation**: Implement fallback strategies for low-confidence scenarios
3. **Context preservation**: Track and log context for better debugging
4. **Threshold management**: Define and enforce appropriate confidence thresholds
5. **Recovery strategies**: Implement smart recovery based on confidence history

By following these patterns, you can build robust applications that handle uncertainty gracefully and provide reliable results even in the face of errors.