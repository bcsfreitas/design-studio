import { linkSystemDependencies } from '../../node/lib/fixtures/workspace-dependencies.js';
import { artifactTitle } from '../../core/artifactTitle.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { parseConfigFile, serializeConfig, withSettings } from '../../core/config-file.ts';

// The canvas CLI as an agent drives it: arguments inline, from a file or piped, guidance when files written
// directly have no identity yet, and the titles navigation shows.
test('canvas CLI reads arguments any way, explains a stale manifest, and titles like navigation', () => {
  const original = path.resolve('.'),
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-canvas-cli-'));
  try {
    fs.cpSync(original, root, {
      recursive: true,
      filter: file => !['node_modules', 'dist', '.git'].includes(path.basename(file)),
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
    fs.writeFileSync(path.join(dir, 'main.tsx'), 'export default function View(){ return <div>Example</div> }');
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
    const studio = (...args) =>
      execFileSync(process.execPath, ['src/platform/node/cli/studio.js', ...args], { ...options, stdio: 'pipe' });
    const canvas = (args, input) =>
      spawnSync(process.execPath, ['src/platform/modules/canvas/cli.ts', `${folder}/board.excalidraw`, ...args], {
        ...options,
        input,
      });
    const ok = (args, input) => {
      const run = canvas(args, input);
      assert.equal(run.status, 0, run.stderr);
      return JSON.parse(run.stdout);
    };
    const boardFile = path.join(dir, 'board.excalidraw');

    // identify assigns identities and refreshes the manifest in one command, and says so.
    const report = studio('identify', folder, '--yes');
    assert.match(report, /main\.tsx → [0-9a-hjkmnp-tv-z]{16}/);
    assert.match(report, /board\.excalidraw → /);
    assert.match(report, /Refreshed the manifest/);
    assert.ok(ok(['artifacts']).artifacts.some(item => item.artifact === 'main.tsx'));

    // A view written directly: the CLI names the command instead of failing on a resource ID.
    const names = ['Home - new user', 'checkout-step_two', 'ação rápida'];
    for (const name of names)
      fs.writeFileSync(path.join(dir, `${name}.tsx`), 'export default function View(){ return <div /> }');
    const boardBefore = fs.readFileSync(boardFile, 'utf8');
    const stale = canvas(['artifacts']);
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, new RegExp(`Run: pnpm studio identify ${folder} --yes`));
    assert.match(stale.stderr, /--identify/);
    assert.doesNotMatch(stale.stderr, /resource ID|at file:|Error:/);
    assert.equal(fs.readFileSync(boardFile, 'utf8'), boardBefore);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json')));
    // --identify runs the command and continues, keeping the identities it found.
    const mainBefore = fs.readFileSync(path.join(dir, 'main.tsx'), 'utf8');
    const listed = ok(['artifacts', '--identify']).artifacts;
    assert.equal(fs.readFileSync(path.join(dir, 'main.tsx'), 'utf8'), mainBefore);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'))).studioId, meta.studioId);
    // Titles are the ones navigation derives (artifactLabel → artifactTitle), separators and accents included.
    for (const name of names)
      assert.equal(listed.find(item => item.artifact === `${name}.tsx`)?.title, artifactTitle(name));
    assert.equal(listed.find(item => item.artifact === 'Home - new user.tsx').title, 'Home - New user');
    assert.equal(listed.find(item => item.artifact === 'main.tsx').title, 'Main');

    // An identified file the manifest doesn't list yet asks for the manifest rebuild.
    const listing = path.join(root, 'public/prototypes/artifacts/parker/example.json'),
      oldListing = fs.readFileSync(listing, 'utf8');
    fs.writeFileSync(path.join(dir, 'later.tsx'), 'export default function View(){ return <div /> }');
    studio('identify', folder, '--yes');
    fs.writeFileSync(listing, oldListing);
    const outdated = canvas(['artifacts']);
    assert.equal(outdated.status, 1);
    assert.match(
      outdated.stderr,
      /doesn't list later\.tsx[\s\S]*Run: node src\/platform\/node\/build\/build-manifest\.js/,
    );
    assert.ok(ok(['artifacts', '--identify']).artifacts.some(item => item.artifact === 'later.tsx'));

    // Arguments inline, from a file, and from standard input read the same.
    const argsFile = path.join(root, 'args.json');
    fs.writeFileSync(argsFile, '﻿' + JSON.stringify({ scope: 'all' }));
    const described = ok(['describe', '{"scope":"all"}']);
    assert.deepEqual(ok(['describe', '--json-file', argsFile]), described);
    assert.deepEqual(ok(['describe', '-'], '{"scope":"all"}'), described);

    const notes = () =>
      JSON.parse(fs.readFileSync(boardFile, 'utf8')).elements.filter(element => element.type !== 'arrow');
    const text = 'Say "hi" — ação';
    fs.writeFileSync(argsFile, JSON.stringify({ type: 'text', text }));
    ok(['create', '--json-file', argsFile]);
    ok(['create', '-'], JSON.stringify({ type: 'text', text }));
    ok(['create', JSON.stringify({ type: 'text', text })]);
    const made = notes().filter(element => element.text === text);
    assert.equal(made.length, 3);
    const [a, b, c] = made.map(element => element.id);
    fs.writeFileSync(argsFile, JSON.stringify({ id: a, text: 'Changed' }));
    ok(['update', '--json-file', argsFile]);
    ok(['update', '-'], JSON.stringify({ id: b, text: 'Changed' }));
    assert.equal(notes().filter(element => element.text === 'Changed').length, 2);
    const at = id => notes().find(element => element.id === id);
    const before = at(a);
    fs.writeFileSync(argsFile, JSON.stringify({ id: a, dx: 0, dy: 120 }));
    ok(['move', '--json-file', argsFile]);
    ok(['move', '-'], JSON.stringify({ id: b, dx: 0, dy: 120 }));
    assert.equal(at(a).y, before.y + 120);
    fs.writeFileSync(argsFile, JSON.stringify({ id: a }));
    ok(['delete', '--json-file', argsFile]);
    ok(['delete', '-'], JSON.stringify({ id: b }));
    assert.deepEqual(
      notes().map(element => element.id),
      [c],
    );

    // Malformed JSON gives its position, and on Windows the file and stdin forms.
    const malformed = canvas(['describe', '{scope:"all"}']);
    assert.equal(malformed.status, 1);
    assert.match(malformed.stderr, /position 1/);
    if (process.platform === 'win32') assert.match(malformed.stderr, /--json-file <path>, or pipe it with -/);
    fs.writeFileSync(argsFile, '{"scope": }');
    const badFile = canvas(['describe', '--json-file', argsFile]);
    assert.equal(badFile.status, 1);
    assert.match(badFile.stderr, /args\.json isn't valid JSON: .*position 10/);

    // A missing manifest asks for the same command.
    fs.rmSync(path.join(root, 'public/prototypes/manifest.json'));
    assert.match(canvas(['artifacts']).stderr, new RegExp(`Run: pnpm studio identify ${folder} --yes`));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
