import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL est requise'),
  JWT_SECRET: z
    .string()
    .min(64, 'JWT_SECRET doit contenir au moins 64 caractères (D-09)'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  REGISTRATION_ENABLED: z
    .string()
    .transform((val) => val.toLowerCase() === 'true')
    .or(z.boolean())
    .default(false),
  CONTENT_PATH: z.string().default('./content'),
  LAB_RUNNER: z.enum(['simulation', 'docker', 'proxmox']).default('simulation'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown> = process.env): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`❌ [Configuration] Erreurs de validation des variables d'environnement :\n${formattedErrors}`);
    throw new Error(`Variables d'environnement invalides :\n${formattedErrors}`);
  }

  return result.data;
}
