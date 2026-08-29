import fs from 'node:fs';
import path from 'node:path';
import { ROOT, step, info, warn, ok, ko, ask, c, IS_WIN, run } from './utils.mjs';

const PID_FILE = path.join(ROOT, '.opensio', 'run.pid');

export function saveInstance(pids) {
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  fs.writeFileSync(PID_FILE, JSON.stringify(pids), 'utf8');
}

export function clearInstance() {
  if (fs.existsSync(PID_FILE)) {
    try {
      fs.unlinkSync(PID_FILE);
    } catch {}
  }
}

function isRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

function killProcess(pid) {
  try {
    if (IS_WIN) {
      run('taskkill', ['/pid', String(pid), '/T', '/F']);
    } else {
      process.kill(pid, 'SIGINT');
      setTimeout(() => {
        try { process.kill(pid, 'SIGKILL'); } catch {}
      }, 3000);
    }
  } catch {}
}

export async function instanceCheck(rl) {
  if (!fs.existsSync(PID_FILE)) return;
  
  let pids = [];
  try {
    pids = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'));
  } catch {
    clearInstance();
    return;
  }
  
  const activePids = pids.filter(isRunning);
  if (activePids.length === 0) {
    clearInstance();
    return;
  }

  step('Instance en cours détectée');
  warn(`Une instance d'OpenSIO semble déjà tourner (PIDs: ${activePids.join(', ')}).`);
  
  const a = await ask(rl, `Que faire ? [A]rrêter et redémarrer / [R]emplacer (kill) / [L]aisser tourner (sortir) / [I]gnorer:`, 'l');
  
  if (a === 'a' || a === 'r') {
    info('Arrêt de l\'instance en cours...');
    for (const pid of activePids) {
      killProcess(pid);
    }
    clearInstance();
    // Wait a bit for ports to be freed
    await new Promise(resolve => setTimeout(resolve, 2000));
    ok('Ancienne instance arrêtée.');
  } else if (a === 'l') {
    info('Sortie. L\'instance en cours continue de tourner.');
    process.exit(0);
  } else if (a === 'i') {
    warn('On continue (risque de conflit de port).');
  }
}
