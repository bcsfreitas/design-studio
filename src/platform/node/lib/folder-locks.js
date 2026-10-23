// Destructive operations probe the folders they will move and survive a refused rename. Shared by system lifecycle
// operations and prototype deletion. The dev-server registry (dev-server-registry.js) names holders through `describeHolder`.
import fs from 'node:fs';
import path from 'node:path';

// Windows refuses to rename a folder that another process holds open (a dev server's watcher, an editor, a terminal).
const LOCKED = new Set(['EPERM', 'EBUSY', 'EACCES']);
export const isLockError = error => LOCKED.has(error?.code);
// A rename across drives (the system temp folder on another volume) is refused the same way, and copies just as well.
const refused = error => isLockError(error) || error?.code === 'EXDEV';
const unknownHolder = 'another program, often a running dev server, an editor or a terminal opened in that folder';

/** @typedef {(folder: string) => string | null | undefined} DescribeHolder Names what holds a folder, when known. */
/** @typedef {{ rename?: typeof fs.renameSync, copy?: (from: string, to: string) => void, remove?: (folder: string) => void }} FolderOps */
const defaults = {
  rename: (from, to) => fs.renameSync(from, to),
  copy: (from, to) =>
    fs.cpSync(from, to, { recursive: true, errorOnExist: true, force: false, verbatimSymlinks: true }),
  remove: folder => fs.rmSync(folder, { recursive: true, force: true, maxRetries: 2 }),
};

/**
 * What holds `folder`, or null when nothing is known to. A registered holder answers first; on Windows the folder
 * is also renamed beside itself and back. POSIX renames are never refused by open handles, so nothing moves there.
 * @param {string} folder
 * @param {{ describeHolder?: DescribeHolder, platform?: string, ops?: FolderOps }} [options]
 * @returns {{ folder: string, holder: string, code?: string } | null}
 */
export function probeFolder(folder, { describeHolder, platform = process.platform, ops = {} } = {}) {
  if (!fs.existsSync(folder)) return null;
  const registered = describeHolder?.(folder);
  if (registered) return { folder, holder: registered };
  if (platform !== 'win32') return null;
  const rename = ops.rename ?? defaults.rename;
  const probe = path.join(path.dirname(folder), `.${path.basename(folder)}.studio-lock-probe-${process.pid}`);
  try {
    rename(folder, probe);
  } catch (error) {
    if (!isLockError(error)) throw error;
    return { folder, holder: unknownHolder, code: error.code };
  }
  rename(probe, folder);
  return null;
}
/** Every held folder among `folders`. */
export const probeFolders = (folders, options) =>
  folders.flatMap(folder => (folder ? [probeFolder(folder, options)].filter(Boolean) : []));

/** One sentence naming the holder and the next action. */
export const heldSentence = (held, root) =>
  `${path.relative(root, held.folder).replaceAll('\\', '/')} is in use by ${held.holder}. Stop it, then run this command again.`;

/**
 * Moves a folder. A refused rename falls back to copy-then-remove; if the removal fails part way, the copy is put
 * back so `from` is exactly as before, and the error is rethrown with `held` naming the holder.
 * @param {string} from
 * @param {string} to
 * @param {{ ops?: FolderOps, describeHolder?: DescribeHolder }} [options]
 * @returns {'rename' | 'copy'}
 */
export function moveFolder(from, to, { ops = {}, describeHolder } = {}) {
  const { rename, copy, remove } = { ...defaults, ...ops };
  try {
    rename(from, to);
    return 'rename';
  } catch (error) {
    if (!refused(error)) throw error;
  }
  try {
    copy(from, to);
  } catch (error) {
    // `from` is untouched; drop the partial copy.
    defaults.remove(to);
    throw withHolder(error, from, describeHolder);
  }
  try {
    remove(from);
  } catch (error) {
    // Some files may already be gone: restore them from the complete copy, then drop it.
    fs.cpSync(to, from, { recursive: true, force: true, verbatimSymlinks: true });
    defaults.remove(to);
    throw withHolder(error, from, describeHolder);
  }
  return 'copy';
}
function withHolder(error, folder, describeHolder) {
  error.held = { folder, holder: describeHolder?.(folder) || unknownHolder, code: error.code };
  return error;
}
