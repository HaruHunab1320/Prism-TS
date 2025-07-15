"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultLLMRegistry = exports.LLMProviderRegistry = exports.MockLLMProvider = exports.GeminiProvider = exports.ClaudeProvider = exports.LLMError = exports.LLMResponse = exports.LLMRequest = void 0;
const ai_1 = require("ai");
const anthropic_1 = require("@ai-sdk/anthropic");
const google_1 = require("@ai-sdk/google");
const zod_1 = require("zod");
// Schema for structured responses with confidence
const ConfidentResponseSchema = zod_1.z.object({
    content: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    reasoning: zod_1.z.string().optional(),
});
class LLMRequest {
    prompt;
    options;
    constructor(prompt, options = {}) {
        this.prompt = prompt;
        this.options = options;
    }
}
exports.LLMRequest = LLMRequest;
class LLMResponse {
    content;
    confidence;
    tokensUsed;
    model;
    metadata;
    constructor(content, confidence, tokensUsed = 0, model = 'unknown', metadata) {
        this.content = content;
        this.confidence = confidence;
        this.tokensUsed = tokensUsed;
        this.model = model;
        this.metadata = metadata;
    }
}
exports.LLMResponse = LLMResponse;
class LLMError extends Error {
    code;
    context;
    constructor(message, code, context) {
        super(message);
        this.code = code;
        this.context = context;
        this.name = 'LLMError';
    }
}
exports.LLMError = LLMError;
class ClaudeProvider {
    name = 'Claude';
    model;
    constructor(apiKey, defaultModel = 'claude-3-5-sonnet-20241022') {
        if (!apiKey) {
            throw new LLMError('API key is required for Claude provider', 'MISSING_API_KEY');
        }
        // Set the API key in the environment for the SDK
        process.env.ANTHROPIC_API_KEY = apiKey;
        this.model = (0, anthropic_1.anthropic)(defaultModel);
    }
    async complete(request) {
        const model = request.options.model
            ? (0, anthropic_1.anthropic)(request.options.model)
            : this.model;
        try {
            if (request.options.structuredOutput !== false) {
                // Use structured output by default
                const systemPrompt = request.options.includeReasoning
                    ? "You are a helpful assistant. Always provide your response with a confidence score between 0 and 1, where 0 means completely uncertain and 1 means absolutely certain. Include reasoning for your confidence score."
                    : "You are a helpful assistant. Always provide your response with a confidence score between 0 and 1, where 0 means completely uncertain and 1 means absolutely certain.";
                const result = await (0, ai_1.generateObject)({
                    model,
                    schema: ConfidentResponseSchema,
                    system: systemPrompt,
                    prompt: request.prompt,
                    maxTokens: request.options.maxTokens || 1000,
                    temperature: request.options.temperature || 0.7,
                    topP: request.options.topP,
                });
                return new LLMResponse(result.object.content, result.object.confidence, result.usage?.totalTokens || 0, model.modelId, {
                    reasoning: result.object.reasoning,
                    usage: result.usage,
                });
            }
            else {
                // Fallback to regular text generation
                const result = await (0, ai_1.generateText)({
                    model,
                    prompt: request.prompt,
                    maxTokens: request.options.maxTokens || 1000,
                    temperature: request.options.temperature || 0.7,
                    topP: request.options.topP,
                });
                // Use confidence extractor if provided
                let confidence = 0.85; // Default confidence
                if (request.options.confidenceExtractor) {
                    const extracted = await request.options.confidenceExtractor.fromResponseAnalysis(result.text);
                    confidence = extracted.value;
                }
                return new LLMResponse(result.text, confidence, result.usage?.totalTokens || 0, model.modelId, {
                    usage: result.usage,
                });
            }
        }
        catch (error) {
            if (error instanceof LLMError) {
                throw error;
            }
            throw new LLMError(`Claude API error: ${error.message}`, 'API_ERROR', { originalError: error });
        }
    }
}
exports.ClaudeProvider = ClaudeProvider;
class GeminiProvider {
    name = 'Gemini';
    model;
    constructor(apiKey, defaultModel = 'gemini-1.5-flash') {
        if (!apiKey) {
            throw new LLMError('API key is required for Gemini provider', 'MISSING_API_KEY');
        }
        // Set the API key in the environment for the SDK
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
        this.model = (0, google_1.google)(defaultModel);
    }
    async complete(request) {
        const model = request.options.model
            ? (0, google_1.google)(request.options.model)
            : this.model;
        try {
            if (request.options.structuredOutput !== false) {
                const systemPrompt = request.options.includeReasoning
                    ? "You are a helpful assistant. Always provide your response with a confidence score between 0 and 1. Include reasoning for your confidence score."
                    : "You are a helpful assistant. Always provide your response with a confidence score between 0 and 1.";
                const result = await (0, ai_1.generateObject)({
                    model,
                    schema: ConfidentResponseSchema,
                    system: systemPrompt,
                    prompt: request.prompt,
                    maxTokens: request.options.maxTokens || 1000,
                    temperature: request.options.temperature || 0.7,
                    topP: request.options.topP,
                });
                return new LLMResponse(result.object.content, result.object.confidence, result.usage?.totalTokens || 0, model.modelId, {
                    reasoning: result.object.reasoning,
                    usage: result.usage,
                });
            }
            else {
                const result = await (0, ai_1.generateText)({
                    model,
                    prompt: request.prompt,
                    maxTokens: request.options.maxTokens || 1000,
                    temperature: request.options.temperature || 0.7,
                    topP: request.options.topP,
                });
                let confidence = 0.8; // Default confidence
                if (request.options.confidenceExtractor) {
                    const extracted = await request.options.confidenceExtractor.fromResponseAnalysis(result.text);
                    confidence = extracted.value;
                }
                return new LLMResponse(result.text, confidence, result.usage?.totalTokens || 0, model.modelId, {
                    usage: result.usage,
                });
            }
        }
        catch (error) {
            if (error instanceof LLMError) {
                throw error;
            }
            throw new LLMError(`Gemini API error: ${error.message}`, 'API_ERROR', { originalError: error });
        }
    }
    async embed(_text) {
        // Gemini supports embeddings through the embedding model
        // const embedModel = google('text-embedding-004');
        try {
            // The AI SDK doesn't have a direct embed method, so we'll use a workaround
            // For now, return a placeholder - you would need to use the Google AI API directly for embeddings
            throw new LLMError('Embeddings not yet implemented for Gemini in AI SDK', 'EMBEDDING_NOT_IMPLEMENTED');
        }
        catch (error) {
            if (error instanceof LLMError) {
                throw error;
            }
            throw new LLMError(`Gemini embedding error: ${error.message}`, 'EMBEDDING_ERROR', { originalError: error });
        }
    }
}
exports.GeminiProvider = GeminiProvider;
class MockLLMProvider {
    name = 'Mock';
    mockResponse = 'Mock response for testing purposes.';
    mockConfidence = 0.75;
    mockReasoning = 'This is a mock response with default confidence.';
    failureRate = 0.0;
    latency = 0;
    async complete(request) {
        // Simulate latency
        if (this.latency > 0) {
            await this.delay(this.latency);
        }
        // Check for timeout
        if (request.options.timeout && this.latency > request.options.timeout) {
            throw new LLMError('Request timeout', 'TIMEOUT');
        }
        // Simulate failures
        if (Math.random() < this.failureRate) {
            throw new LLMError('Mock provider failure', 'MOCK_FAILURE');
        }
        const tokensUsed = Math.floor(this.mockResponse.length / 4) + Math.floor(Math.random() * 10);
        return new LLMResponse(this.mockResponse, this.mockConfidence, tokensUsed, 'mock-model', {
            reasoning: request.options.includeReasoning ? this.mockReasoning : undefined,
            processingTime: this.latency,
            prompt: request.prompt,
            requestId: this.generateId(),
        });
    }
    async embed(text) {
        // Simulate latency
        if (this.latency > 0) {
            await this.delay(this.latency);
        }
        // Generate mock embeddings (384 dimensions, typical for smaller models)
        const dimensions = 384;
        const embeddings = [];
        // Use text hash as seed for deterministic but varied embeddings
        let seed = this.hashCode(text);
        for (let i = 0; i < dimensions; i++) {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff; // Linear congruential generator
            embeddings.push((seed / 0x7fffffff - 0.5) * 2); // Normalize to [-1, 1]
        }
        return embeddings;
    }
    setMockResponse(response, confidence, reasoning) {
        this.mockResponse = response;
        this.mockConfidence = confidence;
        if (reasoning) {
            this.mockReasoning = reasoning;
        }
    }
    setFailureRate(rate) {
        this.failureRate = Math.max(0, Math.min(1, rate));
    }
    setLatency(ms) {
        this.latency = Math.max(0, ms);
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    generateId() {
        return Math.random().toString(36).substring(2, 15);
    }
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
}
exports.MockLLMProvider = MockLLMProvider;
class LLMProviderRegistry {
    providers = new Map();
    defaultProvider;
    register(name, provider) {
        this.providers.set(name, provider);
    }
    get(name) {
        return this.providers.get(name);
    }
    getDefault() {
        if (!this.defaultProvider) {
            return undefined;
        }
        return this.providers.get(this.defaultProvider);
    }
    setDefault(name) {
        if (!this.providers.has(name)) {
            throw new LLMError(`Provider '${name}' not found`, 'PROVIDER_NOT_FOUND');
        }
        this.defaultProvider = name;
    }
    list() {
        return Array.from(this.providers.keys());
    }
    async complete(request, providerName) {
        const provider = providerName ? this.get(providerName) : this.getDefault();
        if (!provider) {
            throw new LLMError(providerName
                ? `Provider '${providerName}' not found`
                : 'No default provider set', 'PROVIDER_NOT_FOUND');
        }
        return provider.complete(request);
    }
    async embed(text, providerName) {
        const provider = providerName ? this.get(providerName) : this.getDefault();
        if (!provider) {
            throw new LLMError(providerName
                ? `Provider '${providerName}' not found`
                : 'No default provider set', 'PROVIDER_NOT_FOUND');
        }
        if (!provider.embed) {
            throw new LLMError(`Provider '${provider.name}' does not support embeddings`, 'EMBEDDING_NOT_SUPPORTED');
        }
        return provider.embed(text);
    }
}
exports.LLMProviderRegistry = LLMProviderRegistry;
// Default registry instance
exports.defaultLLMRegistry = new LLMProviderRegistry();
//# sourceMappingURL=provider-ai-sdk.js.map