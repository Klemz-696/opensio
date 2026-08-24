import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  LabRunner,
  LabSessionContext,
  EditedFile,
  ValidatorVerdict,
  RuntimeRef,
  RuntimeStatus,
} from './lab-runner.interface';
import { resolveContentFilePath } from '../../../common/utils/content-path.util';

const execFileAsync = promisify(execFile);

@Injectable()
export class SimulationLabRunner implements LabRunner {
  readonly kind = 'simulation' as const;
  private readonly logger = new Logger(SimulationLabRunner.name);
  private readonly baseTempDir = path.join(os.tmpdir(), 'opensio-labs');

  constructor() {
    if (!fs.existsSync(this.baseTempDir)) {
      fs.mkdirSync(this.baseTempDir, { recursive: true });
    }
  }

  /**
   * Obtient le chemin du répertoire de travail pour une session.
   */
  getWorkDir(sessionId: string): string {
    return path.join(this.baseTempDir, sessionId);
  }

  /**
   * Démarre l'environnement de session simulé en copiant les fichiers de départ.
   */
  async start(session: LabSessionContext): Promise<RuntimeRef> {
    const workDir = this.getWorkDir(session.sessionId);
    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, { recursive: true });
    }

    // Copier les fichiers initiaux depuis le dossier de lab si existants
    const labDir = this.resolveLabDir(session.definitionPath);
    const starterFilesDir = path.join(labDir, 'files');

    if (fs.existsSync(starterFilesDir)) {
      this.copyDirRecursive(starterFilesDir, workDir);
    }

    return {
      kind: 'simulation',
      workDir,
    };
  }

  /**
   * Sauvegarde les fichiers modifiés dans le répertoire de travail de la session.
   */
  async saveFiles(session: LabSessionContext, files: EditedFile[]): Promise<void> {
    const workDir = this.getWorkDir(session.sessionId);
    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, { recursive: true });
    }

    for (const file of files) {
      const sanitizedRelativePath = path.normalize(file.path).replace(/^(\.\.(\/|\\|$))+/, '');
      const targetFilePath = path.join(workDir, sanitizedRelativePath);
      const targetDirPath = path.dirname(targetFilePath);

      if (!fs.existsSync(targetDirPath)) {
        fs.mkdirSync(targetDirPath, { recursive: true });
      }

      fs.writeFileSync(targetFilePath, file.content, 'utf-8');
    }
  }

  /**
   * Récupère les fichiers actuels depuis le répertoire de travail.
   */
  async getFiles(session: LabSessionContext, editablePaths: string[] = []): Promise<EditedFile[]> {
    const workDir = this.getWorkDir(session.sessionId);
    const labDir = this.resolveLabDir(session.definitionPath);
    const starterFilesDir = path.join(labDir, 'files');

    const result: EditedFile[] = [];

    for (const filePath of editablePaths) {
      const sanitizedRelativePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
      const sessionFilePath = path.join(workDir, sanitizedRelativePath);
      const starterFilePath = path.join(starterFilesDir, sanitizedRelativePath);

      if (fs.existsSync(sessionFilePath)) {
        const content = fs.readFileSync(sessionFilePath, 'utf-8');
        result.push({ path: filePath, content });
      } else if (fs.existsSync(starterFilePath)) {
        const content = fs.readFileSync(starterFilePath, 'utf-8');
        result.push({ path: filePath, content });
      } else {
        result.push({ path: filePath, content: '' });
      }
    }

    return result;
  }

  /**
   * Exécute le validateur sur le répertoire de travail et renvoie le verdict.
   */
  async validate(session: LabSessionContext, files?: EditedFile[]): Promise<ValidatorVerdict> {
    if (files && files.length > 0) {
      await this.saveFiles(session, files);
    }

    const workDir = this.getWorkDir(session.sessionId);
    const labDir = this.resolveLabDir(session.definitionPath);
    const validatorPath = path.join(labDir, 'validator', 'validate.mjs');

    if (!fs.existsSync(validatorPath)) {
      this.logger.warn(`Aucun script de validation trouvé à ${validatorPath}`);
      return {
        passed: true,
        score: 100,
        checks: [
          {
            id: 'default_check',
            passed: true,
            points: 100,
            message: 'Validation automatique simulée avec succès.',
          },
        ],
      };
    }

    try {
      const { stdout } = await execFileAsync(
        process.execPath,
        [validatorPath, workDir],
        {
          timeout: 30000,
          env: {
            ...process.env,
            WORK_DIR: workDir,
          },
        }
      );

      const trimmed = stdout.trim();
      const verdict = JSON.parse(trimmed) as ValidatorVerdict;
      return verdict;
    } catch (err: unknown) {
      this.logger.error(`Erreur lors de l'exécution du validateur de lab: ${String(err)}`);
      return {
        passed: false,
        score: 0,
        checks: [
          {
            id: 'execution_error',
            passed: false,
            points: 0,
            message: 'Erreur ou dépassement de délai lors de l’exécution du script de validation.',
          },
        ],
      };
    }
  }

  /**
   * Arrête la session et nettoie le répertoire de travail temporaire.
   */
  async stop(session: LabSessionContext): Promise<void> {
    const workDir = this.getWorkDir(session.sessionId);
    if (fs.existsSync(workDir)) {
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch (err: unknown) {
        this.logger.warn(`Impossible de supprimer le dossier de lab ${workDir}: ${String(err)}`);
      }
    }
  }

  /**
   * Consulte le statut du runner pour la session.
   */
  async status(session: LabSessionContext): Promise<RuntimeStatus> {
    const workDir = this.getWorkDir(session.sessionId);
    return {
      active: fs.existsSync(workDir),
      details: {
        kind: 'simulation',
        workDir,
      },
    };
  }

  /**
   * Résout le chemin absolu du dossier racine du lab.
   */
  private resolveLabDir(definitionPath: string): string {
    const fullPath = resolveContentFilePath(definitionPath);
    return path.dirname(fullPath);
  }

  /**
   * Copie récursive de dossier.
   */
  private copyDirRecursive(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this.copyDirRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
