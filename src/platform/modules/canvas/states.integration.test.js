import { linkSystemDependencies } from '../../node/lib/fixtures/workspace-dependencies.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { parseConfigFile, serializeConfig, withSettings } from '../../core/config-file.ts';

const STATEFUL = `import type { ViewState } from '@module/view';

export const states: ViewState<{ name: string }>[] = [
  { title: 'Member', props: { name: 'Ana' } },
  { title: 'New user', props: { name: '' } },
];

export default function Home({ name }: { name: string }) {
  return <p>{name ? 'Welcome back, ' + name : 'Welcome'}</p>;
}
`;

// Seam 1: the canvas CLI places every state of a view in one call, and the embeds stay linked to their states
// after the view file is renamed.
test('canvas states places every state of a view with titles, linked by identity across a rename', () => {
  const original = path.resolve('.'),
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-canvas-states-'));
  try {
    fs.cpSync(original, root, {
      recursive: true,
      filter: file => !['node_modules', 'dist', '.git', '.scratch'].includes(path.basename(file)),
    });
    fs.symlinkSync(path.join(original, 'node_modules'), path.join(root, 'node_modules'));
    linkSystemDependencies(original, root);
    const configFile = path.join(root, 'studio.config.json');
    fs.writeFileSync(
      configFile,
      serializeConfig(
        withSettings(parseConfigFile(fs.readFileSync(configFile, 'utf8')).value, { usage: 'personal', admins: [] }),
      ),
    );
    const personFile = path.join(root, 'contributors/parker.json');
    const person = { ...JSON.parse(fs.readFileSync(personFile)), name: 'Canvas Fixture', email: 'canvas@example.test' };
    fs.writeFileSync(personFile, JSON.stringify(person));
    fs.rmSync(path.join(root, 'src/prototypes'), { recursive: true, force: true });
    const folder = 'src/prototypes/parker/example',
      dir = path.join(root, folder);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'meta.json'), '{"formatVersion":1,"title":"Example","systemId":null}');
    fs.writeFileSync(path.join(dir, 'home.tsx'), STATEFUL);
    fs.writeFileSync(
      path.join(dir, 'board.excalidraw'),
      JSON.stringify({ type: 'excalidraw', version: 2, studioVersion: 1, elements: [], appState: {}, files: {} }),
    );
    const options = {
      cwd: root,
      encoding: 'utf8',
      timeout: 60000,
      env: {
        ...process.env,
        MISE_TRUSTED_CONFIG_PATHS: root,
        GIT_CONFIG_COUNT: '2',
        GIT_CONFIG_KEY_0: 'user.name',
        GIT_CONFIG_VALUE_0: person.name,
        GIT_CONFIG_KEY_1: 'user.email',
        GIT_CONFIG_VALUE_1: person.email,
      },
    };
    const node = (...args) => execFileSync(process.execPath, args, { ...options, stdio: 'pipe' });
    const canvas = (...args) =>
      spawnSync(
        process.execPath,
        ['src/platform/modules/canvas/cli.ts', `${folder}/board.excalidraw`, ...args],
        options,
      );
    const ok = (...args) => {
      const run = canvas(...args);
      assert.equal(run.status, 0, run.stderr);
      return JSON.parse(run.stdout);
    };

    node('src/platform/node/cli/studio.js', 'identify', folder, '--yes');
    // State identities, as in the view module's states test (identify doesn't allocate them yet).
    const assign = String.raw`
      import fs from 'node:fs';
      import { INSTALLED_FILE_TYPES } from './src/platform/node/lib/file-types.js';
      import { retainedResourceIds, allocateResourceIdentity } from './src/platform/node/lib/resource-identity-lifecycle.js';
      import { assignChildIdentities } from './src/platform/core/resourceIdentity.ts';
      const file = process.argv[1];
      const used = retainedResourceIds(process.cwd(), INSTALLED_FILE_TYPES);
      const source = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, assignChildIdentities(source, INSTALLED_FILE_TYPES.view, () => allocateResourceIdentity(used)));
    `;
    node('--input-type=module', '--eval', assign, path.join(dir, 'home.tsx'));
    node('src/platform/node/build/build-manifest.js');
    const listing = () =>
      JSON.parse(fs.readFileSync(path.join(root, 'public/prototypes/artifacts/parker/example.json'), 'utf8'));
    const home = listing().find(item => item.path === 'home.tsx');
    assert.equal(home.states.length, 2);

    // `artifacts` names a view's states; `states` places them all, titled, in one call and with no warnings.
    assert.deepEqual(ok('artifacts').artifacts.find(item => item.artifact === 'home.tsx').states, [
      'Member',
      'New user',
    ]);
    ok('create', JSON.stringify({ type: 'text', text: 'Home', fontSize: 28, x: 0, y: 0 }));
    const placed = ok('states', JSON.stringify({ artifact: 'home.tsx' }));
    assert.equal(placed.warnings, undefined);
    const protoId = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'))).studioId;
    const links = home.states.map(state => `/prototypes/${protoId}/artifacts/${state.studioId}`);
    assert.deepEqual(
      placed.states.map(state => [state.title, state.link]),
      [
        ['Member', links[0]],
        ['New user', links[1]],
      ],
    );
    const stored = JSON.parse(fs.readFileSync(path.join(dir, 'board.excalidraw'), 'utf8')).elements;
    assert.deepEqual(
      stored.filter(el => el.type === 'embeddable').map(el => el.link),
      links,
    );
    assert.deepEqual(
      stored.filter(el => el.type === 'text').map(el => el.text),
      ['Home', 'Member', 'New user'],
    );
    const describeStates = () =>
      ok('describe')
        .elements.filter(el => el.kind === 'artifact')
        .map(el => [el.link, el.artifact?.title, el.artifact?.state]);
    assert.deepEqual(describeStates(), [
      [links[0], 'Home', 'Member'],
      [links[1], 'Home', 'New user'],
    ]);
    // With no placement, a second row goes below the first, again without overlaps.
    assert.equal(ok('states', JSON.stringify({ artifact: 'home.tsx' })).warnings, undefined);

    // Renaming the view file keeps every embed linked to its state.
    fs.renameSync(path.join(dir, 'home.tsx'), path.join(dir, 'welcome.tsx'));
    node('src/platform/node/build/build-manifest.js');
    const after = describeStates();
    assert.deepEqual(after.slice(0, 2), [
      [links[0], 'Welcome', 'Member'],
      [links[1], 'Welcome', 'New user'],
    ]);

    // A view without states, and one state alone, are refused with what to do instead.
    fs.writeFileSync(path.join(dir, 'main.tsx'), 'export default function View(){ return <div /> }');
    const plain = canvas('states', JSON.stringify({ artifact: 'main.tsx' }), '--identify');
    assert.equal(plain.status, 1);
    assert.match(plain.stderr, /declares no states/);
    const one = canvas('states', JSON.stringify({ artifact: links[0] }));
    assert.equal(one.status, 1);
    assert.match(one.stderr, /is one state \("Member"\)/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
