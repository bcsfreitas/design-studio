import assert from 'node:assert/strict';
import { test } from 'node:test';
import spec from './type.ts';
import { resourceId } from '#studio/files';

test('lofi toggling preserves view identity and executable contents in both header orders', () => {
  const id = resourceId('0123456789abcdef');
  const source = 'export default function Screen() { return null; }\n';
  const identified = spec.identity!.write(source, id);
  const lofi = spec.fidelity!.setLofi(identified, true);
  assert.equal(spec.identity!.read(lofi), id);
  assert.equal(spec.fidelity!.setLofi(lofi, false), identified);
  const identifiedLofi = spec.identity!.write(spec.fidelity!.setLofi(source, true), id);
  assert.equal(spec.identity!.read(spec.fidelity!.setLofi(identifiedLofi, false)), id);
});

import { viewIdentity } from './identity.ts';
const first = resourceId('0123456789abcdef'),
  second = resourceId('abcdefghjkmnpqrs');

test('view identity survives lofi comments, BOM and CRLF without rewriting executable source', () => {
  const source = '\uFEFF/** @lofi */\r\nexport default function View() { return "@studio-id example"; }\r\n';
  const written = viewIdentity.write(source, first);
  assert.equal(viewIdentity.read(written), first);
  assert.equal(written, '\uFEFF/** @studio-id 0123456789abcdef */\r\n' + source.slice(1));
  assert.equal(viewIdentity.write(written, first), written);
  assert.equal(viewIdentity.read(viewIdentity.write(written, second)), second);
  assert.equal(viewIdentity.read(source), null);
  assert.throws(() => viewIdentity.read('/** @studio-id */\nexport default null;'));
  assert.throws(() =>
    viewIdentity.read(`/** @studio-id ${first} */\n/** @studio-id ${second} */\nexport default null;`),
  );
});
