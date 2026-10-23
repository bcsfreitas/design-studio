import { linkSystemDependencies } from './fixtures/workspace-dependencies.js';
import { writeProfiles } from './fixtures/contributors.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseConfigFile, serializeConfig, withSettings } from '../../core/config-file.ts';

// A changed Git email is recognised through additional emails, and join links instead of duplicating a profile.
test('public CLI resolves every profile email and join links a candidate instead of adding a duplicate', () => {
  const original = path.resolve('.'),
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-join-linking-'));
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
    // Only the fixture's own people: the host's real profiles stay out of the copy's identity checks.
    for (const file of fs.readdirSync(path.join(root, 'contributors')))
      if (file !== 'parker.json') fs.rmSync(path.join(root, 'contributors', file));
    writeProfiles(root, { sam: { name: 'Sam Lee', email: 'sam@work.test', emails: ['sam@home.test'] } });
    fs.rmSync(path.join(root, 'src/prototypes'), { recursive: true, force: true });
    fs.mkdirSync(path.join(root, 'src/prototypes/sam'), { recursive: true });
    const samFile = path.join(root, 'contributors/sam.json');
    const studioId = JSON.parse(fs.readFileSync(samFile, 'utf8')).studioId;
    const listing = () => [
      ...fs.readdirSync(path.join(root, 'contributors')).sort(),
      ...fs.readdirSync(path.join(root, 'src/prototypes')).sort(),
    ];

    const as =
      (name, email) =>
      (script, ...args) =>
        spawnSync(process.execPath, [script, ...args], {
          cwd: root,
          encoding: 'utf8',
          timeout: 30000,
          env: {
            ...process.env,
            MISE_TRUSTED_CONFIG_PATHS: root,
            GIT_CONFIG_COUNT: '2',
            GIT_CONFIG_KEY_0: 'user.name',
            GIT_CONFIG_VALUE_0: name,
            GIT_CONFIG_KEY_1: 'user.email',
            GIT_CONFIG_VALUE_1: email,
          },
        });
    const RESOLVE = 'src/platform/node/cli/resolve-contributor.js',
      JOIN = 'src/platform/node/cli/setup-contributor.js',
      NEW = 'src/platform/modules/prototypes/node/create.js';

    // Primary and additional emails both resolve, by email.
    for (const email of ['sam@work.test', 'SAM@home.test']) {
      const resolved = as('Sam Lee', email)(RESOLVE);
      assert.equal(resolved.status, 0, resolved.stderr);
      assert.equal(resolved.stdout.trim(), 'sam');
      const identity = JSON.parse(as('Sam Lee', email)(RESOLVE, '--json').stdout);
      assert.equal(identity.key, 'sam');
      assert.equal(identity.matchedBy, 'email');
    }

    // A changed email is a candidate: readable in a personal studio, but not linked for changes.
    const changed = as('Sam Lee', 'sam@new.test');
    const candidate = JSON.parse(changed(RESOLVE, '--json').stdout);
    assert.equal(candidate.key, null);
    assert.equal(candidate.candidate, 'sam');
    assert.equal(candidate.readOnlyKey, 'sam');
    assert.deepEqual(candidate.candidates, [{ key: 'sam', matchedBy: ['name'] }]);
    const readOnly = changed(RESOLVE);
    assert.equal(readOnly.status, 0);
    assert.equal(readOnly.stdout.trim(), 'sam');
    assert.match(readOnly.stderr, /isn't linked/);
    const before = listing();
    const refused = changed(NEW, 'Blocked', '--no-system');
    assert.notEqual(refused.status, 0);
    assert.deepEqual(listing(), before);

    // Join previews the link, then links with --yes; no new profile or prototype folder.
    const profileBefore = fs.readFileSync(samFile, 'utf8');
    const preview = changed(JOIN);
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /contributors\/sam\.json \(Sam Lee\) matches your name/);
    assert.match(preview.stdout, /Nothing written/);
    assert.equal(fs.readFileSync(samFile, 'utf8'), profileBefore);
    const linked = changed(JOIN, '--yes');
    assert.equal(linked.status, 0, linked.stderr);
    const profile = JSON.parse(fs.readFileSync(samFile, 'utf8'));
    assert.equal(profile.email, 'sam@work.test');
    assert.deepEqual(profile.emails, ['sam@home.test', 'sam@new.test']);
    assert.equal(profile.studioId, studioId);
    assert.deepEqual(listing(), before);
    assert.equal(JSON.parse(changed(RESOLVE, '--json').stdout).matchedBy, 'email');
    assert.match(changed(JOIN).stdout, /already a contributor: "sam"/);

    // Two matching profiles are never linked automatically.
    writeProfiles(root, { lee: { name: 'Sam Lee', email: 'lee@work.test' } });
    const ambiguousBefore = listing(),
      profilesBefore = ['sam', 'lee'].map(key => fs.readFileSync(path.join(root, `contributors/${key}.json`), 'utf8'));
    const ambiguous = as('Sam Lee', 'sam@other.test');
    const unresolved = JSON.parse(ambiguous(RESOLVE, '--json').stdout);
    assert.equal(unresolved.candidate, null);
    assert.equal(unresolved.readOnlyKey, null);
    assert.equal(unresolved.candidates.length, 2);
    const refusedLink = ambiguous(JOIN, '--yes');
    assert.equal(refusedLink.status, 1);
    assert.match(refusedLink.stderr, /Nothing is linked automatically/);
    assert.deepEqual(listing(), ambiguousBefore);
    assert.deepEqual(
      ['sam', 'lee'].map(key => fs.readFileSync(path.join(root, `contributors/${key}.json`), 'utf8')),
      profilesBefore,
    );
    // An explicit --link chooses one of them.
    assert.equal(ambiguous(JOIN, '--link', 'lee', '--yes').status, 0);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'contributors/lee.json'))).emails, ['sam@other.test']);
    assert.equal(ambiguous(RESOLVE).stdout.trim(), 'lee');

    // A genuinely new identity is registered as before.
    const added = as('Robin Park', 'robin@work.test')(JOIN, '--yes');
    assert.equal(added.status, 0, added.stderr);
    assert.ok(fs.existsSync(path.join(root, 'contributors/robin.json')));
    assert.ok(fs.existsSync(path.join(root, 'src/prototypes/robin/.gitkeep')));
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'contributors/robin.json'))).emails, undefined);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
