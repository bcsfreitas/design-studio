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
    skills.newOptions('', environment).map((option: { target: string }) => option.target),
    ['skill'],
  );
  assert.deepEqual(
    skills.newOptions('review', environment).map((option: { target: string }) => option.target),
    ['file', 'folder'],
  );
  assert.ok(context.newOptions('', environment).some((option: { target: string }) => option.target === 'systems'));
  assert.ok(
    prototypeFileTreePolicy.newOptions('', environment).some((option: { target: string }) => option.target === 'view'),
  );
  assert.equal(prototypeFileTreePolicy.reorder, true);
  assert.equal(skills.reorder, false);
  const definition = { path: 'review/SKILL.md', dir: false };
  assert.equal(skills.fixed(definition), true);
  assert.equal(skills.movable({ path: 'review', dir: true }), false);
  assert.equal(skills.canMoveTo(definition, 'other'), false);
  const artifact = { path: definition.path, fileType: 'systems' };
  assert.equal(skills.bundleItem({ path: 'review', dir: true }, new Map([[definition.path, artifact]])), artifact);
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const { getSystems, getSystem, defaultSystemKey, systemPath, systemKeyFromIdentity, ThemeScope } =
  await server.ssrLoadModule('/platform/api/systems.ts');
test('public system queries isolate registry state and apply the assigned supported theme', () => {
  const key = defaultSystemKey(),
    assigned = getSystem(key);
  assert.ok(assigned);
  assert.equal(systemKeyFromIdentity(assigned.studioId), key);
  assert.equal(systemPath(key), '/systems/' + assigned.studioId);
  assert.equal(getSystem('missing-fixture-system'), undefined);
  const old = assigned.label;
  assigned.label = 'Changed caller copy';
  assert.equal(getSystem(key).label, old);
  const systems = getSystems({ role: 'prototype', status: 'active' }) as Record<
    string,
    { role: string; status: string }
  >;
  assert.ok(
    Object.values(systems).every(
      (system: { role: string; status: string }) => system.role === 'prototype' && system.status === 'active',
    ),
  );
  const html = renderToStaticMarkup(createElement(ThemeScope, { themeClass: assigned.themeClass }, 'Theme proof'));
  assert.ok(html.includes(assigned.themeClass));
  assert.ok(html.includes('data-color-mode="' + (assigned.colorModes.includes('light') ? 'light' : 'dark') + '"'));
});
