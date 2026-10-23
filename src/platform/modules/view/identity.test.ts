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

import { assignChildIdentities, replaceChildIdentities } from '../../core/resourceIdentity.ts';
import { declaredStates, stateProblems } from './states.ts';
const third = resourceId('0000000000000003');
const statefulView = (header = '') =>
  `${header}import type { ViewState } from '@module/view';\n\n` +
  `export const states: ViewState<{ name: string }>[] = [\n` +
  `  { title: 'Member', props: { name: 'Ana', card: { title: 'not a state' } } },\n` +
  `  // { title: 'commented out' },\n` +
  `  { props: { name: '' }, title: "New user" },\n];\n\n` +
  `export default function Home({ name }: { name: string }) { return name; }\n`;

test('view states are read statically from the states export, ignoring nested titles and comments', () => {
  assert.deepEqual(declaredStates(statefulView()), { titles: ['Member', 'New user'], problems: [] });
  assert.deepEqual(declaredStates('export default function View() { return null; }\n'), { titles: [], problems: [] });
  assert.match(declaredStates('export const states = [{ title: name, props: {} }];').problems[0], /plain text/);
  assert.match(declaredStates('export const states = [{ props: {} }];').problems[0], /needs a title/);
  assert.match(declaredStates("export const states = [{ title: 'A' }, { title: 'A' }];").problems[0], /must differ/);
  assert.match(declaredStates('export const states = makeStates();').problems[0], /written in place/);
});

test('state identities are assigned once, kept on later assignment and read back by title', () => {
  const source = viewIdentity.write(statefulView(), first);
  assert.deepEqual(viewIdentity.children!.read(source), [
    { key: 'Member', studioId: null },
    { key: 'New user', studioId: null },
  ]);
  const queue = [second, third];
  const assigned = assignChildIdentities(source, { identity: viewIdentity }, () => queue.shift()!);
  assert.deepEqual(viewIdentity.children!.read(assigned), [
    { key: 'Member', studioId: second },
    { key: 'New user', studioId: third },
  ]);
  assert.equal(viewIdentity.read(assigned), first);
  assert.match(assigned, /^\/\*\* @studio-id 0123456789abcdef \*\/\n\/\*\* @studio-state abcdefghjkmnpqrs Member \*\/\n/);
  assert.equal(assignChildIdentities(assigned, { identity: viewIdentity }, () => assert.fail('no allocation')), assigned);
  assert.deepEqual(stateProblems(assigned), []);
  // Executable source is unchanged: only leading comments were added.
  assert.ok(assigned.endsWith(source.slice(source.indexOf('import'))));
});

test('state identities are permanent across view renames, reordering and title renames done in both places', () => {
  const queue = [second, third];
  const assigned = assignChildIdentities(viewIdentity.write(statefulView(), first), { identity: viewIdentity }, () =>
    queue.shift()!,
  );
  // A file rename or move doesn't touch content, so identity lives in the file: reorder states and rename one.
  const edited = assigned
    .replace("{ title: 'Member',", "{ title: 'Signed-in member',")
    .replace('@studio-state abcdefghjkmnpqrs Member', '@studio-state abcdefghjkmnpqrs Signed-in member');
  assert.deepEqual(viewIdentity.children!.read(edited), [
    { key: 'Signed-in member', studioId: second },
    { key: 'New user', studioId: third },
  ]);
  // Renaming the title in code only is reported, rather than silently minting a new link.
  const stale = assigned.replace("{ title: 'Member',", "{ title: 'Member v2',");
  assert.match(stateProblems(stale)[0], /names no state titled "Member"/);
  assert.deepEqual(
    viewIdentity.children!.read(stale).map(child => child.studioId),
    [null, third],
  );
});

test('state identity declarations reject malformed and repeated IDs, and duplication replaces them all', () => {
  assert.throws(() => viewIdentity.children!.read(`/** @studio-state nope Member */\n${statefulView()}`));
  assert.throws(() =>
    viewIdentity.children!.read(`/** @studio-state ${second} Member */\n/** @studio-state ${third} Member */\n${statefulView()}`),
  );
  const crlf = statefulView(`﻿/**\r\n * @studio-id ${first}\r\n */\r\n`).replace(/\n/g, '\r\n').replace(/\r\r/g, '\r');
  const queue = [second, third];
  const assigned = assignChildIdentities(crlf, { identity: viewIdentity }, () => queue.shift()!);
  assert.ok(assigned.startsWith(`﻿/**\r\n * @studio-id ${first}\r\n */\r\n/** @studio-state ${second} Member */`));
  const copies = [resourceId('0000000000000004'), resourceId('0000000000000005')];
  const copy = replaceChildIdentities(assigned, { identity: viewIdentity }, () => copies.shift()!);
  assert.deepEqual(
    viewIdentity.children!.read(copy.source).map(child => child.studioId),
    ['0000000000000004', '0000000000000005'],
  );
  assert.equal(copy.remapped.get(second), '0000000000000004');
  // Views without states have no children and are untouched.
  const plain = 'export default function View() { return null; }\n';
  assert.deepEqual(viewIdentity.children!.read(plain), []);
  assert.equal(assignChildIdentities(plain, { identity: viewIdentity }, () => assert.fail('no allocation')), plain);
});
