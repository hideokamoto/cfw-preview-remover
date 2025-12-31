/**
 * Cloudflare API client for Workers deployments management
 */

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
}

export interface DeploymentVersion {
  version_id: string;
  percentage: number;
}

export interface Deployment {
  id: string;
  created_on: string;
  author_email: string;
  source: string;
  strategy: string;
  versions: DeploymentVersion[];
}

/**
 * Worker Version - represents an immutable snapshot of code and configuration
 * Versions are what preview URLs are tied to
 */
export interface Version {
  id: string;
  number: number;
  metadata: {
    author_id?: string;
    author_email?: string;
    source?: string;
    created_on?: string;
    modified_on?: string;
  };
  annotations?: {
    'workers/triggered_by'?: string;
    'workers/message'?: string;
    'workers/tag'?: string;
  };
}

interface VersionsResult {
  items: Version[];
}

interface CloudflareResponse<T> {
  success: boolean;
  result: T;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

interface DeploymentsResult {
  deployments: Deployment[];
}

export class CloudflareAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errors?: Array<{ code: number; message: string }>
  ) {
    super(message);
    this.name = 'CloudflareAPIError';
  }
}

export class RateLimitError extends CloudflareAPIError {
  constructor(public retryAfter?: number) {
    super('Rate limit exceeded. Please wait before retrying.');
    this.name = 'RateLimitError';
    this.statusCode = 429;
  }
}

export class CloudflareAPI {
  private baseUrl = 'https://api.cloudflare.com/client/v4';
  private requestDelay = 200; // ms between requests to avoid rate limiting

  constructor(private config: CloudflareConfig) {}

  /**
   * Sanitize error messages to prevent token leakage
   */
  private sanitize(message: string): string {
    return message.replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]');
  }

  /**
   * Make an authenticated request to the Cloudflare API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new RateLimitError(retryAfter ? parseInt(retryAfter, 10) : undefined);
    }

    // Handle permission errors
    if (response.status === 403) {
      throw new CloudflareAPIError(
        'Permission denied. Please check your API token has the required permissions (Workers Scripts: Read and Edit).',
        403
      );
    }

    // Handle not found
    if (response.status === 404) {
      throw new CloudflareAPIError(
        'Resource not found. Please check the script name and account ID.',
        404
      );
    }

    let data: CloudflareResponse<T>;
    try {
      data = (await response.json()) as CloudflareResponse<T>;
    } catch {
      throw new CloudflareAPIError(
        this.sanitize(`Failed to parse API response: ${response.statusText}`),
        response.status
      );
    }

    if (!data.success) {
      const errorMessage =
        data.errors?.[0]?.message || 'Unknown API error';
      throw new CloudflareAPIError(
        this.sanitize(errorMessage),
        response.status,
        data.errors
      );
    }

    return data.result;
  }

  /**
   * List all deployments for a Worker script
   */
  async listDeployments(scriptName: string): Promise<Deployment[]> {
    const result = await this.request<DeploymentsResult>(
      `/accounts/${this.config.accountId}/workers/scripts/${scriptName}/deployments`
    );
    return result.deployments;
  }

  /**
   * Delete a specific deployment
   * Note: The currently active deployment (first in the list) cannot be deleted
   */
  async deleteDeployment(
    scriptName: string,
    deploymentId: string
  ): Promise<void> {
    await this.request(
      `/accounts/${this.config.accountId}/workers/scripts/${scriptName}/deployments/${deploymentId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * List all versions for a Worker script
   * Versions are immutable snapshots of code and configuration
   * The first version in the list is the latest (currently deployed) version
   */
  async listVersions(scriptName: string): Promise<Version[]> {
    const result = await this.request<VersionsResult>(
      `/accounts/${this.config.accountId}/workers/scripts/${scriptName}/versions`
    );
    return result.items;
  }

  /**
   * Delete a specific version
   * Note: The currently active version (referenced by the active deployment) cannot be deleted
   */
  async deleteVersion(
    scriptName: string,
    versionId: string
  ): Promise<void> {
    await this.request(
      `/accounts/${this.config.accountId}/workers/scripts/${scriptName}/versions/${versionId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Attempt to delete a version, returning success status
   */
  private async tryDeleteVersion(
    scriptName: string,
    id: string
  ): Promise<{ success: true } | { success: false; error: string; isRateLimit?: boolean; retryAfter?: number }> {
    try {
      await this.deleteVersion(scriptName, id);
      return { success: true };
    } catch (error) {
      const isRateLimit = error instanceof RateLimitError;
      const retryAfter = isRateLimit ? (error as RateLimitError).retryAfter : undefined;
      return { success: false, error: this.formatError(error), isRateLimit, retryAfter };
    }
  }

  /**
   * Delete multiple versions with rate limiting protection
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
      let result = await this.tryDeleteVersion(scriptName, id);

      // Retry once on rate limit error
      if (!result.success && result.isRateLimit) {
        const waitTime = (result.retryAfter || 60) * 1000;
        await this.delay(waitTime);
        result = await this.tryDeleteVersion(scriptName, id);
      }

      if (result.success) {
        success.push(id);
        onProgress?.(i + 1, versionIds.length, id);
      } else {
        failed.push({ id, error: result.error });
      }

      // Add delay between requests to avoid rate limiting
      if (i < versionIds.length - 1) {
        await this.delay(this.requestDelay);
      }
    }

    return { success, failed };
  }

  /**
   * Format error message from unknown error type
   */
  private formatError(error: unknown): string {
    return error instanceof Error
      ? this.sanitize(error.message)
      : 'Unknown error';
  }

  /**
   * Attempt to delete a deployment, returning success status
   */
  private async tryDelete(
    scriptName: string,
    id: string
  ): Promise<{ success: true } | { success: false; error: string; isRateLimit?: boolean; retryAfter?: number }> {
    try {
      await this.deleteDeployment(scriptName, id);
      return { success: true };
    } catch (error) {
      const isRateLimit = error instanceof RateLimitError;
      const retryAfter = isRateLimit ? (error as RateLimitError).retryAfter : undefined;
      return { success: false, error: this.formatError(error), isRateLimit, retryAfter };
    }
  }

  /**
   * Delete multiple deployments with rate limiting protection
   */
  async deleteDeployments(
    scriptName: string,
    deploymentIds: string[],
    onProgress?: (completed: number, total: number, id: string) => void
  ): Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }> {
    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (let i = 0; i < deploymentIds.length; i++) {
      const id = deploymentIds[i];
      let result = await this.tryDelete(scriptName, id);

      // Retry once on rate limit error
      if (!result.success && result.isRateLimit) {
        const waitTime = (result.retryAfter || 60) * 1000;
        await this.delay(waitTime);
        result = await this.tryDelete(scriptName, id);
      }

      if (result.success) {
        success.push(id);
        onProgress?.(i + 1, deploymentIds.length, id);
      } else {
        failed.push({ id, error: result.error });
      }

      // Add delay between requests to avoid rate limiting
      if (i < deploymentIds.length - 1) {
        await this.delay(this.requestDelay);
      }
    }

    return { success, failed };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
