// References remain readable source. A move changes only references whose old target is known.
import fs from 'node:fs';
import path from 'node:path';
import { installedReferenceAdapters, referenceAdapterFor, rewriteWithAdapter } from './reference-adapters.js';
import { canonicalDirectory } from './safe-paths.js';

const MAX_TEXT = 750 * 1024;
const extensions = [
  '',
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.md',
  '.css',
  '.json',
  '/index.tsx',
  '/index.ts',
  '/index.jsx',
  '/index.js',
];
const slash = value => value.split(path.sep).join('/');
const slug = value => value.replace(/\.[^./]+$/, '');
const encode = value => value.split('/').map(encodeURIComponent).join('/');

// No symlinks, hidden files, or dependencies. Keep identities only, not stale file contents.
export function snapshotFiles(dir) {
  const files = new Map();
  const walk = (folder, prefix = '') => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const relative = prefix + entry.name;
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(file, relative + '/');
      else if (entry.isFile()) {
        const stat = fs.lstatSync(file);
        files.set(relative, `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`);
      }
    }
  };
  walk(dir);
  return files;
}

// Only a unique identity at a missing old path and new path counts. Copies do not count.
export function fileMoves(before, after) {
  const oldById = new Map(),
    newById = new Map();
  for (const [rel, id] of before) oldById.set(id, [...(oldById.get(id) ?? []), rel]);
  for (const [rel, id] of after) newById.set(id, [...(newById.get(id) ?? []), rel]);
  const moves = new Map();
  for (const [id, old] of oldById) {
    const next = newById.get(id);
    if (old.length === 1 && next?.length === 1 && old[0] !== next[0] && !after.has(old[0]) && !before.has(next[0]))
      moves.set(old[0], next[0]);
  }
  return moves;
}

const splitSuffix = value => {
  const at = value.search(/[?#]/);
  return at < 0 ? [value, ''] : [value.slice(0, at), value.slice(at)];
};

export function repairText(
  text,
  oldFile,
  newFile,
  before,
  moves,
  address,
  adapters = installedReferenceAdapters(),
  renameText,
) {
  const [oldAddress, newAddress = oldAddress] = Array.isArray(address) ? address : [address];
  const urlMoves = new Map([...moves].map(([from, to]) => [slug(from), slug(to)]));
  const relativeTarget = (value, imports = false) => {
    const [raw, suffix] = splitSuffix(value);
    if (!raw || /^(?:[a-z][\w+.-]*:|\/\/|\/)/i.test(raw)) return value;
    if (imports && !raw.startsWith('.')) return value;
    let decoded;
    try {
      decoded = imports ? raw : decodeURIComponent(raw);
    } catch {
      return value;
    }
    const wanted = path.posix.normalize(path.posix.join(path.posix.dirname(oldFile), decoded));
    if (wanted === '..' || wanted.startsWith('../')) return value;
    let target = extensions.map(ext => wanted + ext).find(candidate => before.has(candidate));
    let extensionless = Boolean(target && !imports && slug(target) === wanted);
    if (!target && !imports) {
      target = [...before.keys()].find(file => slug(file) === wanted);
      extensionless = Boolean(target);
    }
    if (!target) return value;
    const mapped = moves.get(target) ?? target;
    if (mapped === target && oldFile === newFile) return value;
    let destination = extensionless ? slug(mapped) : mapped;
    // Extensionless imports stay extensionless; index resolution remains valid.
    if (imports && wanted !== target)
      destination = target.endsWith('/index' + path.posix.extname(target)) ? path.posix.dirname(mapped) : slug(mapped);
    let next = path.posix.relative(path.posix.dirname(newFile), destination);
    if (imports || raw.startsWith('./')) {
      if (!next.startsWith('.')) next = './' + next;
    }
    return (imports ? next : encode(next)) + suffix;
  };
  const appTarget = value => {
    const [raw, suffix] = splitSuffix(value);
    // External URLs remain external, including lookalike paths on another host.
    if (!raw.startsWith('/')) return value;
    let decoded;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return value;
    }
    const aliases = [
      oldAddress,
      oldAddress.startsWith('/prototypes/') ? oldAddress.slice('/prototypes'.length) : oldAddress,
    ];
    const prefix = aliases.find(prefix => decoded.startsWith(prefix + '/') || decoded === prefix);
    if (!prefix) return value;
    const item = decoded.slice(prefix.length + 1);
    const next = urlMoves.get(item) ?? (moves.has(item) ? moves.get(item) : item);
    if (next === item && oldAddress === newAddress) return value;
    return newAddress + (item ? '/' + encode(next) : '') + suffix;
  };
  const link = value => {
    const next = appTarget(value);
    return next !== value ? next : relativeTarget(value);
  };

  const navigation = (value, attribute = false) => {
    const [target, suffix] = splitSuffix(value);
    const mapped = moves.get(target) ?? urlMoves.get(target);
    return mapped && (target.includes('/') || attribute) ? mapped + suffix : value;
  };
  const importedTarget = value => {
    if (value.startsWith('@' + oldAddress + '/')) {
      const own = value.slice(('@' + oldAddress + '/').length);
      return (
        '@' +
        newAddress +
        '/' +
        (moves.get(own) ?? [...moves].find(([from]) => slug(from) === own)?.[1]?.replace(/\.[^./]+$/, '') ?? own)
      );
    }
    return relativeTarget(value, true);
  };
  const adapter = referenceAdapterFor(adapters, oldFile);
  return rewriteWithAdapter(adapter, 'move', text, oldFile, {
    link,
    appTarget,
    relativeTarget,
    navigation,
    importedTarget,
    renameText,
  });
}

export function repairReferences(
  dir,
  before,
  after,
  address,
  moves = fileMoves(before, after),
  adapters = installedReferenceAdapters(),
) {
  if (!moves.size && !Array.isArray(address)) return { moves, changes: [] };
  const origin = new Map([...moves].map(([from, to]) => [to, from]));
  const changes = [];
  for (const [relative] of after) {
    if (!referenceAdapterFor(adapters, relative)) continue;
    const file = path.join(dir, relative);
    if (!canonicalDirectory(path.dirname(file), dir))
      throw new Error('A reference file was moved again. Try the move again.');
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_TEXT) continue;
    const content = fs.readFileSync(file, 'utf8');
    const next = repairText(content, origin.get(relative) ?? relative, relative, before, moves, address, adapters);
    if (content !== next) changes.push({ file, content, next });
  }
  // Prepare first, then check the current versions before changing any file.
  for (const { file, content } of changes)
    if (fs.readFileSync(file, 'utf8') !== content) throw new Error('A reference changed during the move. Try again.');
  const written = [];
  try {
    for (const change of changes) {
      fs.writeFileSync(change.file, change.next);
      written.push(change);
    }
  } catch (error) {
    for (const change of written) fs.writeFileSync(change.file, change.content);
    throw error;
  }
  return { moves, changes };
}

export const prototypeAddress = dir => {
  const parts = slash(dir).split('/');
  const index = parts.lastIndexOf('prototypes');
  return index >= 0 ? '/prototypes/' + parts.slice(index + 1).join('/') : '/' + parts.slice(-2).join('/');
};
