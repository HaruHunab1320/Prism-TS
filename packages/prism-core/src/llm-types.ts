/**
 * Shared LLM interfaces used across @prism-lang/core and @prism-lang/llm
 */

export interface ConfidenceExtractorLike {
  fromResponseAnalysis(
    content: string,
    options?: Record<string, unknown>
  ): Promise<{ value: number }>;
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  timeout?: number;
  model?: string;
  structuredOutput?: boolean;
  includeReasoning?: boolean;
  confidenceExtractor?: ConfidenceExtractorLike;
}

export interface LLMStreamChunk {
  type: 'text' | 'reasoning' | 'error';
  content?: string;
  reasoning?: string;
  error?: string;
}

export interface LLMStreamingSession extends AsyncIterable<LLMStreamChunk> {
  response: Promise<LLMResponse>;
  cancel(reason?: unknown): void;
}

export interface LLMStreamOptions {
  signal?: AbortSignal;
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

export interface LLMProvider {
  readonly name: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream?(request: LLMRequest, options?: LLMStreamOptions): LLMStreamingSession;
  embed?(text: string): Promise<number[]>;
}

export interface MockLLMResponse {
  content: string;
  confidence: number;
  reasoning?: string;
}

export interface MockLLMProviderConfig {
  defaultResponse?: MockLLMResponse;
  latency?: number;
  failureRate?: number;
  random?: () => number;
}

export class MockLLMProvider implements LLMProvider {
  readonly name = 'Mock';
  private defaultResponse: MockLLMResponse = {
    content: 'Mock response for testing purposes.',
    confidence: 0.75,
    reasoning: 'This is a mock response with default confidence.',
  };
  private responseQueue: MockLLMResponse[] = [];
  private latency = 0;
  private failureRate = 0;
  private randomFn: () => number = Math.random;

  constructor(config: MockLLMProviderConfig = {}) {
    if (config.defaultResponse) {
      this.defaultResponse = { ...config.defaultResponse };
    }
    if (typeof config.latency === 'number') {
      this.latency = Math.max(0, config.latency);
    }
    if (typeof config.failureRate === 'number') {
      this.failureRate = this.clamp(config.failureRate, 0, 1);
    }
    if (config.random) {
      this.randomFn = config.random;
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const response = this.consumeResponse();
    await this.simulateLatency(request.options.timeout);
    this.maybeFail('complete');
    return this.buildResponse(response, request);
  }

  stream(request: LLMRequest): LLMStreamingSession {
    const provider = this;
    const response = this.consumeResponse();
    const chunks = response.content.split(/(\s+)/).filter(Boolean);
    const chunkDelay = this.latency > 0
      ? Math.min(50, Math.max(5, this.latency / Math.max(chunks.length, 1)))
      : 0;
    let cancelled = false;

    let resolveResponse: (value: LLMResponse | PromiseLike<LLMResponse>) => void = () => {};
    let rejectResponse: (reason?: unknown) => void = () => {};
    const responsePromise = new Promise<LLMResponse>((resolve, reject) => {
      resolveResponse = resolve;
      rejectResponse = reject;
    });

    const iterator = (async function* (provider: MockLLMProvider) {
      try {
        for (const chunk of chunks) {
          if (cancelled) {
            return;
          }
          yield { type: 'text', content: chunk } as LLMStreamChunk;
          if (chunkDelay > 0) {
            await provider.delay(chunkDelay);
          }
        }

        if (!cancelled) {
          await provider.simulateLatency(request.options.timeout);
          provider.maybeFail('stream');
          resolveResponse(provider.buildResponse(response, request));
        }
      } catch (error) {
        rejectResponse(error);
        throw error;
      }
    })(this);

    return {
      response: responsePromise,
      [Symbol.asyncIterator]() {
        return iterator;
      },
      cancel: (reason?: unknown) => {
        cancelled = true;
        rejectResponse(reason ?? provider.createError('Mock stream cancelled', 'STREAM_CANCELLED'));
        iterator.return?.();
      },
    };
  }

  async embed(text: string): Promise<number[]> {
    await this.simulateLatency();
    this.maybeFail('embed');

    const dimensions = 384;
    const embeddings: number[] = [];
    let seed = this.hashCode(text);

    for (let i = 0; i < dimensions; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      embeddings.push((seed / 0x7fffffff - 0.5) * 2);
    }

    return embeddings;
  }

  setMockResponse(content: string, confidence: number, reasoning?: string): void {
    this.defaultResponse = { content, confidence, reasoning };
  }

  queueResponse(response: MockLLMResponse): void {
    this.responseQueue.push({ ...response });
  }

  clearQueue(): void {
    this.responseQueue = [];
  }

  setFailureRate(rate: number): void {
    this.failureRate = this.clamp(rate, 0, 1);
  }

  setLatency(ms: number): void {
    this.latency = Math.max(0, ms);
  }

  setRandomGenerator(generator: () => number): void {
    this.randomFn = generator;
  }

  protected createError(message: string, code: string, context?: Record<string, unknown>): Error {
    const error = new Error(message);
    (error as any).code = code;
    if (context) {
      (error as any).context = context;
    }
    return error;
  }

  private consumeResponse(): MockLLMResponse {
    if (this.responseQueue.length > 0) {
      return this.responseQueue.shift()!;
    }
    return { ...this.defaultResponse };
  }

  private async simulateLatency(timeout?: number): Promise<void> {
    if (this.latency <= 0) {
      return;
    }
    await this.delay(this.latency);
    if (timeout && this.latency > timeout) {
      throw this.createError('Request timeout', 'TIMEOUT');
    }
  }

  private maybeFail(stage: string): void {
    if (this.failureRate > 0 && this.randomFn() < this.failureRate) {
      throw this.createError(`Mock provider failure during ${stage}`, 'MOCK_FAILURE');
    }
  }

  private estimateTokens(text: string): number {
    return Math.max(1, Math.floor(text.length / 4));
  }

  private buildResponse(response: MockLLMResponse, request: LLMRequest): LLMResponse {
    const tokensUsed = this.estimateTokens(response.content);
    const reasoning =
      request.options.includeReasoning
        ? response.reasoning ?? this.defaultResponse.reasoning
        : undefined;

    return new LLMResponse(
      response.content,
      response.confidence,
      tokensUsed,
      'mock-model',
      {
        reasoning,
        processingTime: this.latency,
        prompt: request.prompt,
        requestId: this.generateId(),
      }
    );
  }

  private clamp(value: number, min: number, max: number): number {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateId(): string {
    return this.randomFn().toString(36).substring(2, 10);
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
