/**
 * LLM type definitions for @prism-lang/core
 * These are duplicated here to avoid hard dependency on @prism-lang/llm
 */

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  timeout?: number;
  model?: string;
  structuredOutput?: boolean;
  includeReasoning?: boolean;
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
  embed?(text: string): Promise<number[]>;
}

export class MockLLMProvider implements LLMProvider {
  readonly name = 'Mock';
  private mockResponse = 'Mock response for testing purposes.';
  private mockConfidence = 0.75;

  async complete(_request: LLMRequest): Promise<LLMResponse> {
    return new LLMResponse(
      this.mockResponse,
      this.mockConfidence,
      1,
      'mock-model'
    );
  }

  setMockResponse(response: string, confidence: number): void {
    this.mockResponse = response;
    this.mockConfidence = confidence;
  }
}