import { Command } from 'commander';
import chalk from 'chalk';
import { SessionStore } from '../session/store.js';

const store = new SessionStore();

export function registerStatusCommand(program: Command) {
  program
    .command('status')
    .description('List recent sessions and metadata')
    .action(async () => {
      const sessions = await store.list();
      if (!sessions.length) {
        console.log(chalk.yellow('No sessions yet. Start with `prism-agent chat "hello"`'));
        return;
      }

      sessions
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 10)
        .forEach((session) => {
          const lastMessage = session.messages.at(-1);
          console.log(chalk.cyan(session.id), '-', session.label);
          console.log(`  updated: ${session.updatedAt}`);
          if (lastMessage) {
            console.log(`  last: [${lastMessage.role}] ${lastMessage.content.slice(0, 100)}`);
          }
        });
    });
}
