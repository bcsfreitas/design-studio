import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { fillInsecureContext, randomUUID, sha256 } from './insecure-context.ts';

const hex = (buffer: ArrayBuffer) => Buffer.from(buffer).toString('hex');

test('sha256 matches Node across padding boundaries', () => {
  for (const length of [0, 1, 55, 56, 63, 64, 65, 119, 120, 1000]) {
    const data = new Uint8Array(length).map((_, i) => (i * 31 + 7) & 0xff);
    assert.equal(hex(sha256(data)), createHash('sha256').update(data).digest('hex'), `length ${length}`);
  }
  const text = new TextEncoder().encode('[["app/overview.tsx","1"]] — ünïcode');
  assert.equal(hex(sha256(text)), createHash('sha256').update(text).digest('hex'));
});

test('randomUUID produces distinct version 4 identifiers', () => {
  const ids = new Set(Array.from({ length: 200 }, randomUUID));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('filling an insecure context adds only what is missing', async () => {
  const insecure = { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) } as unknown as Crypto;
  fillInsecureContext({ crypto: insecure } as unknown as typeof globalThis);
  assert.match(insecure.randomUUID(), /^[0-9a-f-]{36}$/);
  const digest = await insecure.subtle.digest('SHA-256', new TextEncoder().encode('studio'));
  assert.equal(hex(digest), createHash('sha256').update('studio').digest('hex'));
  await assert.rejects(insecure.subtle.digest('SHA-1', new Uint8Array()));

  const native = webcrypto.randomUUID;
  fillInsecureContext({ crypto: webcrypto } as unknown as typeof globalThis);
  assert.equal(webcrypto.randomUUID, native);
});
