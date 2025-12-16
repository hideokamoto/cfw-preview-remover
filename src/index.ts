/**
 * cwc - Cloudflare Workers Cleaner CLI
 */
import { Command } from 'commander';
import { listCommand } from './commands/list.js';
import { deleteCommand } from './commands/delete.js';

const program = new Command();

program
  .name('cwc')
  .description(
    'Safely delete Cloudflare Workers preview deployments.\n\n' +
      'Useful for cleaning up preview deployments after security vulnerabilities ' +
      'or when you need to remove old deployments.'
  )
  .version('1.0.0');

// List command
program
  .command('list <script-name>')
  .description('List all deployments for a Worker script')
  .option('--json', 'Output as JSON')
  .action(listCommand);

// Delete command
program
  .command('delete <script-name>')
  .description('Select and delete preview deployments')
  .option('--dry-run', 'Show what would be deleted without actually deleting')
  .option('-y, --force', 'Skip confirmation prompt')
  .option('--all', 'Delete all non-active deployments')
  .action(deleteCommand);

// Parse arguments
program.parse();
