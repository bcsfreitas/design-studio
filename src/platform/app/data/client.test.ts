import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requestJson } from './client.ts';
import { ClientError } from '../../core/client-error.ts';

test('JSON transport preserves server codes, status and messages, and diagnoses invalid replies and unavailable service', async t => {
  for (const status of [403, 409, 422, 500]) {
    t.mock.method(
      globalThis,
      'fetch',
      async () => new Response(JSON.stringify({ code: 'denied', error: 'Keep this message' }), { status }),
    );
    await assert.rejects(
      requestJson('/test'),
      error =>
        error instanceof ClientError &&
        error.status === status &&
        error.code === 'denied' &&
        error.message === 'Keep this message',
    );
  }
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Unavailable</html>', { status: 503 }));
  await assert.rejects(
    requestJson('/test'),
    error => error instanceof ClientError && error.status === 503 && error.code === 'invalid_response',
  );
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('network');
  });
  await assert.rejects(
    requestJson('/test'),
    error => error instanceof ClientError && error.status === undefined && error.code === 'unavailable',
  );
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ success: true })));
  assert.deepEqual(await requestJson('/test'), { success: true });
});
