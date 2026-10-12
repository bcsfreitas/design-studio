import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createServer } from 'vite';
const server = await createServer({
  configFile: path.resolve('vite.config.ts'),
  configLoader: 'native',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true },
});
after(() => server.close());
const { prototypeFileTreePolicy } = await server.ssrLoadModule('/platform/modules/prototypes/viewer/fileTreePolicy.ts');
const { systemFileTreePolicy } = await server.ssrLoadModule('/platform/modules/systems/content/fileTreePolicy.tsx');
test('owners preserve different creation and bundle policies through the shared tree', () => {
  const skills = systemFileTreePolicy({ id: 'product:skills' });
  const context = systemFileTreePolicy({ id: 'product:context' });
  const environment = { live: true, editable: true };
  assert.deepEqual(
    skills.newOptions('', environment).map(option => option.target),
    ['skill'],
  );
  assert.deepEqual(
    skills.newOptions('review', environment).map(option => option.target),
    ['file', 'folder'],
  );
  assert.ok(context.newOptions('', environment).some(option => option.target === 'systems'));
  assert.ok(prototypeFileTreePolicy.newOptions('', environment).some(option => option.target === 'view'));
  assert.equal(prototypeFileTreePolicy.reorder, true);
  assert.equal(skills.reorder, false);
  const definition = { path: 'review/SKILL.md', dir: false };
  assert.equal(skills.fixed(definition), true);
  assert.equal(skills.movable({ path: 'review', dir: true }), false);
  assert.equal(skills.canMoveTo(definition, 'other'), false);
  const artifact = { path: definition.path, fileType: 'systems' };
  assert.equal(skills.bundleItem({ path: 'review', dir: true }, new Map([[definition.path, artifact]])), artifact);
});
