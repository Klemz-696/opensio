import { spawn } from 'node:child_process';
import { step, tryOut, info, run, warn, ok, ko, ask, c, sleep, IS_WIN } from './utils.mjs';

const PG_CONTAINER = 'opensio-postgres';
const PG_SERVICE = 'postgres';
const PG_DB = 'opensio';

export async function dockerCheck(rl) {
  step('Docker');
  let ready = run('docker', ['info']).status === 0;
  if (!ready) {
    warn('Docker ne répond pas.');
    const desktop = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';
    if (IS_WIN) {
      const a = await ask(rl, `Démarrer Docker Desktop ? ${c.gr}[O/n]${c.r}`, 'o');
      if (a !== 'n') {
        run('cmd', ['/c', 'start', '""', desktop]);
        info('Démarrage de Docker Desktop (peut prendre 1 à 2 min)…');
      }
    } else {
      info('Démarre Docker manuellement.');
    }
    for (let i = 0; i < 40 && !ready; i++) {
      await sleep(3000);
      ready = run('docker', ['info']).status === 0;
    }
    while (!ready) {
      const a = await ask(rl, `Toujours indisponible. ${c.gr}[R]éessayer / [a]bandonner${c.r}`, 'r');
      if (a === 'a') {
        ko('Docker est requis pour la base de données.');
        process.exit(1);
      }
      for (let i = 0; i < 10 && !ready; i++) {
        await sleep(3000);
        ready = run('docker', ['info']).status === 0;
      }
    }
  }
  ok('Docker opérationnel');
}

export async function databaseCheck(rl) {
  step('Base de données');
  const up = run('docker', ['compose', 'up', '-d', PG_SERVICE]);
  if (up.status !== 0) {
    ko('docker compose up a échoué.');
    info((up.stderr ?? '').trim());
    process.exit(1);
  }
  let pg = false;
  for (let i = 0; i < 20 && !pg; i++) {
    pg = run('docker', ['exec', PG_CONTAINER, 'pg_isready', '-U', 'postgres']).status === 0;
    if (!pg) await sleep(1500);
  }
  if (!pg) {
    ko(`PostgreSQL (${PG_CONTAINER}) ne répond pas.`);
    info('Diagnostic : docker logs opensio-postgres');
    process.exit(1);
  }
  ok(`PostgreSQL prêt (${PG_CONTAINER})`);
  const count = tryOut('docker', ['exec', PG_CONTAINER, 'psql', '-U', 'postgres', '-d', PG_DB, '-tAc', 'SELECT count(*) FROM modules']);
  if (count === null) {
    info('Vérification du contenu impossible (table absente ?) — ignorée.');
  } else if (Number(count) === 0) {
    warn('Base vide — aucun module.');
    const a = await ask(rl, `Lancer le seed et synchroniser le contenu ? ${c.gr}[O/n]${c.r}`, 'o');
    if (a !== 'n') {
      run('pnpm', ['--filter', '@opensio/api', 'seed'], { stdio: 'inherit' });
      run('pnpm', ['--filter', '@opensio/api', 'content:sync'], { stdio: 'inherit' });
    }
  } else {
    ok(`Contenu présent (${count.trim()} modules)`);
  }
}
