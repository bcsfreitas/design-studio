import test from 'node:test';
import assert from 'node:assert/strict';
import { sameOrigin } from './http.js';

const request = headers => ({ headers });

test('fetch metadata decides when the browser sends it', () => {
  assert.equal(sameOrigin(request({ 'sec-fetch-site': 'same-origin' })), true);
  assert.equal(sameOrigin(request({ 'sec-fetch-site': 'same-site', host: 'a:1', origin: 'http://a:1' })), false);
  assert.equal(sameOrigin(request({ 'sec-fetch-site': 'cross-site', host: 'a:1', origin: 'http://a:1' })), false);
});

test('plain http without fetch metadata falls back to Origin, then Referer', () => {
  const host = '192.168.1.5:5180';
  assert.equal(sameOrigin(request({ host, origin: 'http://192.168.1.5:5180' })), true);
  assert.equal(sameOrigin(request({ host, referer: 'http://192.168.1.5:5180/settings' })), true);
  assert.equal(sameOrigin(request({ host, origin: 'http://evil.example' })), false);
  assert.equal(sameOrigin(request({ host, origin: 'http://192.168.1.5:5181' })), false);
  assert.equal(sameOrigin(request({ host, origin: 'null' })), false);
  assert.equal(sameOrigin(request({ host, referer: 'not a url' })), false);
  assert.equal(sameOrigin(request({ host })), false);
  assert.equal(sameOrigin(request({ origin: 'http://192.168.1.5:5180' })), false);
});
