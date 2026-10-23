import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { heldSentence, moveFolder, probeFolder } from './folder-locks.js';

const refuse = code => () => {
  throw Object.assign(new Error(`${code}: operation not permitted, rename`), { code });
};
function folder() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-folder-locks-'));
  const dir = path.join(root, 'kit');
  fs.mkdirSync(path.join(dir, 'components'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'system.ts'), 'export default {};');
  fs.writeFileSync(path.join(dir, 'components', 'button.tsx'), 'export const Button = () => null;');
  return { root, dir };
}
const snapshot = dir =>
  Object.fromEntries(
    fs
      .readdirSync(dir, { recursive: true })
      .map(String)
      .sort()
      .map(file => [
        file,
        fs.statSync(path.join(dir, file)).isFile() ? fs.readFileSync(path.join(dir, file), 'utf8') : null,
      ]),
  );

test('the probe reports a held folder, names a registered holder, and leaves nothing behind', () => {
  const { root, dir } = folder();
  try {
    assert.equal(probeFolder(dir, { platform: 'win32' }), null);
    assert.deepEqual(fs.readdirSync(root), ['kit']);
    const held = probeFolder(dir, { platform: 'win32', ops: { rename: refuse('EBUSY') } });
    assert.equal(held.code, 'EBUSY');
    assert.match(
      heldSentence(held, root),
      /^kit is in use by another program, .*Stop it, then run this command again\.$/,
    );
    // POSIX renames are never refused by open handles, so only a registered holder is reported there.
    assert.equal(probeFolder(dir, { platform: 'linux', ops: { rename: refuse('EBUSY') } }), null);
    const registered = probeFolder(dir, { platform: 'linux', describeHolder: () => 'the dev server on port 5173' });
    assert.equal(
      heldSentence(registered, root),
      'kit is in use by the dev server on port 5173. Stop it, then run this command again.',
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a refused rename moves by copy-then-remove; a failed removal restores the folder exactly', () => {
  const { root, dir } = folder();
  try {
    const before = snapshot(dir);
    assert.equal(moveFolder(dir, path.join(root, 'moved'), { ops: { rename: refuse('EPERM') } }), 'copy');
    assert.equal(fs.existsSync(dir), false);
    assert.deepEqual(snapshot(path.join(root, 'moved')), before);
    fs.renameSync(path.join(root, 'moved'), dir);
    // Removal deletes one file, then meets the lock.
    const remove = () => {
      fs.rmSync(path.join(dir, 'components'), { recursive: true });
      throw Object.assign(new Error('EBUSY: resource busy or locked, rmdir'), { code: 'EBUSY' });
    };
    assert.throws(
      () => moveFolder(dir, path.join(root, 'moved'), { ops: { rename: refuse('EPERM'), remove } }),
      error => error.held.folder === dir && /another program/.test(error.held.holder),
    );
    assert.deepEqual(snapshot(dir), before);
    assert.deepEqual(fs.readdirSync(root), ['kit']);
    // Other errors are not treated as locks.
    assert.throws(() => moveFolder(dir, path.join(root, 'moved'), { ops: { rename: refuse('ENOENT') } }), /ENOENT/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
