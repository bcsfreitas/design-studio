import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';

// Execute the actual browser module with injected transport and HMR, preserving the shared cache implementation.
async function client(t, request) {
  const handlers = new Map();
  let dispose;
  const previous = globalThis.__studioAssetTest;
  globalThis.__studioAssetTest = {
    request,
    hot: {
      on(event, callback) {
        handlers.set(event, callback);
      },
      off(event, callback) {
        if (handlers.get(event) === callback) handlers.delete(event);
      },
      dispose(callback) {
        dispose = callback;
      },
    },
  };
  t.after(() => {
    globalThis.__studioAssetTest = previous;
  });
  const source = fs
    .readFileSync(new URL('./buildAssets.ts', import.meta.url), 'utf8')
    .replace(
      "import assets from 'virtual:studio-build-assets';",
      "const assets = {'team/report':'/report','other/report':'/other'};",
    )
    .replace(
      "import { requestJson } from './client.ts';",
      'const requestJson = (...args) => globalThis.__studioAssetTest.request(...args);',
    )
    .replace('../../core/generationCache.ts', new URL('../../core/generationCache.ts', import.meta.url).href)
    .replace('../../core/client-error.ts', new URL('../../core/client-error.ts', import.meta.url).href)
    .replaceAll('import.meta.hot', 'globalThis.__studioAssetTest.hot');
  const code = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  }).outputText;
  const api = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64') + '#' + randomUUID());
  return { ...api, emit: (event, data) => handlers.get(event)?.(data), dispose: () => dispose?.(), handlers };
}

test('browser callers follow a newer asset when an obsolete request fails', async t => {
  let reject,
    calls = 0;
  const gate = new Promise((_, failure) => {
    reject = failure;
  });
  const api = await client(t, () => (++calls === 1 ? gate : { generation: calls }));
  const old = api.loadModuleAsset('team', 'report');
  await Promise.resolve();
  api.emit('studio:asset', { key: 'team/report' });
  const current = await api.loadModuleAsset('team', 'report');
  reject(new Error('obsolete request'));
  assert.deepEqual(await old, current);
  assert.equal(calls, 2);
});

test('reconnect refreshes cached assets and subscribed owners after missed events', async t => {
  let generation = 1,
    calls = 0,
    notified = 0;
  const api = await client(t, () => {
    calls++;
    return { generation };
  });
  const unsubscribe = api.subscribeModuleAsset('team', 'report', () => notified++);
  const stopOther = api.subscribeModuleAsset('other', 'report', () => notified++);
  assert.deepEqual(await api.loadModuleAsset('team', 'report'), { generation: 1 });
  assert.deepEqual(await api.loadModuleAsset('other', 'report'), { generation: 1 });
  generation = 2;
  api.emit('vite:ws:connect');
  assert.equal(notified, 2);
  assert.deepEqual(await api.loadModuleAsset('team', 'report'), { generation: 2 });
  assert.deepEqual(await api.loadModuleAsset('other', 'report'), { generation: 2 });
  assert.equal(calls, 4);
  unsubscribe();
  stopOther();
  api.emit('vite:ws:connect');
  assert.equal(notified, 2);
  api.dispose();
  assert.equal(api.handlers.size, 0);
});

test('reconnect also supersedes failed in-flight requests', async t => {
  let reject,
    calls = 0;
  const gate = new Promise((_, failure) => {
    reject = failure;
  });
  const api = await client(t, () => (++calls === 1 ? gate : { generation: calls }));
  const old = api.loadModuleAsset('team', 'report');
  await Promise.resolve();
  api.emit('vite:ws:connect');
  const current = await api.loadModuleAsset('team', 'report');
  reject(new Error('connection interrupted'));
  assert.deepEqual(await old, current);
  await assert.rejects(api.loadModuleAsset('disabled', 'report'), error => error.code === 'unavailable_asset');
});

test('each asset reader gets an independent deep copy while requests stay shared', async t => {
  let calls = 0;
  const value = { items: [{ label: 'original' }], nested: { keep: true } };
  const api = await client(t, () => {
    calls++;
    return value;
  });
  const [first, second] = await Promise.all([
    api.loadModuleAsset('team', 'report'),
    api.loadModuleAsset('team', 'report'),
  ]);
  assert.notEqual(first, second);
  first.items[0].label = 'changed';
  first.items.push({ label: 'added' });
  first.nested.keep = false;
  assert.deepEqual(second, value);
  assert.deepEqual(await api.loadModuleAsset('team', 'report'), value);
  assert.equal(calls, 1);
});

test('failing subscribers cannot block healthy owners on watch changes or reconnects', async t => {
  const errors = [];
  t.mock.method(console, 'error', (...args) => errors.push(args));
  const api = await client(t, () => ({ ready: true }));
  let sameOwner = 0,
    otherOwner = 0;
  api.subscribeModuleAsset('team', 'report', () => {
    throw new Error('sync failure');
  });
  api.subscribeModuleAsset('team', 'report', async () => {
    throw new Error('async failure');
  });
  api.subscribeModuleAsset('team', 'report', () => sameOwner++);
  api.subscribeModuleAsset('other', 'report', () => otherOwner++);
  assert.doesNotThrow(() => api.emit('vite:ws:connect'));
  await Promise.resolve();
  assert.equal(sameOwner, 1);
  assert.equal(otherOwner, 1);
  assert.equal(errors.length, 2);
  assert.doesNotThrow(() => api.emit('studio:asset', { key: 'team/report' }));
  await Promise.resolve();
  assert.equal(sameOwner, 2);
  assert.equal(otherOwner, 1);
  assert.equal(errors.length, 4);
  assert.ok(errors.every(args => args[0].includes('team/report')));
});
