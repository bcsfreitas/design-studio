import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  artifactAddress,
  jsonIdentityMetadata,
  createResourceId,
  markdownIdentity,
  prototypeAddress,
  resourceId,
  systemAddress,
} from './resourceIdentity.ts';

const first = resourceId('0123456789abcdef'),
  second = resourceId('abcdefghjkmnpqrs');

test('resource IDs have a fixed alphabet and reject path fragments and ambiguous encodings', () => {
  for (const invalid of [
    '',
    null,
    123,
    '../0123456789abc',
    '0123456789ABCDEF',
    '0123456789abcdei',
    '0123456789abcdefg',
    '0123456789abcde%',
  ])
    assert.throws(() => resourceId(invalid));
  assert.equal(createResourceId().length, 16);
  assert.equal(resourceId(createResourceId()).length, 16);
  assert.equal(prototypeAddress(first), `/prototypes/${first}`);
  assert.equal(artifactAddress(first, second), `/prototypes/${first}/artifacts/${second}`);
  assert.equal(systemAddress(first), `/systems/${first}`);
});

test('Markdown identity preserves frontmatter and body and rejects malformed or duplicate declarations', () => {
  const source = '\uFEFF---\r\ntitle: Checkout\r\n---\r\n\r\n[Payment](./payment.tsx)\r\n';
  const written = markdownIdentity.write(source, first);
  assert.equal(markdownIdentity.read(written), first);
  assert.equal(written, source.replace('title: Checkout', `studioId: ${first}\r\ntitle: Checkout`));
  assert.equal(markdownIdentity.write(written, first), written);
  assert.equal(markdownIdentity.read(markdownIdentity.write(written, second)), second);
  assert.equal(markdownIdentity.read(markdownIdentity.write('# Notes\n', first)), first);
  assert.throws(() => markdownIdentity.write('---\ntitle: Broken\n', first));
  assert.throws(() => markdownIdentity.read(`---\nstudioId: ${first}\nstudioId: ${second}\n---\n`));
  assert.throws(() => markdownIdentity.read('---\nstudioId: null\n---\n'));
});

test('generic JSON identity preserves data and rejects invalid identity instead of replacing it', () => {
  const scene = {
    elements: [{ id: 'frame-id', type: 'frame' }],
    appState: { gridSize: 20 },
    studioVersion: 1,
    custom: { retained: true },
  };
  const written = jsonIdentityMetadata.write(JSON.stringify(scene), first);
  assert.equal(jsonIdentityMetadata.read(written), first);
  assert.deepEqual(JSON.parse(written), { ...scene, studioId: first });
  assert.equal(jsonIdentityMetadata.write(written, first), written);
  assert.equal(jsonIdentityMetadata.read(jsonIdentityMetadata.write(written, second)), second);
  assert.throws(() => jsonIdentityMetadata.read('[]'));
  assert.throws(() => jsonIdentityMetadata.write('{"studioId":"invalid"}', first));
  assert.throws(() => jsonIdentityMetadata.read(`{"studioId":"${first}","studioId":"${second}"}`));
  assert.throws(() => jsonIdentityMetadata.read(`{"studioId":"${first}","\\u0073tudioId":"${second}"}`));
  assert.equal(jsonIdentityMetadata.read(`{"custom":{"studioId":"${second}"},"studioId":"${first}"}`), first);
});
