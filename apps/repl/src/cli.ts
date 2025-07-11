// Main entry point for @prism-lang/core npm package

// Core exports
export * from './core/tokenizer';
export * from './core/parser';
export * from './core/ast';
export * from './core/runtime';

// Confidence system exports
export { 
  ConfidenceValue as ConfidenceLibValue,
  ConfidenceLevel,
  CombinationStrategy,
  ThresholdConfig,
  DEFAULT_THRESHOLDS,
  ConfidenceThreshold,
  defaultThreshold,
  getConfidenceLevel,
  combineConfidence,
  ConfidentValue,
  withConfidence,
  isHighConfidence,
  isMediumConfidence,
  isLowConfidence
} from './confidence';

// Context exports
export * from './context';

// LLM exports
export * from './llm';

// High-level API for easy usage
import { Tokenizer } from './core/tokenizer';
import { Parser } from './core/parser';
import { Runtime } from './core/runtime';
import { GeminiProvider, ClaudeProvider } from './llm/provider';

export interface PrismOptions {
  anthropicApiKey?: string;
  geminiApiKey?: string;
}

export class Prism {
  private runtime: Runtime;

  constructor(options: PrismOptions = {}) {
    // Initialize runtime with options
    this.runtime = new Runtime();
    
    // Set API keys from options or environment
    if (options.geminiApiKey || process.env.GEMINI_API_KEY) {
      process.env.GEMINI_API_KEY = options.geminiApiKey || process.env.GEMINI_API_KEY;
    }
    if (options.anthropicApiKey || process.env.ANTHROPIC_API_KEY) {
      process.env.ANTHROPIC_API_KEY = options.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    }
    
    // Initialize LLM providers
    this.initializeLLMProviders();
  }

  private initializeLLMProviders(): void {
    // Initialize Gemini provider if API key is available
    if (process.env.GEMINI_API_KEY) {
      const geminiProvider = new GeminiProvider(
        process.env.GEMINI_API_KEY,
        {} // config
      );
      this.runtime.registerLLMProvider('gemini', geminiProvider);
      this.runtime.setDefaultLLMProvider('gemini');
    }
    
    // Initialize Claude provider if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      const claudeProvider = new ClaudeProvider(
        process.env.ANTHROPIC_API_KEY,
        {} // config
      );
      this.runtime.registerLLMProvider('claude', claudeProvider);
      
      // If no default provider set yet, use Claude
      if (!this.runtime.getDefaultLLMProvider()) {
        this.runtime.setDefaultLLMProvider('claude');
      }
    }
  }

  /**
   * Execute Prism code and return the result
   */
  async execute(code: string): Promise<any> {
    const tokenizer = new Tokenizer(code);
    const tokens = tokenizer.tokenize();
    
    const parser = new Parser(tokens, code);
    const ast = parser.parse();
    
    const result = await this.runtime.execute(ast);
    return result;
  }

  /**
   * Execute Prism code from a file
   */
  async executeFile(filePath: string): Promise<any> {
    const fs = await import('fs/promises');
    const code = await fs.readFile(filePath, 'utf-8');
    return this.execute(code);
  }

  /**
   * Get the runtime instance for advanced usage
   */
  getRuntime(): Runtime {
    return this.runtime;
  }
}

// Convenience function for quick execution
export async function runPrism(code: string, options?: PrismOptions): Promise<any> {
  const prism = new Prism(options);
  return prism.execute(code);
}