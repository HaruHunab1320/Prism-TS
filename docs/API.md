# Prism-TS API Reference

This document provides detailed API reference for Prism-TS language constructs and runtime components.

## Language Syntax

### Variables and Literals

#### Number Literals
```prism
42          // Integer
3.14159     // Float
-17         // Negative number
```

#### String Literals
```prism
"hello"           // Double quotes
"multi\nline"     // Escape sequences
"embedded " + var // String concatenation
```

#### Boolean Literals
```prism
true
false
```

### Confidence Expressions

#### Syntax
```prism
expression ~> confidence_value
```

#### Examples
```prism
// Literal confidence
measurement = 100 ~> 0.85

// Variable confidence
quality = 0.9
result = data ~> quality

// Expression confidence
sensor_avg = (sensor1 + sensor2) / 2 ~> 0.75
```

### Binary Operators

#### Arithmetic
- `+` - Addition (numbers) or concatenation (strings)
- `-` - Subtraction
- `*` - Multiplication  
- `/` - Division

#### Comparison
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal
- `<=` - Less than or equal
- `==` - Equal
- `!=` - Not equal

#### Logical
- `&&` - Logical AND
- `||` - Logical OR

### Unary Operators

- `-` - Numeric negation
- `!` - Logical NOT
- `~` - Confidence accessor

### Control Flow

#### If Statements
```prism
if (condition) {
  // then branch
} else {
  // else branch (optional)
}
```

#### Uncertain If Statements
```prism
uncertain if (confident_expression ~> threshold) {
  high { 
    // Execute when confidence >= 0.8
  }
  medium { 
    // Execute when 0.5 <= confidence < 0.8
  }
  low { 
    // Execute when confidence < 0.5
  }
}
```

### Context Management

#### Context Declaration
```prism
in context ContextName {
  // Isolated execution environment
  variable = value
  result = computation
}
```

#### Context Shifting
```prism
in context Source {
  data = "initial"
} -> Target  // Shift to Target context
```

### LLM Integration

#### Basic LLM Call
```prism
response = llm("Your prompt here")
```

#### Variable Prompts
```prism
topic = "machine learning"
explanation = llm("Explain " + topic)
```

#### Chained Calls
```prism
overview = llm("Overview of quantum computing")
details = llm("Based on: " + overview + " - explain challenges")
```

## Runtime API

### Value Types

#### NumberValue
```typescript
class NumberValue extends Value {
  constructor(value: number)
  value: number
  equals(other: Value): boolean
  isTruthy(): boolean
  toString(): string
}
```

#### StringValue
```typescript
class StringValue extends Value {
  constructor(value: string)
  value: string
  equals(other: Value): boolean
  isTruthy(): boolean
  toString(): string
}
```

#### BooleanValue
```typescript
class BooleanValue extends Value {
  constructor(value: boolean)
  value: boolean
  equals(other: Value): boolean
  isTruthy(): boolean
  toString(): string
}
```

#### ConfidenceValue
```typescript
class ConfidenceValue extends Value {
  constructor(value: Value, confidence: ConfidenceLib)
  value: Value
  confidence: ConfidenceLib
  equals(other: Value): boolean
  isTruthy(): boolean
  toString(): string
}
```

### Confidence System

#### ConfidenceLib
```typescript
class ConfidenceLib {
  constructor(value: number)  // 0.0 to 1.0
  
  readonly value: number
  readonly level: ConfidenceLevel
  
  equals(other: ConfidenceLib): boolean
  min(other: ConfidenceLib): ConfidenceLib
  toString(): string
}
```

#### ConfidenceLevel
```typescript
enum ConfidenceLevel {
  LOW = "low",      // < 0.5
  MEDIUM = "medium", // 0.5 - 0.8
  HIGH = "high"     // >= 0.8
}
```

### Runtime Classes

#### Runtime
```typescript
class Runtime {
  constructor()
  
  async execute(program: Program): Promise<Value>
  registerLLMProvider(name: string, provider: LLMProvider): void
  setDefaultLLMProvider(name: string): void
  getDefaultLLMProvider(): string | undefined
}
```

#### Interpreter
```typescript
class Interpreter {
  constructor()
  
  async interpret(node: ASTNode): Promise<Value>
  registerLLMProvider(name: string, provider: LLMProvider): void
  setDefaultLLMProvider(name: string): void
}
```

#### Environment
```typescript
class Environment {
  constructor(parent?: Environment)
  
  define(name: string, value: Value): void
  get(name: string): Value
  set(name: string, value: Value): void
  getAllVariables(): Map<string, Value>
}
```

### LLM Provider Interface

#### LLMProvider
```typescript
interface LLMProvider {
  readonly name: string
  complete(request: LLMRequest): Promise<LLMResponse>
}
```

#### LLMRequest
```typescript
class LLMRequest {
  constructor(prompt: string)
  
  readonly prompt: string
}
```

#### LLMResponse
```typescript
class LLMResponse {
  constructor(content: string, confidence: ConfidenceLib)
  
  readonly content: string
  readonly confidence: ConfidenceLib
}
```

### Built-in Providers

#### ClaudeProvider
```typescript
class ClaudeProvider implements LLMProvider {
  constructor(apiKey: string)
  name: string = "claude"
  
  async complete(request: LLMRequest): Promise<LLMResponse>
}
```

#### GeminiProvider
```typescript
class GeminiProvider implements LLMProvider {
  constructor(apiKey: string)
  name: string = "gemini"
  
  async complete(request: LLMRequest): Promise<LLMResponse>
}
```

#### MockLLMProvider
```typescript
class MockLLMProvider implements LLMProvider {
  constructor()
  name: string = "mock"
  
  async complete(request: LLMRequest): Promise<LLMResponse>
}
```

### Context Management

#### Context
```typescript
class Context {
  constructor(name: string)
  
  readonly name: string
  setVariable(key: string, value: Value): void
  getVariable(key: string): Value | undefined
  getAllVariables(): Map<string, Value>
}
```

#### ContextManager
```typescript
class ContextManager {
  constructor()
  
  registerContext(context: Context): void
  enterContext(name: string): void
  exitContext(): void
  switchContext(name: string): void
  getCurrentContext(): Context | undefined
}
```

### Error Types

#### RuntimeError
```typescript
class RuntimeError extends Error {
  constructor(message: string, node?: ASTNode)
  
  readonly name: string = "RuntimeError"
  readonly node?: ASTNode
}
```

#### ParseError
```typescript
class ParseError extends Error {
  constructor(message: string, token?: Token)
  
  readonly name: string = "ParseError"
  readonly token?: Token
}
```

#### LexError
```typescript
class LexError extends Error {
  constructor(message: string, position: number)
  
  readonly name: string = "LexError"
  readonly position: number
}
```

## Configuration

### Environment Variables

```env
# Required for real LLM integration
GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: Default provider selection
PRISM_DEFAULT_PROVIDER=gemini
```

### LLM Configuration

#### Automatic Configuration
```typescript
import { LLMConfigManager } from './src/llm';

// Create providers from environment
const providers = LLMConfigManager.createFromEnvironment();
const defaultProvider = LLMConfigManager.getDefaultProvider();

// Register with runtime
for (const [name, provider] of Object.entries(providers)) {
  runtime.registerLLMProvider(name, provider);
}
runtime.setDefaultLLMProvider(defaultProvider);
```

#### Manual Configuration
```typescript
import { ClaudeProvider, GeminiProvider } from './src/llm';

// Create providers manually
const claude = new ClaudeProvider('your-api-key');
const gemini = new GeminiProvider('your-api-key');

// Register with runtime
runtime.registerLLMProvider('claude', claude);
runtime.registerLLMProvider('gemini', gemini);
runtime.setDefaultLLMProvider('gemini');
```

## Usage Examples

### Basic Runtime Usage
```typescript
import { createRuntime } from './src/core/runtime';
import { parseProgram } from './src/core/parser';

const runtime = createRuntime();
const source = 'result = 42 ~> 0.85';
const program = parseProgram(source);
const value = await runtime.execute(program);

console.log(value.toString()); // "42 (~85.0%)"
```

### REPL Integration
```typescript
import { PrismREPL } from './src/repl';

const repl = new PrismREPL();

// Configure LLM providers
repl.registerLLMProvider('gemini', new GeminiProvider(apiKey));
repl.setDefaultLLMProvider('gemini');

// Evaluate code
const result = await repl.evaluate('response = llm("Hello!")');
console.log(result.value);
```

### Custom LLM Provider
```typescript
class CustomLLMProvider implements LLMProvider {
  name = "custom";
  
  async complete(request: LLMRequest): Promise<LLMResponse> {
    // Your custom implementation
    const content = await callYourAPI(request.prompt);
    const confidence = new ConfidenceLib(0.8);
    return new LLMResponse(content, confidence);
  }
}
```

This API reference covers all major components and interfaces in Prism-TS. For implementation details and examples, see the source code and test files.