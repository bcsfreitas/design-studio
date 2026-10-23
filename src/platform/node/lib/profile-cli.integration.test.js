import { writeProfiles } from './fixtures/contributors.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseConfigFile, serializeConfig, withSettings } from '../../core/config-file.ts';

// `pnpm studio profile` previews and applies profile changes without touching studio ID or preferences.
test('public CLI profile command previews, applies and refuses profile changes', () => {
  const original = path.resolve('.'),
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-profile-'));
  try {
    fs.cpSync(original, root, {
      recursive: true,
      filter: file => !['node_modules', 'dist', '.git', '.scratch'].includes(path.basename(file)),
    });
    fs.symlinkSync(path.join(original, 'node_modules'), path.join(root, 'node_modules'));
    const configFile = path.join(root, 'studio.config.json');
    fs.writeFileSync(
      configFile,
      serializeConfig(
        withSettings(parseConfigFile(fs.readFileSync(configFile, 'utf8')).value, { usage: 'personal', admins: [] }),
      ),
    );
    for (const file of fs.readdirSync(path.join(root, 'contributors')))
      if (file !== 'parker.json') fs.rmSync(path.join(root, 'contributors', file));
    const preferences = { onboarding: { welcomeDismissed: true, completed: ['tour'] }, canvas: { grid: false } };
    writeProfiles(root, {
      sam: { name: 'Sam Lee', email: 'sam@work.test', github: 'samlee', preferences },
      lee: { name: 'Lee Park', email: 'lee@work.test', github: 'leepark' },
    });
    const samFile = path.join(root, 'contributors/sam.json');
    const read = () => JSON.parse(fs.readFileSync(samFile, 'utf8'));
    const { studioId } = read();

    const as =
      (name, email) =>
      (...args) =>
        spawnSync(process.execPath, ['src/platform/node/cli/studio.js', 'profile', ...args], {
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
    const sam = as('Sam Lee', 'sam@work.test');

    // Without changes, it shows the profile.
    const shown = sam();
    assert.equal(shown.status, 0, shown.stderr);
    assert.match(shown.stdout, /contributors\/sam\.json \(sam\)/);
    assert.match(shown.stdout, /email \(primary\): sam@work\.test/);

    // A preview writes nothing.
    const before = fs.readFileSync(samFile, 'utf8');
    const changes = ['--name', 'Sam Lee-Park', '--add-email', 'sam@home.test', '--github', 'sam-lee'];
    const preview = sam(...changes);
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /name: Sam Lee → Sam Lee-Park/);
    assert.match(preview.stdout, /emails: none → sam@home\.test/);
    assert.match(preview.stdout, /github: samlee → sam-lee/);
    assert.match(preview.stdout, /Nothing written/);
    assert.equal(fs.readFileSync(samFile, 'utf8'), before);

    // --yes applies; studio ID, onboarding progress and other preferences are unchanged.
    const applied = sam(...changes, '--yes');
    assert.equal(applied.status, 0, applied.stderr);
    let profile = read();
    assert.equal(profile.name, 'Sam Lee-Park');
    assert.equal(profile.email, 'sam@work.test');
    assert.deepEqual(profile.emails, ['sam@home.test']);
    assert.equal(profile.github, 'sam-lee');
    assert.equal(profile.studioId, studioId);
    assert.deepEqual(profile.preferences, preferences);

    // The primary email can move; the old primary stays as an additional email.
    assert.equal(sam('--primary-email', 'sam@home.test', '--yes').status, 0);
    profile = read();
    assert.equal(profile.email, 'sam@home.test');
    assert.deepEqual(profile.emails, ['sam@work.test']);

    // The email the current Git identity resolves through can't be removed.
    const unchanged = fs.readFileSync(samFile, 'utf8');
    const lockout = sam('--remove-email', 'sam@work.test', '--yes');
    assert.equal(lockout.status, 1);
    assert.match(lockout.stderr, /remove-email: sam@work\.test is your current Git email/);
    assert.equal(fs.readFileSync(samFile, 'utf8'), unchanged);
    // From the other email, it can.
    const fromHome = as('Sam Lee', 'sam@home.test');
    assert.equal(fromHome('--remove-email', 'sam@work.test', '--yes').status, 0, 'removes an email not in use');
    assert.equal(read().emails, undefined);

    // Validation errors name the field and the expected form, and write nothing.
    const invalid = fs.readFileSync(samFile, 'utf8');
    for (const [args, message] of [
      [['--add-email', 'not-an-email'], /add-email: expected an email address such as sam@example\.com/],
      [['--github', 'bad name!'], /github: expected a GitHub username/],
      [['--name', ' '], /name: expected a nonempty name/],
      [['--add-email', 'lee@work.test'], /add-email: lee@work\.test is already registered to lee/],
      [['--github', 'LeePark'], /github: "LeePark" is already registered to lee/],
      [['--remove-email', 'nobody@work.test'], /remove-email: nobody@work\.test isn't on this profile/],
      [['--remove-email', 'sam@home.test'], /remove-email: sam@home\.test is your current Git email/],
      [['--frobnicate'], /Unknown option --frobnicate/],
    ]) {
      const refused = fromHome(...args, '--yes');
      assert.equal(refused.status, 1, args.join(' '));
      assert.match(refused.stderr, message);
    }
    assert.equal(fs.readFileSync(samFile, 'utf8'), invalid);

    // An unrecognised identity is told so; --as recovers a matching profile and is refused for another.
    const changed = as('Sam Lee-Park', 'sam@new.test');
    const unrecognised = changed('--add-email', 'sam@new.test', '--yes');
    assert.equal(unrecognised.status, 1);
    assert.match(
      unrecognised.stderr,
      /Your Git identity \(sam@new\.test\) doesn't match a contributor profile.*--as sam/s,
    );
    const refusedAs = changed('--as', 'lee', '--add-email', 'sam@new.test', '--yes');
    assert.equal(refusedAs.status, 1);
    assert.match(refusedAs.stderr, /--as lee refused/);
    const recovered = changed('--as', 'sam', '--add-email', 'sam@new.test', '--yes');
    assert.equal(recovered.status, 0, recovered.stderr);
    assert.deepEqual(read().emails, ['sam@new.test']);
    assert.equal(read().studioId, studioId);
    assert.deepEqual(read().preferences, preferences);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
