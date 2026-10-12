import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { createServer } from 'vite';

test('recovery discards incomplete descriptors while retaining unrelated mounted views', async t => {
  const root = path.resolve(import.meta.dirname, '../../../..');
  const server = await createServer({
    configFile: false,
    root: path.join(root, 'src'),
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    resolve: { alias: { '@': path.join(root, 'src') } },
  });
  t.after(() => server.close());
  const { createLoader } = await server.ssrLoadModule('/platform/app/data/createLoader.ts');
  const originalWindow = globalThis.window;
  const events = new EventTarget();
  globalThis.window = events;
  t.after(() => {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  });
  const empty = '/prototypes/sam/flow/empty.tsx',
    rendered = '/prototypes/sam/flow/rendered.tsx';
  const oldDescriptor = Promise.resolve({ default: () => null });
  const mountedDescriptor = Promise.resolve({ default: () => 'mounted' });
  const originalGlob = { [empty]: () => oldDescriptor, [rendered]: () => mountedDescriptor };
  const state = {
    glob: originalGlob,
    stamp: 0,
    loaded: new Map([
      [empty, oldDescriptor],
      [rendered, mountedDescriptor],
    ]),
    waiting: [],
    incomplete: new Set(['src' + empty]),
  };
  const hot = { data: { state }, on() {} };
  let refreshes = 0;
  events.addEventListener('studio:views', () => refreshes++);
  createLoader(originalGlob, hot);
  assert.equal(state.loaded.get(empty), oldDescriptor);
  createLoader({ ...originalGlob }, hot);
  assert.equal(state.loaded.has(empty), false);
  assert.equal(state.loaded.get(rendered), mountedDescriptor);
  assert.equal(state.incomplete.size, 0);
  assert.equal(refreshes, 1);
});
