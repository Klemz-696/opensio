import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const IS_WIN = process.platform === 'win32';

export const c = { r: '\x1b[0m', b: '\x1b[1m', g: '\x1b[32m', red: '\x1b[31m', y: '\x1b[33m', cy: '\x1b[36m', gr: '\x1b[90m' };
export const ok = (m) => console.log(`  ${c.g}✓${c.r} ${m}`);
export const ko = (m) => console.log(`  ${c.red}✗${c.r} ${m}`);
export const warn = (m) => console.log(`  ${c.y}!${c.r} ${m}`);
export const step = (m) => console.log(`\n${c.b}${c.cy}▸ ${m}${c.r}`);
export const info = (m) => console.log(`    ${c.gr}${m}${c.r}`);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Exé¢¢ute une commande synchronement.
 * Sur Windows, on utilise shell: true mais on échappe les arguments pour éviter DEP0190.
 */
export function run(cmd, args = [], opts = {}) {
  try {
    // Pour éviter le warning DEP0190 avec shell: true, on concatène la commande et les arguments
    if (IS_WIN && args.length > 0) {
      const safeArgs = args.map(a => {
        const s = String(a).replace(/"/g, '\\"');
        return s.includes(' ') ? `"${s}"` : s;
      }).join(' ');
      
      return spawnSync(`${cmd} ${safeArgs}`, [], {
        cwd: ROOT,
        encoding: 'utf8',
        shell: IS_WIN,
        ...opts
      });
    }

    return spawnSync(cmd, args, {
      cwd: ROOT,
      encoding: 'utf8',
      shell: IS_WIN,
      ...opts
    });
  } catch (e) {
    return { status: 1, stdout: '', stderr: String(e) };
  }
}

/**
 * Exé¢¢ute une commande asynchronement (pour kill, etc.).
 */
export function runAsync(cmd, args = [], opts = {}) {
  if (IS_WIN && args.length > 0) {
    const safeArgs = args.map(a => {
      const s = String(a).replace(/"/g, '\\"');
      return s.includes(' ') ? `"${s}"` : s;
    }).join(' ');
    
    return spawn(`${cmd} ${safeArgs}`, [], {
      cwd: ROOT,
      shell: IS_WIN,
      ...opts
    });
  }

  return spawn(cmd, args, {
    cwd: ROOT,
    shell: IS_WIN,
    ...opts
  });
}

export const tryOut = (cmd, args) => {
  const r = run(cmd, args);
  return r.status === 0 ? (r.stdout ?? '').trim() : null;
};

export async function ask(rl, question, def = 'o') {
  const a = (await rl.question(`    ${question} `)).trim().toLowerCase();
  return a === '' ? def : a;
}