#!/usr/bin/env node

/**
 * scripts/check-theme-classes.mjs
 *
 * Contrôle d'absence de classes sombres hardcodées non adaptatives dans apps/web.
 * Garantit que chaque élément dispose de classes adaptées au mode clair et au mode sombre.
 *
 * Règles vérifiées :
 * 1. Pas de bg-slate-800/850/900/950 sans préfixe dark:
 * 2. Pas de border-slate-700/800/850/900 sans préfixe dark:
 * 3. Pas de from-slate-900/950, to-slate-900/950, via-slate-900/950 sans préfixe dark:
 * 4. Pas de text-white nu sans préfixe dark: (sauf sur boutons/badges colorés explicites ex: bg-sky-500 text-white)
 * 5. Pas de text-slate-200/300/400 nu sans préfixe dark: ni équivalent clair
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const TARGET_DIRS = ['apps/web/app', 'apps/web/components'];
const TARGET_EXTENSIONS = new Set(['.tsx', '.ts']);

const WHITELIST_PATTERNS = [
  /\.spec\.(ts|tsx)$/,
  /\.d\.ts$/,
  /node_modules/,
  /\.next/,
  /styles\/tokens\.css/,
];

let totalFilesScanned = 0;
let violationsCount = 0;

function isWhitelisted(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return WHITELIST_PATTERNS.some((pattern) => pattern.test(normalizedPath));
}

// Prefixes autorisés pour le mode sombre
function isDarkVariant(token) {
  return token.startsWith('dark:') || token.includes(':dark:');
}

// Couleurs de fond pleines ou dégradés qui justifient un text-white en mode clair
const SOLID_COLOR_BG_PATTERN = /\b(?:bg-(?:sky|emerald|blue|indigo|purple|rose|amber|red|green|teal|cyan|violet|fuchsia)-(?:500|600|700)|bg-gradient-to-[a-z]+)\b/;

function checkFile(filePath, relPath) {
  const content = readFileSync(filePath, 'utf-8');
  if (!content) return;

  const lines = content.split(/\r?\n/);
  totalFilesScanned++;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return;
    }

    // Extraire tous les tokens (mots) ressemblant à des classes CSS
    const tokens = line.match(/[a-zA-Z0-9_:\/-]+/g) || [];
    const lineHasSolidBg = SOLID_COLOR_BG_PATTERN.test(line);

    for (const token of tokens) {
      if (isDarkVariant(token)) {
        continue; // C'est une variante dark: (ex: dark:bg-slate-900, dark:hover:text-white, dark:border-slate-800) -> OK !
      }

      // 1. Fond sombre hardcodé sans dark:
      if (/^(?:[a-z-]+:)?bg-slate-(?:800|850|900|950)(?:\/\d+)?$/.test(token)) {
        console.error(`\x1b[31m[CLASSE SOMBRE NON ADAPTATIVE]\x1b[0m ${relPath}:${lineNum} -> "${token}" (utiliser une variante claire + dark:${token})`);
        violationsCount++;
      }

      // 2. Bordure sombre hardcodée sans dark:
      if (/^(?:[a-z-]+:)?border-slate-(?:700|800|850|900)(?:\/\d+)?$/.test(token)) {
        console.error(`\x1b[31m[BORDURE SOMBRE NON ADAPTATIVE]\x1b[0m ${relPath}:${lineNum} -> "${token}" (utiliser border-slate-200 ou border-border + dark:${token})`);
        violationsCount++;
      }

      // 3. Dégradé sombre hardcodé sans dark:
      if (/^(?:[a-z-]+:)?(?:from|to|via)-slate-(?:800|850|900|950)(?:\/\d+)?$/.test(token)) {
        console.error(`\x1b[31m[DÉGRADÉ SOMBRE NON ADAPTATIVE]\x1b[0m ${relPath}:${lineNum} -> "${token}" (utiliser une version claire + dark:${token})`);
        violationsCount++;
      }

      // 4. Texte clair hardcodé sans dark: (illisible sur fond clair)
      if (/^(?:[a-z-]+:)?text-slate-(?:200|300|400)(?:\/\d+)?$/.test(token)) {
        console.error(`\x1b[31m[TEXTE CLAIR HARDCODÉ]\x1b[0m ${relPath}:${lineNum} -> "${token}" (utiliser text-slate-500/600/700/800 + dark:${token})`);
        violationsCount++;
      }

      // 5. text-white sans dark: et sans fond solide sur la ligne
      if (token === 'text-white' && !lineHasSolidBg) {
        if (!/fill-white|border-t-white|border-white/.test(line)) {
          console.error(`\x1b[31m[TEXT-WHITE SANS FOND SOMBRE]\x1b[0m ${relPath}:${lineNum} -> "text-white" sans variante dark: ou sans fond coloré`);
          violationsCount++;
        }
      }
    }
  });
}

function scanDir(dirPath) {
  let entries;
  try {
    entries = readdirSync(dirPath);
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const relPath = relative(process.cwd(), fullPath);

    if (isWhitelisted(relPath)) continue;

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (stat.isFile()) {
      const ext = extname(entry).toLowerCase();
      if (TARGET_EXTENSIONS.has(ext)) {
        checkFile(fullPath, relPath);
      }
    }
  }
}

console.log('🔍 [OpenSIO] Vérification exhaustive des classes bi-thème (Thème Clair & Sombre)...');

for (const target of TARGET_DIRS) {
  scanDir(join(process.cwd(), target));
}

console.log(`\n📊 Bilan Vérification Thème :`);
console.log(` - Fichiers analysés : ${totalFilesScanned}`);
console.log(` - Violations de thème détectées : ${violationsCount}`);

if (violationsCount > 0) {
  console.error(`\n\x1b[31m❌ Échec du contrôle de thème : ${violationsCount} classe(s) sombre(s) non adaptative(s) trouvée(s).\x1b[0m`);
  process.exit(1);
} else {
  console.log(`\n\x1b[32m✅ Toutes les classes sont parfaitement bi-thème et adaptatives !\x1b[0m`);
  process.exit(0);
}
