# TypeScript Integration Guide

This guide shows how to use Prism in your TypeScript/JavaScript projects via the `prism-uncertainty` npm package.

## Installation

```bash
npm install prism-uncertainty
```

Or with yarn:
```bash
yarn add prism-uncertainty
```

## Basic Usage

### Import the Package

```typescript
import { Prism, runPrism } from 'prism-uncertainty';
```

### Create a Prism Instance

```typescript
const prism = new Prism({
  geminiApiKey: 'your-api-key',    // Optional: defaults to GEMINI_API_KEY env var
  anthropicApiKey: 'your-api-key'  // Optional: defaults to ANTHROPIC_API_KEY env var
});
```

### Execute Prism Code

```typescript
async function analyzeData() {
  const result = await prism.execute(`
    data = [75, 82, 90, 68, 95]
    average = (75 + 82 + 90 + 68 + 95) / 5
    quality = average ~> 0.85
    
    analysis = llm("Analyze this data quality: " + quality)
    decision = analysis ~@> "approve" ~?? "review"
    
    decision
  `);
  
  console.log(result); // ConfidenceValue or regular value
}
```

## TypeScript Types

The package exports several useful types:

```typescript
import { 
  Prism,
  PrismOptions,
  ConfidenceValue,
  Value,
  NumberValue,
  StringValue,
  BooleanValue
} from 'prism-uncertainty';

// Type-safe options
const options: PrismOptions = {
  geminiApiKey: process.env.GEMINI_API_KEY
};

// Working with results
const result = await prism.execute('42 ~> 0.9');
if (result instanceof ConfidenceValue) {
  console.log('Value:', result.value);
  console.log('Confidence:', result.confidence);
}
```

## Advanced Integration Patterns

### 1. Wrapper Functions

Create type-safe wrapper functions for common operations:

```typescript
interface AnalysisResult {
  decision: string;
  confidence: number;
  reasoning?: string;
}

async function analyzeWithConfidence(
  data: string,
  threshold: number = 0.8
): Promise<AnalysisResult> {
  const prism = new Prism();
  
  const code = `
    analysis = llm("Analyze: ${data}")
    confidence = <~ analysis
    
    uncertain if (analysis ~> ${threshold}) {
      high { 
        decision = "approved"
        reasoning = "High confidence analysis"
      }
      medium { 
        decision = "review"
        reasoning = "Medium confidence - manual review needed"
      }
      low { 
        decision = "rejected"
        reasoning = "Low confidence - insufficient data"
      }
    }
    
    decision + "|" + confidence + "|" + reasoning
  `;
  
  const result = await prism.execute(code);
  const [decision, conf, reasoning] = result.toString().split('|');
  
  return {
    decision,
    confidence: parseFloat(conf),
    reasoning
  };
}
```

### 2. Model Ensemble Pattern

```typescript
interface ModelResponse {
  model: string;
  response: string;
  confidence: number;
}

async function runModelEnsemble(
  prompt: string,
  models: string[] = ['gpt', 'claude', 'gemini']
): Promise<ModelResponse> {
  const prism = new Prism();
  
  const modelCalls = models
    .map(model => `${model}_result = llm("${prompt} [via ${model}]")`)
    .join('\n');
  
  const parallelOp = models
    .map(model => `${model}_result`)
    .join(' ~||> ');
  
  const code = `
    ${modelCalls}
    best = ${parallelOp}
    conf = <~ best
    best + "|" + conf
  `;
  
  const result = await prism.execute(code);
  const [response, confidence] = result.toString().split('|');
  
  // Determine which model was selected based on confidence
  const selectedModel = models[0]; // Simplified - in practice, track this
  
  return {
    model: selectedModel,
    response,
    confidence: parseFloat(confidence)
  };
}
```

### 3. React Integration

```typescript
import { useState, useEffect } from 'react';
import { Prism } from 'prism-uncertainty';

function usePrism(code: string, deps: any[] = []) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const execute = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const prism = new Prism();
        const output = await prism.execute(code);
        setResult(output);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    execute();
  }, deps);
  
  return { result, loading, error };
}

// Usage in component
function ConfidenceAnalyzer({ data }: { data: string }) {
  const { result, loading, error } = usePrism(`
    analysis = llm("Analyze: ${data}")
    confidence = <~ analysis
    uncertain if (analysis ~> 0.8) {
      high { "High confidence: " + analysis }
      medium { "Medium confidence: " + analysis }
      low { "Low confidence: " + analysis }
    }
  `, [data]);
  
  if (loading) return <div>Analyzing...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{result?.toString()}</div>;
}
```

### 4. Express.js API Endpoint

```typescript
import express from 'express';
import { Prism } from 'prism-uncertainty';

const app = express();
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  const { code, options } = req.body;
  
  try {
    const prism = new Prism(options);
    const result = await prism.execute(code);
    
    res.json({
      success: true,
      result: result.toString(),
      type: result.constructor.name,
      confidence: result instanceof ConfidenceValue 
        ? result.confidence.toString() 
        : null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});
```

### 5. Testing with Jest

```typescript
import { Prism, runPrism } from 'prism-uncertainty';

describe('Prism Integration', () => {
  let prism: Prism;
  
  beforeEach(() => {
    prism = new Prism();
  });
  
  test('confidence assignment works', async () => {
    const result = await prism.execute('42 ~> 0.9');
    expect(result.toString()).toContain('42');
    expect(result.toString()).toContain('90.0%');
  });
  
  test('parallel confidence selects highest', async () => {
    const result = await runPrism(`
      low = "option1" ~> 0.6
      high = "option2" ~> 0.9
      best = low ~||> high
      best
    `);
    
    expect(result.toString()).toContain('option2');
  });
  
  test('threshold gate executes conditionally', async () => {
    const result = await prism.execute(`
      confident = "proceed" ~> 0.8
      action = confident ~@> "executed"
      action
    `);
    
    expect(result.toString()).toBe('executed');
  });
});
```

## Configuration

### Environment Variables

```typescript
// .env file
GEMINI_API_KEY=your-gemini-key
ANTHROPIC_API_KEY=your-anthropic-key

// TypeScript code
import { config } from 'dotenv';
config();

const prism = new Prism(); // Automatically uses env vars
```

### Custom Configuration

```typescript
interface AppConfig {
  prism: {
    defaultConfidenceThreshold: number;
    llmProvider: 'gemini' | 'anthropic';
    apiKeys: {
      gemini?: string;
      anthropic?: string;
    };
  };
}

const config: AppConfig = {
  prism: {
    defaultConfidenceThreshold: 0.7,
    llmProvider: 'gemini',
    apiKeys: {
      gemini: process.env.GEMINI_API_KEY
    }
  }
};

const prism = new Prism(config.prism.apiKeys);
```

## Error Handling

```typescript
try {
  const result = await prism.execute(userProvidedCode);
  // Handle success
} catch (error) {
  if (error.name === 'ParseError') {
    console.error('Syntax error in Prism code:', error.message);
  } else if (error.name === 'RuntimeError') {
    console.error('Runtime error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Best Practices

1. **Always Handle Async Operations**
   ```typescript
   // Good
   const result = await prism.execute(code);
   
   // Also good
   prism.execute(code).then(result => {
     // Handle result
   }).catch(error => {
     // Handle error
   });
   ```

2. **Validate User Input**
   ```typescript
   function sanitizePrismCode(code: string): string {
     // Remove potentially harmful patterns
     return code.replace(/\bimport\b|\brequire\b/g, '');
   }
   ```

3. **Cache Prism Instances**
   ```typescript
   let prismInstance: Prism;
   
   function getPrism(): Prism {
     if (!prismInstance) {
       prismInstance = new Prism();
     }
     return prismInstance;
   }
   ```

4. **Type Guards for Results**
   ```typescript
   import { ConfidenceValue, NumberValue } from 'prism-uncertainty';
   
   function isConfidentNumber(value: any): value is ConfidenceValue {
     return value instanceof ConfidenceValue && 
            value.value instanceof NumberValue;
   }
   ```

## Deployment

### Vercel/Next.js

```typescript
// pages/api/prism.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { runPrism } from 'prism-uncertainty';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code } = req.body;
  
  try {
    const result = await runPrism(code);
    res.status(200).json({ result: result.toString() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

### AWS Lambda

```typescript
import { APIGatewayProxyHandler } from 'aws-lambda';
import { runPrism } from 'prism-uncertainty';

export const handler: APIGatewayProxyHandler = async (event) => {
  const { code } = JSON.parse(event.body || '{}');
  
  try {
    const result = await runPrism(code);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        result: result.toString()
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};
```

## Troubleshooting

### Common Issues

1. **Module Resolution**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "moduleResolution": "node",
       "esModuleInterop": true
     }
   }
   ```

2. **API Key Issues**
   ```typescript
   // Debug API key loading
   console.log('Keys loaded:', {
     gemini: !!process.env.GEMINI_API_KEY,
     anthropic: !!process.env.ANTHROPIC_API_KEY
   });
   ```

3. **Async/Await in Top Level**
   ```typescript
   // Wrap in async function
   (async () => {
     const result = await runPrism('42 ~> 0.9');
     console.log(result);
   })();
   ```

## Support

- GitHub Issues: [Report bugs](https://github.com/HaruHunab1320/Prism-TS/issues)
- Documentation: [Full docs](https://github.com/HaruHunab1320/Prism-TS/docs)
- NPM Package: [prism-uncertainty](https://www.npmjs.com/package/prism-uncertainty)