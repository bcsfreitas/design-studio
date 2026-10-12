import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { defineReferenceAdapter } from '../../core/references.ts';
import { MODULE_DIRS } from './module-catalog.js';
import { canonicalDirectory } from './safe-paths.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const require = createRequire(import.meta.url);
let installed;

// Like retained identity adapters, installed source grammars remain usable while
// a renderer is disabled. Physical removal removes its grammar too.
export function loadReferenceAdapters(root, directories) {
  const adapters = Object.entries(directories).flatMap(([id, dir]) => {
    const file = path.join(root, dir, 'references.ts');
    if (!fs.existsSync(file)) return [];
    if (!canonicalDirectory(path.dirname(file), root) || fs.lstatSync(file).isSymbolicLink())
      throw new Error(`${id}: reference adapters must be ordinary local files.`);
    const exports = require(file).default;
    if (!Array.isArray(exports)) throw new Error(`${id}/references.ts must export an adapter list.`);
    return exports.map(adapter => ({ ...defineReferenceAdapter(adapter), owner: id }));
  });
  const owners = new Map();
  for (const adapter of adapters)
    for (const extension of adapter.extensions) {
      if (owners.has(extension))
        throw new Error(`${extension}: reference adapters in ${owners.get(extension)} and ${adapter.owner} overlap.`);
      owners.set(extension, adapter.owner);
    }
  return adapters;
}

export const installedReferenceAdapters = () => (installed ??= loadReferenceAdapters(ROOT, MODULE_DIRS));
export const referenceAdapterFor = (adapters, file) =>
  adapters.find(adapter => adapter.extensions.some(ext => file.endsWith(ext)));

export function rewriteWithAdapter(adapter, operation, source, file, context) {
  if (!adapter) return source;
  const next = adapter[operation](source, file, context);
  if (typeof next !== 'string' || Buffer.byteLength(next) > 750 * 1024)
    throw new Error(`${file}: reference adapter returned invalid or oversized source.`);
  return next;
}
