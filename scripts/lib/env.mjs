import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { ROOT, step, info, warn, ok, ko, ask, c, IS_WIN, run } from './utils.mjs';

const WEB_ENV = path.join(ROOT, 'apps', 'web', '.env');
const WEB_ENV_EXAMPLE = WEB_ENV + '.example';
const API_ENV = path.join(ROOT, 'apps', 'api', '.env');
const API_ENV_EXAMPLE = API_ENV + '.example';

const portFree = (port) =>
  new Promise((res) => {
    const s = net.createServer();
    s.once('error', () => res(false));
    s.once('listening', () => s.close(() => res(true)));
    s.listen(port);
  });

function findFreePort(start, end = start + 100) {
  return new Promise((res) => {
    const tryPort = (port) => {
      const s = net.createServer();
      s.once('error', () => {
        s.close();
        tryPort(port + 1);
      });
      s.once('listening', () => {
        s.close(() => res(port));
      });
      s.listen(port);
    };
    tryPort(start);
  });
}

export async function envCheck(rl) {
  step('Environnement');
  const MIN_NODE_MAJOR = 22;
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < MIN_NODE_MAJOR) {
    ko(`Node.js ${process.versions.node} — version ${MIN_NODE_MAJOR}+ requise.`);
    process.exit(1);
  }
  ok(`Node.js ${process.versions.node}`);
  const pnpmV = (run('pnpm', ['--version']).stdout ?? '').trim();
  if (!pnpmV) {
    ko('pnpm introuvable — installe-le : npm i -g pnpm');
    process.exit(1);
  }
  ok(`pnpm ${pnpmV}`);
  if (fs.existsSync(path.join(ROOT, 'node_modules'))) {
    ok('Dépendances installées');
  } else {
    warn('node_modules absent.');
    const a = await ask(rl, `Lancer pnpm install ? ${c.gr}[O/n]${c.r}`, 'o');
    if (a === 'n') {
      ko('Impossible de continuer sans dépendances.');
      process.exit(1);
    }
    if (run('pnpm', ['install'], { stdio: 'inherit' }).status !== 0) {
      ko('pnpm install a échoué.');
      process.exit(1);
    }
    ok('Dépendances installées');
  }

  // Create .env.example if missing
  if (!fs.existsSync(WEB_ENV_EXAMPLE) && !fs.existsSync(WEB_ENV)) {
    fs.writeFileSync(WEB_ENV_EXAMPLE, `NEXT_PUBLIC_API_URL=http://localhost:4000\nPORT=3000\n`);
    info('apps/web/.env.example créé avec des valeurs par défaut.');
  }

  if (fs.existsSync(WEB_ENV)) {
    ok('apps/web/.env présent');
  } else if (fs.existsSync(WEB_ENV_EXAMPLE)) {
    fs.copyFileSync(WEB_ENV_EXAMPLE, WEB_ENV);
    warn('apps/web/.env créé depuis .env.example — pense à renseigner les secrets.');
  } else {
    ko('apps/web/.env absent (et pas de .env.example) — à créer manuellement.');
  }

  if (fs.existsSync(API_ENV)) {
    ok('apps/api/.env présent');
  } else if (fs.existsSync(API_ENV_EXAMPLE)) {
    fs.copyFileSync(API_ENV_EXAMPLE, API_ENV);
    warn('apps/api/.env créé depuis .env.example — pense à renseigner les secrets.');
  } else {
    ko('apps/api/.env absent (et pas de .env.example) — à créer manuellement.');
  }
}

export async function portsCheck(rl) {
  step('Ports');
  const targets = [
    { name: 'Web', port: 3000, env: 'PORT' },
    { name: 'API', port: 4000, env: 'PORT_API' },
  ];
  let envUpdated = false;

  for (const t of targets) {
    if (await portFree(t.port)) {
      ok(`${t.name} → ${t.port} libre`);
    } else {
      warn(`${t.name} : ${t.port} occupé — recherche d'un port libre...`);
      const free = await findFreePort(t.port + 1);
      ok(`${t.name} → ${free} disponible`);
      const a = await ask(rl, `Utiliser ${free} ? ${c.g}[O/n]${c.r}`, 'o');
      if (a === 'n') {
        ko('Port requis — arrêt.');
        process.exit(1);
      }
      t.port = free;
      envUpdated = true;
    }
  }

  // Handle postgres port
  const pgPort = 5432;
  if (!(await portFree(pgPort))) {
    // Is it our postgres container? We can check if it's running via docker
    const isOurs = (run('docker', ['ps', '-q', '-f', 'name=opensio-postgres']).stdout ?? '').trim();
    if (!isOurs) {
      warn(`Port ${pgPort} occupé par une autre application.`);
      const freePg = await findFreePort(pgPort + 1);
      ok(`PostgreSQL → utilisation du port local ${freePg} via docker-compose.override.yml`);
      const overridePath = path.join(ROOT, 'docker-compose.override.yml');
      const overrideContent = `services:\n  postgres:\n    ports:\n      - "${freePg}:5432"\n`;
      fs.writeFileSync(overridePath, overrideContent);
      info('docker-compose.override.yml généré.');
    } else {
      ok(`PostgreSQL → ${pgPort} (occupé par le conteneur du projet)`);
    }
  } else {
      // It's free, meaning we might be running it in default port.
      // But if we generated an override before, docker-compose will use it.
      // Maybe we don't need to delete the override, but it's fine.
  }

  // Mise à jour de .env
  if (envUpdated) {
    let env = fs.existsSync(WEB_ENV) ? fs.readFileSync(WEB_ENV, 'utf8') : '';
    const setEnv = (key, val) => {
      const re = new RegExp(`^${key}=.*`, 'm');
      if (re.test(env)) env = env.replace(re, `${key}=${val}`);
      else env += `\n${key}=${val}`;
    };
    setEnv('PORT', targets[0].port);
    setEnv('NEXT_PUBLIC_API_URL', `http://localhost:${targets[1].port}`);
    fs.writeFileSync(WEB_ENV, env.trim() + '\n');
    info(`apps/web/.env mis à jour (PORT=${targets[0].port}, NEXT_PUBLIC_API_URL=http://localhost:${targets[1].port})`);

    if (fs.existsSync(API_ENV)) {
      let apiEnv = fs.readFileSync(API_ENV, 'utf8');
      const setApiEnv = (key, val) => {
        const re = new RegExp(`^${key}=.*`, 'm');
        if (re.test(apiEnv)) apiEnv = apiEnv.replace(re, `${key}=${val}`);
        else apiEnv += `\n${key}=${val}`;
      };
      setApiEnv('API_PORT', targets[1].port);
      fs.writeFileSync(API_ENV, apiEnv.trim() + '\n');
      info(`apps/api/.env mis à jour (API_PORT=${targets[1].port})`);
    }
  }
}

export async function systemSetupCheck(rl) {
  // Desktop shortcut & global path link
  if (IS_WIN) {
    const desktopPath = path.join(process.env.USERPROFILE, 'Desktop', 'OpenSIO.bat');
    if (!fs.existsSync(desktopPath)) {
      step('Raccourci Bureau');
      const a = await ask(rl, `Créer un raccourci OpenSIO.bat sur le bureau ? ${c.gr}[O/n]${c.r}`, 'o');
      if (a !== 'n') {
        const content = `@echo off\ncd /d "${ROOT}" && pnpm opensio %*\npause\n`;
        fs.writeFileSync(desktopPath, content);
        ok('Raccourci Bureau créé.');
      }
    }
  }

  // Global link check
  const whichOutput = (run(IS_WIN ? 'where' : 'which', ['opensio']).stdout ?? '').trim();
  if (!whichOutput || whichOutput.includes('not found') || whichOutput.includes('Impossible de trouver')) {
    step('Lien global (opensio)');
    warn('La commande globale "opensio" n\'est pas disponible dans le PATH.');
    const a = await ask(rl, `Créer l'alias global pour taper 'opensio' partout ? ${c.gr}[O/n]${c.r}`, 'o');
    if (a !== 'n') {
      let success = false;
      if (IS_WIN) {
        // Option C : utiliser le dossier npm souvent déjà dans le PATH (Git Bash, CMD, PS)
        const npmPath = path.join(process.env.APPDATA || '', 'npm');
        if (fs.existsSync(npmPath)) {
          const cmdPath = path.join(npmPath, 'opensio.cmd');
          fs.writeFileSync(cmdPath, `@echo off\ncd /d "${ROOT}" && pnpm opensio %*\n`);
          const bashPath = path.join(npmPath, 'opensio');
          fs.writeFileSync(bashPath, `#!/bin/sh\ncd "${ROOT.replace(/\\/g, '/')}" && pnpm opensio "$@"\n`);
          success = true;
        }
      }
      
      if (!success) {
        const res = run('pnpm', ['link', '--global'], { stdio: 'inherit' });
        success = res.status === 0;
        if (success && IS_WIN) {
          info('Si la commande n\'est toujours pas reconnue, exécute "pnpm setup" puis redémarre le terminal.');
        }
      }

      if (success) ok('Lien global créé ! Tu peux maintenant taper "opensio" partout.');
      else ko('Échec de la création du lien global.');
    }
  }
}
