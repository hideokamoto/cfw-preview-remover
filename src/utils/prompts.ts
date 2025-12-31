/**
 * Interactive prompts for user input
 */
import { checkbox, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import type { Deployment, Version } from '../lib/cloudflare-api.js';

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
  options: { force?: boolean } = {}
): Promise<boolean> {
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

/**
 * Display versions and let user select which to delete
 * The first version (active) is disabled and cannot be selected
 */
export async function selectVersionsToDelete(
  versions: Version[]
): Promise<Version[]> {
  if (versions.length === 0) {
    return [];
  }

  const choices = versions.map((v, index) => {
    const date = v.metadata.created_on
      ? new Date(v.metadata.created_on).toLocaleString()
      : 'Unknown date';
    const idShort = v.id.slice(0, 8);
    const author = v.metadata.author_email || 'unknown';
    const tag = v.annotations?.['workers/tag'];
    const tagLabel = tag ? ` [${tag}]` : '';

    return {
      name: `${idShort}... | #${v.number} | ${date} | ${author}${tagLabel}`,
      value: v,
      disabled:
        index === 0
          ? chalk.yellow('(Currently active - cannot delete)')
          : false,
    };
  });

  return checkbox({
    message:
      'Select versions to delete (Space to select, Enter to confirm):',
    choices,
    pageSize: 15,
  });
}

/**
 * Confirm version deletion with the user
 */
export async function confirmVersionDeletion(
  count: number,
  options: { force?: boolean } = {}
): Promise<boolean> {
  if (options.force) {
    return true;
  }

  return confirm({
    message: chalk.red(
      `You are about to delete ${count} version(s). This will remove their preview URLs permanently. Continue?`
    ),
    default: false,
  });
}

/**
 * Confirm deletion of all non-active versions
 */
export async function confirmDeleteAllVersions(
  count: number,
  options: { force?: boolean } = {}
): Promise<boolean> {
  if (options.force) {
    return true;
  }

  return confirm({
    message: chalk.red(
      `You are about to delete ALL ${count} non-active version(s). This will remove all preview URLs permanently. Continue?`
    ),
    default: false,
  });
}
