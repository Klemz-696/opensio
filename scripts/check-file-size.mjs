#!/usr/bin/env node

/**
 * scripts/check-file-size.mjs
 *
 * Contrôle de conformité à la règle D-13 / RM-13 (OpenSIO Blueprint) :
 * - Aucun fichier source ne doit dépasser 400 lignes.
 * - Avertissement à partir de 300 lignes.
 * - Périmètre scanné : apps/, packages/, infra/
 * - Extensions vérifiées : .ts, .tsx, .css, .prisma
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const MAX_LINES = 400;
const WARN_LINES = 300;
const TARGET_DIRS = ['apps', 'packages', 'infra'];
const TARGET_EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.prisma']);

// Liste blanche explicite pour les fichiers générés ou exceptions autorisées
const WHITELIST_PATTERNS = [
  /\/migrations\//,
  /node_modules/,
  /\.next/,
  /dist/,
  /\.d\.ts$/,
];

let totalFilesScanned = 0;
let violationsCount = 0;
let warningsCount = 0;

function isWhitelisted(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return WHITELIST_PATTERNS.some((pattern) => pattern.test(normalizedPath));
}

function countLines(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

function scanDirectory(dirPath) {
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

    if (isWhitelisted(relPath)) {
      continue;
    }

    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (stat.isFile()) {
      const ext = extname(entry).toLowerCase();
      if (TARGET_EXTENSIONS.has(ext)) {
        totalFilesScanned++;
        const lines = countLines(fullPath);

        if (lines > MAX_LINES) {
          console.error(
            `\x1b[31m[ERREUR D-13]\x1b[0m ${relPath} : ${lines} lignes (maximum autorisé : ${MAX_LINES})`
          );
          violationsCount++;
        } else if (lines >= WARN_LINES) {
          console.warn(
            `\x1b[33m[AVERTISSEMENT D-13]\x1b[0m ${relPath} : ${lines} lignes (seuil d'attention : ${WARN_LINES})`
          );
          warningsCount++;
        }
      }
    }
  }
}

console.log('🔍 [OpenSIO] Vérification de la taille des fichiers source (Règle D-13 / RM-13)...');

for (const target of TARGET_DIRS) {
  scanDirectory(join(process.cwd(), target));
}

console.log(`\n📊 Bilan D-13 :`);
console.log(` - Fichiers analysés : ${totalFilesScanned}`);
console.log(` - Avertissements (≥ ${WARN_LINES} lignes) : ${warningsCount}`);
console.log(` - Violations (> ${MAX_LINES} lignes) : ${violationsCount}`);

if (violationsCount > 0) {
  console.error(
    `\n\x1b[31m❌ Échec du contrôle D-13 : ${violationsCount} fichier(s) dépassent la limite de ${MAX_LINES} lignes.\x1b[0m`
  );
  process.exit(1);
} else {
  console.log(`\n\x1b[32m✅ Conformité D-13 validée.\x1b[0m`);
  process.exit(0);
}
