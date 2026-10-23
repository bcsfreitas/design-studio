// `pnpm studio dev status|restart|stop`: the studio's own dev server, as recorded in the dev-server registry.
// Restart and stop end only the recorded process (and its child processes); nothing is stopped by port or name.
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  LOG_FILE,
  RUNTIME_DIR,
  clearDevServer,
  isAlive,
  readDevServer,
  statusLines,
} from '../lib/dev-server-registry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const [, , , action, ...rest] = process.argv;
const json = rest.includes('--json');
const say = text => console.log(text);
const fail = text => {
  console.error(text);
  process.exit(1);
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, timeout, step = 200) {
  for (const end = Date.now() + timeout; Date.now() < end; await delay(step)) if (await check()) return true;
  return check();
}
const portFree = port =>
  new Promise(resolve => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, () => probe.close(() => resolve(true)));
  });

// Windows ends the process tree (the server and its helpers); elsewhere the server closes itself on SIGTERM.
async function stopProcess(pid) {
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {}
    if (!(await until(() => !isAlive(pid), 10000))) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
    }
  }
  if (!(await until(() => !isAlive(pid), 10000))) fail(`Process ${pid} did not stop. Nothing was restarted.`);
  clearDevServer(ROOT, pid);
}

async function stop() {
  const status = readDevServer(ROOT);
  if (status.state === 'absent') return say('No dev server is recorded for this studio. Nothing was stopped.');
  if (status.state === 'stale') {
    clearDevServer(ROOT, status.record.pid);
    return say(`Removed the stale record of the dev server on port ${status.record.port}; it was no longer running.`);
  }
  await stopProcess(status.record.pid);
  say(`Stopped the dev server on port ${status.record.port} (process ${status.record.pid}).`);
}

async function restart() {
  const status = readDevServer(ROOT);
  if (status.state === 'absent')
    fail('No dev server is recorded for this studio, so there is nothing to restart. Start one with pnpm dev.');
  const { port, pid } = status.record;
  const vite = path.join(ROOT, 'node_modules/vite/bin/vite.js');
  if (!fs.existsSync(vite)) fail('Vite is not installed. Run pnpm install, then pnpm studio dev restart.');
  // The same preparation as pnpm dev, before anything stops, so a failure leaves the running server alone.
  for (const args of [['src/platform/node/cli/studio.js', 'sync'], ['src/platform/node/build/build-manifest.js']]) {
    const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: json ? 'ignore' : 'inherit' });
    if (result.status !== 0) fail(`${args.join(' ')} failed; the dev server was not restarted.`);
  }
  if (status.state === 'running') await stopProcess(pid);
  else clearDevServer(ROOT, pid);
  if (!(await until(() => portFree(port), 10000)))
    fail(`Port ${port} is still in use by another program. The dev server was stopped and not restarted.`);
  // Detached, so it outlives this command; its output goes to the log, since no terminal is attached.
  fs.mkdirSync(path.join(ROOT, RUNTIME_DIR), { recursive: true });
  const log = fs.openSync(path.join(ROOT, LOG_FILE), 'w');
  const child = spawn(process.execPath, [vite, '--port', String(port), '--strictPort'], {
    cwd: ROOT,
    detached: true,
    windowsHide: true,
    stdio: ['ignore', log, log],
  });
  fs.closeSync(log);
  let exited = null;
  child.once('exit', code => (exited = code ?? 'a signal'));
  child.unref();
  const started = await until(() => {
    const now = readDevServer(ROOT);
    return exited !== null || (now.state === 'running' && now.record.pid === child.pid);
  }, 60000);
  if (exited !== null || !started)
    fail(
      `The dev server did not start on port ${port}${exited !== null ? ` (it exited with ${exited})` : ''}. See ${LOG_FILE}.`,
    );
  const { record } = readDevServer(ROOT);
  if (json) return say(JSON.stringify({ state: 'running', record, log: LOG_FILE }));
  say(
    [
      `Restarted the dev server at ${record.url ?? `http://localhost:${port}/`} (port ${port}, process ${record.pid}).`,
      `It runs in the background with its output in ${LOG_FILE}. Stop it with pnpm studio dev stop.`,
      status.state === 'running'
        ? `If the previous server (process ${pid}) ran in a terminal, that terminal has returned to its prompt.`
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

if (action === 'status') {
  const status = readDevServer(ROOT);
  say(json ? JSON.stringify(status) : statusLines(status).join('\n'));
} else if (action === 'restart') await restart();
else if (action === 'stop') await stop();
else
  fail(
    'Usage: pnpm studio dev status [--json] | restart [--json] | stop\n' +
      '  status   whether this studio dev server is running, its port, since when and started by whom\n' +
      '  restart  stop the recorded dev server only, then start it again on the same port, in the background\n' +
      '  stop     stop the recorded dev server only',
  );
