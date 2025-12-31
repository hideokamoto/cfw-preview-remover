/**
 * Versions List command - displays all versions for a Worker script
 */
import ora from 'ora';
import chalk from 'chalk';
import { CloudflareAPI, CloudflareAPIError } from '../lib/cloudflare-api.js';
import { getEnv } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface VersionsListOptions {
  json?: boolean;
}

export async function versionsListCommand(
  scriptName: string,
  options: VersionsListOptions
): Promise<void> {
  const spinner = ora('Fetching versions...').start();

  try {
    const env = getEnv();
    const api = new CloudflareAPI({
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: env.CLOUDFLARE_API_TOKEN,
    });

    const versions = await api.listVersions(scriptName);
    spinner.stop();

    if (versions.length === 0) {
      logger.warn(`No versions found for script "${scriptName}".`);
      return;
    }

    // JSON output mode
    if (options.json) {
      console.log(JSON.stringify(versions, null, 2));
      return;
    }

    // Human-readable output
    console.log(
      chalk.bold(`\nVersions for "${scriptName}" (${versions.length} total):\n`)
    );

    logger.printVersions(
      versions.map((v, index) => ({
        ...v,
        isActive: index === 0,
      }))
    );

    const deletableCount = versions.length - 1;
    if (deletableCount > 0) {
      logger.info(
        `${deletableCount} version(s) can be deleted. Use "${chalk.cyan(`cwc versions delete ${scriptName}`)}" to remove them.`
      );
      logger.info(
        chalk.yellow('Deleting versions will permanently remove their preview URLs.')
      );
    } else {
      logger.info('Only the active version exists. Nothing to delete.');
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
