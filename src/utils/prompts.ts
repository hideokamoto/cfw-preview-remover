/**
 * Interactive prompts for user input
 */
import { checkbox, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import type { Deployment } from '../lib/cloudflare-api.js';

/**
 * Display deployments and let user select which to delete
 * The first deployment (active) is disabled and cannot be selected
 */
export async function selectDeploymentsToDelete(
  deployments: Deployment[]
): Promise<Deployment[]> {
  if (deployments.length === 0) {
    return [];
  }

  const choices = deployments.map((d, index) => {
    const date = new Date(d.created_on).toLocaleString();
    const idShort = d.id.slice(0, 8);

    return {
      name: `${idShort}... | ${date} | ${d.author_email}`,
      value: d,
      disabled:
        index === 0
          ? chalk.yellow('(Currently active - cannot delete)')
          : false,
    };
  });

  return checkbox({
    message:
      'Select deployments to delete (Space to select, Enter to confirm):',
    choices,
    pageSize: 15,
  });
}

/**
 * Confirm deletion with the user
 */
export async function confirmDeletion(
  count: number,
  options: { force?: boolean; dryRun?: boolean } = {}
): Promise<boolean> {
  if (options.dryRun) {
    return false;
  }

  if (options.force) {
    return true;
  }

  return confirm({
    message: chalk.red(
      `You are about to delete ${count} deployment(s). This action cannot be undone. Continue?`
    ),
    default: false,
  });
}

/**
 * Confirm deletion of all non-active deployments
 */
export async function confirmDeleteAll(
  count: number,
  options: { force?: boolean } = {}
): Promise<boolean> {
  if (options.force) {
    return true;
  }

  return confirm({
    message: chalk.red(
      `You are about to delete ALL ${count} non-active deployment(s). This action cannot be undone. Continue?`
    ),
    default: false,
  });
}
