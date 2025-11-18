import { generateObject, generateText, streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import {
  LLMRequest,
  LLMResponse,
  LLMProvider,
  LLMStreamingSession,
  LLMStreamChunk,
  MockLLMProvider as CoreMockLLMProvider
} from '@prism-lang/core';

// Schema for structured responses with confidence
const ConfidentResponseSchema = z.object({
  content: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

// type ConfidentResponse = z.infer<typeof ConfidentResponseSchema>;

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

  stream(request: LLMRequest): LLMStreamingSession {
    if (request.options.structuredOutput !== false) {
      throw new LLMError('Streaming requires structuredOutput set to false', 'STREAM_NOT_SUPPORTED');
    }

    const controller = new AbortController();
    const model = request.options.model
      ? anthropic(request.options.model)
      : this.model;

    const result = streamText({
      model,
      prompt: request.prompt,
      maxTokens: request.options.maxTokens || 1000,
      temperature: request.options.temperature ?? 0.7,
      topP: request.options.topP,
      abortSignal: controller.signal,
    });

    const iterator = (async function* (): AsyncGenerator<LLMStreamChunk> {
      try {
        for await (const delta of result.textStream) {
          yield { type: 'text', content: delta };
        }
      } catch (error) {
        throw mapStreamError('Claude', error);
      }
    })();

    const responsePromise = (async () => {
      try {
        const [text, usage, responseMeta, finishReason] = await Promise.all([
          result.text,
          result.usage,
          result.response,
          result.finishReason,
        ]);
        let confidence = 0.85;
        if (request.options.confidenceExtractor) {
          const extracted = await request.options.confidenceExtractor.fromResponseAnalysis(text);
          confidence = extracted.value;
        }
        const reasoning = request.options.includeReasoning ? await result.reasoning : undefined;
        return new LLMResponse(
          text,
          confidence,
          usage?.totalTokens ?? 0,
          responseMeta.modelId,
          {
            reasoning,
            usage,
            finishReason,
            provider: this.name,
          }
        );
      } catch (error) {
        throw mapStreamError('Claude', error);
      }
    })();

    return {
      response: responsePromise,
      [Symbol.asyncIterator]() {
        return iterator;
      },
      cancel: () => controller.abort(),
    };
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

  stream(request: LLMRequest): LLMStreamingSession {
    if (request.options.structuredOutput !== false) {
      throw new LLMError('Streaming requires structuredOutput set to false', 'STREAM_NOT_SUPPORTED');
    }

    const controller = new AbortController();
    const model = request.options.model
      ? google(request.options.model)
      : this.model;

    const result = streamText({
      model,
      prompt: request.prompt,
      maxTokens: request.options.maxTokens || 1000,
      temperature: request.options.temperature ?? 0.7,
      topP: request.options.topP,
      abortSignal: controller.signal,
    });

    const iterator = (async function* (): AsyncGenerator<LLMStreamChunk> {
      try {
        for await (const delta of result.textStream) {
          yield { type: 'text', content: delta };
        }
      } catch (error) {
        throw mapStreamError('Gemini', error);
      }
    })();

    const responsePromise = (async () => {
      try {
        const [text, usage, responseMeta, finishReason] = await Promise.all([
          result.text,
          result.usage,
          result.response,
          result.finishReason,
        ]);
        let confidence = 0.85;
        if (request.options.confidenceExtractor) {
          const extracted = await request.options.confidenceExtractor.fromResponseAnalysis(text);
          confidence = extracted.value;
        }
        const reasoning = request.options.includeReasoning ? await result.reasoning : undefined;
        return new LLMResponse(
          text,
          confidence,
          usage?.totalTokens ?? 0,
          responseMeta.modelId,
          {
            reasoning,
            usage,
            finishReason,
            provider: this.name,
          }
        );
      } catch (error) {
        throw mapStreamError('Gemini', error);
      }
    })();

    return {
      response: responsePromise,
      [Symbol.asyncIterator]() {
        return iterator;
      },
      cancel: () => controller.abort(),
    };
  }
}

export class MockLLMProvider extends CoreMockLLMProvider {
  protected override createError(message: string, code: string, context?: Record<string, unknown>): Error {
    return new LLMError(message, code, context);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'));
}

function mapStreamError(provider: string, error: unknown): LLMError {
  if (isAbortError(error)) {
    return new LLMError(`${provider} streaming cancelled`, 'STREAM_CANCELLED');
  }
  const message = error instanceof Error ? error.message : String(error);
  return new LLMError(`${provider} streaming failed: ${message}`, 'STREAM_ERROR', { originalError: error });
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

  stream(request: LLMRequest, providerName?: string): LLMStreamingSession {
    const provider = providerName ? this.get(providerName) : this.getDefault();
    if (!provider) {
      throw new LLMError(
        providerName 
          ? `Provider '${providerName}' not found`
          : 'No default provider set',
        'PROVIDER_NOT_FOUND'
      );
    }
    if (!provider.stream) {
      throw new LLMError(
        `Provider '${provider.name}' does not support streaming`,
        'STREAM_NOT_SUPPORTED'
      );
    }
    return provider.stream(request);
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
