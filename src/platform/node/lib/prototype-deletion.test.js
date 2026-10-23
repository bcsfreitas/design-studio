import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeProfiles } from './fixtures/contributors.js';
import { writeFixtureConfig } from './fixtures/identities.js';
import { createResourceId } from '../../core/resourceIdentity.ts';
import { applyPrototypeDeletion, deletionPreview, planPrototypeDeletion } from './prototype-deletion.js';

const noGit = () => ({ git: false, untracked: [], modified: [] });
const refuse = code => () => {
  throw Object.assign(new Error(`${code}: operation not permitted, rename`), { code });
};

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-prototype-deletion-'));
  writeProfiles(root, { admin: { name: 'Admin' }, member: { name: 'Member' }, other: { name: 'Other' } });
  writeFixtureConfig(root, {
    usage: 'team',
    admins: ['admin'],
    systems: ['kit'],
    systemMaintainers: { kit: [] },
    defaultSystem: 'kit',
  });
  const ids = { doomed: createResourceId(), view: createResourceId(), kept: createResourceId() };
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  };
  const meta = (studioId, title) => JSON.stringify({ formatVersion: 1, studioId, title, systemId: null });
  write('src/prototypes/member/doomed/meta.json', meta(ids.doomed, 'Doomed'));
  write('src/prototypes/member/doomed/main.tsx', 'export default () => null;');
  write('src/prototypes/member/doomed/notes.md', '# Own notes\n[Self](./main.tsx)\n');
  write('src/prototypes/other/kept/meta.json', meta(ids.kept, 'Kept'));
  // A document linking by relative path and by path address, a canvas by permanent address, a view by import.
  write(
    'src/prototypes/other/kept/notes.md',
    '[Doomed](../../member/doomed/notes.md) and [route](/prototypes/member/doomed)\n',
  );
  write(
    'src/prototypes/other/kept/board.excalidraw',
    JSON.stringify({ elements: [{ type: 'embeddable', link: `/prototypes/${ids.doomed}/artifacts/${ids.view}` }] }),
  );
  write('src/prototypes/other/kept/main.tsx', "import Main from '../../member/doomed/main';\nexport default Main;\n");
  write('src/prototypes/other/kept/unrelated.md', '[Similar](/prototypes/member/doomed-two) [Own](./main.tsx)\n');
  return { root, ids, folder: 'src/prototypes/member/doomed', dir: path.join(root, 'src/prototypes/member/doomed') };
}

test('the preview lists incoming links, breaking canvas and document references, and untracked files', () => {
  const { root, ids, folder } = fixture();
  try {
    const git = () => ({ git: true, untracked: [`${folder}/draft.md`], modified: [`${folder}/main.tsx`] });
    const plan = planPrototypeDeletion(root, folder, 'member', { git });
    assert.deepEqual(plan.incoming, [
      { path: 'src/prototypes/other/kept/main.tsx', kind: 'link', references: ['../../member/doomed/main'] },
    ]);
    assert.deepEqual(plan.breaking, [
      {
        path: 'src/prototypes/other/kept/board.excalidraw',
        kind: 'canvas',
        references: [`/prototypes/${ids.doomed}`],
      },
      {
        path: 'src/prototypes/other/kept/notes.md',
        kind: 'document',
        references: ['../../member/doomed/notes.md', '/prototypes/member/doomed'],
      },
    ]);
    assert.equal(plan.prototypeId, ids.doomed);
    const preview = deletionPreview(plan).join('\n');
    assert.match(
      preview,
      /Incoming links from other prototypes that would break:\n {2}src\/prototypes\/other\/kept\/main\.tsx/,
    );
    assert.match(preview, /Canvas and document references that would break:/);
    assert.match(
      preview,
      /Untracked files that would be lost \(not in Git\):\n {2}src\/prototypes\/member\/doomed\/draft\.md/,
    );
    assert.match(preview, /Uncommitted changes that would be lost:\n {2}src\/prototypes\/member\/doomed\/main\.tsx/);
    assert.match(deletionPreview({ ...plan, git: false }).join('\n'), /not a Git repository/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('only the owner or an Admin may delete, and other folders are refused', () => {
  const { root, folder } = fixture();
  try {
    assert.throws(() => planPrototypeDeletion(root, folder, 'other', { git: noGit }), {
      message: /belongs to someone else/,
      refusal: 'owner',
    });
    assert.throws(() => planPrototypeDeletion(root, folder, null, { git: noGit }), { refusal: 'identity' });
    assert.equal(planPrototypeDeletion(root, folder, 'admin', { git: noGit }).folder, folder);
    assert.throws(() => planPrototypeDeletion(root, 'src/prototypes/member', 'admin', { git: noGit }), /existing/);
    assert.throws(
      () => planPrototypeDeletion(root, 'src/prototypes/member/missing', 'admin', { git: noGit }),
      /existing/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('apply removes the folder after finish, and restores it when finish fails or the preview is stale', () => {
  const { root, folder, dir } = fixture();
  try {
    const plan = planPrototypeDeletion(root, folder, 'member', { git: noGit });
    assert.throws(
      () =>
        applyPrototypeDeletion(root, plan, 'member', {
          git: noGit,
          finish: () => {
            assert.equal(fs.existsSync(dir), false);
            throw new Error('manifest failed');
          },
        }),
      /manifest failed/,
    );
    assert.equal(fs.readFileSync(path.join(dir, 'notes.md'), 'utf8'), '# Own notes\n[Self](./main.tsx)\n');
    fs.writeFileSync(path.join(root, 'src/prototypes/other/kept/late.md'), '[Late](/prototypes/member/doomed)');
    assert.throws(() => applyPrototypeDeletion(root, plan, 'member', { git: noGit }), /changed since the preview/);
    assert.ok(fs.existsSync(dir));
    let finished = false;
    const next = planPrototypeDeletion(root, folder, 'member', { git: noGit });
    assert.deepEqual(applyPrototypeDeletion(root, next, 'member', { git: noGit, finish: () => (finished = true) }), {
      deleted: folder,
      prototypeId: next.prototypeId,
    });
    assert.ok(finished);
    assert.equal(fs.existsSync(dir), false);
    assert.ok(fs.existsSync(path.join(root, 'src/prototypes/other/kept/notes.md')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a held folder is reported in the preview, survives through copy-then-remove, or is restored with its holder', () => {
  const { root, folder, dir } = fixture();
  const leftovers = () => fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('studio-prototype-delete-'));
  const before = leftovers();
  try {
    const plan = planPrototypeDeletion(root, folder, 'member', {
      git: noGit,
      describeHolder: folder => (folder === dir ? 'the dev server (pid 42)' : null),
    });
    assert.deepEqual(plan.held, [
      'src/prototypes/member/doomed is in use by the dev server (pid 42). Stop it, then run this command again.',
    ]);
    // Both the rename and the removal refused: everything is restored and the message names the next action.
    const removeFails = folder => {
      fs.rmSync(path.join(folder, 'main.tsx'));
      throw Object.assign(new Error('EBUSY: resource busy'), { code: 'EBUSY' });
    };
    assert.throws(
      () =>
        applyPrototypeDeletion(root, plan, 'member', {
          git: noGit,
          ops: { rename: refuse('EPERM'), remove: removeFails },
        }),
      { message: /^src\/prototypes\/member\/doomed is in use by .*Stop it, then run this command again\.$/ },
    );
    assert.deepEqual(fs.readdirSync(dir).sort(), ['main.tsx', 'meta.json', 'notes.md']);
    // A refused rename alone falls back to copy-then-remove.
    applyPrototypeDeletion(root, plan, 'member', { git: noGit, ops: { rename: refuse('EPERM') } });
    assert.equal(fs.existsSync(dir), false);
    assert.deepEqual(leftovers(), before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
