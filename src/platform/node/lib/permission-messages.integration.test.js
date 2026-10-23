import { linkSystemDependencies } from './fixtures/workspace-dependencies.js';
import { writeProfiles } from './fixtures/contributors.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseConfigFile, serializeConfig, withSettings } from '../../core/config-file.ts';

// A refused shared operation says whether the Git identity or the contributor's role is the cause.
test('public CLI refusals name an unrecognised identity, a missing Admin role, or a missing maintainer role', () => {
  const original = path.resolve('.'),
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-permission-messages-')),
    ghConfig = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-permission-gh-'));
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
      sam: { name: 'Sam Lee', email: 'sam@work.test', github: 'samlee' },
    });
    fs.rmSync(path.join(root, 'src/prototypes'), { recursive: true, force: true });
    const studioIdOf = key => JSON.parse(fs.readFileSync(path.join(root, `contributors/${key}.json`), 'utf8')).studioId;
    const configFile = path.join(root, 'studio.config.json');
    const configure = settings =>
      fs.writeFileSync(
        configFile,
        serializeConfig(withSettings(parseConfigFile(fs.readFileSync(configFile, 'utf8')).value, settings)),
      );
    const system = JSON.parse(fs.readFileSync(configFile, 'utf8')).systems[0];
    const systemFolder = path.join(root, 'src/systems', system);
    assert.ok(fs.existsSync(systemFolder), `the copy needs the ${system} system`);

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
    const stranger = as('Robin Park', 'robin@elsewhere.test');
    const identityMessage =
      /Your Git identity \(robin@elsewhere\.test\) doesn't match a contributor profile.*pnpm join/s;

    // Personal studio: every contributor is an Admin, so an unregistered email is the only possible cause.
    configure({ usage: 'personal', admins: [] });
    const personal = stranger(['delete-system', system, '--yes']);
    assert.equal(personal.status, 1);
    assert.match(personal.stderr, identityMessage);
    assert.doesNotMatch(personal.stderr, /Admin/);
    assert.ok(fs.existsSync(systemFolder));

    // A changed email whose name matches a profile is told which profile to link, and may act as it with --as.
    const changed = as('Sam Lee', 'sam@new.test');
    const unlinked = changed(['delete-system', system, '--yes']);
    assert.equal(unlinked.status, 1);
    assert.match(unlinked.stderr, /Your Git identity \(sam@new\.test\) doesn't match a contributor profile/);
    assert.match(unlinked.stderr, /Profile "sam" matches your name.*--as sam/s);
    const asSam = changed(['status', '--json', '--as', 'sam']);
    assert.equal(asSam.status, 0, asSam.stderr);
    assert.equal(JSON.parse(asSam.stdout).contributor, 'sam');
    // --as is refused when the profile matches neither the Git name nor GitHub account.
    const asAda = changed(['delete-system', system, '--yes', '--as', 'ada']);
    assert.equal(asAda.status, 1);
    assert.match(asAda.stderr, /--as ada refused: that profile matches neither your Git name nor your GitHub account/);
    // --as never switches a linked identity to someone else.
    const linkedAsAda = as('Ada Admin', 'sam@work.test')(['status', '--json', '--as', 'ada']);
    assert.equal(linkedAsAda.status, 1);
    assert.match(linkedAsAda.stderr, /already resolves to "sam"/);
    assert.equal(stranger(['status', '--as', 'nobody']).status, 1);
    assert.ok(fs.existsSync(systemFolder));

    // Team studio: a recognised contributor lacks a role; an unrecognised user is told about identity.
    configure({ usage: 'team', admins: [studioIdOf('ada')] });
    const sam = as('Sam Lee', 'sam@work.test');
    const notAdmin = sam(['delete-system', system, '--yes']);
    assert.equal(notAdmin.status, 1);
    assert.match(notAdmin.stderr, /Only an Admin can do this\. You are recognised as a contributor, not an Admin\./);
    const notMaintainer = sam(['rename-system', system, '--label', 'Renamed', '--yes']);
    assert.equal(notMaintainer.status, 1);
    assert.match(notMaintainer.stderr, new RegExp(`maintainer of the ${system} system`));
    const sharedChange = sam(['disable', 'onboarding']);
    assert.equal(sharedChange.status, 1);
    assert.match(sharedChange.stderr, /Only an Admin can apply shared configuration changes\. You are recognised/);
    const unrecognised = stranger(['delete-system', system, '--yes']);
    assert.equal(unrecognised.status, 1);
    assert.match(unrecognised.stderr, identityMessage);
    assert.doesNotMatch(unrecognised.stderr, /Only an Admin/);
    // --as keeps the named contributor's own permissions: Sam is still not an Admin.
    const samAs = as('Sam Lee', 'sam@new.test')(['delete-system', system, '--yes', '--as', 'sam']);
    assert.equal(samAs.status, 1);
    assert.match(samAs.stderr, /Only an Admin can do this/);
    assert.ok(fs.existsSync(systemFolder));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(ghConfig, { recursive: true, force: true });
  }
});
