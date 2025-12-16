/**
 * Logger utility with colored output
 */
import chalk from 'chalk';

export const logger = {
  info: (message: string) => {
    console.log(chalk.blue('ℹ'), message);
  },

  success: (message: string) => {
    console.log(chalk.green('✓'), message);
  },

  warn: (message: string) => {
    console.log(chalk.yellow('⚠'), message);
  },

  error: (message: string) => {
    console.error(chalk.red('✖'), message);
  },

  debug: (message: string) => {
    if (process.env.DEBUG) {
      console.log(chalk.gray('⚙'), message);
    }
  },

  /**
   * Log a dry run message
   */
  dryRun: (message: string) => {
    console.log(chalk.cyan('[DRY RUN]'), message);
  },

  /**
   * Format a date string safely, returning fallback for invalid dates
   */
  formatDate: (dateString: string): string => {
    if (!dateString) {
      return 'Unknown date';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      logger.debug(`Invalid date format: ${dateString}`);
      return dateString;
    }
    return date.toLocaleString();
  },

  /**
   * Print a table-like list of deployments
   */
  printDeployments: (
    deployments: Array<{
      id: string;
      created_on: string;
      author_email: string;
      isActive?: boolean;
    }>
  ) => {
    console.log('');
    deployments.forEach((d, index) => {
      const date = logger.formatDate(d.created_on);
      const idShort = d.id.slice(0, 8);
      const activeLabel = d.isActive
        ? chalk.yellow(' (ACTIVE - cannot delete)')
        : '';

      console.log(
        `  ${chalk.gray(`${index + 1}.`)} ${chalk.white(idShort)}... | ${chalk.gray(date)} | ${chalk.blue(d.author_email)}${activeLabel}`
      );
    });
    console.log('');
  },

  /**
   * Print a blank line
   */
  newline: () => {
    console.log('');
  },
};
