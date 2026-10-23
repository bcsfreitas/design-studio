import { linkSystemDependencies } from './fixtures/workspace-dependencies.js';
import { recordDevServer, RECORD_FILE } from './dev-server-registry.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseConfigFile, serializeConfig, withSettings } from '../../core/config-file.ts';

// `pnpm studio dev status` reports the recorded dev server; a recorded one also blocks a second server and is named
// as the holder in system lifecycle previews.
test('dev status reports running, stale and absent servers; a second server and lifecycle previews name it', () => {
  const original = path.resolve('.'),
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-dev-status-'));
  try {
    fs.cpSync(original, root, {
      recursive: true,
      // A dev server running in the source studio must not leak its record into the copy.
      filter: file =>
        !['node_modules', 'dist', '.git'].includes(path.basename(file)) &&
        !file.endsWith(path.join('.studio', 'runtime')),
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
    const options = { cwd: root, encoding: 'utf8', timeout: 60000, env: { ...process.env, STUDIO_DEV_FORCE: '' } };
    const studio = (...args) => spawnSync(process.execPath, ['src/platform/node/cli/studio.js', ...args], options);
    const status = () => {
      const result = studio('dev', 'status');
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    };

    assert.equal(status(), 'No dev server is recorded for this studio. Start one with pnpm dev.');
    assert.deepEqual(JSON.parse(studio('dev', 'status', '--json').stdout), { state: 'absent' });

    // A live process: this test runner stands in for the server.
    recordDevServer(root, {
      port: 5391,
      pid: process.pid,
      url: 'http://localhost:5391/',
      startedAt: new Date(Date.now() - 5 * 60000).toISOString(),
      startedBy: 'parker',
    });
    assert.match(
      status(),
      /^Running: http:\/\/localhost:5391\/ \(port 5391, process \d+\), started by parker since \S+ \(5 min ago\)\.$/,
    );
    const json = JSON.parse(studio('dev', 'status', '--json').stdout);
    assert.equal(json.state, 'running');
    assert.equal(json.record.pid, process.pid);

    // A second dev server warns, points at the first, and exits without starting.
    const second = spawnSync(
      process.execPath,
      [path.join(root, 'node_modules/vite/bin/vite.js'), '--port', '5392', '--strictPort'],
      options,
    );
    assert.equal(second.status, 1, second.stdout + second.stderr);
    assert.match(second.stderr, /A dev server is already running for this studio: the dev server on port 5391/);
    assert.match(second.stderr, /pnpm studio dev restart/);
    assert.match(second.stderr, /STUDIO_DEV_FORCE=1/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, RECORD_FILE), 'utf8')).pid, process.pid);

    // The lifecycle preview names the dev server and its port as the holder of the system folder.
    const system = fs.readdirSync(path.join(root, 'src/systems'))[0];
    const preview = studio('rename-system', system, '--label', 'Held Probe');
    assert.match(
      preview.stdout + preview.stderr,
      new RegExp(
        `src/systems/${system} is in use by the dev server on port 5391 \\(process ${process.pid}, started by parker; pnpm studio dev stop stops it\\)\\.`,
      ),
    );
    assert.ok(fs.existsSync(path.join(root, 'src/systems', system)));

    // A process that has exited leaves a stale record.
    const ended = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], {
      encoding: 'utf8',
    });
    recordDevServer(root, {
      port: 5393,
      pid: Number(ended.stdout),
      startedAt: new Date().toISOString(),
      startedBy: 'session agent',
    });
    assert.match(status(), /^Stale record: the dev server on port 5393 \(process \d+, started by session agent\)/);
    assert.equal(JSON.parse(studio('dev', 'status', '--json').stdout).state, 'stale');
    // Stop clears a stale record without touching any process.
    assert.match(studio('dev', 'stop').stdout, /Removed the stale record/);
    assert.equal(status(), 'No dev server is recorded for this studio. Start one with pnpm dev.');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
