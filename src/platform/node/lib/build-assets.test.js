import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { buildAssetStore, serializeBuildAsset } from './build-assets.js';

test('assets stay lazy, share cached work, and invalidate for additions, changes, and deletions', async () => {
  let calls = 0;
  const store = buildAssetStore(
    [['team', { assets: { report: { watch: ['content/**', 'types/*.ts'], load: () => ({ calls: ++calls }) } } }]],
    { root: '/studio', enabled: ['team'] },
  );
  assert.equal(calls, 0);
  const [one, two] = await Promise.all([store.read('team/report'), store.read('team/report')]);
  assert.equal(one, two);
  assert.equal(calls, 1);
  assert.deepEqual(store.invalidate('/studio/unrelated.txt'), []);
  for (const file of ['content/added.txt', 'content/edited.txt', 'content/deleted.txt', 'types/shape.ts']) {
    assert.deepEqual(store.invalidate(path.join('/studio', file)), ['team/report']);
    await store.read('team/report');
  }
  assert.equal(calls, 5);
  await assert.rejects(store.read('disabled/report'), error => error.status === 404);
  assert.deepEqual(buildAssetStore([], { root: '/studio', enabled: [] }).keys, []);
});
test('an edit during an in-flight computation cannot publish the previous generation', async () => {
  let release,
    calls = 0;
  const gate = new Promise(resolve => {
    release = resolve;
  });
  const store = buildAssetStore(
    [
      [
        'team',
        {
          assets: {
            report: {
              watch: ['content/**'],
              load: async () => {
                const generation = ++calls;
                if (generation === 1) await gate;
                return { generation };
              },
            },
          },
        },
      ],
    ],
    { root: '/studio', enabled: ['team'] },
  );
  const first = store.read('team/report');
  await Promise.resolve();
  store.invalidate('/studio/content/edited.txt');
  const second = store.read('team/report');
  release();
  assert.deepEqual(JSON.parse(await first), { generation: 2 });
  assert.equal(await first, await second);
});
test('asset failures remain retryable and invalid declarations or non-JSON values fail clearly', async () => {
  let fail = true;
  const store = buildAssetStore(
    [
      [
        'team',
        {
          assets: {
            report: {
              watch: ['content/**'],
              load: () => {
                if (fail) throw new Error('Broken source');
                return { valid: true };
              },
            },
          },
        },
      ],
    ],
    { root: '/studio', enabled: ['team'] },
  );
  await assert.rejects(store.read('team/report'), /Broken source/);
  fail = false;
  assert.equal(await store.read('team/report'), '{"valid":true}');
  for (const watch of [[], ['../escape'], ['/absolute'], ['content\\file'], ['!content/**']])
    assert.throws(
      () =>
        buildAssetStore([['team', { assets: { report: { watch, load: () => null } } }]], {
          root: '/studio',
          enabled: ['team'],
        }),
      /repository-relative watch/,
    );
  const cycle = {};
  cycle.self = cycle;
  for (const value of [undefined, { field: undefined }, NaN, { fn: () => {} }, new Date(), cycle])
    assert.throws(() => serializeBuildAsset(value), /serializable JSON/);
});
