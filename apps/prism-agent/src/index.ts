#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'module';
import { registerChatCommand } from './commands/chat.js';
import { registerPlanCommand } from './commands/plan.js';
import { registerStatusCommand } from './commands/status.js';
import { log } from './utils/logger.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

async function main() {
  const program = new Command();
  program.name('prism-agent').description('Prism CLI coding agent (preview)').version(pkg.version);

  registerChatCommand(program);
  registerPlanCommand(program);
  registerStatusCommand(program);

  program.addHelpCommand(false);

  try {
    await program.parseAsync(process.argv);
  } catch (error: any) {
    log.error(error.message || String(error));
    process.exit(1);
  }
}

main();
