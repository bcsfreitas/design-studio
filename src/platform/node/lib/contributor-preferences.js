import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { KEY } from './contributors.js';
import { applySetupChanges } from './studio-setup.js';

const fail = (message, status) => Object.assign(new Error(message), { status });

// Actor comes from the server/CLI identity resolver, never from the request body.
export function readPreferenceProfile(root, actor, contributor = actor) {
  if (!actor || actor !== contributor) throw fail('Only the contributor can change their preferences.', 403);
  if (!KEY.test(contributor)) throw fail('Invalid contributor key.', 400);
  const directory = path.join(root, 'contributors');
  const file = path.join(directory, `${contributor}.json`);
  if (!fs.existsSync(file)) throw fail('Contributor is not registered.', 422);
  const validateFile = () => {
    for (const [target, directoryExpected] of [
      [directory, true],
      [file, false],
    ]) {
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink() || !(directoryExpected ? stat.isDirectory() : stat.isFile()))
        throw fail('Contributor profiles must use ordinary files and directories.', 422);
    }
  };
  validateFile();
  const source = fs.readFileSync(file, 'utf8');
  const profile = JSON.parse(source);
  if (!profile || typeof profile !== 'object' || Array.isArray(profile))
    throw fail('Contributor profile must be an object.', 422);
  return { file, source, profile, version: createHash('sha256').update(source).digest('hex'), validateFile };
}

// Internal transaction primitive. Public callers can only replace their module namespace.
export function transactPreferenceProfile(root, actor, { contributor = actor, base, update }) {
  const current = readPreferenceProfile(root, actor, contributor);
  if (base !== current.version) throw fail('Contributor preferences changed. Read them again before saving.', 409);
  const next = update(structuredClone(current.profile));
  const after = JSON.stringify(next, null, 2) + '\n';
  if (after !== current.source)
    applySetupChanges([{ file: current.file, before: current.source, after }], { validateFile: current.validateFile });
  return next;
}
