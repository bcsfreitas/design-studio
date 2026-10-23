// Every package-manager step of the Studio CLI runs through this helper. It uses the pnpm that launched the
// command (`npm_execpath`), then the one corepack provides, and only then PATH. On Windows a bare `pnpm` is never
// looked up: corepack installs it as a `.cmd` shim, which execFile cannot run and a PATH without it never finds.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import semver from 'semver';

const SCRIPT = /\.[cm]?js$/i;
const launchedByPnpm = env =>
  /^pnpm\//.test(env.npm_config_user_agent ?? '') || /(^|[\\/])pnpm[^\\/]*$/i.test(env.npm_execpath ?? '');

// Corepack ships inside Node (through Node 24): node_modules sits beside node.exe on Windows and under lib/ elsewhere.
function corepackEntry(env, execPath) {
  const candidates = [
    env.COREPACK_ROOT && path.join(env.COREPACK_ROOT, 'dist', 'corepack.js'),
    path.join(path.dirname(execPath), 'node_modules', 'corepack', 'dist', 'corepack.js'),
    path.join(path.dirname(execPath), '..', 'lib', 'node_modules', 'corepack', 'dist', 'corepack.js'),
  ];
  return candidates.find(file => file && fs.existsSync(file)) ?? null;
}

function pathEntry(env, platform) {
  const dirs = (env.PATH ?? env.Path ?? '').split(path.delimiter).filter(Boolean);
  const names = platform === 'win32' ? ['pnpm.exe', 'pnpm.cmd'] : ['pnpm'];
  for (const dir of dirs)
    for (const name of names) {
      const file = path.join(dir, name);
      if (fs.existsSync(file)) return file;
    }
  return null;
}

/** Where pnpm comes from: `{ command, prefix, source }`, or null when no pnpm can be found. */
export function resolvePackageManager({
  env = process.env,
  platform = process.platform,
  execPath = process.execPath,
} = {}) {
  const launcher = launchedByPnpm(env) && env.npm_execpath;
  if (launcher && fs.existsSync(launcher))
    return SCRIPT.test(launcher)
      ? { command: execPath, prefix: [launcher], source: 'launcher' }
      : { command: launcher, prefix: [], source: 'launcher' };
  const corepack = corepackEntry(env, execPath);
  if (corepack) return { command: execPath, prefix: [corepack, 'pnpm'], source: 'corepack', corepack: true };
  const found = pathEntry(env, platform);
  if (found) return { command: found, prefix: [], source: 'path', shell: /\.cmd$/i.test(found) };
  // macOS and Linux keep their previous behaviour: the shell's own lookup of `pnpm`.
  if (platform !== 'win32') return { command: 'pnpm', prefix: [], source: 'path' };
  return null;
}

/**
 * Runs `pnpm <args>` and never throws for a failed step.
 * @returns {{ command: string, status: number | null, ok: boolean, stdout: string, stderr: string, output: string }}
 */
export function runPackageManager(args, { cwd, env = process.env, platform = process.platform, timeout } = {}) {
  const command = ['pnpm', ...args].join(' ');
  const resolved = resolvePackageManager({ env, platform });
  if (!resolved)
    return {
      command,
      status: null,
      ok: false,
      stdout: '',
      stderr: 'pnpm was not found.',
      output: 'pnpm was not found.',
    };
  // A `.cmd` shim needs the shell; quote each argument so version ranges such as `^1.0.0` reach pnpm unchanged.
  const result = resolved.shell
    ? spawnSync(`"${resolved.command}" ${args.map(arg => `"${arg}"`).join(' ')}`, {
        cwd,
        env,
        shell: true,
        encoding: 'utf8',
        windowsHide: true,
        maxBuffer: 64 * 1024 * 1024,
        timeout,
      })
    : spawnSync(resolved.command, [...resolved.prefix, ...args], {
        cwd,
        // Corepack would otherwise wait on a download prompt that a captured step can never answer.
        env: resolved.corepack ? { COREPACK_ENABLE_DOWNLOAD_PROMPT: '0', ...env } : env,
        encoding: 'utf8',
        windowsHide: true,
        maxBuffer: 64 * 1024 * 1024,
        timeout,
      });
  const stdout = result.stdout ?? '',
    stderr = result.error ? String(result.error.message) : (result.stderr ?? '');
  return {
    command,
    status: result.status,
    ok: result.status === 0,
    stdout,
    stderr,
    output: `${stdout}${stderr}`.trim(),
  };
}

/** One actionable sentence for a failed step: the command, its exit status and what to do next. */
export function packageManagerFailure(result, next = 'then run this command again') {
  const status = result.status === null ? 'did not start' : `exited with status ${result.status}`;
  const reason = result.output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .at(-1);
  return `\`${result.command}\` ${status}${reason ? ` (${reason.replace(/[.\s]+$/, '')})` : ''}; run it in this folder to see the full output, fix what it reports, ${next}.`;
}

/** Runs a step and throws an Error whose message is the actionable sentence, for callers with a rollback. */
export function requirePackageManager(args, options) {
  const result = runPackageManager(args, options);
  if (!result.ok) throw Object.assign(new Error(packageManagerFailure(result)), { packageManager: result });
  return result;
}

/** A warning when this Node is outside package.json `engines.node`, or null. */
export function nodeEngineWarning(root, version = process.version) {
  try {
    const range = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).engines?.node;
    if (!range || semver.satisfies(version, range)) return null;
    return `Warning: this studio expects Node ${range}, but Node ${version} is running. Install a supported Node (mise.toml names one), then run the command again if anything fails.`;
  } catch {
    return null;
  }
}
