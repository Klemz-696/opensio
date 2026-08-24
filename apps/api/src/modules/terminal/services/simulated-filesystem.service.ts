import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TerminalCommandResult } from '../dto/terminal-response.dto';

@Injectable()
export class SimulatedFilesystemService {
  private readonly sessionCwds = new Map<string, string>();

  getRelativeCwd(sessionId: string): string {
    const stored = this.sessionCwds.get(sessionId);
    return stored ? `/${stored}` : '';
  }

  getAbsoluteCwd(sessionId: string, workDir: string): string {
    const relative = this.sessionCwds.get(sessionId) || '';
    return path.resolve(workDir, relative);
  }

  handleCd(sessionId: string, targetPath: string | undefined, workDir: string): TerminalCommandResult {
    const relativeCwd = this.getRelativeCwd(sessionId);
    if (!targetPath || targetPath === '~' || targetPath === '/') {
      this.sessionCwds.set(sessionId, '');
      return { stdout: '', stderr: '', exitCode: 0, cwd: '' };
    }

    const currentAbs = this.getAbsoluteCwd(sessionId, workDir);
    const resolved = path.resolve(currentAbs, targetPath);

    if (!resolved.startsWith(path.resolve(workDir))) {
      return {
        stdout: '',
        stderr: 'bash: cd: permission non accordée pour quitter le sandbox',
        exitCode: 1,
        cwd: relativeCwd,
      };
    }

    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      return {
        stdout: '',
        stderr: `bash: cd: ${targetPath}: Aucun fichier ou dossier de ce type`,
        exitCode: 1,
        cwd: relativeCwd,
      };
    }

    const newRelative = path.relative(path.resolve(workDir), resolved).replace(/\\/g, '/');
    this.sessionCwds.set(sessionId, newRelative);
    return { stdout: '', stderr: '', exitCode: 0, cwd: newRelative };
  }

  handleLs(
    sessionId: string,
    args: string[],
    workDir: string
  ): TerminalCommandResult {
    const currentAbs = this.getAbsoluteCwd(sessionId, workDir);
    const target = args.find((a) => !a.startsWith('-'));
    const targetDir = target ? path.resolve(currentAbs, target) : currentAbs;

    if (!targetDir.startsWith(path.resolve(workDir))) {
      return {
        stdout: '',
        stderr: 'ls: accès refusé hors du sandbox',
        exitCode: 1,
        cwd: this.getRelativeCwd(sessionId),
      };
    }

    if (!fs.existsSync(targetDir)) {
      return {
        stdout: '',
        stderr: `ls: impossible d'accéder à '${target || '.'}': Aucun fichier ou dossier de ce type`,
        exitCode: 2,
        cwd: this.getRelativeCwd(sessionId),
      };
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const showAll = args.some((a) => a.startsWith('-') && a.includes('a'));
    const showLong = args.some((a) => a.startsWith('-') && a.includes('l'));

    const filtered = showAll ? entries : entries.filter((e) => !e.name.startsWith('.'));

    if (showLong) {
      const lines = filtered.map((e) => {
        const typeChar = e.isDirectory() ? 'd' : '-';
        const perms = `${typeChar}rw-r--r-- 1 student student`;
        const size = e.isDirectory() ? '4096' : ' 512';
        return `${perms} ${size} Aug 24 14:00 ${e.name}${e.isDirectory() ? '/' : ''}`;
      });
      return {
        stdout: `total ${lines.length * 4}\n${lines.join('\n')}`,
        stderr: '',
        exitCode: 0,
        cwd: this.getRelativeCwd(sessionId),
      };
    }

    return {
      stdout: filtered.map((e) => `${e.name}${e.isDirectory() ? '/' : ''}`).join('  '),
      stderr: '',
      exitCode: 0,
      cwd: this.getRelativeCwd(sessionId),
    };
  }

  handleCat(
    sessionId: string,
    targetFile: string | undefined,
    workDir: string
  ): TerminalCommandResult {
    const relativeCwd = this.getRelativeCwd(sessionId);
    if (!targetFile) {
      return {
        stdout: '',
        stderr: 'cat: fichier manquant',
        exitCode: 1,
        cwd: relativeCwd,
      };
    }

    const currentAbs = this.getAbsoluteCwd(sessionId, workDir);
    const resolved = path.resolve(currentAbs, targetFile);

    if (!resolved.startsWith(path.resolve(workDir))) {
      return {
        stdout: '',
        stderr: 'cat: accès refusé hors du sandbox',
        exitCode: 1,
        cwd: relativeCwd,
      };
    }

    if (!fs.existsSync(resolved)) {
      return {
        stdout: '',
        stderr: `cat: ${targetFile}: Aucun fichier ou dossier de ce type`,
        exitCode: 1,
        cwd: relativeCwd,
      };
    }

    if (fs.statSync(resolved).isDirectory()) {
      return {
        stdout: '',
        stderr: `cat: ${targetFile}: Est un dossier`,
        exitCode: 1,
        cwd: relativeCwd,
      };
    }

    const content = fs.readFileSync(resolved, 'utf-8');
    return {
      stdout: content,
      stderr: '',
      exitCode: 0,
      cwd: relativeCwd,
    };
  }
}
