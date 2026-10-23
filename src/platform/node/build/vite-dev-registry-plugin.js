// Records the running dev server in the studio's dev-server registry (src/platform/node/lib/dev-server-registry.js)
// and refuses a second one. Embedded servers (middleware mode, as tests use) neither record nor refuse.
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  FORCE_ENV,
  clearDevServer,
  describeDevServer,
  readDevServer,
  recordDevServer,
} from '../lib/dev-server-registry.js';
import { keysForEmail, loadContributors } from '../lib/contributors.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

// The contributor whose Git email this is, otherwise a session label: STUDIO_SESSION_LABEL, or the OS account.
function startedBy() {
  try {
    const email = execFileSync('git', ['config', 'user.email'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const keys = email ? keysForEmail(loadContributors(), email) : [];
    if (keys.length === 1) return keys[0];
  } catch {}
  if (process.env.STUDIO_SESSION_LABEL) return process.env.STUDIO_SESSION_LABEL;
  try {
    return `session ${os.userInfo().username}`;
  } catch {
    return 'an unnamed session';
  }
}

let exitHandled = false;

export default function devRegistry({ root = ROOT } = {}) {
  let active = false;
  return {
    name: 'studio-dev-registry',
    apply: 'serve',
    configResolved(config) {
      if (config.isPreview || config.server.middlewareMode) return;
      active = true;
      const current = readDevServer(root);
      if (current.state !== 'running' || current.record.pid === process.pid || process.env[FORCE_ENV] === '1') return;
      const { record } = current;
      console.warn(
        [
          `A dev server is already running for this studio: ${describeDevServer(record)}, since ${record.startedAt}.`,
          `Use it at ${record.url ?? `http://localhost:${record.port}/`}, or restart it with pnpm studio dev restart.`,
          `To start a second server anyway, set ${FORCE_ENV}=1.`,
        ].join('\n'),
      );
      process.exit(1);
    },
    configureServer(server) {
      if (!active || !server.httpServer) return;
      const httpServer = server.httpServer;
      httpServer.on('listening', () => {
        // A forced second server does not replace the first one's record.
        const current = readDevServer(root);
        if (current.state === 'running' && current.record.pid !== process.pid) return;
        // A configuration restart in this process keeps when and by whom the server was started.
        const previous = current.state === 'running' ? current.record : null;
        const address = httpServer.address();
        if (!address || typeof address === 'string') return;
        const base = server.config.base || '/';
        recordDevServer(root, {
          port: address.port,
          url: `http://localhost:${address.port}${base}`,
          startedAt: previous?.startedAt,
          startedBy: previous?.startedBy ?? (process.env.STUDIO_DEV_STARTED_BY || startedBy()),
        });
      });
      // The record outlives a configuration restart, whose next server records itself again; exit clears it.
      // A killed process cannot clear it: readers detect that as a stale record.
      if (!exitHandled) process.once('exit', () => clearDevServer(root, process.pid));
      exitHandled = true;
    },
  };
}
