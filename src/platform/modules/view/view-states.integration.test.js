import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { artifactFixture } from '../../node/lib/fixtures/artifacts.js';

const STATEFUL = `import type { ViewState } from '@module/view';

export const states: ViewState<{ name: string }>[] = [
  { title: 'Member', props: { name: 'Ana' } },
  { title: 'New user', props: { name: '' } },
];

export default function Home({ name }: { name: string }) {
  return <p>{name ? 'Welcome back, ' + name : 'Welcome'}</p>;
}
`;

// Seam 1: named view states through the public commands and the manifest they leave on disk.
test('named view states get permanent identities that survive renaming the view file', () => {
  const fixture = artifactFixture();
  try {
    const { root, base, run, env } = fixture;
    const node = (...args) => spawnSync(process.execPath, args, { cwd: root, env, encoding: 'utf8', timeout: 60000 });
    run('src/platform/node/cli/studio.js', 'identify', base, '--yes');
    run('src/platform/modules/prototypes/node/create.js', 'States fixture', '--no-system');
    const folder = 'src/prototypes/artifact-fixture/states-fixture';
    const dir = path.join(root, folder);
    fs.writeFileSync(path.join(dir, 'home.tsx'), STATEFUL);
    // Assignment gives the view and each of its states a permanent identity, and is idempotent.
    run('src/platform/node/cli/studio.js', 'identify', folder, '--yes');
    const identified = fs.readFileSync(path.join(dir, 'home.tsx'), 'utf8');
    assert.match(identified, /^\/\*\* @studio-id [0-9a-z]{16} \*\//);
    for (const title of ['Member', 'New user'])
      assert.match(identified, new RegExp(`/\\*\\* @studio-state [0-9a-z]{16} ${title} \\*/`));
    run('src/platform/node/cli/studio.js', 'identify', folder, '--yes');
    assert.equal(fs.readFileSync(path.join(dir, 'home.tsx'), 'utf8'), identified);

    const artifactsOf = () => {
      const result = node('src/platform/node/build/build-manifest.js');
      assert.equal(result.status, 0, result.stderr);
      assert.doesNotMatch(result.stderr, /states-fixture/);
      const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/prototypes/manifest.json'), 'utf8'));
      const proto = manifest.prototypes.find(p => p.contributorKey === 'artifact-fixture' && p.id === 'states-fixture');
      const artifacts = JSON.parse(
        fs.readFileSync(path.join(root, 'public/prototypes/artifacts/artifact-fixture/states-fixture.json'), 'utf8'),
      );
      return { proto, artifacts };
    };
    const before = artifactsOf();
    const home = before.artifacts.find(item => item.path === 'home.tsx');
    assert.deepEqual(
      home.states.map(state => state.title),
      ['Member', 'New user'],
    );
    assert.ok(home.states.every(state => /^[0-9a-hjkmnp-tv-z]{16}$/.test(state.studioId)));
    assert.notEqual(home.states[0].studioId, home.states[1].studioId);
    assert.ok(home.states.every(state => state.studioId !== home.studioId));
    // Views without states are unchanged.
    const plain = before.artifacts.find(item => item.path === 'prototype.tsx');
    assert.ok(plain.studioId);
    assert.equal('states' in plain, false);

    // The identity audit counts state IDs with every other resource.
    const audit = JSON.parse(node('src/platform/node/cli/studio.js', 'identity-audit', '--json').stdout);
    const children = audit.children.filter(child => child.path === `${folder}/home.tsx`);
    assert.deepEqual(
      children.map(child => [child.key, child.studioId]),
      home.states.map(state => [state.title, state.studioId]),
    );

    // Renaming the view file keeps the view's and every state's identity.
    fs.renameSync(path.join(dir, 'home.tsx'), path.join(dir, 'welcome.tsx'));
    const after = artifactsOf();
    const welcome = after.artifacts.find(item => item.path === 'welcome.tsx');
    assert.equal(welcome.studioId, home.studioId);
    assert.deepEqual(welcome.states, home.states);
    assert.equal(
      after.artifacts.some(item => item.path === 'home.tsx'),
      false,
    );

    // A document links to a state by its permanent address; duplication gives the copy's states fresh IDs and
    // points the copied link at the copy's state.
    const link = `/prototypes/${after.proto.studioId}/artifacts/${home.states[0].studioId}`;
    fs.writeFileSync(path.join(dir, 'notes.md'), `# Notes\n\nSee [the member state](${link}).\n`);
    run('src/platform/node/cli/studio.js', 'identify', folder, '--yes');
    const duplicate = String.raw`
      import { duplicatePrototype } from './src/platform/modules/prototypes/node/duplicate.js';
      duplicatePrototype({ key: 'artifact-fixture', id: 'states-fixture', title: 'States copy' });
    `;
    run('--input-type=module', '--eval', duplicate);
    const copyArtifacts = JSON.parse(
      fs.readFileSync(path.join(root, 'public/prototypes/artifacts/artifact-fixture/states-copy.json'), 'utf8'),
    );
    const copied = copyArtifacts.find(item => item.path === 'welcome.tsx');
    assert.deepEqual(
      copied.states.map(state => state.title),
      ['Member', 'New user'],
    );
    assert.ok(copied.states.every(state => !home.states.some(original => original.studioId === state.studioId)));
    const copyManifest = JSON.parse(fs.readFileSync(path.join(root, 'public/prototypes/manifest.json'), 'utf8'));
    const copyId = copyManifest.prototypes.find(p => p.id === 'states-copy').studioId;
    assert.match(
      fs.readFileSync(path.join(root, 'src/prototypes/artifact-fixture/states-copy/notes.md'), 'utf8'),
      new RegExp(`\\(/prototypes/${copyId}/artifacts/${copied.states[0].studioId}\\)`),
    );
    assert.deepEqual(
      JSON.parse(node('src/platform/node/cli/studio.js', 'identity-audit', '--json').stdout).problems.filter(problem =>
        problem.includes('states-'),
      ),
      [],
    );

    // Renaming a state's title in both places keeps its link; renaming it in code only is reported.
    const file = path.join(dir, 'welcome.tsx');
    const source = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, source.replaceAll('New user', 'First visit'));
    assert.deepEqual(
      artifactsOf().artifacts.find(item => item.path === 'welcome.tsx').states,
      [home.states[0], { ...home.states[1], title: 'First visit' }],
    );
    fs.writeFileSync(file, source.replace("title: 'Member'", "title: 'Signed in'"));
    const stale = node('src/platform/node/build/build-manifest.js');
    assert.match(stale.stderr, /welcome\.tsx: @studio-state \S+ names no state titled "Member"/);
  } finally {
    fixture.dispose();
  }
});
