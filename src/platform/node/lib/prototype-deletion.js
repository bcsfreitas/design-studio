// Deleting a contributor's prototype: a preview of what would break or be lost, then a lock-aware removal.
// The caller regenerates the manifest inside the rollback boundary (`finish`), so nothing shows a ghost.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { readPersistedStudioConfig } from './persisted-studio-config.js';
import { canonicalDirectory } from './safe-paths.js';
import { jsonIdentity, prototypeAddress, resourceId } from '../../core/resourceIdentity.ts';
import { permissionRefusal, refusalMessage } from '../../core/permissions.ts';
import { addressPattern, linkedFiles, personAddress } from './prototype-links.js';
import { heldSentence, moveFolder, probeFolders } from './folder-locks.js';

const PROTOTYPES = 'src/prototypes';
const slash = value => value.split(path.sep).join('/');
// Canvases and documents are listed apart: their references break visibly. Anything else is an incoming link.
const kindOf = file => (file.endsWith('.excalidraw') ? 'canvas' : /\.mdx?$/.test(file) ? 'document' : 'link');
// A relative path written in a file: `./x`, `../x`, quoted or in Markdown parentheses.
const RELATIVE = /(?<=["'`(\s]|^)(\.\.?\/[^\s"'`()<>?#]*)/gm;

/** Untracked and modified paths under `folder`, from Git. Outside a repository, nothing is known (`git: false`). */
export function gitChanges(root, folder) {
  // ls-files paths are relative to `root`, even when the studio sits inside a larger repository.
  const files = (...args) =>
    [
      ...new Set(
        execFileSync('git', ['ls-files', '-z', ...args, '--', folder], {
          cwd: root,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        })
          .split('\0')
          .filter(Boolean),
      ),
    ].sort();
  try {
    return { git: true, untracked: files('--others', '--exclude-standard'), modified: files('--modified') };
  } catch {
    return { git: false, untracked: [], modified: [] };
  }
}

/**
 * The references from other prototypes' files into the prototype at `folder`: its path address
 * (`/prototypes/<key>/<id>`), its permanent address (`/prototypes/<studioId>`), and relative paths into it.
 */
export function incomingReferences(root, folder, { key, id, studioId }) {
  const target = path.resolve(root, folder);
  const byPath = addressPattern(personAddress(key, id));
  const permanent = studioId ? prototypeAddress(resourceId(studioId)) : null;
  const permanentPattern = permanent && new RegExp(`${permanent}(?![0-9a-z])`, 'g');
  const prototypes = path.join(root, PROTOTYPES);
  if (!fs.existsSync(prototypes)) return [];
  const others = fs
    .readdirSync(prototypes, { withFileTypes: true })
    .filter(owner => owner.isDirectory() && !owner.name.startsWith('.'))
    .flatMap(owner =>
      fs
        .readdirSync(path.join(prototypes, owner.name), { withFileTypes: true })
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => path.join(prototypes, owner.name, entry.name)),
    )
    .filter(dir => dir !== target)
    .sort();
  return others.flatMap(dir =>
    linkedFiles(dir).flatMap(file => {
      const text = fs.readFileSync(file, 'utf8');
      const references = new Set([
        ...(text.match(byPath) ?? []),
        ...((permanentPattern && text.match(permanentPattern)) ?? []),
        ...[...text.matchAll(RELATIVE)]
          .map(match => match[1])
          .filter(value => {
            const resolved = path.resolve(path.dirname(file), value);
            return resolved === target || resolved.startsWith(target + path.sep);
          }),
      ]);
      const relative = slash(path.relative(root, file));
      return references.size ? [{ path: relative, kind: kindOf(relative), references: [...references].sort() }] : [];
    }),
  );
}

/**
 * What deleting the prototype at `folder` would do, for `actor`. Throws a refusal sentence (with `refusal`) when the
 * actor is neither its owner nor an Admin. `probe: false` skips the held-folder probe.
 */
export function planPrototypeDeletion(root, folder, actor, { git = gitChanges, probe = true, describeHolder } = {}) {
  const absolute = path.resolve(root, folder),
    relative = slash(path.relative(root, absolute));
  const match = /^src\/prototypes\/([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9._-]*)$/i.exec(relative);
  if (!match || !fs.existsSync(path.join(absolute, 'meta.json')) || !canonicalDirectory(absolute, root))
    throw new Error(
      'Delete an existing contributor-owned prototype folder (src/prototypes/<key>/<id>) without symbolic links.',
    );
  const [, key, id] = match;
  const current = readPersistedStudioConfig(root);
  const refusal = permissionRefusal(
    current.config,
    actor,
    Object.keys(current.directory.contributorIds),
    { kind: 'prototype', owner: key },
    'manage',
  );
  if (refusal) throw Object.assign(new Error(refusalMessage(refusal)), { refusal });
  const source = fs.readFileSync(path.join(absolute, 'meta.json'), 'utf8');
  const studioId = jsonIdentity(source);
  const title = JSON.parse(source).title ?? id;
  const incoming = incomingReferences(root, relative, { key, id, studioId });
  const { git: tracked, untracked, modified } = git(root, relative);
  return {
    stage: 'prototype-deletion',
    folder: relative,
    owner: key,
    id,
    title,
    prototypeId: studioId,
    incoming: incoming.filter(file => file.kind === 'link'),
    breaking: incoming.filter(file => file.kind !== 'link'),
    git: tracked,
    untracked,
    modified,
    held: probe ? probeFolders([absolute], { describeHolder }).map(held => heldSentence(held, root)) : [],
  };
}

/** The preview as lines for a terminal. */
export function deletionPreview(plan) {
  const list = (heading, items, line) => (items.length ? [heading, ...items.map(item => `  ${line(item)}`)] : []);
  const references = file => `${file.path}: ${file.references.join(', ')}`;
  return [
    `Delete prototype ${plan.folder} (“${plan.title}”). This permanently removes the folder.`,
    ...list('Incoming links from other prototypes that would break:', plan.incoming, references),
    ...list('Canvas and document references that would break:', plan.breaking, references),
    ...(plan.git
      ? [
          ...list('Untracked files that would be lost (not in Git):', plan.untracked, file => file),
          ...list('Uncommitted changes that would be lost:', plan.modified, file => file),
        ]
      : ['This studio is not a Git repository, so every file in the folder would be lost.']),
    ...(plan.incoming.length || plan.breaking.length ? [] : ['No other prototype links to it.']),
    ...plan.held,
  ];
}

const comparable = ({ held, ...plan }) => JSON.stringify(plan);

/**
 * Removes the prototype inside one rollback boundary: the folder moves out (a refused rename falls back to
 * copy-then-remove), `finish` runs (the manifest refresh), and only then is the moved copy discarded. On failure the
 * folder is put back; a held folder throws one sentence naming the holder and the next action, with `held`.
 * @param {ReturnType<typeof planPrototypeDeletion>} plan
 * @param {{ finish?: () => void, git?: typeof gitChanges, ops?: import('./folder-locks.js').FolderOps, describeHolder?: import('./folder-locks.js').DescribeHolder }} [options]
 */
export function applyPrototypeDeletion(root, plan, actor, { finish = () => {}, git, ops, describeHolder } = {}) {
  if (plan?.stage !== 'prototype-deletion') throw new Error('Review a prototype deletion preview first.');
  const current = planPrototypeDeletion(root, plan.folder, actor, { git, probe: false });
  if (comparable(current) !== comparable(plan))
    throw new Error('The prototype or its links changed since the preview. Review it again.');
  const absolute = path.join(root, plan.folder);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-prototype-delete-'));
  const moved = path.join(temporary, 'prototype');
  try {
    moveFolder(absolute, moved, { ops, describeHolder });
    finish();
  } catch (error) {
    // Restoring uses the real file system, with the same copy fallback.
    if (fs.existsSync(moved) && !fs.existsSync(absolute)) moveFolder(moved, absolute);
    if (error.held) throw Object.assign(new Error(heldSentence(error.held, root)), { held: error.held });
    throw error;
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
  return { deleted: plan.folder, prototypeId: plan.prototypeId };
}
