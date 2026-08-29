import { step, tryOut, info, run, warn, ok, ko, ask, c } from './utils.mjs';
import { saveConfig } from './config.mjs';

export async function updateCheck(rl, cfg) {
  step('Mise à jour du projet');
  const branch = tryOut('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== 'main') {
    info(`Branche « ${branch ?? '?'} » — vérification ignorée (main uniquement).`);
    return;
  }
  if (run('git', ['fetch', 'origin', 'main']).status !== 0) {
    warn('origin injoignable (hors ligne ?) — étape ignorée.');
    return;
  }
  const local = tryOut('git', ['rev-parse', 'HEAD']);
  const remote = tryOut('git', ['rev-parse', 'origin/main']);
  if (local === remote) {
    ok(`À jour (${local.slice(0, 7)})`);
    return;
  }
  const behind = tryOut('git', ['rev-list', '--count', 'HEAD..origin/main']) ?? '?';
  const ahead = tryOut('git', ['rev-list', '--count', 'origin/main..HEAD']) ?? '0';
  warn(`${behind} commit(s) de retard sur origin/main${ahead !== '0' ? ` (+${ahead} local non poussé)` : ''}.`);
  const a = await ask(rl, `Mettre à jour ? ${c.gr}[O]ui / [n]on / [j]amais${c.r}`, 'o');
  if (a === 'j') {
    cfg.updateCheck = false;
    saveConfig(cfg);
    ok('Vérification des mises à jour désactivée.');
    info('Réactivation : pnpm opensio --reconfigure');
    return;
  }
  if (a === 'n') {
    info('Mise à jour ignorée pour cette fois.');
    return;
  }
  const dirty = tryOut('git', ['status', '--porcelain']);
  if (dirty) {
    warn('Modifications locales non commitées :');
    for (const l of dirty.split('\n').slice(0, 10)) console.log(`      ${c.gr}${l}${c.r}`);
    const c2 = await ask(rl, `Continuer quand même ? ${c.gr}[o/N]${c.r}`, 'n');
    if (c2 !== 'o') {
      info('Mise à jour annulée.');
      return;
    }
  }
  if (run('git', ['pull', '--ff-only'], { stdio: 'inherit' }).status !== 0) {
    ko('Échec du pull — résous manuellement puis relance.');
    process.exit(1);
  }
  ok('Projet mis à jour.');
  info('Installation des dépendances…');
  run('pnpm', ['install'], { stdio: 'inherit' });
}
