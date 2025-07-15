import { LLMProvider } from './provider-ai-sdk';
export interface LLMProviderConfig {
    type: 'claude' | 'gemini' | 'mock';
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    timeout?: number;
    [key: string]: unknown;
}
export declare class LLMConfigManager {
    private static readonly ENV_KEYS;
    static getApiKey(provider: 'claude' | 'gemini'): string | undefined;
    static createProvider(config: LLMProviderConfig): LLMProvider;
    static createFromEnvironment(): Record<string, LLMProvider>;
    static getDefaultProvider(): string;
    static validateConfig(config: LLMProviderConfig): string[];
    static validateApiKey(provider: 'claude' | 'gemini', apiKey: string): boolean;
    static getConfigStatus(): {
        provider: string;
        status: string;
        details?: string;
    }[];
    static getAvailableProviders(): string[];
    static showConfigHelp(): string;
    private static checkEnvFile;
}
//# sourceMappingURL=config.d.ts.map