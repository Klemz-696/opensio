import { Injectable, Inject } from '@nestjs/common';
import type { TerminalCommandResult } from '../dto/terminal-response.dto';
import { SimulatedNetworkService } from './simulated-network.service';
import { SimulatedFilesystemService } from './simulated-filesystem.service';

export const PERMITTED_SIMULATION_COMMANDS = [
  'help',
  '?',
  'ls',
  'dir',
  'pwd',
  'cd',
  'cat',
  'echo',
  'whoami',
  'hostname',
  'uname',
  'ip',
  'ifconfig',
  'ping',
  'systemctl',
  'service',
  'ss',
  'netstat',
  'df',
  'free',
  'ps',
  'clear',
  'date',
] as const;

@Injectable()
export class SimulationCommandInterpreter {
  constructor(
    @Inject(SimulatedNetworkService) private readonly networkService: SimulatedNetworkService,
    @Inject(SimulatedFilesystemService) private readonly fsService: SimulatedFilesystemService
  ) {}

  /**
   * Interprète de façon strictement sécurisée une commande simulée via liste blanche.
   * AUCUN exec, spawn, eval n'est utilisé sur l'entrée utilisateur.
   */
  async interpret(
    sessionId: string,
    rawCommand: string,
    workDir: string
  ): Promise<TerminalCommandResult> {
    const trimmed = rawCommand.trim();
    if (!trimmed) {
      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        cwd: this.fsService.getRelativeCwd(sessionId),
      };
    }

    const tokens = this.tokenize(trimmed);
    const commandName = (tokens[0] || '').toLowerCase();
    const args = tokens.slice(1);

    if (!PERMITTED_SIMULATION_COMMANDS.includes(commandName as (typeof PERMITTED_SIMULATION_COMMANDS)[number])) {
      return {
        stdout: '',
        stderr: `bash: ${commandName}: commande non autorisée en mode simulation. Tapez 'help' pour la liste des commandes autorisées.`,
        exitCode: 127,
        cwd: this.fsService.getRelativeCwd(sessionId),
      };
    }

    switch (commandName) {
      case 'help':
      case '?':
        return this.handleHelp(sessionId);

      case 'pwd':
        return {
          stdout: `/home/student${this.fsService.getRelativeCwd(sessionId)}`,
          stderr: '',
          exitCode: 0,
          cwd: this.fsService.getRelativeCwd(sessionId),
        };

      case 'whoami':
        return {
          stdout: 'student',
          stderr: '',
          exitCode: 0,
          cwd: this.fsService.getRelativeCwd(sessionId),
        };

      case 'hostname':
        return {
          stdout: `opensio-lab-${sessionId.slice(0, 4)}`,
          stderr: '',
          exitCode: 0,
          cwd: this.fsService.getRelativeCwd(sessionId),
        };

      case 'uname':
        return {
          stdout: args.includes('-a')
            ? 'Linux opensio-lab 6.1.0-21-amd64 #1 SMP PREEMPT_DYNAMIC Debian 6.1.90-1 (2026-08-24) x86_64 GNU/Linux'
            : 'Linux',
          stderr: '',
          exitCode: 0,
          cwd: this.fsService.getRelativeCwd(sessionId),
        };

      case 'date':
        return {
          stdout: new Date().toUTCString(),
          stderr: '',
          exitCode: 0,
          cwd: this.fsService.getRelativeCwd(sessionId),
        };

      case 'clear':
        return {
          stdout: '\x1b[2J\x1b[H',
          stderr: '',
          exitCode: 0,
          cwd: this.fsService.getRelativeCwd(sessionId),
        };

      case 'echo':
        return {
          stdout: args.join(' '),
          stderr: '',
          exitCode: 0,
          cwd: this.fsService.getRelativeCwd(sessionId),
        };

      case 'cd':
        return this.fsService.handleCd(sessionId, args[0], workDir);

      case 'ls':
      case 'dir':
        return this.fsService.handleLs(sessionId, args, workDir);

      case 'cat':
        return this.fsService.handleCat(sessionId, args[0], workDir);

      case 'ip':
        return this.handleIp(sessionId, args);

      case 'ifconfig':
        return {
          stdout: this.networkService.formatIpAddr(this.networkService.getDefaultConfig(sessionId)),
          stderr: '',
          exitCode: 0,
          cwd: this.fsService.getRelativeCwd(sessionId),
        };

      case 'ping':
        return this.handlePing(sessionId, args[0]);

      case 'systemctl':
      case 'service':
        return this.handleSystemctl(sessionId, args);

      case 'ss':
      case 'netstat':
        return {
          stdout: this.networkService.formatListeningPorts(),
          stderr: '',
          exitCode: 0,
          cwd: this.fsService.getRelativeCwd(sessionId),
        };

      case 'df':
        return {
          stdout: [
            'Filesystem     1K-blocks    Used Available Use% Mounted on',
            '/dev/root       10218772 3120140   6558488  33% /',
            'tmpfs             512000       0    512000   0% /dev/shm',
            '/dev/sda1        1048576  128400    920176  13% /boot',
          ].join('\n'),
          stderr: '',
          exitCode: 0,
          cwd: this.fsService.getRelativeCwd(sessionId),
        };

      case 'free':
        return {
          stdout: [
            '               total        used        free      shared  buff/cache   available',
            'Mem:         2048000      420100     1102400       12000      525500     1627900',
            'Swap:        1024000           0     1024000',
          ].join('\n'),
          stderr: '',
          exitCode: 0,
          cwd: this.fsService.getRelativeCwd(sessionId),
        };

      case 'ps':
        return {
          stdout: [
            '    PID TTY          TIME CMD',
            '    100 pts/0    00:00:00 bash',
            '    120 pts/0    00:00:00 ps',
          ].join('\n'),
          stderr: '',
          exitCode: 0,
          cwd: this.fsService.getRelativeCwd(sessionId),
        };

      default:
        return {
          stdout: '',
          stderr: `bash: ${commandName}: commande non implémentée`,
          exitCode: 127,
          cwd: this.fsService.getRelativeCwd(sessionId),
        };
    }
  }

  private handleHelp(sessionId: string): TerminalCommandResult {
    const helpLines = [
      'OpenSIO — Terminal Virtuel Sécurisé (Mode Simulation)',
      '====================================================',
      'Commandes autorisées :',
      '  Navigation & Fichiers : ls, pwd, cd, cat, echo, clear',
      '  Réseau BTS SISR       : ip [a|route], ifconfig, ping <cible>, ss, netstat',
      '  Services & Système    : systemctl [status] <service>, ps, df, free, whoami, hostname, uname',
      '  Aide                  : help',
      '',
      "Note : L'exécution shell arbitraire est désactivée par sécurité.",
    ];
    return {
      stdout: helpLines.join('\n'),
      stderr: '',
      exitCode: 0,
      cwd: this.fsService.getRelativeCwd(sessionId),
    };
  }

  private handleIp(sessionId: string, args: string[]): TerminalCommandResult {
    const config = this.networkService.getDefaultConfig(sessionId);
    const subCmd = (args[0] || 'a').toLowerCase();

    if (subCmd === 'a' || subCmd === 'addr' || subCmd === 'address') {
      return {
        stdout: this.networkService.formatIpAddr(config),
        stderr: '',
        exitCode: 0,
        cwd: this.fsService.getRelativeCwd(sessionId),
      };
    }

    if (subCmd === 'r' || subCmd === 'route') {
      return {
        stdout: this.networkService.formatIpRoute(config),
        stderr: '',
        exitCode: 0,
        cwd: this.fsService.getRelativeCwd(sessionId),
      };
    }

    return {
      stdout: this.networkService.formatIpAddr(config),
      stderr: '',
      exitCode: 0,
      cwd: this.fsService.getRelativeCwd(sessionId),
    };
  }

  private handlePing(sessionId: string, target: string | undefined): TerminalCommandResult {
    if (!target) {
      return {
        stdout: '',
        stderr: 'ping: usage: ping [-c count] destination',
        exitCode: 1,
        cwd: this.fsService.getRelativeCwd(sessionId),
      };
    }

    return {
      stdout: this.networkService.formatPing(target),
      stderr: '',
      exitCode: 0,
      cwd: this.fsService.getRelativeCwd(sessionId),
    };
  }

  private handleSystemctl(sessionId: string, args: string[]): TerminalCommandResult {
    const config = this.networkService.getDefaultConfig(sessionId);
    const action = (args[0] || 'status').toLowerCase();
    const serviceName = args[1] || 'bind9';

    const res = this.networkService.formatSystemctl(action, serviceName, config);
    return {
      stdout: res.stdout,
      stderr: res.exitCode !== 0 ? res.stdout : '',
      exitCode: res.exitCode,
      cwd: this.fsService.getRelativeCwd(sessionId),
    };
  }

  private tokenize(commandStr: string): string[] {
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    const tokens: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(commandStr)) !== null) {
      tokens.push(match[1] || match[2] || match[0]);
    }
    return tokens;
  }
}
