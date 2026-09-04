import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Charge les fichiers d'environnement (.env) de manière résiliente.
 * Ordre de recherche sans écraser les variables déjà fournies par le système ou Turbo :
 * 1. process.cwd()/.env & .env.local
 * 2. Dossier de l'API (apps/api/.env)
 * 3. Racine du monorepo (.env & .env.local)
 */
export function loadEnv(): void {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../../.env.local'),
  ];

  const loaded = new Set<string>();

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath) && !loaded.has(envPath)) {
      dotenv.config({ path: envPath, override: false });
      loaded.add(envPath);
    }
  }
}

// Exécution automatique au premier import
loadEnv();
