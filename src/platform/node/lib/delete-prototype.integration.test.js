import { linkSystemDependencies } from './fixtures/workspace-dependencies.js';
import { writeProfiles } from './fixtures/contributors.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { parseConfigFile, serializeConfig, withSettings } from '../../core/config-file.ts';

// Deleting a prototype previews what breaks or is lost, respects ownership, and leaves no ghost in the manifest.
test('public CLI previews and deletes a prototype under owner-or-Admin permissions', () => {
  const original = path.resolve('.'),
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-delete-prototype-')),
    ghConfig = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-delete-prototype-gh-'));
  try {
    fs.cpSync(original, root, {
      recursive: true,
      filter: file => !['node_modules', 'dist', '.git', '.scratch'].includes(path.basename(file)),
    });
    fs.symlinkSync(path.join(original, 'node_modules'), path.join(root, 'node_modules'));
    linkSystemDependencies(original, root);
    // Only the fixture's own people: the host's real profiles stay out of the copy's identity checks.
    for (const file of fs.readdirSync(path.join(root, 'contributors')))
      if (file !== 'parker.json') fs.rmSync(path.join(root, 'contributors', file));
    writeProfiles(root, {
      ada: { name: 'Ada Admin', email: 'ada@work.test' },
      sam: { name: 'Sam Lee', email: 'sam@work.test' },
    });
    const adaId = JSON.parse(fs.readFileSync(path.join(root, 'contributors/ada.json'), 'utf8')).studioId;
    const configFile = path.join(root, 'studio.config.json');
    fs.writeFileSync(
      configFile,
      serializeConfig(
        withSettings(parseConfigFile(fs.readFileSync(configFile, 'utf8')).value, { usage: 'team', admins: [adaId] }),
      ),
    );
    fs.rmSync(path.join(root, 'src/prototypes'), { recursive: true, force: true });
    const write = (file, content) => {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), content);
    };
    const meta = title => JSON.stringify({ formatVersion: 1, title, systemId: null });
    const doomed = 'src/prototypes/sam/doomed',
      linker = 'src/prototypes/ada/linker';
    write(`${doomed}/meta.json`, meta('Doomed'));
    write(`${doomed}/main.tsx`, 'export default function View(){ return <div>Doomed</div> }');
    write(`${linker}/meta.json`, meta('Linker'));
    write(`${linker}/main.tsx`, 'export default function View(){ return <div>Linker</div> }');

    const as = (name, email) => args =>
      spawnSync(process.execPath, ['src/platform/node/cli/studio.js', ...args], {
        cwd: root,
        encoding: 'utf8',
        timeout: 60000,
        env: {
          ...process.env,
          GH_TOKEN: '',
          GITHUB_TOKEN: '',
          GH_CONFIG_DIR: ghConfig,
          MISE_TRUSTED_CONFIG_PATHS: root,
          GIT_CONFIG_COUNT: '2',
          GIT_CONFIG_KEY_0: 'user.name',
          GIT_CONFIG_VALUE_0: name,
          GIT_CONFIG_KEY_1: 'user.email',
          GIT_CONFIG_VALUE_1: email,
        },
      });
    const ok = result => {
      assert.equal(result.status, 0, result.stderr);
      return result.stdout;
    };
    const sam = as('Sam Lee', 'sam@work.test'),
      ada = as('Ada Admin', 'ada@work.test'),
      stranger = as('Robin Park', 'robin@elsewhere.test');
    ok(sam(['identify', doomed, '--yes']));
    ok(ada(['identify', linker, '--yes']));
    const doomedId = JSON.parse(fs.readFileSync(path.join(root, doomed, 'meta.json'), 'utf8')).studioId;
    // Another prototype's document and canvas link into the doomed one.
    write(`${linker}/notes.md`, '# Notes\n[Doomed](/prototypes/sam/doomed)\n');
    write(
      `${linker}/board.excalidraw`,
      JSON.stringify({
        type: 'excalidraw',
        version: 2,
        studioVersion: 1,
        elements: [{ type: 'embeddable', link: `/prototypes/${doomedId}` }],
        appState: {},
        files: {},
      }),
    );
    ok(ada(['identify', linker, '--yes']));
    const manifest = () => fs.readFileSync(path.join(root, 'public/prototypes/manifest.json'), 'utf8');
    assert.ok(manifest().includes(doomedId));

    // Only the doomed prototype is committed, so a new draft is untracked.
    const git = (...args) =>
      execFileSync('git', ['-c', 'user.name=Sam Lee', '-c', 'user.email=sam@work.test', ...args], {
        cwd: root,
        stdio: 'pipe',
      });
    git('init', '-q');
    git('add', doomed);
    // A throwaway fixture repository, so the host's signing setup does not apply.
    git('-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'Fixture');
    write(`${doomed}/draft.md`, '# Draft\n');

    const preview = JSON.parse(ok(sam(['delete-prototype', doomed, '--json'])));
    assert.deepEqual(preview.untracked, [`${doomed}/draft.md`]);
    assert.deepEqual(
      preview.breaking.map(file => [file.path, file.kind]),
      [
        [`${linker}/board.excalidraw`, 'canvas'],
        [`${linker}/notes.md`, 'document'],
      ],
    );
    const text = ok(sam(['delete-prototype', doomed]));
    assert.match(text, /Canvas and document references that would break:/);
    assert.match(
      text,
      /Untracked files that would be lost \(not in Git\):\n {2}src\/prototypes\/sam\/doomed\/draft\.md/,
    );
    assert.match(text, /Preview only\. Apply with --yes\./);
    assert.ok(fs.existsSync(path.join(root, doomed, 'draft.md')));

    // Someone else's prototype is refused unless they are an Admin; an unknown identity is told how to register.
    const refused = sam(['delete-prototype', linker, '--yes']);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /belongs to someone else/);
    assert.ok(fs.existsSync(path.join(root, linker, 'notes.md')));
    const unknown = stranger(['delete-prototype', doomed, '--yes']);
    assert.equal(unknown.status, 1);
    assert.match(unknown.stderr, /Your Git identity \(robin@elsewhere\.test\) doesn't match a contributor profile/);
    assert.ok(fs.existsSync(path.join(root, doomed)));

    // An Admin deletes it; the manifest no longer lists it.
    const deleted = ok(ada(['delete-prototype', doomed, '--yes']));
    assert.match(deleted, /Deleted src\/prototypes\/sam\/doomed\./);
    assert.match(deleted, /Refreshed the manifest/);
    assert.equal(fs.existsSync(path.join(root, doomed)), false);
    assert.ok(!manifest().includes(doomedId));
    assert.ok(fs.existsSync(path.join(root, linker, 'notes.md')));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(ghConfig, { recursive: true, force: true });
  }
});
