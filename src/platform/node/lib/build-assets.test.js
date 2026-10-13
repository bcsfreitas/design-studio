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

test('superseded failures follow successful replacement work for every waiting caller', async () => {
  let reject,
    calls = 0;
  const gate = new Promise((_, failure) => {
    reject = failure;
  });
  const store = buildAssetStore(
    [
      [
        'team',
        { assets: { report: { watch: ['content/**'], load: () => (++calls === 1 ? gate : { generation: calls }) } } },
      ],
    ],
    { root: '/studio', enabled: ['team'] },
  );
  const first = store.read('team/report'),
    shared = store.read('team/report');
  await Promise.resolve();
  store.invalidate('/studio/content/fixed.txt');
  const latest = await store.read('team/report');
  reject(new Error('obsolete broken source'));
  assert.equal(await first, latest);
  assert.equal(await shared, latest);
  assert.equal(calls, 2);
});

import { generationCache } from '../../core/generationCache.ts';
test('current failures reject all waiters and retry only on a subsequent read', async () => {
  let calls = 0;
  const cache = generationCache(() => {
    calls++;
    if (calls === 1) throw new Error('current failure');
    return 'recovered';
  });
  const results = await Promise.allSettled([cache.read('one'), cache.read('one')]);
  assert.ok(results.every(result => result.status === 'rejected' && /current failure/.test(result.reason.message)));
  assert.equal(calls, 1);
  assert.equal(await cache.read('one'), 'recovered');
  assert.equal(calls, 2);
});
test('global invalidation supersedes in-flight work as well as completed values', async () => {
  let release,
    calls = 0;
  const gate = new Promise(resolve => {
    release = resolve;
  });
  const cache = generationCache(async key => {
    const generation = ++calls;
    if (key === 'pending' && generation === 1) await gate;
    return { key, generation };
  });
  const first = cache.read('pending');
  await Promise.resolve();
  await cache.read('complete');
  cache.invalidateAll();
  release();
  assert.deepEqual(await first, { key: 'pending', generation: 3 });
  assert.deepEqual(await cache.read('complete'), { key: 'complete', generation: 4 });
});

test('JSON serialization rejects accessors without invoking them and preserves literal data keys', () => {
  let calls = 0;
  for (const value of [
    {
      get number() {
        calls++;
        return NaN;
      },
    },
    Object.defineProperty({}, 'toJSON', {
      get() {
        calls++;
        return () => null;
      },
    }),
    Object.defineProperty([], '0', {
      get() {
        calls++;
        return 'changed';
      },
    }),
  ])
    assert.throws(() => serializeBuildAsset(value), /accessors/);
  assert.equal(calls, 0);
  const data = JSON.parse('{"__proto__":{"keep":true},"array":[1,null,false]}');
  assert.deepEqual(JSON.parse(serializeBuildAsset(data)), data);
});
