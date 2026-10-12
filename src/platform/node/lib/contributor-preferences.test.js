import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readPreferenceProfile, transactPreferenceProfile } from './contributor-preferences.js';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-preferences-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'contributors'));
  fs.writeFileSync(
    path.join(root, 'contributors/sam.json'),
    JSON.stringify({
      studioId: '0123456789abcdef',
      name: 'Sam',
      welcomeDismissed: false,
      preferences: { research: { keep: 3 } },
    }),
  );
  return root;
}
test('preference claims preserve identities and unrelated state, including repeated claims', t => {
  const root = fixture(t);
  const before = readPreferenceProfile(root, 'sam');
  transactPreferenceProfile(root, 'sam', {
    base: before.version,
    update: profile => ({ ...profile, welcomeDismissed: true }),
  });
  const { profile } = readPreferenceProfile(root, 'sam');
  assert.equal(profile.studioId, '0123456789abcdef');
  assert.deepEqual(profile.preferences.research, { keep: 3 });
});
test('preference transactions reject foreign actors, stale versions, and symlink profiles', t => {
  const root = fixture(t);
  assert.throws(
    () => readPreferenceProfile(root, 'alex', 'sam'),
    error => error.status === 403,
  );
  const current = readPreferenceProfile(root, 'sam');
  fs.appendFileSync(current.file, '\n');
  assert.throws(
    () => transactPreferenceProfile(root, 'sam', { base: current.version, update: p => p }),
    error => error.status === 409,
  );
  fs.renameSync(current.file, current.file + '.original');
  fs.symlinkSync(current.file + '.original', current.file);
  assert.throws(() => readPreferenceProfile(root, 'sam'), /ordinary/);
});
