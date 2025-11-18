#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { PrismREPL } from '@prism-lang/repl';
import { LLMConfigManager } from '@prism-lang/llm';
import { DiagnosticError, formatDiagnostic, LLMRequest, Module } from '@prism-lang/core';
import { getVersion, executeCode, readFileSync, setupRuntimeWithLLM } from './cli-utils';

// Load environment variables from .env file early
try {
  require('dotenv').config();
} catch {
  // dotenv not available or .env file doesn't exist, continue without it
}

const VERSION = getVersion();

interface RunFileOptions {
  watch?: boolean;
}

interface RunCommandArgs {
  filename?: string;
  watch: boolean;
}

function parseRunArguments(args: string[]): RunCommandArgs {
  const positional: string[] = [];
  let watch = false;

  for (const arg of args) {
    if (arg === '--watch' || arg === '-w') {
      watch = true;
    } else {
      positional.push(arg);
    }
  }

  return {
    filename: positional[0],
    watch,
  };
}

function renderRuntimeResult(result: any): string | null {
  if (result === undefined || result === null) {
    return null;
  }

  if (typeof result === 'object' && result !== null && 'value' in result) {
    if ('confidence' in result && result.confidence) {
      const printableValue =
        result.value && typeof result.value === 'object' && 'value' in result.value
          ? result.value.value
          : result.value;
      const printableConfidence =
        typeof result.confidence === 'object' && result.confidence !== null && 'value' in result.confidence
          ? result.confidence.value
          : result.confidence;
      return `Result: ${printableValue} (~${printableConfidence})`;
    }

    if ('value' in result) {
      return `Result: ${result.value}`;
    }

    return `Result: ${result}`;
  }

  return `Result: ${result}`;
}

// Command handlers
async function runFile(filename: string, options: RunFileOptions = {}): Promise<void> {
  const resolvedPath = path.resolve(process.cwd(), filename);

  if (options.watch) {
    await runFileWithWatch(resolvedPath);
    return;
  }

  let code = '';
  try {
    // Read file contents
    code = readFileSync(resolvedPath);
    
    // Parse and execute
    console.log(`🚀 Running ${filename}...\n`);
    const result = await executeCode(code);
    
    const formatted = renderRuntimeResult(result);
    if (formatted) {
      console.log(`\n${formatted}`);
    }
  } catch (error) {
    console.error(`❌ ${formatError(error, code)}`);
    process.exit(1);
  }
}

type WatchListener = (curr: fs.Stats, prev: fs.Stats) => void;

async function runFileWithWatch(entryPath: string): Promise<void> {
  if (!fs.existsSync(entryPath)) {
    console.error(`❌ Error: File not found: ${entryPath}`);
    process.exit(1);
  }

  const { runtime } = await setupRuntimeWithLLM();
  const moduleSystem = runtime.getModuleSystem();
  const normalizedEntry = path.resolve(entryPath);
  const watchers = new Map<string, WatchListener>();
  const pendingChanges = new Set<string>();
  let reloadTimer: NodeJS.Timeout | null = null;

  const cleanupWatchers = () => {
    for (const [file, listener] of watchers.entries()) {
      fs.unwatchFile(file, listener);
    }
    watchers.clear();
  };

  const scheduleReload = (filePath: string) => {
    pendingChanges.add(filePath);
    if (reloadTimer) {
      return;
    }
    reloadTimer = setTimeout(async () => {
      const changed = Array.from(pendingChanges);
      pendingChanges.clear();
      reloadTimer = null;
      await runOnce(changed);
    }, 75);
  };

  const ensureWatcher = (filePath: string) => {
    const normalized = path.resolve(filePath);
    if (watchers.has(normalized)) {
      return;
    }

    const listener: WatchListener = (curr, prev) => {
      if (curr.mtimeMs === prev.mtimeMs) {
        return;
      }
      scheduleReload(normalized);
    };

    fs.watchFile(normalized, { interval: 200 }, listener);
    watchers.set(normalized, listener);
  };

  const updateWatchers = (files: Set<string>) => {
    for (const file of files) {
      ensureWatcher(file);
    }

    for (const [file, listener] of Array.from(watchers.entries())) {
      if (!files.has(file)) {
        fs.unwatchFile(file, listener);
        watchers.delete(file);
      }
    }
  };

  const collectGraph = async (module: Module | null, visited = new Set<string>()): Promise<Set<string>> => {
    if (!module || visited.has(module.path)) {
      return visited;
    }

    visited.add(module.path);
    for (const dep of module.dependencies) {
      const dependencyModule = await moduleSystem.loadModule(dep, runtime);
      await collectGraph(dependencyModule, visited);
    }
    return visited;
  };

  const runOnce = async (changedPaths: string[] = []) => {
    if (changedPaths.length) {
      console.log(`\n♻️  Reloading after changes in:\n${changedPaths.map((file) => `   - ${file}`).join('\n')}`);
    } else {
      console.log(`\n🚀 Running ${normalizedEntry} (watch mode)...`);
    }

    try {
      for (const changed of changedPaths) {
        try {
          await runtime.reloadModule(changed);
        } catch (error) {
          console.error(`❌ Reload failed for ${changed}: ${formatError(error)}`);
        }
      }

      const module = await moduleSystem.loadModule(normalizedEntry, runtime);
      const watchedPaths = await collectGraph(module);
      updateWatchers(watchedPaths);

      if (module.exports?.default) {
        const formatted = renderRuntimeResult(module.exports.default as any);
        if (formatted) {
          console.log(formatted);
        }
      }

      console.log('👀 Watching for changes (Ctrl+C to stop).');
    } catch (error) {
      console.error(`❌ ${formatError(error)}`);
    }
  };

  ensureWatcher(normalizedEntry);
  console.log(`👀 Watch mode enabled for ${normalizedEntry}`);
  await runOnce();

  const handleSigint = () => {
    console.log('\n👋 Stopping watch mode.');
    cleanupWatchers();
    process.exit(0);
  };

  process.on('SIGINT', handleSigint);

  await new Promise(() => {});
}

async function evalCode(code: string): Promise<void> {
  try {
    const result = await executeCode(code);
    
    if (result !== undefined && result !== null) {
      // Format the output based on the value type
      if (typeof result === 'object' && 'value' in result) {
        // It's a Value object from Prism
        if ('confidence' in result && result.confidence) {
          // ConfidenceValue - show both value and confidence
          const value = result.value.value !== undefined ? result.value.value : result.value;
          const confidence = typeof result.confidence === 'object' && 'value' in result.confidence 
            ? result.confidence.value 
            : result.confidence;
          console.log(`${value} (~${confidence})`);
        } else if ('value' in result) {
          // Regular Value object
          console.log(result.value);
        } else {
          console.log(result);
        }
      } else {
        console.log(result);
      }
    }
  } catch (error) {
    console.error(`❌ ${formatError(error, code)}`);
    process.exit(1);
  }
}

interface LLMCLIOptions {
  provider?: string;
  stream: boolean;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  model?: string;
  timeout?: number;
  includeReasoning?: boolean;
  structuredOutput?: boolean;
}

function parseLLMCommandArgs(args: string[]): { prompt: string; options: LLMCLIOptions } {
  const options: LLMCLIOptions = { stream: false };
  const promptParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--provider':
      case '-p':
        options.provider = args[++i];
        break;
      case '--stream':
        options.stream = true;
        break;
      case '--no-stream':
        options.stream = false;
        break;
      case '--temperature':
        options.temperature = Number(args[++i]);
        break;
      case '--maxTokens':
        options.maxTokens = Number(args[++i]);
        break;
      case '--topP':
        options.topP = Number(args[++i]);
        break;
      case '--model':
        options.model = args[++i];
        break;
      case '--timeout':
        options.timeout = Number(args[++i]);
        break;
      case '--include-reasoning':
        options.includeReasoning = true;
        break;
      case '--no-include-reasoning':
        options.includeReasoning = false;
        break;
      case '--structured-output':
      case '--structured':
        options.structuredOutput = true;
        break;
      case '--no-structured-output':
      case '--no-structured':
        options.structuredOutput = false;
        break;
      default:
        promptParts.push(arg);
        break;
    }
  }

  const prompt = promptParts.join(' ').trim();
  if (!prompt) {
    throw new Error('Missing prompt for llm command');
  }
  return { prompt, options };
}

async function runLLMCommand(args: string[]): Promise<void> {
  let parsed;
  try {
    parsed = parseLLMCommandArgs(args);
  } catch (error) {
    console.error(`❌ ${(error as Error).message}`);
    console.error('Usage: prism llm [--provider name] [--stream] [--temperature n] [--maxTokens n] <prompt>');
    process.exit(1);
    return;
  }

  const { runtime } = await setupRuntimeWithLLM();
  const requestOptions = {
    maxTokens: parsed.options.maxTokens,
    temperature: parsed.options.temperature,
    topP: parsed.options.topP,
    model: parsed.options.model,
    timeout: parsed.options.timeout,
    includeReasoning: parsed.options.includeReasoning,
    structuredOutput: parsed.options.structuredOutput,
  };

  if (parsed.options.stream) {
    if (requestOptions.structuredOutput && requestOptions.structuredOutput !== false) {
      console.error('❌ Streaming mode requires --no-structured-output');
      process.exit(1);
      return;
    }
    requestOptions.structuredOutput = false;
    console.log('🔊 Streaming response (Ctrl+C to cancel):\n');
    const session = runtime.streamLLM(parsed.prompt, {
      ...requestOptions,
      provider: parsed.options.provider,
    });

    const handleSigint = () => {
      console.log('\n⚠️  Cancelling stream...');
      session.cancel();
    };

    process.on('SIGINT', handleSigint);

    try {
      for await (const chunk of session.chunks) {
        if (chunk.type === 'text' && chunk.content) {
          process.stdout.write(chunk.content);
        }
      }
      const response = await session.response;
      console.log(`\n\n(~${(response.confidence * 100).toFixed(1)}%)`);
    } catch (error) {
      console.error(`\n❌ ${formatError(error, parsed.prompt)}`);
    } finally {
      process.off('SIGINT', handleSigint);
    }
  } else {
    const provider = runtime.getLLMProvider(parsed.options.provider);
    if (!provider) {
      const providerName = parsed.options.provider || runtime.getDefaultLLMProvider() || 'default';
      console.error(`❌ LLM provider '${providerName}' not configured.`);
      process.exit(1);
    }
    const request = new LLMRequest(parsed.prompt, requestOptions);
    try {
      const response = await provider.complete(request);
      console.log(`${response.content}\n(~${(response.confidence * 100).toFixed(1)}%)`);
    } catch (error) {
      console.error(`❌ ${formatError(error, parsed.prompt)}`);
      process.exit(1);
    }
  }
}

function formatError(error: unknown, source?: string): string {
  if (error instanceof DiagnosticError) {
    return formatDiagnostic(error.diagnostic, source);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function startREPL(): Promise<void> {
  // Create REPL instance
  const repl = new PrismREPL();
  
  // Set up LLM providers from environment
  const providers = LLMConfigManager.createFromEnvironment();
  const defaultProvider = LLMConfigManager.getDefaultProvider();
  
  // Register all available providers
  for (const [name, provider] of Object.entries(providers)) {
    repl.registerLLMProvider(name, provider);
  }
  
  // Set default provider
  repl.setDefaultLLMProvider(defaultProvider);
  
  // Show provider status (only in non-test mode)
  if (process.env.NODE_ENV !== 'test') {
    const availableProviders = LLMConfigManager.getAvailableProviders();
    if (availableProviders.length === 1 && availableProviders[0] === 'mock') {
      console.log('⚠️  Only mock LLM provider available. Set CLAUDE_API_KEY or GEMINI_API_KEY for real AI integration.');
    } else {
      console.log(`🤖 LLM providers: ${availableProviders.join(', ')} (default: ${defaultProvider})`);
    }
  }

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'prism> '
  });

  // Show welcome message (only in non-test mode)
  if (process.env.NODE_ENV !== 'test') {
    console.log(repl.getWelcomeMessage());
    console.log();
  }

  // Start the REPL loop
  rl.prompt();

  rl.on('line', async (input) => {
    try {
      const result = await repl.evaluate(input.trim());
      
      if (result.success) {
        if (result.value) {
          if (result.type === 'help' || result.type === 'vars' || result.type === 'history' || result.type === 'stats' || result.type === 'llm') {
            console.log(result.value);
          } else {
            console.log(`${result.value} (${result.type})`);
          }
        }
        
        if (result.shouldExit) {
          rl.close();
          return;
        }
      } else {
        console.error(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Unexpected error: ${formatError(error)}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nThanks for using Prism! 🚀');
    process.exit(0);
  });

  // Handle Ctrl+C gracefully
  rl.on('SIGINT', () => {
    if (repl.cancelActiveStream()) {
      console.log('\n⚠️  Streaming cancelled.');
      rl.prompt();
      return;
    }
    console.log('\n\nUse :exit to quit gracefully, or press Ctrl+C again to force exit.');
    rl.prompt();
  });
}

function showHelp(): void {
  console.log(`
🌟 Prism Programming Language CLI v${VERSION} 🌟

Usage:
  prism                    Start interactive REPL
  prism run [--watch] <file>  Run a Prism file (use --watch for hot reload)
  prism eval <code>        Evaluate Prism code
  prism llm [options] <prompt>  Send an LLM prompt (use --stream for live output)
  prism repl               Start interactive REPL (same as no args)
  prism --help, -h         Show this help message
  prism --version, -v      Show version information

LLM Options:
  --provider, -p <name>    Choose a configured provider
  --stream                 Stream text as it is generated
  --model <name>           Override the provider's model for this call
  --timeout <ms>           Abort the request after N milliseconds
  --temperature <value>    Adjust sampling temperature
  --maxTokens <value>      Limit completion token budget
  --topP <value>           Set nucleus sampling probability
  --include-reasoning      Ask providers that support it to return reasoning traces
  --no-include-reasoning   Disable reasoning metadata
  --structured-output      Force structured responses (default: true for non-streaming)
  --no-structured-output   Force plain text responses (required for streaming)

Interactive REPL Commands:
  :help     - Show REPL help
  :vars     - Show variables
  :clear    - Clear session  
  :history  - Show history
  :stats    - Show statistics
  :llm      - Show LLM status
  :exit     - Exit REPL

Examples:
  $ prism run example.prism
  $ prism eval "x = 42 ~> 0.9; print(x)"
  $ prism
  prism> 2 + 3
  5 (number)
  
  prism> llm("Hello AI!")
  Hello! How can I help you today? (~85.0%) (confident)
  
  prism> x = 42 ~> 0.9
  42 (~90.0%) (confident)

For more information, visit: https://github.com/HaruHunab1320/Prism-TS
Documentation: https://docs.prismlang.dev/
  `);
}

// Main CLI entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'repl') {
    // Start interactive REPL
    await startREPL().catch((error) => {
      console.error('Failed to start Prism REPL:', error);
      process.exit(1);
    });
  } else if (args[0] === '--help' || args[0] === '-h') {
    showHelp();
  } else if (args[0] === '--version' || args[0] === '-v') {
    console.log(`Prism v${VERSION}`);
  } else if (args[0] === 'run') {
    const runArgs = parseRunArguments(args.slice(1));
    if (!runArgs.filename) {
      console.error('❌ Error: Missing filename');
      console.error('Usage: prism run [--watch] <file>');
      process.exit(1);
    }
    await runFile(runArgs.filename, { watch: runArgs.watch });
  } else if (args[0] === 'eval') {
    if (args.length < 2) {
      console.error('❌ Error: Missing code to evaluate');
      console.error('Usage: prism eval <code>');
      process.exit(1);
    }
    // Join all remaining args as the code to evaluate
    const code = args.slice(1).join(' ');
    await evalCode(code);
  } else if (args[0] === 'llm') {
    if (args.length < 2) {
      console.error('❌ Error: Missing prompt for llm command');
      console.error('Usage: prism llm [--provider name] [--stream] <prompt>');
      process.exit(1);
    }
    await runLLMCommand(args.slice(1));
  } else {
    console.error(`❌ Unknown command: ${args[0]}`);
    console.error('Use --help for available options.');
    process.exit(1);
  }
}

// Run the CLI
main().catch((error) => {
  console.error(`❌ Fatal error: ${formatError(error)}`);
  process.exit(1);
});
