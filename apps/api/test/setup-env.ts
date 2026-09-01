import * as fs from 'node:fs';
import * as path from 'node:path';

// Forcer NODE_ENV à test
process.env.NODE_ENV = 'test';

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    // Priorité aux variables définies dans .env.test si non spécifiées explicitement
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

// 1. Charger .env.test local ou racine
const rootEnvTest = path.resolve(__dirname, '../../../.env.test');
const localEnvTest = path.resolve(__dirname, '../.env.test');

if (fs.existsSync(localEnvTest)) {
  loadEnvFile(localEnvTest);
} else if (fs.existsSync(rootEnvTest)) {
  loadEnvFile(rootEnvTest);
}

// 2. Transformer toute URL de base de dev vers la base de test isolée opensio_test
if (process.env.DATABASE_URL) {
  if (process.env.DATABASE_URL.endsWith('/opensio')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/\/opensio$/, '/opensio_test');
  } else if (process.env.DATABASE_URL.includes('/opensio?')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('/opensio?', '/opensio_test?');
  }
} else {
  process.env.DATABASE_URL =
    'postgresql://opensio:opensio-super-secure-dev-db-pass-2026!@127.0.0.1:5432/opensio_test';
}

// 3. Garde-fou anti-écrasement de la base de dev
const dbUrl = (process.env.DATABASE_URL || '').toLowerCase();
const isDevDb = dbUrl.endsWith('/opensio') || dbUrl.includes('/opensio?');
const isTestDb = dbUrl.includes('test') || dbUrl.includes('_test');

if (isDevDb || !isTestDb) {
  throw new Error(
    `[GARDE-FOU BASE DE TEST] Refus d'exécution : DATABASE_URL cible la base de développement (${process.env.DATABASE_URL}). Les tests doivent impérativement cibler la base de test isolée opensio_test.`
  );
}
