/**
 * Wrangler wrapper for executing wrangler commands programmatically
 */
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WranglerConfig {
  apiToken: string;
  accountId: string;
}

export class WranglerWrapper {
  constructor(private config: WranglerConfig) {}

  /**
   * Delete a worker version using wrangler
   * @param scriptName Worker script name
   * @param versionId Version ID to delete
   */
  async deleteVersion(scriptName: string, versionId: string): Promise<void> {
    const env = {
      ...process.env,
      CLOUDFLARE_API_TOKEN: this.config.apiToken,
      CLOUDFLARE_ACCOUNT_ID: this.config.accountId,
    };

    // wrangler versions delete <script-name> <version-id>
    // Note: wrangler may use different command format, adjust if needed
    const command = `npx -y wrangler@latest versions delete ${scriptName} ${versionId} --account-id ${this.config.accountId}`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        env,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      // wrangler may output warnings to stderr, but that's usually fine
      if (stderr && !stderr.includes('warning') && !stderr.includes('WARN')) {
        // Only throw if it's not a warning
        const stderrLower = stderr.toLowerCase();
        if (!stderrLower.includes('warn') && stderr.trim().length > 0) {
          throw new Error(stderr);
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Extract the actual error message from the command output
      if (errorMessage.includes('Error:')) {
        const match = errorMessage.match(/Error: (.+)/);
        throw new Error(match ? match[1] : errorMessage);
      }
      throw new Error(`Failed to delete version using wrangler: ${errorMessage}`);
    }
  }

  /**
   * Delete multiple versions using wrangler
   */
  async deleteVersions(
    scriptName: string,
    versionIds: string[],
    onProgress?: (completed: number, total: number, id: string) => void
  ): Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }> {
    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (let i = 0; i < versionIds.length; i++) {
      const id = versionIds[i];
      try {
        await this.deleteVersion(scriptName, id);
        success.push(id);
        onProgress?.(i + 1, versionIds.length, id);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        failed.push({ id, error: errorMessage });
      }
    }

    return { success, failed };
  }
}

