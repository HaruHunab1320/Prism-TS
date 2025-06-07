#!/usr/bin/env node

const { program } = require('commander');
const { Prism } = require('../dist/index.js');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');

// Load environment variables
require('dotenv').config();

program
  .name('prism')
  .description('The Prism programming language - where AI meets certainty')
  .version('1.0.0');

program
  .command('run <file>')
  .description('Execute a Prism file')
  .action(async (file) => {
    try {
      const prism = new Prism();
      const filePath = path.resolve(file);
      
      console.log(chalk.blue(`Running ${filePath}...`));
      const result = await prism.executeFile(filePath);
      
      if (result !== null && result !== undefined) {
        console.log(chalk.green('Result:'), result);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('repl')
  .description('Start the Prism interactive REPL')
  .action(async () => {
    console.log(chalk.cyan('🌟 Prism Language REPL v1.0'));
    console.log(chalk.gray("Type 'exit' to quit, 'help' for commands\n"));

    const prism = new Prism();
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.blue('prism> ')
    });

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();
      
      if (input === 'exit' || input === 'quit') {
        console.log(chalk.yellow('Goodbye!'));
        rl.close();
        process.exit(0);
      }
      
      if (input === 'help') {
        console.log(chalk.cyan('Available commands:'));
        console.log('  help     - Show this help message');
        console.log('  exit     - Exit the REPL');
        console.log('  clear    - Clear the screen');
        console.log('\nEnter any Prism expression to evaluate it.');
        rl.prompt();
        return;
      }
      
      if (input === 'clear') {
        console.clear();
        rl.prompt();
        return;
      }

      if (input === '') {
        rl.prompt();
        return;
      }

      try {
        const result = await prism.execute(input);
        if (result !== null && result !== undefined) {
          console.log(chalk.green(result));
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error.message);
      }
      
      rl.prompt();
    });

    rl.on('close', () => {
      process.exit(0);
    });
  });

program
  .command('eval <code>')
  .description('Evaluate a Prism expression')
  .action(async (code) => {
    try {
      const prism = new Prism();
      const result = await prism.execute(code);
      
      if (result !== null && result !== undefined) {
        console.log(result);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}