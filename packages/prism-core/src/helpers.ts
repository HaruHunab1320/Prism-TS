import { parse } from './parser';
import { createRuntime, Runtime } from './runtime';
import { LLMProvider } from './llm-types';

export interface RunPrismOptions {
  /** LLM provider to use for llm() calls */
  llmProvider?: LLMProvider;
  /** Additional global variables/functions to inject */
  globals?: Record<string, any>;
  /** Default LLM provider name (defaults to 'default') */
  defaultProviderName?: string;
}

/**
 * Simple helper to run Prism code in one call
 * 
 * @example
 * ```javascript
 * const { runPrism } = require('@prism-lang/core');
 * const result = await runPrism('x = 5 ~> 0.9; x * 2');
 * console.log(result); // 10 with 90% confidence
 * ```
 * 
 * @example With LLM provider
 * ```javascript
 * const { runPrism } = require('@prism-lang/core');
 * const { createProvider } = require('@prism-lang/llm');
 * 
 * const result = await runPrism(
 *   'response = llm("Hello"); response',
 *   { llmProvider: createProvider() }
 * );
 * ```
 */
export async function runPrism(
  code: string, 
  options?: RunPrismOptions
): Promise<any> {
  // If we have globals, we need to prepend them as assignments
  let fullCode = code;
  if (options?.globals) {
    const globalAssignments = Object.entries(options.globals)
      .map(([name, value]) => {
        if (typeof value === 'string') {
          return `${name} = "${value.replace(/"/g, '\\"')}"`;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          return `${name} = ${value}`;
        } else if (typeof value === 'function') {
          // For functions, we can't inject them this way
          // This is a limitation we need to document
          return '';
        } else {
          return `${name} = ${JSON.stringify(value)}`;
        }
      })
      .filter(Boolean)
      .join('\n');
    
    if (globalAssignments) {
      fullCode = globalAssignments + '\n' + code;
    }
  }
  
  // Parse the code
  const ast = parse(fullCode);
  
  // Create runtime
  const runtime = createRuntime();
  
  // Set up LLM provider if provided
  if (options?.llmProvider) {
    const providerName = options.defaultProviderName || 'default';
    runtime.registerLLMProvider(providerName, options.llmProvider);
    runtime.setDefaultLLMProvider(providerName);
  }
  
  // Execute and return result
  return runtime.execute(ast);
}

/**
 * Create a configured Prism runtime
 * Useful when you want to reuse the same runtime for multiple executions
 * 
 * Note: Since the runtime doesn't support direct global injection,
 * you'll need to execute code that sets globals first.
 * 
 * @example
 * ```javascript
 * const { createPrismRuntime, parse } = require('@prism-lang/core');
 * 
 * const runtime = createPrismRuntime();
 * 
 * // Set globals by executing assignment code
 * const setupAst = parse('PI = 3.14159');
 * await runtime.execute(setupAst);
 * 
 * const ast1 = parse('x = PI * 2');
 * await runtime.execute(ast1);
 * 
 * const ast2 = parse('x + 1');
 * const result = await runtime.execute(ast2);
 * ```
 */
export function createPrismRuntime(options?: RunPrismOptions): Runtime {
  const runtime = createRuntime();
  
  // Set up LLM provider if provided
  if (options?.llmProvider) {
    const providerName = options.defaultProviderName || 'default';
    runtime.registerLLMProvider(providerName, options.llmProvider);
    runtime.setDefaultLLMProvider(providerName);
  }
  
  // Note: globals option is ignored here since Runtime doesn't support setGlobal
  // Users should execute assignment statements instead
  
  return runtime;
}