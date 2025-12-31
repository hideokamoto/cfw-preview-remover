/**
 * cwc - Cloudflare Workers Cleaner CLI
 */
import { Command } from 'commander';
import { listCommand } from './commands/list.js';
import { deleteCommand } from './commands/delete.js';
import { versionsListCommand } from './commands/versions-list.js';
import { versionsDeleteCommand } from './commands/versions-delete.js';

const program = new Command();

program
  .name('cwc')
  .description(
    'Safely delete Cloudflare Workers preview deployments and versions.\n\n' +
      'Useful for cleaning up preview deployments after security vulnerabilities ' +
      'or when you need to remove old deployments and versions.'
  )
  .version('1.0.0');

// List command (deployments)
program
  .command('list <script-name>')
  .description('List all deployments for a Worker script')
  .option('--json', 'Output as JSON')
  .action(listCommand);

// Delete command (deployments)
program
  .command('delete <script-name>')
  .description('Select and delete preview deployments')
  .option('--dry-run', 'Show what would be deleted without actually deleting')
  .option('-y, --force', 'Skip confirmation prompt')
  .option('--all', 'Delete all non-active deployments')
  .action(deleteCommand);

// Versions subcommand group
const versions = program
  .command('versions')
  .description('Manage Worker versions (preview URLs are tied to versions)');

// Versions list command
versions
  .command('list <script-name>')
  .description('List all versions for a Worker script')
  .option('--json', 'Output as JSON')
  .action(versionsListCommand);

// Versions delete command
versions
  .command('delete <script-name>')
  .description('Select and delete versions (removes preview URLs permanently)')
  .option('--dry-run', 'Show what would be deleted without actually deleting')
  .option('-y, --force', 'Skip confirmation prompt')
  .option('--all', 'Delete all non-active versions')
  .action(versionsDeleteCommand);

// Parse arguments
program.parse();
