import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import buildAssets from './vite-build-assets-plugin.js';
test('development asset middleware resolves mounted paths, preserves laziness, and rejects foreign requests', async () => {
  let calls = 0,
    handler;
  const watcher = new EventEmitter();
  watcher.add = () => {};
  const notifications = [];
  const plugin = buildAssets({
    root: '/studio',
    enabled: ['team'],
    builds: [['team', { assets: { report: { watch: ['content/**'], load: () => ({ calls: ++calls }) } } }]],
  });
  plugin.configureServer({
    middlewares: {
      use: (_path, callback) => {
        handler = callback;
      },
    },
    watcher,
    ws: { send: event => notifications.push(event) },
  });
  assert.equal(calls, 0);
  const response = () => ({
    statusCode: 200,
    setHeader() {},
    end(body) {
      this.body = body;
    },
  });
  const first = response();
  await handler({ method: 'GET', url: '/team/report?version=1', headers: { 'sec-fetch-site': 'same-origin' } }, first);
  assert.equal(first.statusCode, 200);
  assert.deepEqual(JSON.parse(first.body), { calls: 1 });
  const second = response();
  await handler({ method: 'GET', url: '/team/report', headers: { 'sec-fetch-site': 'same-origin' } }, second);
  assert.equal(calls, 1);
  watcher.emit('change', '/studio/content/edited.txt');
  assert.equal(notifications[0].data.key, 'team/report');
  await handler({ method: 'GET', url: '/team/report', headers: { 'sec-fetch-site': 'same-origin' } }, response());
  assert.equal(calls, 2);
  const denied = response();
  await handler({ method: 'GET', url: '/team/report', headers: { 'sec-fetch-site': 'cross-site' } }, denied);
  assert.equal(denied.statusCode, 403);
  assert.equal(calls, 2);
});
