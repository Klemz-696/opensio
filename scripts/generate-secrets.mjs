import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');

const args = process.argv.slice(2);
const isDev = args.includes('--target=dev') || args.includes('--dev') || (args.includes('--target') && args[args.indexOf('--target') + 1] === 'dev');
const isForce = args.includes('--force') || args.includes('-f');

function generateSecretString() {
  return randomBytes(48).toString('base64');
}

function handleDev() {
  const apiEnvPath = join(rootDir, 'apps', 'api', '.env');
  const apiEnvExamplePath = join(rootDir, 'apps', 'api', '.env.example');

  if (!existsSync(apiEnvExamplePath)) {
    console.error('❌ [Erreur] Template apps/api/.env.example introuvable.');
    process.exit(1);
  }

  if (existsSync(apiEnvPath) && !isForce) {
    let content = readFileSync(apiEnvPath, 'utf8');
    const jwtSecret = generateSecretString();
    if (/^JWT_SECRET=.*/m.test(content)) {
      content = content.replace(/^JWT_SECRET=.*/m, `JWT_SECRET=${jwtSecret}`);
    } else {
      content += `\nJWT_SECRET=${jwtSecret}\n`;
    }
    writeFileSync(apiEnvPath, content);
    console.log('✅ [Succès] JWT_SECRET mis à jour dans apps/api/.env');
    return;
  }

  try {
    let content = readFileSync(apiEnvExamplePath, 'utf8');
    const jwtSecret = generateSecretString();
    content = content.replace(/^JWT_SECRET=.*/m, `JWT_SECRET=${jwtSecret}`);
    writeFileSync(apiEnvPath, content);
    console.log('✅ [Succès] Fichier apps/api/.env initialisé avec un JWT_SECRET sécurisé !');
  } catch (error) {
    console.error('❌ [Erreur] Impossible d\'écrire apps/api/.env :', error);
    process.exit(1);
  }
}

function handleProd() {
  const examplePath = join(rootDir, '.env.production.example');
  const prodPath = join(rootDir, '.env.production');

  if (existsSync(prodPath) && !isForce) {
    console.error('❌ [Erreur] Le fichier .env.production existe déjà.');
    console.error('Si vous souhaitez le recréer, utilisez --force ou supprimez-le manuellement.');
    process.exit(1);
  }

  try {
    let content = readFileSync(examplePath, 'utf8');

    // Génération de secrets aléatoires
    const pgPassword = randomBytes(16).toString('hex'); // 32 chars
    const jwtSecret = generateSecretString();

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
}

if (isDev) {
  handleDev();
} else {
  handleProd();
}
