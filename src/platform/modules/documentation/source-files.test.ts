import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import build from './build.ts';
import { sourceFile } from '../../node/build/files/source.js';

test('Manual discovery and editable sources work without initializing a module registry', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-manual-discovery-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const folder = 'src/platform/modules/documentation/pages';
  fs.cpSync(folder, path.join(root, folder), { recursive: true });
  const enabled = Object.keys(JSON.parse(fs.readFileSync('studio.config.json', 'utf8')).modules);
  // A fresh process reproduces native build-hook loading alongside Vite's separate bundled registry.
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import build from ${JSON.stringify(new URL('./build.ts', import.meta.url).href)};
       const root = ${JSON.stringify(root)};
       const result = build.manifest({root, enabled: ${JSON.stringify(enabled)}, out: console});
       console.log(JSON.stringify({result, sources: build.sourceFiles(result.data, {root}), watch: build.watch}));`,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const {
    result: discovered,
    sources,
    watch,
  } = JSON.parse(result.stdout) as {
    result: ReturnType<typeof build.manifest>;
    sources: string[];
    watch: string[];
  };
  assert.equal(discovered.errors, 0);
  assert.deepEqual(discovered.data.manual.map(page => page.slug).sort(), [
    'agent',
    'customize',
    'environment',
    'index',
    'prototypes',
    'questions',
    'share',
    'team',
  ]);
  assert.deepEqual(watch, [folder]);
  assert.deepEqual([...new Set(sources)].sort(), discovered.data.manual.map(page => 'src' + page.source).sort());
});

test('Manual source contribution keeps malformed chapters repairable and disappears without contributed data', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-manual-source-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const chapter = 'src/platform/modules/documentation/pages/index.md';
  const damaged = 'src/platform/modules/documentation/pages/draft.md';
  fs.mkdirSync(path.dirname(path.join(root, chapter)), { recursive: true });
  fs.writeFileSync(path.join(root, chapter), '# Source');
  fs.writeFileSync(path.join(root, damaged), '---\ntitle: broken');
  const data = {
    manual: [
      {
        slug: 'index',
        title: 'Index',
        description: '',
        section: null,
        source: '/platform/modules/documentation/pages/index.md',
      },
    ],
  };
  const allowed = build.sourceFiles(data, { root });
  assert.ok(allowed.includes(chapter));
  assert.ok(allowed.includes(damaged));
  for (const file of [chapter, damaged]) {
    const before = sourceFile(root, allowed, { action: 'read', path: file });
    assert.equal(
      sourceFile(root, allowed, { action: 'write', path: file, content: '# Edited', base: before.body.version }).status,
      undefined,
    );
  }
  const unavailable = build.sourceFiles(undefined, { root });
  assert.deepEqual(unavailable, []);
  assert.equal(sourceFile(root, unavailable, { action: 'read', path: chapter }).status, 404);
});
