/**
 * Environment configuration with validation
 */
import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file
dotenv.config();

const EnvSchema = z.object({
  CLOUDFLARE_API_TOKEN: z.string().min(1, 'CLOUDFLARE_API_TOKEN is required'),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1, 'CLOUDFLARE_ACCOUNT_ID is required'),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Validate and return environment variables
 * @throws {Error} if required environment variables are missing
 */
export function getEnv(): Env {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(
      `Environment validation failed:\n${errors}\n\nPlease set the required environment variables or create a .env file.`
    );
  }

  return result.data;
}
