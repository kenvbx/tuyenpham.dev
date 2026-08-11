import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv({ quiet: true });

const DEFAULT_PORT = 4000;

const optionalUrlSchema = z
  .string()
  .trim()
  .url()
  .optional()
  .or(z.literal("").transform(() => undefined));

const envSchema = z.object({
  ADMIN_URL: z.string().trim().url(),
  APP_URL: z.string().trim().url(),
  CORS_ORIGINS: z
    .string()
    .trim()
    .min(1)
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().url()).min(1)),
  DATABASE_URL: optionalUrlSchema,
  ERROR_MONITORING_DSN: optionalUrlSchema,
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(DEFAULT_PORT),
  SUPABASE_ANON_KEY: z.string().trim().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
  SUPABASE_URL: z.string().trim().url(),
});

export type AppEnv = z.infer<typeof envSchema>;

function formatEnvError(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "env";
      return `- ${path}: ${issue.message}`;
    })
    .join("\n");
}

export function parseEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    throw new Error(`Invalid API environment configuration:\n${formatEnvError(result.error)}`);
  }

  return result.data;
}

export const appEnv = parseEnv();
