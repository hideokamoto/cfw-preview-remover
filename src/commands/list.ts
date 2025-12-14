/**
 * List command - displays all deployments for a Worker script
 */
import ora from 'ora';
import chalk from 'chalk';
import { CloudflareAPI, CloudflareAPIError } from '../lib/cloudflare-api.js';
import { getEnv } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface ListOptions {
  json?: boolean;
}

export async function listCommand(
  scriptName: string,
  options: ListOptions
): Promise<void> {
  const spinner = ora('Fetching deployments...').start();

  try {
    const env = getEnv();
    const api = new CloudflareAPI({
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: env.CLOUDFLARE_API_TOKEN,
    });

    const deployments = await api.listDeployments(scriptName);
    spinner.stop();

    if (deployments.length === 0) {
      logger.warn(`No deployments found for script "${scriptName}".`);
      return;
    }

    // JSON output mode
    if (options.json) {
      console.log(JSON.stringify(deployments, null, 2));
      return;
    }

    // Human-readable output
    console.log(
      chalk.bold(`\nDeployments for "${scriptName}" (${deployments.length} total):\n`)
    );

    logger.printDeployments(
      deployments.map((d, index) => ({
        ...d,
        isActive: index === 0,
      }))
    );

    const deletableCount = deployments.length - 1;
    if (deletableCount > 0) {
      logger.info(
        `${deletableCount} deployment(s) can be deleted. Use "${chalk.cyan(`cf-preview-cleaner delete ${scriptName}`)}" to remove them.`
      );
    } else {
      logger.info('Only the active deployment exists. Nothing to delete.');
    }
  } catch (error) {
    spinner.stop();

    if (error instanceof CloudflareAPIError) {
      logger.error(error.message);
      if (error.statusCode === 403) {
        logger.info(
          'Make sure your API token has "Workers Scripts: Read" permission.'
        );
      }
    } else if (error instanceof Error) {
      logger.error(error.message);
    } else {
      logger.error('An unknown error occurred.');
    }

    process.exit(1);
  }
}
