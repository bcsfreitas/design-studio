import { linkSystemDependencies } from './fixtures/workspace-dependencies.js';
import { runPackageManager } from './package-manager.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseConfigFile, serializeConfig, withSettings } from '../../core/config-file.ts';

// Seam 1: system lifecycle commands run their package-manager steps through the pnpm that launched them, with no
// pnpm executable on PATH (Windows with corepack), and a failed step reports one sentence and restores the studio.
test('system commands use the launching pnpm without one on PATH, and a failed step restores the studio', () => {
  const original = path.resolve('.'),
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-package-manager-cli-'));
  try {
    // The entry point a `pnpm` command provides; asked of pnpm itself when this test was not launched by it.
    const entry = /^pnpm\//.test(process.env.npm_config_user_agent ?? '')
      ? process.env.npm_execpath
      : runPackageManager(['exec', 'node', '-p', 'process.env.npm_execpath'], { cwd: original })
          .stdout.trim()
          .split('\n')
          .at(-1);
    assert.ok(entry && fs.existsSync(entry), `pnpm entry point: ${entry}`);
    fs.cpSync(original, root, {
      recursive: true,
      filter: file => !['node_modules', 'dist', '.git', '.scratch'].includes(path.basename(file)),
    });
    fs.symlinkSync(path.join(original, 'node_modules'), path.join(root, 'node_modules'), 'junction');
    linkSystemDependencies(original, root);
    const configFile = path.join(root, 'studio.config.json');
    fs.writeFileSync(
      configFile,
      serializeConfig(
        withSettings(parseConfigFile(fs.readFileSync(configFile, 'utf8')).value, { usage: 'personal', admins: [] }),
      ),
    );
    const personFile = path.join(root, 'contributors/parker.json');
    const person = { ...JSON.parse(fs.readFileSync(personFile)), name: 'Lifecycle Fixture', email: 'pm@example.test' };
    fs.writeFileSync(personFile, JSON.stringify(person));
    // No directory that provides pnpm (or corepack's pnpm shim) stays on PATH.
    const PATH = (process.env.PATH ?? process.env.Path ?? '')
      .split(path.delimiter)
      .filter(dir => !['pnpm', 'pnpm.exe', 'pnpm.cmd'].some(name => fs.existsSync(path.join(dir, name))))
      .join(path.delimiter);
    const env = {
      ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(path|npm_)/i.test(key))),
      PATH,
      npm_execpath: entry,
      npm_config_user_agent: 'pnpm/12 node win32',
      MISE_TRUSTED_CONFIG_PATHS: root,
      GIT_CONFIG_COUNT: '2',
      GIT_CONFIG_KEY_0: 'user.name',
      GIT_CONFIG_VALUE_0: person.name,
      GIT_CONFIG_KEY_1: 'user.email',
      GIT_CONFIG_VALUE_1: person.email,
    };
    const studio = (args, extra = {}) =>
      spawnSync(process.execPath, ['src/platform/node/cli/studio.js', ...args], {
        cwd: root,
        encoding: 'utf8',
        timeout: 240000,
        env: { ...env, ...extra },
      });
    const created = studio(['create-system', 'fixture-kit', '--label', 'Fixture kit', '--yes']);
    assert.equal(created.status, 0, created.stderr + created.stdout);
    const system = path.join(root, 'src/systems/fixture-kit');
    assert.ok(fs.existsSync(path.join(system, 'system.ts')));

    // A failing package-manager step: one sentence with the command, its status and the next action.
    const watched = ['studio.config.json', 'pnpm-lock.yaml', 'AGENTS.md'].map(file => path.join(root, file));
    const read = () => [
      ...watched.map(file => fs.readFileSync(file, 'utf8')),
      fs.readdirSync(system, { recursive: true }).sort().join(),
    ];
    const before = read();
    const failing = path.join(root, 'failing-pnpm.cjs');
    fs.writeFileSync(failing, "console.error('ERR_PNPM_FIXTURE refused'); process.exit(3);");
    const failed = studio(['delete-system', 'fixture-kit', '--yes'], { npm_execpath: failing });
    fs.rmSync(failing);
    assert.equal(failed.status, 1, failed.stdout);
    const message = failed.stderr
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('Warning:'))
      .join('\n');
    assert.match(
      message,
      /^Nothing was changed\. `pnpm install --lockfile-only [^`]*` exited with status 3 \(ERR_PNPM_FIXTURE refused\); .*then run this command again\.$/,
    );
    assert.doesNotMatch(failed.stderr, /^\s+at /m);
    assert.deepEqual(read(), before);
    assert.equal(fs.existsSync(path.join(root, '.studio-system-operation')), false);

    const deleted = studio(['delete-system', 'fixture-kit', '--yes']);
    assert.equal(deleted.status, 0, deleted.stderr + deleted.stdout);
    assert.equal(fs.existsSync(system), false);
    assert.doesNotMatch(fs.readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8'), /src\/systems\/fixture-kit/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
