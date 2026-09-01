import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const examplePath = join(rootDir, '.env.production.example');
const prodPath = join(rootDir, '.env.production');

if (existsSync(prodPath)) {
  console.error('❌ [Erreur] Le fichier .env.production existe déjà.');
  console.error('Si vous souhaitez le recréer, supprimez-le manuellement avant de relancer ce script.');
  process.exit(1);
}

try {
  let content = readFileSync(examplePath, 'utf8');

  // Génération de secrets aléatoires
  const pgPassword = randomBytes(16).toString('hex'); // 32 chars
  const jwtSecret = randomBytes(48).toString('base64'); // 64 chars

  // Remplacement
  content = content.replace(
    /POSTGRES_PASSWORD=change-me/g,
    `POSTGRES_PASSWORD=${pgPassword}`
  );
  
  content = content.replace(
    /DATABASE_URL=postgresql:\/\/opensio:change-me@db:5432\/opensio\?schema=public/g,
    `DATABASE_URL=postgresql://opensio:${pgPassword}@db:5432/opensio?schema=public`
  );

  content = content.replace(
    /JWT_SECRET=change-this-to-a-very-secure-random-64-bytes-secret-key-for-jwt-signing/g,
    `JWT_SECRET=${jwtSecret}`
  );

  writeFileSync(prodPath, content);
  
  console.log('✅ [Succès] Fichier .env.production généré avec succès !');
  console.log('N\'oubliez pas de le consulter pour ajuster DOMAIN ou SEED_ADMIN_PASSWORD si nécessaire.');
} catch (error) {
  console.error('❌ [Erreur] Impossible de générer le fichier .env.production :', error);
  process.exit(1);
}
