import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LessonReaderService {
  private readonly contentRoot: string;

  constructor() {
    const rawRoot = process.env.CONTENT_PATH ?? './content';
    let resolved = path.resolve(process.cwd(), rawRoot);

    // Résolution de repli si exécuté depuis apps/api
    if (!fs.existsSync(resolved)) {
      const workspaceRootFallback = path.resolve(process.cwd(), '../../content');
      const apiParentFallback = path.resolve(process.cwd(), '../content');
      if (fs.existsSync(workspaceRootFallback)) {
        resolved = workspaceRootFallback;
      } else if (fs.existsSync(apiParentFallback)) {
        resolved = apiParentFallback;
      }
    }

    this.contentRoot = resolved;
  }

  /**
   * Retourne le chemin absolu de la racine de contenu.
   */
  getContentRoot(): string {
    return this.contentRoot;
  }

  /**
   * Lit de manière strictement sécurisée le contenu Markdown d'une leçon.
   * Empêche toute tentative de path traversal (../, null-byte, échappement de racine).
   */
  async readLessonMarkdown(relativePath: string): Promise<string> {
    if (!relativePath || typeof relativePath !== 'string') {
      throw new BadRequestException('Le chemin du fichier de leçon est invalide');
    }

    // Protection 1 : Rejet des caractères nuls (%00 / \0)
    if (relativePath.includes('\0')) {
      throw new BadRequestException('Tentative d\'injection de caractère nul détectée');
    }

    // Protection 2 : Normalisation et résolution stricte du chemin
    const normalizedRelative = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const absoluteTarget = path.resolve(this.contentRoot, normalizedRelative);

    // Protection 3 : Vérification que le chemin résolu reste strictement dans la racine de contenu
    const relativeToRoot = path.relative(this.contentRoot, absoluteTarget);
    const isOutsideRoot =
      relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot);

    if (isOutsideRoot) {
      throw new BadRequestException('Accès interdit : chemin en dehors du répertoire de contenu autorisé');
    }

    // Protection 4 : Vérification de l'existence du fichier
    if (!fs.existsSync(absoluteTarget)) {
      throw new NotFoundException(`Fichier de leçon introuvable : ${relativePath}`);
    }

    // Protection 5 : Vérification qu'il s'agit bien d'un fichier régulier
    try {
      const stats = await fs.promises.stat(absoluteTarget);
      if (!stats.isFile()) {
        throw new BadRequestException('Le chemin spécifié n\'est pas un fichier régulier');
      }

      const rawContent = await fs.promises.readFile(absoluteTarget, 'utf-8');
      return this.extractMarkdownBody(rawContent);
    } catch (err: unknown) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      throw new NotFoundException(`Impossible de lire le fichier de leçon : ${relativePath}`);
    }
  }

  /**
   * Extrait le corps Markdown en retirant l'en-tête frontmatter YAML si présent.
   */
  private extractMarkdownBody(rawContent: string): string {
    const frontmatterRegex = /^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/;
    const match = rawContent.match(frontmatterRegex);
    if (match && match[1] !== undefined) {
      return match[1].trim();
    }
    return rawContent.trim();
  }
}
