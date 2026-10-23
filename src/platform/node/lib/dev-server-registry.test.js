import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  RECORD_FILE,
  clearDevServer,
  devServerHolder,
  isAlive,
  readDevServer,
  recordDevServer,
  statusLines,
} from './dev-server-registry.js';
import { heldSentence, probeFolder } from './folder-locks.js';

const studio = () => fs.mkdtempSync(path.join(os.tmpdir(), 'studio-dev-registry-'));
const sample = { port: 5173, pid: 4242, startedAt: '2026-10-21T09:00:00.000Z', startedBy: 'parker' };

test('a recorded dev server reads as running while its process lives, stale after, absent when cleared', () => {
  const root = studio();
  try {
    assert.deepEqual(readDevServer(root), { state: 'absent' });
    const record = recordDevServer(root, sample);
    assert.equal(record.root, path.resolve(root));
    // The runtime folder keeps itself out of Git.
    assert.equal(fs.readFileSync(path.join(root, '.studio/runtime/.gitignore'), 'utf8'), '*\n');
    assert.deepEqual(readDevServer(root, { alive: () => true }), { state: 'running', record });
    assert.deepEqual(readDevServer(root, { alive: () => false }), { state: 'stale', record });
    // Only the recorded process clears the record.
    assert.equal(clearDevServer(root, 1), false);
    assert.equal(clearDevServer(root, 4242), true);
    assert.deepEqual(readDevServer(root), { state: 'absent' });
    assert.equal(clearDevServer(root), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('liveness uses the real process table', () => {
  assert.equal(isAlive(process.pid), true);
  assert.equal(isAlive(0), false);
  assert.equal(isAlive(2 ** 31 - 2), false);
});

test('a record copied with the studio, or unreadable, counts as absent', () => {
  const root = studio(),
    other = studio();
  try {
    recordDevServer(root, sample);
    fs.mkdirSync(path.join(other, '.studio/runtime'), { recursive: true });
    fs.copyFileSync(path.join(root, RECORD_FILE), path.join(other, RECORD_FILE));
    assert.deepEqual(readDevServer(other, { alive: () => true }), { state: 'absent' });
    fs.writeFileSync(path.join(root, RECORD_FILE), '{not json');
    assert.deepEqual(readDevServer(root), { state: 'absent' });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(other, { recursive: true, force: true });
  }
});

test('status lines name the port, process, start and starter, or say what to do', () => {
  const record = { root: '/studio', ...sample, url: 'http://localhost:5173/' };
  assert.deepEqual(statusLines({ state: 'absent' }), [
    'No dev server is recorded for this studio. Start one with pnpm dev.',
  ]);
  assert.deepEqual(statusLines({ state: 'running', record }, Date.parse('2026-10-21T09:30:00.000Z')), [
    'Running: http://localhost:5173/ (port 5173, process 4242), started by parker since 2026-10-21T09:00:00.000Z (30 min ago).',
  ]);
  assert.match(
    statusLines({ state: 'stale', record })[0],
    /^Stale record: .*port 5173 \(process 4242.*no longer running/,
  );
});

test('folder probes name the running dev server and its port as the holder of folders inside the studio', () => {
  const root = studio();
  try {
    const kit = path.join(root, 'src/systems/kit');
    fs.mkdirSync(kit, { recursive: true });
    recordDevServer(root, sample);
    const holder = devServerHolder(root, { alive: () => true, self: 1 });
    const held = probeFolder(kit, { describeHolder: holder, platform: 'linux' });
    assert.equal(
      heldSentence(held, root),
      'src/systems/kit is in use by the dev server on port 5173 (process 4242, started by parker; pnpm studio dev stop stops it). Stop it, then run this command again.',
    );
    // Outside the studio, a stale record, or the dev server asking about itself: no holder.
    assert.equal(holder(os.tmpdir()), null);
    assert.equal(devServerHolder(root, { alive: () => false, self: 1 })(kit), null);
    assert.equal(devServerHolder(root, { alive: () => true, self: 4242 })(kit), null);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
