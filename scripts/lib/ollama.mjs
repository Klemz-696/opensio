import { spawn } from 'node:child_process';
import { step, tryOut, info, run, warn, ok, ask, c, sleep } from './utils.mjs';

const OLLAMA_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = 'gemma2:2b';

async function ollamaUp() {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch {
    return false;
  }
}

export async function ollamaCheck(rl) {
  step('Assistant IA (Ollama)');
  const bin = tryOut('ollama', ['--version']);
  if (!bin) {
    warn('Ollama non installé — le chat IA sera indisponible.');
    info('Installation : https://ollama.com — ou désactive : pnpm opensio --reconfigure');
    return;
  }
  if (!(await ollamaUp())) {
    info('Démarrage du serveur Ollama…');
    spawn('ollama', ['serve'], { detached: true, stdio: 'ignore' }).unref();
    for (let i = 0; i < 15 && !(await ollamaUp()); i++) await sleep(2000);
  }
  if (!(await ollamaUp())) {
    warn('Impossible de démarrer Ollama — le chat IA sera indisponible.');
    return;
  }
  ok('Serveur Ollama en ligne');
  let models = [];
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(4000) });
    const j = await r.json();
    models = (j.models ?? []).map((m) => m.name ?? '');
  } catch { /* ignore */ }
  if (models.some((m) => m.startsWith('gemma2'))) {
    ok(`Modèle ${OLLAMA_MODEL} disponible`);
  } else {
    warn(`Modèle ${OLLAMA_MODEL} absent.`);
    const a = await ask(rl, `Télécharger (~1,6 Go) ? ${c.gr}[O/n]${c.r}`, 'o');
    if (a !== 'n') run('ollama', ['pull', OLLAMA_MODEL], { stdio: 'inherit' });
  }
}
