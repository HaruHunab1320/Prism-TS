import { ConfidenceValue } from '../confidence';

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  timeout?: number;
  context?: string;
  model?: string;
  [key: string]: unknown;
}

export interface ClaudeConfig {
  model?: string;
  baseUrl?: string;
  timeout?: number;
  apiVersion?: string;
  maxRetries?: number;
}

export interface GeminiConfig {
  model?: string;
  baseUrl?: string;
  timeout?: number;
  apiVersion?: string;
}

export interface RetryOptions {
  maxRetries: number;
  delay: number;
  exponentialBackoff?: boolean;
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
    public readonly confidence: ConfidenceValue,
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
  embed(text: string): Promise<number[]>;
}

export class MockLLMProvider implements LLMProvider {
  readonly name = 'Mock';
  private mockResponse = 'Mock response for testing purposes.';
  private mockConfidence = new ConfidenceValue(0.75);
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

  setMockResponse(response: string, confidence: ConfidenceValue): void {
    this.mockResponse = response;
    this.mockConfidence = confidence;
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

export class ClaudeProvider implements LLMProvider {
  readonly name = 'Claude';
  
  constructor(
    private apiKey: string,
    private config: ClaudeConfig = {}
  ) {
    if (!apiKey) {
      throw new LLMError('API key is required for Claude provider', 'MISSING_API_KEY');
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.options.model || this.config.model || 'claude-3-haiku-20240307';
    const timeout = request.options.timeout || this.config.timeout || 30000;
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com';
    const apiVersion = this.config.apiVersion || '2023-06-01';
    
    try {
      const response = await this.makeApiCall('/v1/messages', {
        model,
        max_tokens: request.options.maxTokens || 1000,
        temperature: request.options.temperature || 0.7,
        top_p: request.options.topP,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ]
      }, timeout, baseUrl, apiVersion);
      
      return this.parseClaudeResponse(response, model);
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

  async embed(_text: string): Promise<number[]> {
    // Claude doesn't provide embeddings directly, so we'll use a placeholder
    // In a real implementation, you might use a different service for embeddings
    throw new LLMError(
      'Claude does not provide embedding functionality. Use a dedicated embedding provider.',
      'EMBEDDING_NOT_SUPPORTED'
    );
  }

  private async makeApiCall(
    endpoint: string, 
    data: unknown, 
    timeout: number,
    baseUrl: string,
    apiVersion: string
  ): Promise<any> {
    const { default: fetch } = await import('node-fetch');
    const url = `${baseUrl}${endpoint}`;
    
    const requestConfig = {
      method: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': apiVersion,
        'User-Agent': 'Prism-TS/0.1.0'
      },
      body: JSON.stringify(data),
      signal: timeout ? AbortSignal.timeout(timeout) : undefined
    };

    const response = await fetch(url, requestConfig);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any;
      throw new LLMError(
        `Claude API error (${response.status}): ${errorData.error?.message || response.statusText}`,
        `HTTP_${response.status}`,
        { 
          status: response.status,
          statusText: response.statusText,
          errorData 
        }
      );
    }

    return response.json();
  }

  private parseClaudeResponse(response: any, model: string): LLMResponse {
    if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
      throw new LLMError('Invalid response format from Claude API', 'INVALID_RESPONSE');
    }

    // Extract text content from the first content block
    const textContent = response.content.find((content: any) => content.type === 'text');
    if (!textContent) {
      throw new LLMError('No text content found in Claude response', 'NO_TEXT_CONTENT');
    }

    const content = textContent.text || '';
    const tokensUsed = response.usage?.input_tokens + response.usage?.output_tokens || 0;
    
    // Estimate confidence based on response quality and stop reason
    let confidenceValue = 0.85; // Default confidence for Claude responses
    
    if (response.stop_reason === 'end_turn') {
      confidenceValue = 0.9; // High confidence for natural completion
    } else if (response.stop_reason === 'max_tokens') {
      confidenceValue = 0.75; // Lower confidence when truncated
    } else if (response.stop_reason === 'stop_sequence') {
      confidenceValue = 0.85; // Medium confidence for stop sequence
    }
    
    return new LLMResponse(
      content,
      new ConfidenceValue(confidenceValue),
      tokensUsed,
      model,
      {
        stopReason: response.stop_reason,
        usage: response.usage,
        id: response.id,
        type: response.type,
        role: response.role
      }
    );
  }
}

export class GeminiProvider implements LLMProvider {
  readonly name = 'Gemini';
  
  constructor(
    private apiKey: string, // Would be used in real API calls
    private config: GeminiConfig = {}
  ) {
    if (!apiKey) {
      throw new LLMError('API key is required for Gemini provider', 'MISSING_API_KEY');
    }
    // Store apiKey for future use in real implementation
    void this.apiKey;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const model = request.options.model || this.config.model || 'gemini-pro';
    const timeout = request.options.timeout || this.config.timeout || 30000;
    const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com';
    const apiVersion = this.config.apiVersion || 'v1';
    
    try {
      const response = await this.makeGeminiApiCall(`${baseUrl}/${apiVersion}/models/${model}:generateContent`, {
        contents: [{ parts: [{ text: request.prompt }] }],
        generationConfig: {
          maxOutputTokens: request.options.maxTokens || 1000,
          temperature: request.options.temperature || 0.7,
          topP: request.options.topP || 0.95,
        },
      }, timeout);
      
      return this.parseGeminiResponse(response, model);
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

  async embed(text: string): Promise<number[]> {
    const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com';
    const apiVersion = this.config.apiVersion || 'v1';
    
    try {
      const response = await this.makeGeminiApiCall(`${baseUrl}/${apiVersion}/models/embedding-001:embedContent`, {
        content: { parts: [{ text }] },
      });
      
      return response.embedding?.values || [];
    } catch (error) {
      throw new LLMError(
        `Gemini embedding error: ${(error as Error).message}`,
        'EMBEDDING_ERROR',
        { originalError: error }
      );
    }
  }

  private async makeGeminiApiCall(url: string, data: unknown, timeout?: number): Promise<any> {
    const { default: fetch } = await import('node-fetch');
    const fullUrl = `${url}?key=${this.apiKey}`;
    
    const requestConfig = {
      method: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Prism-TS/0.1.0'
      },
      body: JSON.stringify(data),
      signal: timeout ? AbortSignal.timeout(timeout) : undefined
    };

    const response = await fetch(fullUrl, requestConfig);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any;
      throw new LLMError(
        `Gemini API error (${response.status}): ${errorData.error?.message || response.statusText}`,
        `HTTP_${response.status}`,
        { 
          status: response.status,
          statusText: response.statusText,
          errorData 
        }
      );
    }

    return response.json();
  }

  private parseGeminiResponse(response: any, model: string): LLMResponse {
    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new LLMError('No response candidate received', 'NO_CANDIDATE');
    }
    
    const content = candidate.content?.parts?.[0]?.text || '';
    const tokensUsed = response.usageMetadata?.totalTokenCount || 0;
    
    // Estimate confidence based on finish reason and safety ratings
    let confidenceValue = 0.8; // Default confidence
    if (candidate.finishReason === 'STOP') {
      confidenceValue = 0.9;
    } else if (candidate.finishReason === 'MAX_TOKENS') {
      confidenceValue = 0.7;
    } else {
      confidenceValue = 0.6;
    }
    
    return new LLMResponse(
      content,
      new ConfidenceValue(confidenceValue),
      tokensUsed,
      model,
      {
        finishReason: candidate.finishReason,
        safetyRatings: candidate.safetyRatings,
        usageMetadata: response.usageMetadata,
      }
    );
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
    
    return provider.embed(text);
  }
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number,
    private refillPeriod: number // milliseconds
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }
    
    // Wait for next token
    const waitTime = this.refillPeriod - (Date.now() - this.lastRefill);
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.acquire();
    }
  }

  remaining(): number {
    this.refill();
    return this.tokens;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    
    if (timePassed >= this.refillPeriod) {
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    }
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === options.maxRetries) {
        break;
      }
      
      // Calculate delay
      let delay = options.delay;
      if (options.exponentialBackoff) {
        delay = options.delay * Math.pow(2, attempt);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Default registry instance
export const defaultLLMRegistry = new LLMProviderRegistry();