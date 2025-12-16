/**
 * Delete command - remove preview deployments
 */
import ora from 'ora';
import chalk from 'chalk';
import { CloudflareAPI, CloudflareAPIError } from '../lib/cloudflare-api.js';
import { getEnv } from '../config/index.js';
import { logger } from '../utils/logger.js';
import {
  selectDeploymentsToDelete,
  confirmDeletion,
  confirmDeleteAll,
} from '../utils/prompts.js';
import type { Deployment } from '../lib/cloudflare-api.js';

export interface DeleteOptions {
  dryRun?: boolean;
  force?: boolean;
  all?: boolean;
}

export async function deleteCommand(
  scriptName: string,
  options: DeleteOptions
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

    if (deployments.length === 1) {
      logger.warn(
        'Only the active deployment exists. Cannot delete the active deployment.'
      );
      return;
    }

    // Exclude the first (active) deployment
    const deletableDeployments = deployments.slice(1);

    logger.info(
      `Found ${deployments.length} deployment(s), ${deletableDeployments.length} can be deleted.`
    );
    logger.newline();

    // Determine which deployments to delete
    let toDelete: Deployment[];
    if (options.all) {
      toDelete = deletableDeployments;
      logger.info(`Selected all ${toDelete.length} deletable deployment(s).`);
    } else {
      toDelete = await selectDeploymentsToDelete(deployments);
    }

    if (toDelete.length === 0) {
      logger.info('No deployments selected. Exiting.');
      return;
    }

    // Dry run mode
    if (options.dryRun) {
      logger.dryRun('The following deployments would be deleted:');
      logger.newline();
      toDelete.forEach((d) => {
        const date = new Date(d.created_on).toLocaleString();
        console.log(`  - ${d.id.slice(0, 8)}... (${date}) by ${d.author_email}`);
      });
      logger.newline();
      logger.dryRun(
        `Total: ${toDelete.length} deployment(s). No actual deletion performed.`
      );
      return;
    }

    // Confirm deletion
    const shouldProceed = options.all
      ? await confirmDeleteAll(toDelete.length, { force: options.force })
      : await confirmDeletion(toDelete.length, { force: options.force });

    if (!shouldProceed) {
      logger.info('Deletion cancelled.');
      return;
    }

    // Execute deletion
    logger.newline();
    const deleteSpinner = ora('Deleting deployments...').start();

    const result = await api.deleteDeployments(
      scriptName,
      toDelete.map((d) => d.id),
      (completed, total, id) => {
        deleteSpinner.text = `Deleting deployments... (${completed}/${total}) - ${id.slice(0, 8)}...`;
      }
    );

    deleteSpinner.stop();

    // Report results
    if (result.success.length > 0) {
      logger.success(
        `Successfully deleted ${result.success.length} deployment(s).`
      );
    }

    if (result.failed.length > 0) {
      logger.error(`Failed to delete ${result.failed.length} deployment(s):`);
      result.failed.forEach(({ id, error }) => {
        console.log(chalk.red(`  - ${id.slice(0, 8)}...: ${error}`));
      });
    }

    // Summary
    logger.newline();
    if (result.failed.length === 0) {
      logger.success(chalk.green('All selected deployments have been deleted.'));
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
