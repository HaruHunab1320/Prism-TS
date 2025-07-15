import { generateObject, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import type { ConfidenceExtractor } from '@prism-lang/confidence';

// Schema for structured responses with confidence
const ConfidentResponseSchema = z.object({
  content: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

// type ConfidentResponse = z.infer<typeof ConfidentResponseSchema>;

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

export class LLMRequest {
  constructor(
    public readonly prompt: string,
    public readonly options: LLMOptions = {}
  ) {}
}

export class LLMResponse {
  constructor(
    public readonly content: string,
    public readonly confidence: number,
    public readonly tokensUsed: number = 0,
    public readonly model: string = 'unknown',
    public readonly metadata?: Record<string, unknown>
  ) {}
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export interface LLMProvider {
  readonly name: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
  embed?(text: string): Promise<number[]>;
}

export class ClaudeProvider implements LLMProvider {
  readonly name = 'Claude';
  private model: ReturnType<typeof anthropic>;
  
  constructor(
    apiKey: string,
    defaultModel: string = 'claude-3-5-sonnet-20241022'
  ) {
    if (!apiKey) {
      throw new LLMError('API key is required for Claude provider', 'MISSING_API_KEY');
    }
    // Set the API key in the environment for the SDK
    process.env.ANTHROPIC_API_KEY = apiKey;
    this.model = anthropic(defaultModel);
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.options.model 
      ? anthropic(request.options.model)
      : this.model;

    try {
      if (request.options.structuredOutput !== false) {
        // Use structured output by default
        const systemPrompt = request.options.includeReasoning 
          ? "You are a helpful assistant. Always provide your response with a confidence score between 0 and 1, where 0 means completely uncertain and 1 means absolutely certain. Include reasoning for your confidence score."
          : "You are a helpful assistant. Always provide your response with a confidence score between 0 and 1, where 0 means completely uncertain and 1 means absolutely certain.";

        const result = await generateObject({
          model,
          schema: ConfidentResponseSchema,
          system: systemPrompt,
          prompt: request.prompt,
          maxTokens: request.options.maxTokens || 1000,
          temperature: request.options.temperature || 0.7,
          topP: request.options.topP,
        });

        return new LLMResponse(
          result.object.content,
          result.object.confidence,
          result.usage?.totalTokens || 0,
          model.modelId,
          {
            reasoning: result.object.reasoning,
            usage: result.usage,
          }
        );
      } else {
        // Fallback to regular text generation
        const result = await generateText({
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

        return new LLMResponse(
          result.text,
          confidence,
          result.usage?.totalTokens || 0,
          model.modelId,
          {
            usage: result.usage,
          }
        );
      }
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw new LLMError(
        `Claude API error: ${(error as Error).message}`,
        'API_ERROR',
        { originalError: error }
      );
    }
  }
}

export class GeminiProvider implements LLMProvider {
  readonly name = 'Gemini';
  private model: ReturnType<typeof google>;
  
  constructor(
    apiKey: string,
    defaultModel: string = 'gemini-1.5-flash'
  ) {
    if (!apiKey) {
      throw new LLMError('API key is required for Gemini provider', 'MISSING_API_KEY');
    }
    // Set the API key in the environment for the SDK
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    this.model = google(defaultModel);
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.options.model 
      ? google(request.options.model)
      : this.model;

    try {
      if (request.options.structuredOutput !== false) {
        const systemPrompt = request.options.includeReasoning 
          ? "You are a helpful assistant. Always provide your response with a confidence score between 0 and 1. Include reasoning for your confidence score."
          : "You are a helpful assistant. Always provide your response with a confidence score between 0 and 1.";

        const result = await generateObject({
          model,
          schema: ConfidentResponseSchema,
          system: systemPrompt,
          prompt: request.prompt,
          maxTokens: request.options.maxTokens || 1000,
          temperature: request.options.temperature || 0.7,
          topP: request.options.topP,
        });

        return new LLMResponse(
          result.object.content,
          result.object.confidence,
          result.usage?.totalTokens || 0,
          model.modelId,
          {
            reasoning: result.object.reasoning,
            usage: result.usage,
          }
        );
      } else {
        const result = await generateText({
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

        return new LLMResponse(
          result.text,
          confidence,
          result.usage?.totalTokens || 0,
          model.modelId,
          {
            usage: result.usage,
          }
        );
      }
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw new LLMError(
        `Gemini API error: ${(error as Error).message}`,
        'API_ERROR',
        { originalError: error }
      );
    }
  }

  async embed(_text: string): Promise<number[]> {
    // Gemini supports embeddings through the embedding model
    // const embedModel = google('text-embedding-004');
    
    try {
      // The AI SDK doesn't have a direct embed method, so we'll use a workaround
      // For now, return a placeholder - you would need to use the Google AI API directly for embeddings
      throw new LLMError(
        'Embeddings not yet implemented for Gemini in AI SDK',
        'EMBEDDING_NOT_IMPLEMENTED'
      );
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw new LLMError(
        `Gemini embedding error: ${(error as Error).message}`,
        'EMBEDDING_ERROR',
        { originalError: error }
      );
    }
  }
}

export class MockLLMProvider implements LLMProvider {
  readonly name = 'Mock';
  private mockResponse = 'Mock response for testing purposes.';
  private mockConfidence = 0.75;
  private mockReasoning = 'This is a mock response with default confidence.';
  private failureRate = 0.0;
  private latency = 0;

  async complete(request: LLMRequest): Promise<LLMResponse> {
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
    
    return new LLMResponse(
      this.mockResponse,
      this.mockConfidence,
      tokensUsed,
      'mock-model',
      {
        reasoning: request.options.includeReasoning ? this.mockReasoning : undefined,
        processingTime: this.latency,
        prompt: request.prompt,
        requestId: this.generateId(),
      }
    );
  }

  async embed(text: string): Promise<number[]> {
    // Simulate latency
    if (this.latency > 0) {
      await this.delay(this.latency);
    }

    // Generate mock embeddings (384 dimensions, typical for smaller models)
    const dimensions = 384;
    const embeddings: number[] = [];
    
    // Use text hash as seed for deterministic but varied embeddings
    let seed = this.hashCode(text);
    
    for (let i = 0; i < dimensions; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff; // Linear congruential generator
      embeddings.push((seed / 0x7fffffff - 0.5) * 2); // Normalize to [-1, 1]
    }
    
    return embeddings;
  }

  setMockResponse(response: string, confidence: number, reasoning?: string): void {
    this.mockResponse = response;
    this.mockConfidence = confidence;
    if (reasoning) {
      this.mockReasoning = reasoning;
    }
  }

  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  setLatency(ms: number): void {
    this.latency = Math.max(0, ms);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

export class LLMProviderRegistry {
  private providers = new Map<string, LLMProvider>();
  private defaultProvider?: string;

  register(name: string, provider: LLMProvider): void {
    this.providers.set(name, provider);
  }

  get(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  getDefault(): LLMProvider | undefined {
    if (!this.defaultProvider) {
      return undefined;
    }
    return this.providers.get(this.defaultProvider);
  }

  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new LLMError(`Provider '${name}' not found`, 'PROVIDER_NOT_FOUND');
    }
    this.defaultProvider = name;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }

  async complete(request: LLMRequest, providerName?: string): Promise<LLMResponse> {
    const provider = providerName ? this.get(providerName) : this.getDefault();
    if (!provider) {
      throw new LLMError(
        providerName 
          ? `Provider '${providerName}' not found`
          : 'No default provider set',
        'PROVIDER_NOT_FOUND'
      );
    }
    
    return provider.complete(request);
  }

  async embed(text: string, providerName?: string): Promise<number[]> {
    const provider = providerName ? this.get(providerName) : this.getDefault();
    if (!provider) {
      throw new LLMError(
        providerName 
          ? `Provider '${providerName}' not found`
          : 'No default provider set',
        'PROVIDER_NOT_FOUND'
      );
    }
    
    if (!provider.embed) {
      throw new LLMError(
        `Provider '${provider.name}' does not support embeddings`,
        'EMBEDDING_NOT_SUPPORTED'
      );
    }
    
    return provider.embed(text);
  }
}

// Default registry instance
export const defaultLLMRegistry = new LLMProviderRegistry();