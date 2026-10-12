// Installed declarations are trusted executable Node entries, unlike untrusted pack previews.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { MODULE_ROOTS } from '../../core/roots.ts';
import { moduleProblems, moduleRootProblems } from '../../core/modules/index.ts';
import { discoverModuleFolders } from './module-folders.js';

const require = createRequire(import.meta.url);
const loaded = new Map();
function load(root, { id, dir }) {
  const file = path.resolve(root, dir, 'module.ts');
  if (fs.lstatSync(file).isSymbolicLink() || !fs.lstatSync(file).isFile())
    throw new Error(`${file}: installed declarations must use ordinary files.`);
  const source = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const cached = loaded.get(file);
  if (cached && cached.source !== source)
    throw Object.assign(
      new Error(`${file}: declaration changed; restart the process before reading or writing preferences.`),
      { status: 409 },
    );
  if (!cached) loaded.set(file, { source, spec: require(file).default });
  return { id, dir, spec: structuredClone(loaded.get(file).spec) };
}

export const installedModuleDeclarations = root => discoverModuleFolders(root).map(folder => load(root, folder));
export const installedDeclarationProblems = declarations => [
  ...moduleRootProblems(declarations),
  ...declarations.flatMap(({ id, dir, spec }) => moduleProblems(spec, id, dir)),
];

// A namespace transaction resolves only its owner, so unrelated modules cannot break it.
export function installedModuleDeclaration(root, id) {
  if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(id)) return undefined;
  const folders = MODULE_ROOTS.flatMap(base => {
    const dir = `${base}/${id}/`;
    const folder = path.join(root, dir);
    return fs.existsSync(path.join(folder, 'module.ts')) &&
      fs.lstatSync(folder).isDirectory() &&
      !fs.lstatSync(folder).isSymbolicLink()
      ? [{ id, dir }]
      : [];
  });
  if (folders.length > 1) throw new Error(`Module ${id} is declared in both module roots.`);
  return folders.length ? load(root, folders[0]) : undefined;
}
