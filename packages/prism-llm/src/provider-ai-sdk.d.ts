import type { ConfidenceExtractor } from '@prism/confidence';
export interface LLMOptions {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    timeout?: number;
    model?: string;
    structuredOutput?: boolean;
    includeReasoning?: boolean;
    confidenceExtractor?: ConfidenceExtractor;
}
export declare class LLMRequest {
    readonly prompt: string;
    readonly options: LLMOptions;
    constructor(prompt: string, options?: LLMOptions);
}
export declare class LLMResponse {
    readonly content: string;
    readonly confidence: number;
    readonly tokensUsed: number;
    readonly model: string;
    readonly metadata?: Record<string, unknown> | undefined;
    constructor(content: string, confidence: number, tokensUsed?: number, model?: string, metadata?: Record<string, unknown> | undefined);
}
export declare class LLMError extends Error {
    readonly code: string;
    readonly context?: Record<string, unknown> | undefined;
    constructor(message: string, code: string, context?: Record<string, unknown> | undefined);
}
export interface LLMProvider {
    readonly name: string;
    complete(request: LLMRequest): Promise<LLMResponse>;
    embed?(text: string): Promise<number[]>;
}
export declare class ClaudeProvider implements LLMProvider {
    readonly name = "Claude";
    private model;
    constructor(apiKey: string, defaultModel?: string);
    complete(request: LLMRequest): Promise<LLMResponse>;
}
export declare class GeminiProvider implements LLMProvider {
    readonly name = "Gemini";
    private model;
    constructor(apiKey: string, defaultModel?: string);
    complete(request: LLMRequest): Promise<LLMResponse>;
    embed(_text: string): Promise<number[]>;
}
export declare class MockLLMProvider implements LLMProvider {
    readonly name = "Mock";
    private mockResponse;
    private mockConfidence;
    private mockReasoning;
    private failureRate;
    private latency;
    complete(request: LLMRequest): Promise<LLMResponse>;
    embed(text: string): Promise<number[]>;
    setMockResponse(response: string, confidence: number, reasoning?: string): void;
    setFailureRate(rate: number): void;
    setLatency(ms: number): void;
    private delay;
    private generateId;
    private hashCode;
}
export declare class LLMProviderRegistry {
    private providers;
    private defaultProvider?;
    register(name: string, provider: LLMProvider): void;
    get(name: string): LLMProvider | undefined;
    getDefault(): LLMProvider | undefined;
    setDefault(name: string): void;
    list(): string[];
    complete(request: LLMRequest, providerName?: string): Promise<LLMResponse>;
    embed(text: string, providerName?: string): Promise<number[]>;
}
export declare const defaultLLMRegistry: LLMProviderRegistry;
//# sourceMappingURL=provider-ai-sdk.d.ts.map