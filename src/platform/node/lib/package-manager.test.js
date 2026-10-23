import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  nodeEngineWarning,
  packageManagerFailure,
  resolvePackageManager,
  runPackageManager,
} from './package-manager.js';

function folder() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'studio-package-manager-'));
}

test('pnpm resolves from the launching entry point, then corepack, then PATH, never a bare Windows lookup', () => {
  const dir = folder();
  try {
    const script = path.join(dir, 'pnpm.cjs'),
      native = path.join(dir, 'pnpm-native.exe');
    fs.writeFileSync(script, '');
    fs.writeFileSync(native, '');
    const execPath = path.join(dir, 'node', 'node.exe');
    const env = { npm_execpath: script, npm_config_user_agent: 'pnpm/12.14.0 node/v24 win32 x64', PATH: '' };
    // A JavaScript entry point runs with this Node; a native one runs directly.
    assert.deepEqual(resolvePackageManager({ env, platform: 'win32', execPath }), {
      command: execPath,
      prefix: [script],
      source: 'launcher',
    });
    assert.equal(
      resolvePackageManager({ env: { ...env, npm_execpath: native }, platform: 'win32', execPath }).command,
      native,
    );
    // npm's entry point is not pnpm.
    const npm = path.join(dir, 'npm-cli.js');
    fs.writeFileSync(npm, '');
    const corepack = path.join(dir, 'node', 'node_modules', 'corepack', 'dist', 'corepack.js');
    fs.mkdirSync(path.dirname(corepack), { recursive: true });
    fs.writeFileSync(corepack, '');
    assert.deepEqual(
      resolvePackageManager({
        env: { npm_execpath: npm, npm_config_user_agent: 'npm/11', PATH: '' },
        platform: 'win32',
        execPath,
      }).prefix,
      [corepack, 'pnpm'],
    );
    fs.rmSync(path.join(dir, 'node'), { recursive: true });
    const bin = path.join(dir, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, 'pnpm.cmd'), '');
    assert.deepEqual(resolvePackageManager({ env: { PATH: bin }, platform: 'win32', execPath }), {
      command: path.join(bin, 'pnpm.cmd'),
      prefix: [],
      source: 'path',
      shell: true,
    });
    assert.equal(resolvePackageManager({ env: { PATH: '' }, platform: 'win32', execPath }), null);
    // macOS and Linux keep the shell's own lookup as the last resort.
    assert.equal(resolvePackageManager({ env: { PATH: '' }, platform: 'linux', execPath }).command, 'pnpm');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a failed step returns its command, status and output, and reads as one actionable sentence', () => {
  const dir = folder();
  try {
    const script = path.join(dir, 'pnpm.cjs');
    fs.writeFileSync(
      script,
      "console.log('Resolving'); console.error('ERR_PNPM_FETCH registry unreachable'); process.exit(3);",
    );
    const result = runPackageManager(['install', '--lockfile-only'], {
      cwd: dir,
      env: { ...process.env, npm_execpath: script, npm_config_user_agent: 'pnpm/12.14.0' },
    });
    assert.equal(result.command, 'pnpm install --lockfile-only');
    assert.equal(result.status, 3);
    assert.equal(result.ok, false);
    assert.match(result.output, /Resolving[\s\S]*registry unreachable/);
    const sentence = packageManagerFailure(result);
    assert.equal(sentence.split('\n').length, 1);
    assert.match(
      sentence,
      /^`pnpm install --lockfile-only` exited with status 3 \(ERR_PNPM_FETCH registry unreachable\);/,
    );
    assert.match(sentence, /then run this command again\.$/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the Studio CLI warns when Node is outside the declared engine range', () => {
  const dir = folder();
  try {
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ engines: { node: '>=24 <25' } }));
    assert.equal(nodeEngineWarning(dir, 'v24.3.0'), null);
    assert.match(nodeEngineWarning(dir, 'v22.22.3'), /expects Node >=24 <25, but Node v22\.22\.3 is running/);
    fs.writeFileSync(path.join(dir, 'package.json'), '{}');
    assert.equal(nodeEngineWarning(dir, 'v22.22.3'), null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
