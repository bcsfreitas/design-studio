// The studio's dev-server registry: one runtime record of the running `pnpm dev` server, so contributors and agents
// can see it (`pnpm studio dev status`), restart only it (`pnpm studio dev restart`), and name it as a folder holder.
// The record is local runtime state in `.studio/runtime/`, a folder that ignores itself in Git.
import fs from 'node:fs';
import path from 'node:path';

export const RUNTIME_DIR = '.studio/runtime';
export const RECORD_FILE = `${RUNTIME_DIR}/dev-server.json`;
export const LOG_FILE = `${RUNTIME_DIR}/dev-server.log`;
/** Set to `1` to start a second dev server while one is recorded. */
export const FORCE_ENV = 'STUDIO_DEV_FORCE';

/** @typedef {{ root: string, port: number, pid: number, url?: string, startedAt: string, startedBy: string }} DevServerRecord */

const recordPath = root => path.join(root, RECORD_FILE);
// Windows paths compare without case; a copied studio carries the original's record, which names another root.
const sameRoot = (a, b) =>
  process.platform === 'win32'
    ? path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase()
    : path.resolve(a) === path.resolve(b);

/** Whether a process exists. EPERM means it exists but belongs to someone else. */
export function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

/**
 * The recorded dev server and whether its process still runs. A record for another root (copied with the studio)
 * or one that cannot be read counts as absent.
 * @param {string} root
 * @param {{ alive?: (pid: number) => boolean }} [options]
 * @returns {{ state: 'absent' } | { state: 'running' | 'stale', record: DevServerRecord }}
 */
export function readDevServer(root, { alive = isAlive } = {}) {
  let record;
  try {
    record = JSON.parse(fs.readFileSync(recordPath(root), 'utf8'));
  } catch {
    return { state: 'absent' };
  }
  if (!record || typeof record !== 'object' || !Number.isInteger(record.pid) || !sameRoot(record.root ?? '', root))
    return { state: 'absent' };
  return { state: alive(record.pid) ? 'running' : 'stale', record };
}

/** Writes the record, replacing any earlier one. */
export function recordDevServer(
  root,
  { port, pid = process.pid, url, startedAt = new Date().toISOString(), startedBy },
) {
  const dir = path.join(root, RUNTIME_DIR);
  fs.mkdirSync(dir, { recursive: true });
  // The folder keeps itself out of Git, so no studio's .gitignore has to know about it.
  const ignore = path.join(dir, '.gitignore');
  if (!fs.existsSync(ignore)) fs.writeFileSync(ignore, '*\n');
  /** @type {DevServerRecord} */
  const record = { root: path.resolve(root), port, pid, ...(url ? { url } : {}), startedAt, startedBy };
  const temporary = `${recordPath(root)}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`);
  fs.renameSync(temporary, recordPath(root));
  return record;
}

/** Removes the record, only when it belongs to `pid` (by default, any). */
export function clearDevServer(root, pid) {
  if (!fs.existsSync(recordPath(root))) return false;
  const current = readDevServer(root, { alive: () => true });
  if (pid !== undefined && current.state !== 'absent' && current.record.pid !== pid) return false;
  fs.rmSync(recordPath(root), { force: true });
  return true;
}

/** "the dev server on port 5173 (process 1234, started by parker)" */
export const describeDevServer = record =>
  `the dev server on port ${record.port} (process ${record.pid}, started by ${record.startedBy || 'an unknown session'})`;

/**
 * A folder-lock `describeHolder` for one studio: names its running dev server for any folder inside the studio.
 * The dev server's own process is not named, since a check it serves cannot ask it to stop.
 * @param {string} root
 * @returns {(folder: string) => string | null}
 */
export const devServerHolder =
  (root, { alive = isAlive, self = process.pid } = {}) =>
  folder => {
    const relative = path.relative(path.resolve(root), path.resolve(folder));
    if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
    const current = readDevServer(root, { alive });
    if (current.state !== 'running' || current.record.pid === self) return null;
    return describeDevServer(current.record).replace(/\)$/, '; pnpm studio dev stop stops it)');
  };

/** The status lines `pnpm studio dev status` prints. */
export function statusLines(status, now = Date.now()) {
  if (status.state === 'absent') return ['No dev server is recorded for this studio. Start one with pnpm dev.'];
  const { record } = status;
  const since = `since ${record.startedAt}${Number.isNaN(Date.parse(record.startedAt)) ? '' : ` (${ago(now - Date.parse(record.startedAt))})`}`;
  if (status.state === 'stale')
    return [
      `Stale record: the dev server on port ${record.port} (process ${record.pid}, started by ${record.startedBy}) is no longer running.`,
      'Start one with pnpm dev, or run pnpm studio dev restart to start it again on the same port.',
    ];
  return [
    `Running: ${record.url ?? `http://localhost:${record.port}/`} (port ${record.port}, process ${record.pid}), started by ${record.startedBy} ${since}.`,
  ];
}
function ago(ms) {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}
