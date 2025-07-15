---
sidebar_position: 2
title: Configuration API
---

# LLM Configuration API

The Configuration API provides tools for managing LLM provider settings, API keys, and runtime options.

## Overview

The configuration system offers:
- Environment-based configuration
- API key management
- Provider auto-detection
- Configuration validation
- Status monitoring

## LLMConfigManager

Central configuration management class.

### Static Methods

#### getApiKey()

```typescript
static getApiKey(provider: 'claude' | 'gemini'): string | undefined
```

Retrieve API key from environment variables.

**Parameters:**
- `provider`: Provider name

**Returns:** API key or undefined

**Environment Variables:**
- Claude: `CLAUDE_API_KEY` or `ANTHROPIC_API_KEY`
- Gemini: `GEMINI_API_KEY` or `GOOGLE_API_KEY`

**Example:**
```typescript
import { LLMConfigManager } from '@prism-lang/llm';

const claudeKey = LLMConfigManager.getApiKey('claude');
if (!claudeKey) {
  console.log('Claude API key not found');
}
```

#### createProvider()

```typescript
static createProvider(config: LLMProviderConfig): LLMProvider
```

Create a provider instance from configuration.

**Parameters:**
- `config`: Provider configuration object

**Returns:** Configured LLMProvider instance

**Example:**
```typescript
const provider = LLMConfigManager.createProvider({
  type: 'claude',
  apiKey: 'sk-ant-...', // Optional, uses env if not provided
  model: 'claude-3-opus-20240229',
  timeout: 60000
});
```

#### createFromEnvironment()

```typescript
static createFromEnvironment(): Record<string, LLMProvider>
```

Create all available providers from environment.

**Returns:** Map of provider name to instance

**Example:**
```typescript
const providers = LLMConfigManager.createFromEnvironment();
// Returns: { mock: MockProvider, claude?: ClaudeProvider, gemini?: GeminiProvider }

for (const [name, provider] of Object.entries(providers)) {
  console.log(`${name}: ${provider.name}`);
}
```

#### getDefaultProvider()

```typescript
static getDefaultProvider(): string
```

Determine default provider based on available API keys.

**Priority Order:**
1. Claude (if API key available)
2. Gemini (if API key available)
3. Mock (always available)

**Example:**
```typescript
const defaultName = LLMConfigManager.getDefaultProvider();
console.log(`Default provider: ${defaultName}`);
```

#### validateConfig()

```typescript
static validateConfig(config: LLMProviderConfig): string[]
```

Validate provider configuration.

**Parameters:**
- `config`: Configuration to validate

**Returns:** Array of error messages (empty if valid)

**Example:**
```typescript
const config = {
  type: 'claude',
  timeout: -1 // Invalid!
};

const errors = LLMConfigManager.validateConfig(config);
if (errors.length > 0) {
  console.error('Configuration errors:', errors);
}
// Output: ['Timeout must be a positive number']
```

#### validateApiKey()

```typescript
static validateApiKey(
  provider: 'claude' | 'gemini',
  apiKey: string
): boolean
```

Validate API key format.

**Parameters:**
- `provider`: Provider type
- `apiKey`: API key to validate

**Returns:** true if format is valid

**Validation Rules:**
- Claude: Must start with `sk-ant-` and be > 20 characters
- Gemini: Must start with `AIza` and be exactly 39 characters

**Example:**
```typescript
const isValid = LLMConfigManager.validateApiKey(
  'claude',
  'sk-ant-api03-abc123...'
);
console.log(isValid); // true
```

#### getConfigStatus()

```typescript
static getConfigStatus(): {
  provider: string;
  status: string;
  details?: string;
}[]
```

Get configuration status for all providers.

**Returns:** Array of provider status objects

**Example:**
```typescript
const status = LLMConfigManager.getConfigStatus();
status.forEach(s => {
  console.log(`${s.provider}: ${s.status}`);
  if (s.details) console.log(`  ${s.details}`);
});

// Output:
// claude: ✅ Valid
// gemini: ❌ Missing
//   Set GEMINI_API_KEY or GOOGLE_API_KEY
// mock: ✅ Available
//   Testing provider (always available)
```

#### getAvailableProviders()

```typescript
static getAvailableProviders(): string[]
```

List providers with valid configuration.

**Returns:** Array of available provider names

**Example:**
```typescript
const available = LLMConfigManager.getAvailableProviders();
console.log('Available:', available.join(', '));
// Output: "Available: mock, claude"
```

#### showConfigHelp()

```typescript
static showConfigHelp(): string
```

Generate comprehensive configuration help text.

**Returns:** Formatted help string

**Example:**
```typescript
console.log(LLMConfigManager.showConfigHelp());
// Displays configuration guide with current status
```

## Configuration Types

### LLMProviderConfig

```typescript
interface LLMProviderConfig {
  type: 'claude' | 'gemini' | 'mock';
  apiKey?: string;      // Uses environment if not provided
  model?: string;       // Provider-specific default
  baseUrl?: string;     // API endpoint override
  timeout?: number;     // Request timeout (ms)
  [key: string]: unknown; // Provider-specific options
}
```

### Provider-Specific Options

#### Claude Configuration

```typescript
const claudeConfig: LLMProviderConfig = {
  type: 'claude',
  model: 'claude-3-opus-20240229',
  timeout: 60000,
  apiVersion: '2023-06-01',
  maxRetries: 3
};
```

#### Gemini Configuration

```typescript
const geminiConfig: LLMProviderConfig = {
  type: 'gemini',
  model: 'gemini-1.5-pro',
  timeout: 30000,
  apiVersion: 'v1beta'
};
```

## Environment Setup

### Using Environment Variables

```bash
# Direct export
export CLAUDE_API_KEY="sk-ant-api03-..."
export GEMINI_API_KEY="AIzaSy..."

# Or in shell profile
echo 'export CLAUDE_API_KEY="sk-ant-api03-..."' >> ~/.bashrc
```

### Using .env File

1. Create `.env` file in project root:
```env
# .env
CLAUDE_API_KEY=sk-ant-api03-...
GEMINI_API_KEY=AIzaSy...
```

2. The configuration manager automatically loads from `.env`

### Security Best Practices

1. **Never commit API keys**
   ```gitignore
   # .gitignore
   .env
   .env.local
   .env.*.local
   ```

2. **Use environment-specific files**
   ```bash
   .env              # Default
   .env.local        # Local overrides
   .env.production   # Production settings
   ```

3. **Validate keys on startup**
   ```typescript
   const status = LLMConfigManager.getConfigStatus();
   const invalid = status.filter(s => s.status.includes('Invalid'));
   if (invalid.length > 0) {
     console.warn('Invalid API keys detected');
   }
   ```

## Usage Patterns

### Basic Setup

```typescript
import { LLMConfigManager, LLMProviderRegistry } from '@prism-lang/llm';

// Create registry with all available providers
const registry = new LLMProviderRegistry();
const providers = LLMConfigManager.createFromEnvironment();

for (const [name, provider] of Object.entries(providers)) {
  registry.register(name, provider);
}

// Set default
registry.setDefault(LLMConfigManager.getDefaultProvider());
```

### Manual Configuration

```typescript
// Override environment settings
const customProvider = LLMConfigManager.createProvider({
  type: 'claude',
  apiKey: 'sk-ant-custom-key',
  model: 'claude-3-haiku-20240307',
  timeout: 15000
});
```

### Configuration Validation

```typescript
function validateSetup(): boolean {
  const available = LLMConfigManager.getAvailableProviders();
  
  if (available.length === 1 && available[0] === 'mock') {
    console.error('No LLM providers configured!');
    console.log(LLMConfigManager.showConfigHelp());
    return false;
  }
  
  const status = LLMConfigManager.getConfigStatus();
  const hasInvalid = status.some(s => 
    s.status.includes('Invalid')
  );
  
  if (hasInvalid) {
    console.warn('Some API keys have invalid format');
    status.forEach(s => {
      if (s.status.includes('Invalid')) {
        console.warn(`  ${s.provider}: ${s.details}`);
      }
    });
  }
  
  return true;
}
```

### Dynamic Provider Selection

```typescript
class SmartProviderSelector {
  private registry: LLMProviderRegistry;
  
  constructor() {
    this.registry = new LLMProviderRegistry();
    this.loadProviders();
  }
  
  private loadProviders() {
    const providers = LLMConfigManager.createFromEnvironment();
    
    for (const [name, provider] of Object.entries(providers)) {
      this.registry.register(name, provider);
    }
  }
  
  async selectProvider(requirements: {
    needsEmbeddings?: boolean;
    preferredModel?: string;
    maxLatency?: number;
  }): Promise<string> {
    const available = LLLMConfigManager.getAvailableProviders();
    
    if (requirements.needsEmbeddings) {
      // Only Gemini supports embeddings
      if (available.includes('gemini')) {
        return 'gemini';
      }
      throw new Error('No embedding provider available');
    }
    
    if (requirements.preferredModel?.includes('opus')) {
      // Only Claude has Opus models
      if (available.includes('claude')) {
        return 'claude';
      }
    }
    
    // Default selection
    return LLMConfigManager.getDefaultProvider();
  }
}
```

## Troubleshooting

### Common Issues

1. **API Key Not Found**
   ```typescript
   // Check environment
   console.log('CLAUDE_API_KEY set:', !!process.env.CLAUDE_API_KEY);
   
   // Check .env file
   const fs = require('fs');
   console.log('.env exists:', fs.existsSync('.env'));
   ```

2. **Invalid API Key Format**
   ```typescript
   const key = LLMConfigManager.getApiKey('claude');
   if (key && !LLMConfigManager.validateApiKey('claude', key)) {
     console.error('Claude API key has invalid format');
     console.error('Expected: sk-ant-...');
   }
   ```

3. **Provider Creation Fails**
   ```typescript
   try {
     const provider = LLMConfigManager.createProvider(config);
   } catch (error) {
     if (error.code === 'MISSING_API_KEY') {
       console.error('API key required:', error.message);
     }
   }
   ```

### Debug Configuration

```typescript
function debugConfiguration() {
  console.log('=== LLM Configuration Debug ===');
  
  // Environment
  console.log('\nEnvironment Variables:');
  ['CLAUDE_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY']
    .forEach(key => {
      console.log(`  ${key}: ${process.env[key] ? '✅ Set' : '❌ Not set'}`);
    });
  
  // Providers
  console.log('\nProvider Status:');
  LLMConfigManager.getConfigStatus().forEach(status => {
    console.log(`  ${status.provider}: ${status.status}`);
  });
  
  // Available
  console.log('\nAvailable Providers:');
  console.log(' ', LLMConfigManager.getAvailableProviders().join(', '));
  
  // Default
  console.log('\nDefault Provider:');
  console.log(' ', LLMConfigManager.getDefaultProvider());
}
```

## Best Practices

1. **Use Environment Variables**: Keep API keys out of code
2. **Validate Early**: Check configuration on startup
3. **Handle Failures**: Always have fallback options
4. **Monitor Usage**: Track API calls and costs
5. **Rotate Keys**: Regularly update API keys
6. **Use Specific Models**: Don't rely on defaults