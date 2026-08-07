import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

// Next.js loads the root .env.local automatically; the independent worker does not.
// `override: false` preserves environment values supplied by a production worker host.
loadEnv({ path: resolve(process.cwd(), "../.env.local"), override: false, quiet: true });

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  REDIS_URL: z.string().url(),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
});

export const config = () => schema.parse(process.env);
