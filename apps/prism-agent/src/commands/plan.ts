import { Command } from 'commander';
import chalk from 'chalk';
import { SessionStore } from '../session/store.js';
import { log } from '../utils/logger.js';

const store = new SessionStore();

interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in-progress' | 'done';
}

function makePlaceholderPlan(goal: string): PlanStep[] {
  const base = goal || 'Resolve task';
  return [
    { id: 'analyze', description: `${base}: analyze repository state`, status: 'pending' },
    { id: 'implement', description: `${base}: implement changes`, status: 'pending' },
    { id: 'validate', description: `${base}: run tests & lint`, status: 'pending' },
  ];
}

export function registerPlanCommand(program: Command) {
  program
    .command('plan')
    .description('Draft a task plan (stub implementation)')
    .argument('<goal...>', 'natural language goal')
    .option('-s, --session <id>', 'associate plan with an existing session')
    .action(async (goalWords: string[], options: { session?: string }) => {
      const goal = goalWords.join(' ');
      const plan = makePlaceholderPlan(goal);
      console.log(chalk.magentaBright(`Plan for: ${goal}`));
      plan.forEach((step, index) => {
        console.log(`  ${index + 1}. [${step.status}] ${step.description}`);
      });

      if (options.session) {
        await store.appendMessage(options.session, {
          role: 'assistant',
          content: `Draft plan:\n${plan.map((step, idx) => `${idx + 1}. ${step.description}`).join('\n')}`,
          timestamp: new Date().toISOString(),
        });
        log.info(`Appended plan to session ${options.session}`);
      } else {
        log.warn('No session specified; use --session to persist this plan.');
      }
    });
}
