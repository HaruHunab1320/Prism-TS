import chalk from 'chalk';

export const log = {
  info(message: string) {
    console.log(chalk.blue('info'), message);
  },
  success(message: string) {
    console.log(chalk.green('success'), message);
  },
  warn(message: string) {
    console.warn(chalk.yellow('warn'), message);
  },
  error(message: string) {
    console.error(chalk.red('error'), message);
  },
};
