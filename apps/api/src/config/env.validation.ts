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
  TERMINAL_ENABLED: z
    .string()
    .transform((val) => val.toLowerCase() === 'true')
    .or(z.boolean())
    .default(true),
  AI_ENABLED: z
    .string()
    .transform((val) => val.toLowerCase() === 'true')
    .or(z.boolean())
    .default(true),
  AI_PROVIDER: z.enum(['openai-compatible', 'null']).default('openai-compatible'),
  OLLAMA_BASE_URL: z.string().optional(),
  AI_BASE_URL: z.string().optional().default('http://localhost:11434/v1'),
  AI_MODEL: z.string().default('llama3.1:8b'),
  AI_API_KEY: z.string().optional(),
  AI_RATE_LIMIT_HOURLY: z.coerce.number().int().positive().default(20),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
}).refine(
  (data) => {
    if (data.NODE_ENV === 'test') {
      return true;
    }
    const secret = data.JWT_SECRET.toLowerCase();
    const isDefault =
      secret === 'change-this-to-a-very-secure-random-64-bytes-secret-key-for-jwt-signing' ||
      secret === 'generate-64-random-bytes';
    const hasTemplateKeyword =
      secret.includes('change-me') || secret.includes('change-this');
    return !isDefault && !hasTemplateKeyword;
  },
  {
    message:
      'JWT_SECRET non sécurisé : les valeurs par défaut de template ("change-this", "change-me") sont interdites. Générez un secret aléatoire de 64 octets minimum.',
    path: ['JWT_SECRET'],
  }
);

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
