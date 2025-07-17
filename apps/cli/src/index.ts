#!/usr/bin/env node

import * as readline from 'readline';
import { PrismREPL } from '@prism-lang/repl';
import { LLMConfigManager } from '@prism-lang/llm';
import { getVersion, executeCode, readFileSync } from './cli-utils';

// Load environment variables from .env file early
try {
  require('dotenv').config();
} catch {
  // dotenv not available or .env file doesn't exist, continue without it
}

const VERSION = getVersion();

// Command handlers
async function runFile(filename: string): Promise<void> {
  try {
    // Read file contents
    const code = readFileSync(filename);
    
    // Parse and execute
    console.log(`🚀 Running ${filename}...\n`);
    const result = await executeCode(code);
    
    if (result !== undefined && result !== null) {
      // Format the result similar to evalCode
      if (typeof result === 'object' && 'value' in result) {
        if ('confidence' in result && result.confidence) {
          const value = result.value.value !== undefined ? result.value.value : result.value;
          const confidence = typeof result.confidence === 'object' && 'value' in result.confidence 
            ? result.confidence.value 
            : result.confidence;
          console.log(`\nResult: ${value} (~${confidence})`);
        } else if ('value' in result) {
          console.log('\nResult:', result.value);
        } else {
          console.log('\nResult:', result);
        }
      } else {
        console.log('\nResult:', result);
      }
    }
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
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
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
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
  
  // Show provider status
  const availableProviders = LLMConfigManager.getAvailableProviders();
  if (availableProviders.length === 1 && availableProviders[0] === 'mock') {
    console.log('⚠️  Only mock LLM provider available. Set CLAUDE_API_KEY or GEMINI_API_KEY for real AI integration.');
  } else {
    console.log(`🤖 LLM providers: ${availableProviders.join(', ')} (default: ${defaultProvider})`);
  }

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'prism> '
  });

  // Show welcome message
  console.log(repl.getWelcomeMessage());
  console.log();

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
      console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nThanks for using Prism! 🚀');
    process.exit(0);
  });

  // Handle Ctrl+C gracefully
  rl.on('SIGINT', () => {
    console.log('\n\nUse :exit to quit gracefully, or press Ctrl+C again to force exit.');
    rl.prompt();
  });
}

function showHelp(): void {
  console.log(`
🌟 Prism Programming Language CLI v${VERSION} 🌟

Usage:
  prism                    Start interactive REPL
  prism run <file>         Run a Prism file
  prism eval <code>        Evaluate Prism code
  prism repl               Start interactive REPL (same as no args)
  prism --help, -h         Show this help message
  prism --version, -v      Show version information

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
    if (args.length < 2) {
      console.error('❌ Error: Missing filename');
      console.error('Usage: prism run <file>');
      process.exit(1);
    }
    await runFile(args[1]);
  } else if (args[0] === 'eval') {
    if (args.length < 2) {
      console.error('❌ Error: Missing code to evaluate');
      console.error('Usage: prism eval <code>');
      process.exit(1);
    }
    // Join all remaining args as the code to evaluate
    const code = args.slice(1).join(' ');
    await evalCode(code);
  } else {
    console.error(`❌ Unknown command: ${args[0]}`);
    console.error('Use --help for available options.');
    process.exit(1);
  }
}

// Run the CLI
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});