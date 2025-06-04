import { ClaudeProvider, GeminiProvider, MockLLMProvider, LLMProvider, LLMError } from './provider';

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

Environment Variables:
  CLAUDE_API_KEY or ANTHROPIC_API_KEY - Your Anthropic Claude API key
  GEMINI_API_KEY or GOOGLE_API_KEY     - Your Google Gemini API key

Available Providers:
  - claude: Claude 3 models from Anthropic
  - gemini: Gemini models from Google
  - mock:   Mock provider for testing (always available)

Current Status:
  Available providers: ${this.getAvailableProviders().join(', ')}
  Default provider: ${this.getDefaultProvider()}

To set up a provider:
  1. Get an API key from the provider
  2. Set the appropriate environment variable
  3. Restart Prism

Example:
  export CLAUDE_API_KEY="your-api-key-here"
  export GEMINI_API_KEY="your-api-key-here"
`;
  }
}