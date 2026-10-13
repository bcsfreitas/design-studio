import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resourceId } from '#studio/files';

import { diagramIdentity } from './identity.ts';
const first = resourceId('0123456789abcdef'),
  second = resourceId('abcdefghjkmnpqrs');

test('diagram identity remains a valid leading Mermaid comment', () => {
  const source = '\uFEFF%% Existing comment\r\nflowchart LR\r\n A --> B\r\n';
  const written = diagramIdentity.write(source, first);
  assert.equal(diagramIdentity.read(written), first);
  assert.equal(written, `\uFEFF%% @studio-id ${first}\r\n${source.slice(1)}`);
  assert.equal(diagramIdentity.write(written, first), written);
  assert.equal(diagramIdentity.read(diagramIdentity.write(written, second)), second);
  assert.throws(() => diagramIdentity.read(`%% @studio-id ${first}\n%% @studio-id ${second}\nflowchart LR`));
});
