import { ClaudeProvider, GeminiProvider, MockLLMProvider, LLMProvider, LLMError } from './provider';

// Load environment variables from .env file
try {
  require('dotenv').config();
} catch {
  // dotenv not available or .env file doesn't exist, continue without it
}

export interface LLMProviderConfig {
  type: 'claude' | 'gemini' | 'mock';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeout?: number;
  [key: string]: unknown;
}

export class LLMConfigManager {
  private static readonly ENV_KEYS = {
    CLAUDE_API_KEY: 'CLAUDE_API_KEY',
    GEMINI_API_KEY: 'GEMINI_API_KEY',
    ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY', // Alternative name
    GOOGLE_API_KEY: 'GOOGLE_API_KEY', // Alternative name
  };

  static getApiKey(provider: 'claude' | 'gemini'): string | undefined {
    switch (provider) {
      case 'claude':
        return process.env[this.ENV_KEYS.CLAUDE_API_KEY] || 
               process.env[this.ENV_KEYS.ANTHROPIC_API_KEY];
      case 'gemini':
        return process.env[this.ENV_KEYS.GEMINI_API_KEY] || 
               process.env[this.ENV_KEYS.GOOGLE_API_KEY];
      default:
        return undefined;
    }
  }

  static createProvider(config: LLMProviderConfig): LLMProvider {
    const { type, apiKey, ...options } = config;

    switch (type) {
      case 'claude': {
        const key = apiKey || this.getApiKey('claude');
        if (!key) {
          throw new LLMError(
            'Claude API key not found. Set CLAUDE_API_KEY or ANTHROPIC_API_KEY environment variable.',
            'MISSING_API_KEY'
          );
        }
        return new ClaudeProvider(key, options);
      }

      case 'gemini': {
        const key = apiKey || this.getApiKey('gemini');
        if (!key) {
          throw new LLMError(
            'Gemini API key not found. Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable.',
            'MISSING_API_KEY'
          );
        }
        return new GeminiProvider(key, options);
      }

      case 'mock':
        return new MockLLMProvider();

      default:
        throw new LLMError(`Unknown provider type: ${type}`, 'UNKNOWN_PROVIDER');
    }
  }

  static createFromEnvironment(): Record<string, LLMProvider> {
    const providers: Record<string, LLMProvider> = {};

    // Always include mock provider
    providers.mock = this.createProvider({ type: 'mock' });

    // Try to create Claude provider
    try {
      providers.claude = this.createProvider({ type: 'claude' });
    } catch (error) {
      // Claude provider not available, skip silently
    }

    // Try to create Gemini provider
    try {
      providers.gemini = this.createProvider({ type: 'gemini' });
    } catch (error) {
      // Gemini provider not available, skip silently
    }

    return providers;
  }

  static getDefaultProvider(): string {
    // Priority order: Claude, Gemini, Mock
    if (this.getApiKey('claude')) {
      return 'claude';
    }
    if (this.getApiKey('gemini')) {
      return 'gemini';
    }
    return 'mock';
  }

  static validateConfig(config: LLMProviderConfig): string[] {
    const errors: string[] = [];

    if (!config.type) {
      errors.push('Provider type is required');
    }

    if (config.type !== 'mock' && !config.apiKey && !this.getApiKey(config.type as 'claude' | 'gemini')) {
      errors.push(`API key is required for ${config.type} provider`);
    }

    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      errors.push('Timeout must be a positive number');
    }

    return errors;
  }

  static validateApiKey(provider: 'claude' | 'gemini', apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    switch (provider) {
      case 'claude':
        // Claude API keys typically start with 'sk-ant-'
        return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
      case 'gemini':
        // Gemini API keys are typically 39 characters and start with 'AIza'
        return apiKey.startsWith('AIza') && apiKey.length === 39;
      default:
        return false;
    }
  }

  static getConfigStatus(): { provider: string; status: string; details?: string }[] {
    const status: { provider: string; status: string; details?: string }[] = [];

    // Check Claude
    const claudeKey = this.getApiKey('claude');
    if (claudeKey) {
      status.push({
        provider: 'claude',
        status: this.validateApiKey('claude', claudeKey) ? '✅ Valid' : '⚠️  Invalid format',
        details: this.validateApiKey('claude', claudeKey) ? undefined : 'Expected format: sk-ant-...'
      });
    } else {
      status.push({
        provider: 'claude',
        status: '❌ Missing',
        details: 'Set CLAUDE_API_KEY or ANTHROPIC_API_KEY'
      });
    }

    // Check Gemini
    const geminiKey = this.getApiKey('gemini');
    if (geminiKey) {
      status.push({
        provider: 'gemini',
        status: this.validateApiKey('gemini', geminiKey) ? '✅ Valid' : '⚠️  Invalid format',
        details: this.validateApiKey('gemini', geminiKey) ? undefined : 'Expected format: AIza... (39 chars)'
      });
    } else {
      status.push({
        provider: 'gemini',
        status: '❌ Missing',
        details: 'Set GEMINI_API_KEY or GOOGLE_API_KEY'
      });
    }

    // Mock is always available
    status.push({
      provider: 'mock',
      status: '✅ Available',
      details: 'Testing provider (always available)'
    });

    return status;
  }

  static getAvailableProviders(): string[] {
    const providers: string[] = ['mock'];

    if (this.getApiKey('claude')) {
      providers.push('claude');
    }

    if (this.getApiKey('gemini')) {
      providers.push('gemini');
    }

    return providers;
  }

  static showConfigHelp(): string {
    return `
LLM Provider Configuration Help:

🔧 Configuration Methods:
  1. Environment Variables (recommended for production)
  2. .env file (recommended for development)

📝 Environment Variables:
  CLAUDE_API_KEY or ANTHROPIC_API_KEY - Your Anthropic Claude API key
  GEMINI_API_KEY or GOOGLE_API_KEY     - Your Google Gemini API key

📁 .env File Setup:
  1. Copy .env.example to .env
  2. Add your API keys to the .env file
  3. Restart Prism

🌐 Get API Keys:
  Claude:  https://console.anthropic.com/
  Gemini:  https://aistudio.google.com/app/apikey

🔍 Current Status:
  Available providers: ${this.getAvailableProviders().join(', ')}
  Default provider: ${this.getDefaultProvider()}
  .env file: ${this.checkEnvFile() ? '✅ Found' : '❌ Not found'}

💡 Quick Setup:
  # Using environment variables
  export CLAUDE_API_KEY="your-claude-api-key"
  export GEMINI_API_KEY="your-gemini-api-key"
  
  # Or create .env file
  cp .env.example .env
  # Edit .env file with your API keys
`;
  }

  private static checkEnvFile(): boolean {
    try {
      const fs = require('fs');
      return fs.existsSync('.env');
    } catch {
      return false;
    }
  }
}