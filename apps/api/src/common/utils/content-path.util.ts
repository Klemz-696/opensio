import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Résout de manière déterministe et robuste le chemin absolu de la racine de contenu (`content/`).
 * Fonctionne indifféremment que l'application soit exécutée depuis la racine du monorepo
 * ou depuis le sous-dossier `apps/api` (par ex. en mode `nest start --watch`, `pnpm dev` ou compilation node).
 *
 * @param customRoot Chemin racine explicite optionnel (ou valeur de `process.env.CONTENT_PATH`)
 * @param baseCwd Répertoire courant de travail (par défaut `process.cwd()`)
 * @returns Le chemin absolu résolu et existant vers le dossier `content/`
 */
export function resolveContentRoot(customRoot?: string | null, baseCwd?: string): string {
  const cwd = baseCwd ?? process.cwd();
  const rawRoot = customRoot ?? process.env.CONTENT_PATH ?? './content';

  const candidates: string[] = [];

  if (path.isAbsolute(rawRoot)) {
    candidates.push(rawRoot);
  } else {
    // Ordre de priorité :
    // 1. cwd + rawRoot (ex: racine du repo + './content' -> ./content)
    // 2. cwd + '../../content' (ex: apps/api + '../../content' -> repo/content)
    // 3. cwd + '../content' (ex: apps/api/src + '../content' ou fallback)
    // 4. cwd + './content'
    candidates.push(
      path.resolve(cwd, rawRoot),
      path.resolve(cwd, '../../content'),
      path.resolve(cwd, '../content'),
      path.resolve(cwd, './content'),
      path.resolve(cwd, 'content')
    );
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback déterministe si aucun n'existe sur disque à ce stade
  return candidates[0] || path.resolve(cwd, rawRoot);
}

/**
 * Résout le chemin absolu vers un fichier de contenu pédagogique (leçon, lab.yaml, quiz.yaml...).
 *
 * @param relativeOrAbsolutePath Chemin relatif à la racine de contenu ou chemin absolu
 * @param customRoot Chemin racine optionnel
 * @param baseCwd Répertoire courant de travail
 */
export function resolveContentFilePath(
  relativeOrAbsolutePath: string,
  customRoot?: string | null,
  baseCwd?: string
): string {
  if (!relativeOrAbsolutePath) {
    return resolveContentRoot(customRoot, baseCwd);
  }

  if (path.isAbsolute(relativeOrAbsolutePath)) {
    return path.normalize(relativeOrAbsolutePath);
  }

  const root = resolveContentRoot(customRoot, baseCwd);
  return path.resolve(root, relativeOrAbsolutePath);
}
