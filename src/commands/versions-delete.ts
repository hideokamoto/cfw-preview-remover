/**
 * Versions Delete command - remove old versions and their preview URLs
 */
import ora from 'ora';
import chalk from 'chalk';
import { CloudflareAPI, CloudflareAPIError } from '../lib/cloudflare-api.js';
import { getEnv } from '../config/index.js';
import { logger } from '../utils/logger.js';
import {
  selectVersionsToDelete,
  confirmVersionDeletion,
  confirmDeleteAllVersions,
} from '../utils/prompts.js';
import type { Version } from '../lib/cloudflare-api.js';

export interface VersionsDeleteOptions {
  dryRun?: boolean;
  force?: boolean;
  all?: boolean;
}

export async function versionsDeleteCommand(
  scriptName: string,
  options: VersionsDeleteOptions
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

    if (versions.length === 1) {
      logger.warn(
        'Only the active version exists. Cannot delete the active version.'
      );
      return;
    }

    // Exclude the first (active) version
    const deletableVersions = versions.slice(1);

    logger.info(
      `Found ${versions.length} version(s), ${deletableVersions.length} can be deleted.`
    );
    logger.warn(
      chalk.yellow('Deleting versions will permanently remove their preview URLs!')
    );
    logger.newline();

    // Determine which versions to delete
    let toDelete: Version[];
    if (options.all) {
      toDelete = deletableVersions;
      logger.info(`Selected all ${toDelete.length} deletable version(s).`);
    } else {
      toDelete = await selectVersionsToDelete(versions);
    }

    if (toDelete.length === 0) {
      logger.info('No versions selected. Exiting.');
      return;
    }

    // Dry run mode
    if (options.dryRun) {
      logger.dryRun('The following versions would be deleted:');
      logger.printVersions(toDelete);
      logger.dryRun(
        `Total: ${toDelete.length} version(s). No actual deletion performed.`
      );
      return;
    }

    // Confirm deletion
    const shouldProceed = options.all
      ? await confirmDeleteAllVersions(toDelete.length, { force: options.force })
      : await confirmVersionDeletion(toDelete.length, { force: options.force });

    if (!shouldProceed) {
      logger.info('Deletion cancelled.');
      return;
    }

    // Execute deletion
    logger.newline();
    const deleteSpinner = ora('Deleting versions...').start();

    const result = await api.deleteVersions(
      scriptName,
      toDelete.map((v) => v.id),
      (completed, total, id) => {
        deleteSpinner.text = `Deleting versions... (${completed}/${total}) - ${id.slice(0, 8)}...`;
      }
    );

    deleteSpinner.stop();

    // Report results
    if (result.success.length > 0) {
      logger.success(
        `Successfully deleted ${result.success.length} version(s) and their preview URLs.`
      );
    }

    if (result.failed.length > 0) {
      logger.error(`Failed to delete ${result.failed.length} version(s):`);
      result.failed.forEach(({ id, error }) => {
        logger.error(`- ${id.slice(0, 8)}...: ${error}`);
      });
    }

    // Summary
    logger.newline();
    if (result.failed.length === 0) {
      logger.success(chalk.green('All selected versions have been deleted.'));
    } else {
      logger.warn(
        `Completed with ${result.failed.length} error(s). Please retry failed deletions.`
      );
      process.exit(1);
    }
  } catch (error) {
    spinner.stop();

    if (error instanceof CloudflareAPIError) {
      logger.error(error.message);
      if (error.statusCode === 403) {
        logger.info(
          'Make sure your API token has "Workers Scripts: Read" and "Workers Scripts: Edit" permissions.'
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
