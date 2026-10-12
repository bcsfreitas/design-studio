import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { defineReferenceAdapter } from '../../core/references.ts';
import { repairText, repairReferences, snapshotFiles } from './artifact-moves.js';
import { rewriteResourceLinks } from './resource-links.js';
import { rewriteWithAdapter, loadReferenceAdapters } from './reference-adapters.js';

const adapter = defineReferenceAdapter({
  extensions: ['.fixture'],
  move: (source, _path, context) =>
    source.replace(/LINK\(([^)]+)\)/g, (_, value) => 'LINK(' + context.link(value) + ')'),
  copy: (source, _path, context) =>
    source.replace(/LINK\(([^)]+)\)/g, (_, value) => 'LINK(' + context.target(value) + ')'),
});

test('external grammars participate in relocation and copy mappings without changing prose or external URLs', () => {
  const source = 'LINK(./other.fixture?state=1#part) prose ./other.fixture LINK(https://outside.test/other.fixture)';
  const before = new Map([
    ['other.fixture', 1],
    ['main.fixture', 2],
  ]);
  const moves = new Map([['other.fixture', 'nested/other.fixture']]);
  const next = repairText(source, 'main.fixture', 'main.fixture', before, moves, '/prototypes/sam/model', [adapter]);
  assert.equal(
    next,
    'LINK(./nested/other.fixture?state=1#part) prose ./other.fixture LINK(https://outside.test/other.fixture)',
  );
  assert.equal(
    rewriteResourceLinks(
      'LINK(/prototypes/old/artifacts/one#part) prose /prototypes/old/artifacts/one',
      'main.fixture',
      new Map([['/prototypes/old/artifacts/one', '/prototypes/new/artifacts/two']]),
      new Map(),
      {},
      [adapter],
    ),
    'LINK(/prototypes/new/artifacts/two#part) prose /prototypes/old/artifacts/one',
  );
});

test('all adapter edits are prepared before writing, and adapter failure prevents partial reference writes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-reference-adapter-'));
  try {
    fs.writeFileSync(path.join(root, 'a.fixture'), 'LINK(./target.fixture)');
    fs.writeFileSync(path.join(root, 'b.fixture'), 'broken');
    fs.writeFileSync(path.join(root, 'target.fixture'), 'target');
    const before = snapshotFiles(root);
    fs.renameSync(path.join(root, 'target.fixture'), path.join(root, 'moved.fixture'));
    const failing = {
      ...adapter,
      move(source, ...args) {
        if (source === 'broken') throw new Error('Invalid fixture');
        return adapter.move(source, ...args);
      },
    };
    assert.throws(
      () => repairReferences(root, before, snapshotFiles(root), '/prototypes/sam/model', undefined, [failing]),
      /Invalid fixture/,
    );
    assert.equal(fs.readFileSync(path.join(root, 'a.fixture'), 'utf8'), 'LINK(./target.fixture)');
    assert.throws(
      () => rewriteWithAdapter({ ...adapter, move: () => ({ file: 'outside' }) }, 'move', 'source', 'a.fixture', {}),
      /invalid/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('installed adapter registration rejects conflicting owners and linked source files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-reference-registry-'));
  try {
    for (const id of ['one', 'two']) {
      fs.mkdirSync(path.join(root, id));
      fs.writeFileSync(
        path.join(root, id, 'references.ts'),
        "export default [{extensions:['.fixture'],move:s=>s,copy:s=>s}];",
      );
    }
    assert.throws(() => loadReferenceAdapters(root, { one: 'one', two: 'two' }), /overlap/);
    fs.unlinkSync(path.join(root, 'two/references.ts'));
    fs.symlinkSync(path.join(root, 'one/references.ts'), path.join(root, 'two/references.ts'));
    assert.throws(() => loadReferenceAdapters(root, { two: 'two' }), /ordinary local files/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('adapter declarations reject missing transformations and overlapping extensions within a grammar', () => {
  assert.throws(() => defineReferenceAdapter({ ...adapter, extensions: ['.fixture', '.fixture'] }), /unique/);
  assert.throws(() => defineReferenceAdapter({ ...adapter, copy: undefined }), /move and copy/);
});
