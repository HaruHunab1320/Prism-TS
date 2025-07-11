#!/usr/bin/env node

// Load environment variables from .env file early
try {
  require('dotenv').config();
} catch {
  // dotenv not available or .env file doesn't exist, continue without it
}

import * as readline from 'readline';
import { PrismREPL } from '@prism/repl';
import { LLMConfigManager } from '@prism/llm';

async function startREPL() {
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

// Handle command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  // Start interactive REPL
  startREPL().catch((error) => {
    console.error('Failed to start Prism REPL:', error);
    process.exit(1);
  });
} else if (args[0] === '--help' || args[0] === '-h') {
  console.log(`
🌟 Prism Programming Language CLI 🌟

Usage:
  prism                 Start interactive REPL
  prism --help          Show this help message
  prism --version       Show version information

Interactive REPL Commands:
  :help     - Show REPL help
  :vars     - Show variables
  :clear    - Clear session  
  :history  - Show history
  :stats    - Show statistics
  :exit     - Exit REPL

Examples:
  $ prism
  prism> 2 + 3
  5 (number)
  
  prism> llm("Hello AI!")
  I am a mock AI assistant... (~85.0%) (confident)
  
  prism> x = 42 ~> 0.9
  42 (~90.0%) (confident)

For more information, visit: https://github.com/your-repo/prism-ts
  `);
} else if (args[0] === '--version' || args[0] === '-v') {
  console.log(`Prism v1.0.21`);
} else {
  console.error(`Unknown option: ${args[0]}`);
  console.error('Use --help for available options.');
  process.exit(1);
}