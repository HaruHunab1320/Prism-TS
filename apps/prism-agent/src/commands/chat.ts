import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { SessionStore } from '../session/store.js';
import { log } from '../utils/logger.js';

const store = new SessionStore();

function formatPrompt(words: string[]): string {
  return words.join(' ').trim();
}

async function simulateAssistantResponse(prompt: string): Promise<string> {
  // Placeholder response; future versions will call @prism-lang/llm orchestrations.
  const summary = prompt ? prompt.slice(0, 80) : 'idle';
  return `Preview agent response for "${summary}" (LLM integration coming soon).`;
}

export function registerChatCommand(program: Command) {
  program
    .command('chat')
    .description('Chat with the Prism agent (preview)')
    .argument('[prompt...]', 'prompt to send')
    .option('-s, --session <id>', 'resume an existing session')
    .option('-l, --label <label>', 'label for a new session')
    .action(async (words: string[], options: { session?: string; label?: string }) => {
      const prompt = formatPrompt(words);
      const spinner = ora('Connecting to Prism agent...').start();

      try {
        let sessionId = options.session;
        let sessionLabel = options.label || prompt || 'untitled';

        if (!sessionId) {
          const session = await store.create(sessionLabel);
          sessionId = session.id;
          spinner.text = `Created session ${sessionId}`;
        }

        if (prompt) {
          await store.appendMessage(sessionId, {
            role: 'user',
            content: prompt,
            timestamp: new Date().toISOString(),
          });
        }

        const assistant = await simulateAssistantResponse(prompt);
        await store.appendMessage(sessionId, {
          role: 'assistant',
          content: assistant,
          timestamp: new Date().toISOString(),
        });

        spinner.stop();
        log.success(`Session ${sessionId}`);
        console.log(chalk.cyan('agent:'), assistant);
        log.info('LLM + tool integrations will be wired up in upcoming milestones.');
      } catch (error: any) {
        spinner.stop();
        log.error(error.message || String(error));
        process.exitCode = 1;
      }
    });
}
