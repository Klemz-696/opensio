import fs from 'node:fs';
import path from 'node:path';
import { ROOT, step, info, ask, ok, c } from './utils.mjs';

const CONFIG_DIR = path.join(ROOT, '.opensio');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export function loadConfig() {
  try {
    return { ollama: true, updateCheck: true, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  } catch {
    return null;
  }
}

export function saveConfig(cfg) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n');
}

export async function firstRunWizard(rl) {
  step('Premier démarrage — configuration');
  info('Ces choix seront mémorisés dans .opensio/config.json (non versionné).');
  const a1 = await ask(rl, `Assistant IA local avec Ollama ? ${c.gr}[O/n]${c.r}`, 'o');
  const a2 = await ask(rl, `Vérifier les mises à jour du projet au lancement ? ${c.gr}[O/n]${c.r}`, 'o');
  const cfg = { ollama: a1 !== 'n', updateCheck: a2 !== 'n' };
  saveConfig(cfg);
  ok('Configuration enregistrée.');
  info('Modifiable à tout moment : pnpm opensio --reconfigure');
  return cfg;
}
