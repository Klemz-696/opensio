#!/usr/bin/env node
// OpenSIO — lanceur tout-en-un : scripts/opensio.mjs
// Usage : pnpm opensio [--prod] [--reconfigure] [--no-update-check] [--help]

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { run, runAsync, ROOT, IS_WIN, c, ko, step } from './lib/utils.mjs';
import { loadConfig, firstRunWizard } from './lib/config.mjs';
import { instanceCheck, saveInstance, clearInstance } from './lib/instance.mjs';
import { envCheck, portsCheck, systemSetupCheck } from './lib/env.mjs';
import { dockerCheck, databaseCheck } from './lib/docker.mjs';
import { ollamaCheck } from './lib/ollama.mjs';
import { updateCheck } from './lib/git.mjs';

function launch(prod) {
  step('Lancement');
  
  // Read actual ports from env for display
  const WEB_ENV = path.join(ROOT, 'apps', 'web', '.env');
  let webPort = '3000';
  let apiPort = '4000';
  if (fs.existsSync(WEB_ENV)) {
    const envContent = fs.readFileSync(WEB_ENV, 'utf8');
    const pMatch = envContent.match(/^PORT=(\d+)/m);
    if (pMatch) webPort = pMatch[1];
    const aMatch = envContent.match(/^NEXT_PUBLIC_API_URL=http:\/\/localhost:(\d+)/m);
    if (aMatch) apiPort = aMatch[1];
  }

  console.log(`  Web → ${c.cy}http://localhost:${webPort}${c.r}`);
  console.log(`  API → ${c.cy}http://localhost:${apiPort}${c.r}`);
  console.log(`  ${c.gr}Ctrl+C pour tout arrêter.${c.r}\n`);
  
  const children = [];
  if (prod) {
    children.push(runAsync('pnpm', ['--filter', '@opensio/api', 'start'], { stdio: 'inherit' }));
    children.push(runAsync('pnpm', ['--filter', '@opensio/web', 'start'], { stdio: 'inherit' }));
  } else {
    children.push(runAsync('pnpm', ['dev'], { stdio: 'inherit' }));
  }
  
  saveInstance(children.map(ch => ch.pid));

  const shutdown = () => {
    for (const ch of children) {
      if (IS_WIN) run('taskkill', ['/pid', String(ch.pid), '/T', '/F'], { stdio: 'ignore' });
      else ch.kill('SIGINT');
    }
    clearInstance();
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  if (children.length === 1) {
    children[0].on('exit', (code) => {
      clearInstance();
      process.exit(code ?? 0);
    });
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help')) {
    console.log(`
OpenSIO — lanceur tout-en-un

  pnpm opensio                 Vérifications puis lancement en mode dev
  pnpm opensio --prod          Build de production puis démarrage
  pnpm opensio --reconfigure   Rejouer l'assistant de premier démarrage
  pnpm opensio --no-update-check   Ignorer la vérification de mise à jour (cette fois)
`);
    process.exit(0);
  }
  const prod = argv.includes('--prod');
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  console.log(`\n${c.b}OpenSIO${c.r} ${c.gr}v${pkg.version}${c.r} — vérifications préalables`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    await instanceCheck(rl);

    let cfg = loadConfig();
    if (!cfg || argv.includes('--reconfigure')) cfg = await firstRunWizard(rl);
    
    if (cfg.updateCheck && !argv.includes('--no-update-check')) await updateCheck(rl, cfg);
    else if (!cfg.updateCheck) {
      step('Mise à jour du projet');
      console.log(`    ${c.gr}Vérification désactivée dans la configuration.${c.r}`);
    }
    
    await envCheck(rl);
    await systemSetupCheck(rl);
    await dockerCheck(rl);
    await databaseCheck(rl);
    
    if (cfg.ollama) await ollamaCheck(rl);
    else {
      step('Assistant IA (Ollama)');
      console.log(`    ${c.gr}Désactivé dans la configuration — étape ignorée.${c.r}`);
    }
    
    await portsCheck(rl);
    
    if (prod) {
      step('Build de production');
      const buildRes = run('pnpm', ['build'], { stdio: 'inherit' });
      if (buildRes.status !== 0) {
        ko('Build échoué.');
        process.exit(1);
      }
    }
  } finally {
    rl.close();
  }
  launch(prod);
}

main().catch((e) => {
  ko(String(e?.message ?? e));
  process.exit(1);
});