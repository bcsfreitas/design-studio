// Actual update-command acceptance in an isolated release repository and customized studio.
// Usage: upgrade-test.js [--working] [--from <public-tag>] [--keep]
// Default: two synthetic releases of the current candidate foundation. --from uses a supported release's source.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import semver from 'semver';
import { loadOwnership, tierOf, trackedFiles } from '../lib/ownership.js';
import { readLock, writeLock, sha256 } from '../lib/lock.js';
import { parseConfigFile, serializeConfig, withSettings } from '../../core/config-file.ts';
import { createResourceId } from '../../core/resourceIdentity.ts';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const args = process.argv.slice(2);
const fromAt = args.indexOf('--from');
const from = fromAt >= 0 ? args[fromAt + 1] : null;
const options = fromAt >= 0 ? args.filter((_, index) => index !== fromAt && index !== fromAt + 1) : args;
if (fromAt >= 0 && (!from || from.startsWith('--'))) throw new Error('--from requires a public release tag.');
if (options.some(option => !['--working', '--keep', '--repair-runtime'].includes(option)))
  throw new Error('Usage: upgrade-test.js [--working] [--from <public-tag>] [--keep] [--repair-runtime]');
const repairRuntime = options.includes('--repair-runtime');
if (repairRuntime && from !== 'v0.3.0') throw new Error('--repair-runtime requires --from v0.3.0.');
const box = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-update-cli-'));
const upstream = path.join(box, 'upstream'),
  studio = path.join(box, 'studio');
const env = {
  ...process.env,
  CI: '1',
  MISE_TRUSTED_CONFIG_PATHS: [upstream, studio].join(path.delimiter),
  GIT_CONFIG_COUNT: '4',
  GIT_CONFIG_KEY_0: 'user.name',
  GIT_CONFIG_VALUE_0: 'Update Fixture',
  GIT_CONFIG_KEY_1: 'user.email',
  GIT_CONFIG_VALUE_1: 'fixture@example.test',
  GIT_CONFIG_KEY_2: 'commit.gpgsign',
  GIT_CONFIG_VALUE_2: 'false',
  GIT_CONFIG_KEY_3: 'tag.gpgsign',
  GIT_CONFIG_VALUE_3: 'false',
};
const run = (cwd, command, commandArgs) => execFileSync(command, commandArgs, { cwd, env, stdio: 'inherit' });
const read = (cwd, command, commandArgs) =>
  execFileSync(command, commandArgs, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const git = (cwd, ...commandArgs) => read(cwd, 'git', commandArgs);
const step = title => console.log(`\n[upgrade] ${title}`);
const write = (cwd, file, text) => {
  const target = path.join(cwd, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
};
const edit = (cwd, file, change) => write(cwd, file, change(fs.readFileSync(path.join(cwd, file), 'utf8')));
function source(cwd, revision, working = false) {
  fs.mkdirSync(cwd, { recursive: true });
  if (working) {
    const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean);
    for (const file of new Set(files))
      if (fs.existsSync(path.join(ROOT, file))) {
        fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
        fs.cpSync(path.join(ROOT, file), path.join(cwd, file), {
          preserveTimestamps: true,
          recursive: true,
          verbatimSymlinks: true,
        });
      }
  } else {
    const archive = path.join(box, `source-${path.basename(cwd)}.tar`);
    execFileSync('git', ['archive', '--format=tar', '-o', archive, revision], { cwd: ROOT });
    execFileSync('tar', ['-xf', archive, '-C', cwd]);
    fs.rmSync(archive);
  }
}
const versionFile = 'src/platform/core/modules/index.ts',
  snapshotFile = 'src/platform/core/contract.snapshot.json';
const platformVersion = cwd =>
  fs.readFileSync(path.join(cwd, versionFile), 'utf8').match(/PLATFORM_VERSION = '([^']+)'/)[1];
const stack = 'src/platform/context/stack.md',
  seed = 'src/systems/product/_update-seed.txt',
  deletedSeed = 'src/systems/product/_deleted-update-seed.txt',
  newSeed = 'src/systems/product/_new-update-seed.txt';
const commit = (cwd, message) => {
  run(cwd, 'git', ['add', '-A']);
  run(cwd, 'git', ['commit', '-q', '--no-verify', '-m', message]);
  return git(cwd, 'rev-parse', 'HEAD');
};
const cli = (...commandArgs) => run(studio, 'pnpm', ['studio', 'update', ...commandArgs]);
const attempt = (...commandArgs) =>
  spawnSync('pnpm', ['studio', 'update', ...commandArgs], {
    cwd: studio,
    env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
const requireFailure = (result, pattern) => {
  if (result.status === 0 || !pattern.test(result.stdout + result.stderr))
    throw new Error(`Expected refusal ${pattern}:\n${result.stdout}\n${result.stderr}`);
};
const entry = (cwd, file) => {
  const target = path.join(cwd, file),
    stat = fs.lstatSync(target);
  if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error(`Unsupported tracked directory ${file}`);
  return {
    kind: stat.isSymbolicLink() ? 'link' : 'file',
    executable: Boolean(stat.mode & 0o111),
    bytes: stat.isSymbolicLink() ? Buffer.from(fs.readlinkSync(target)) : fs.readFileSync(target),
  };
};
const repairBase = 'src/prototypes/fixture/fixture-prototype';
const tooltipFile = 'src/systems/product/components/tooltip/tooltip.tsx';
const runRepair = (...args) => run(studio, 'pnpm', ['studio', 'repair-runtime-imports', ...args]);
const repair = () => {
  const planFile = path.join(box, `repair-${Date.now()}.json`);
  runRepair('--out', planFile, '--json');
  const plan = JSON.parse(fs.readFileSync(planFile));
  if (!plan.applicable || !plan.changes.length) throw new Error('Expected a complete explicit runtime repair plan.');
  const head = git(studio, 'rev-parse', 'HEAD');
  const before = inventory(studio);
  runRepair('--apply', planFile, '--yes', '--json');
  if (git(studio, 'rev-parse', 'HEAD') !== head || git(studio, 'diff', '--cached'))
    throw new Error('Repair changed Git state.');
  const planned = new Map(plan.changes.map(change => [change.path, change]));
  const changed = [];
  for (const [file, digest] of before) {
    const value = entry(studio, file);
    const after = sha256(Buffer.concat([Buffer.from(`${value.kind}:${value.executable}\0`), value.bytes]));
    if (after !== digest) {
      const expected = planned.get(file);
      if (!expected || sha256(value.bytes) !== expected.afterHash)
        throw new Error(`Repair changed unreviewed bytes: ${file}`);
      changed.push(file);
    }
  }
  if (changed.length !== plan.changes.length) throw new Error('Reviewed repairs were not all applied.');
  const empty = JSON.parse(read(studio, 'pnpm', ['studio', 'repair-runtime-imports', '--json']));
  if (empty.changes.length || !empty.applicable) throw new Error('Second preview is not empty.');
  const emptyFile = path.join(box, `empty-${Date.now()}.json`);
  fs.writeFileSync(emptyFile, JSON.stringify(empty));
  runRepair('--apply', emptyFile, '--yes', '--json');
  return plan;
};
const inventory = cwd =>
  new Map(
    trackedFiles(cwd).map(file => {
      const value = entry(cwd, file);
      return [file, sha256(Buffer.concat([Buffer.from(`${value.kind}:${value.executable}\0`), value.bytes]))];
    }),
  );
const assertInventory = (cwd, before) => {
  const after = inventory(cwd);
  if (JSON.stringify([...before]) !== JSON.stringify([...after]))
    throw new Error('The dry run changed tracked files or their inventory.');
};
try {
  step(`Prepare isolated source releases${from ? ' from ' + from : ' from the candidate foundation'}`);
  source(upstream, from ?? 'HEAD', !from && options.includes('--working'));
  run(upstream, 'git', ['init', '-q', '-b', 'main']);
  edit(upstream, stack, text => `${text}\nUpdate fixture choice: base.\n`);
  write(upstream, seed, 'Installed seed bytes.\n');
  write(upstream, deletedSeed, 'Seed the team will delete.\n');
  const baseVersion = platformVersion(upstream),
    baseCommit = commit(upstream, 'Synthetic installed release');
  run(upstream, 'git', ['tag', '-a', `v${baseVersion}`, '-m', 'Synthetic installed release']);
  run(box, 'git', ['clone', '--no-local', '-q', upstream, studio]);
  run(studio, 'git', ['remote', 'rename', 'origin', 'upstream']);
  // Build the incoming release on the same synthetic history, using candidate source for a supported-tag rehearsal.
  if (from) {
    for (const file of trackedFiles(upstream)) fs.rmSync(path.join(upstream, file), { force: true });
    source(upstream, 'HEAD', options.includes('--working'));
    edit(upstream, stack, text => `${text}\nUpdate fixture choice: incoming.\n`);
  } else
    edit(upstream, stack, text => text.replace('Update fixture choice: base.', 'Update fixture choice: incoming.'));
  const candidate = platformVersion(upstream);
  const targetVersion = semver.gt(candidate, baseVersion) ? candidate : semver.inc(baseVersion, 'patch');
  edit(upstream, versionFile, text =>
    text.replace(/PLATFORM_VERSION = '[^']+'/, `PLATFORM_VERSION = '${targetVersion}'`),
  );
  edit(upstream, snapshotFile, text => {
    const snapshot = JSON.parse(text);
    snapshot.platformVersion = targetVersion;
    return JSON.stringify(snapshot, null, 2) + '\n';
  });
  edit(upstream, 'README.md', text => text + '\nIncoming README bytes.\n');
  fs.rmSync(path.join(upstream, seed), { force: true });
  write(upstream, newSeed, 'New incoming seed bytes.\n');
  write(upstream, deletedSeed, 'Incoming edit must not resurrect the deleted seed.\n');
  edit(upstream, 'package.json', text => {
    const pkg = JSON.parse(text);
    pkg.scripts['update-fixture-proof'] = 'node -e "process.exit(0)"';
    return JSON.stringify(pkg, null, 2) + '\n';
  });
  const targetCommit = commit(upstream, 'Synthetic incoming release');
  run(upstream, 'git', ['tag', '-a', `v${targetVersion}`, '-m', 'Synthetic incoming release']);

  step('Customize the installed studio through supported commands');
  // Fixture construction establishes personal authority; real studio lifecycle uses the managed commands below.
  edit(studio, 'studio.config.json', text =>
    serializeConfig(withSettings(parseConfigFile(text).value, { usage: 'personal', admins: [] })),
  );
  run(studio, 'pnpm', ['install', '--frozen-lockfile']);
  run(studio, 'pnpm', [
    'join',
    '--key',
    'fixture',
    '--name',
    'Update Fixture',
    '--email',
    'fixture@example.test',
    '--github',
    'fixture-person',
    '--yes',
  ]);
  run(studio, 'pnpm', ['studio', 'create-system', 'fixture-kit', '--label', 'Fixture kit', '--yes']);
  const system = JSON.parse(fs.readFileSync(path.join(studio, 'src/systems/fixture-kit/package.json'))).name;
  run(studio, 'pnpm', ['--filter', system, 'add', 'clsx@2.1.1']);
  run(studio, 'pnpm', ['add', '-w', 'clsx@2.1.1']);
  run(studio, 'pnpm', ['new', 'Fixture Prototype']);
  if (repairRuntime) {
    // Retain a customized handler and class beside the untouched seed dialog.
    edit(studio, tooltipFile, text =>
      text.replace(
        'data-slot="tooltip-trigger" {...props}',
        'data-slot="tooltip-trigger" className="fixture-tooltip-custom" onPointerEnter={(event) => { event.currentTarget.dataset.fixtureHover = "retained"; }} {...props}',
      ),
    );
    const emptyId = createResourceId(),
      implementedId = createResourceId();
    write(
      studio,
      `${repairBase}/retained-empty.tsx`,
      `/** @studio-id ${emptyId} */\n/** @lofi */\nimport {emptyView as pending} from '@/lib/emptyView';\n// Preserve our planned review screen.\nexport default pending;\n`,
    );
    write(
      studio,
      `${repairBase}/implemented.tsx`,
      `/** @studio-id ${implementedId} */
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@/systems/product/components/dialog';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/systems/product/components/tooltip';
export default function RepairDemo() { return <main><h1>Retained implemented view</h1>
<Dialog><DialogTrigger>Open repaired dialog</DialogTrigger><DialogContent><DialogTitle>Repaired dialog</DialogTitle><p>Retained dialog content</p></DialogContent></Dialog>
<TooltipProvider><Tooltip><TooltipTrigger>Repaired tooltip trigger</TooltipTrigger><TooltipContent>Retained tooltip content</TooltipContent></Tooltip></TooltipProvider>
</main>; }
`,
    );
    write(
      studio,
      `${repairBase}/_custom.ts`,
      "import { cn } from '@/lib/utils';\nexport const teamDensity = () => cn('team-density');\n",
    );
    write(
      studio,
      `${repairBase}/_ambiguous.ts`,
      "import * as utils from '@/lib/utils';\nexport const classes = utils.cn;\n",
    );
    write(box, 'runtime-browser.json', JSON.stringify({ studio, base: repairBase, emptyId, implementedId }));
  }
  run(studio, 'pnpm', ['studio', 'create-module', 'fixture-notes', '--label', 'Fixture notes', '--yes']);
  edit(studio, 'studio.config.json', text =>
    serializeConfig({ ...parseConfigFile(text).value, name: 'Fixture Studio' }),
  );
  edit(studio, 'README.md', text => text + '\nComplete team README customization.\n');
  edit(studio, 'AGENTS.team.md', text => text + '\nFixture team agent guidance.\n');
  write(studio, 'team-binary.bin', Buffer.from([0, 255, 1, 9]));
  write(studio, 'team-script.sh', '#!/bin/sh\nexit 0\n');
  fs.chmodSync(path.join(studio, 'team-script.sh'), 0o755);
  fs.symlinkSync('team-binary.bin', path.join(studio, 'team-link'));
  fs.rmSync(path.join(studio, deletedSeed));
  const modules = {
    'fixture-notes': {
      source: 'fixture-notes',
      files: {
        'src/modules/fixture-notes/module.ts': sha256(
          fs.readFileSync(path.join(studio, 'src/modules/fixture-notes/module.ts')),
        ),
      },
    },
  };
  const systems = {
    'fixture-kit': {
      source: 'fixture-kit',
      files: {
        'src/systems/fixture-kit/package.json': sha256(
          fs.readFileSync(path.join(studio, 'src/systems/fixture-kit/package.json')),
        ),
      },
    },
  };
  writeLock({ platform: { version: baseVersion, commit: baseCommit }, modules, systems }, studio);
  run(studio, 'pnpm', ['studio', 'sync']);
  run(studio, 'pnpm', ['check']);
  const customized = commit(studio, 'Team customizations');
  const originalBranch = git(studio, 'symbolic-ref', '--short', 'HEAD');
  const ownership = loadOwnership(studio);
  const protectedFiles = trackedFiles(studio).filter(
    file => file !== 'studio.lock.json' && ['seed', 'team', 'unknown'].includes(tierOf(ownership, file)),
  );
  const protectedBytes = new Map(protectedFiles.map(file => [file, entry(studio, file)]));
  const dependencyBytes = JSON.parse(fs.readFileSync(path.join(studio, 'package.json'))).dependencies;
  const localTags = git(studio, 'show-ref', '--tags'),
    before = inventory(studio);
  step('Dry-run the actual update command');
  cli(targetVersion, '--dry-run');
  if (
    git(studio, 'rev-parse', 'HEAD') !== customized ||
    git(studio, 'symbolic-ref', '--short', 'HEAD') !== originalBranch ||
    git(studio, 'show-ref', '--tags') !== localTags ||
    git(studio, 'status', '--porcelain')
  )
    throw new Error('The dry run changed the branch, tags, or working tree.');
  assertInventory(studio, before);

  step('Apply the actual update command and verify complete ownership and receipt preservation');
  if (repairRuntime) requireFailure(attempt(targetVersion), /is committed.*pnpm (?:check|build) failed/);
  else cli(targetVersion);
  const verify = () => {
    if (git(studio, 'rev-parse', originalBranch) !== customized)
      throw new Error('The update changed the original branch.');
    if (git(studio, 'symbolic-ref', '--short', 'HEAD') !== `studio-update/v${targetVersion}`)
      throw new Error('The update used the wrong branch.');
    const parents = git(studio, 'rev-list', '--parents', '-n1', 'HEAD').split(' ');
    if (parents.length !== 3 || parents[1] !== customized || parents[2] !== targetCommit)
      throw new Error('The update did not create the expected two-parent merge.');
    const lock = readLock(studio);
    if (
      JSON.stringify(lock.platform) !== JSON.stringify({ version: targetVersion, commit: targetCommit }) ||
      JSON.stringify(lock.modules) !== JSON.stringify(modules) ||
      JSON.stringify(lock.systems) !== JSON.stringify(systems)
    )
      throw new Error('The release stamp or installed capability records changed incorrectly.');
    if (
      JSON.stringify(JSON.parse(git(studio, 'show', 'HEAD:studio.lock.json'))) !==
      JSON.stringify(JSON.parse(fs.readFileSync(path.join(studio, 'studio.lock.json'))))
    )
      throw new Error('The release stamp is not in the merge commit.');
    for (const [file, before] of protectedBytes) {
      if (!fs.existsSync(path.join(studio, file))) throw new Error(`Lost protected path: ${file}`);
      const after = entry(studio, file);
      if (before.kind !== after.kind || before.executable !== after.executable || !before.bytes.equals(after.bytes))
        throw new Error(`Lost complete protected content or mode: ${file}`);
    }
    const expected = new Set(protectedFiles);
    for (const file of trackedFiles(studio))
      if (file !== 'studio.lock.json' && ['team', 'unknown'].includes(tierOf(ownership, file)) && !expected.has(file))
        throw new Error(`Unexpected incoming team file: ${file}`);
    const dependencies = JSON.parse(fs.readFileSync(path.join(studio, 'package.json'))).dependencies;
    for (const [name, value] of Object.entries(dependencyBytes))
      if (dependencies[name] !== value) throw new Error(`Changed dependency ${name}`);
    if (fs.readFileSync(path.join(studio, newSeed), 'utf8') !== 'New incoming seed bytes.\n')
      throw new Error('The new incoming seed was not installed.');
    if (fs.existsSync(path.join(studio, deletedSeed))) throw new Error('The update resurrected a deleted seed.');
    if (!fs.readFileSync(path.join(studio, 'AGENTS.md'), 'utf8').includes('Fixture team agent guidance.'))
      throw new Error('Generated team guidance was lost.');
    if (git(studio, 'status', '--porcelain')) throw new Error('The updated studio is not clean.');
  };
  verify();
  if (repairRuntime) {
    step('Preview and explicitly initialize retained contributor preference namespaces');
    const preferencePlan = path.join(box, 'preferences.json');
    run(studio, 'pnpm', ['studio', 'preferences', '--plan', preferencePlan]);
    const plan = JSON.parse(fs.readFileSync(preferencePlan));
    for (const edit of plan.edits) {
      const before = JSON.parse(edit.before),
        after = JSON.parse(edit.after);
      for (const [key, value] of Object.entries(before))
        if (key !== 'formatVersion' && JSON.stringify(value) !== JSON.stringify(after[key]))
          throw new Error(`Preference initialization changed retained field ${key}`);
    }
    run(studio, 'pnpm', ['studio', 'preferences', '--apply', preferencePlan]);
    const emptyPlan = path.join(box, 'preferences-repeat.json');
    run(studio, 'pnpm', ['studio', 'preferences', '--plan', emptyPlan]);
    if (JSON.parse(fs.readFileSync(emptyPlan)).edits.length)
      throw new Error('Preference initialization was not idempotent.');
    if (plan.edits.length) commit(studio, 'Reviewed contributor preference initialization');
  }
  if (repairRuntime) {
    step('Refuse ambiguous imports and custom helpers, then perform explicit manual resolution');
    const blocked = spawnSync('pnpm', ['studio', 'repair-runtime-imports', '--json'], {
      cwd: studio,
      env,
      encoding: 'utf8',
    });
    if (blocked.status !== 1 || !JSON.parse(blocked.stdout).diagnostics.some(d => d.code === 'unsupported-import'))
      throw new Error('Namespace consumer did not block repair.');
    const customHelper = 'export const cn = (...values: string[]) => values.join(" ") + " team-custom";\n';
    write(studio, 'src/lib/utils.ts', customHelper);
    const custom = JSON.parse(
      read(studio, 'node', [
        '--input-type=module',
        '--eval',
        `import {planRuntimeRepair} from './src/platform/node/lib/runtime-import-repair.js';console.log(JSON.stringify(planRuntimeRepair(process.cwd(),'fixture',['${repairBase}/_custom.ts'])));`,
      ]),
    );
    if (!custom.diagnostics.some(d => d.code === 'custom-helper'))
      throw new Error('Customized legacy helper was guessed.');
    // The person explicitly preserves custom behavior in team scope. This is not an automatic repair.
    write(studio, `${repairBase}/_team-classes.ts`, customHelper);
    edit(studio, `${repairBase}/_custom.ts`, text => text.replace('@/lib/utils', './_team-classes'));
    edit(studio, `${repairBase}/_ambiguous.ts`, text =>
      text
        .replace("import * as utils from '@/lib/utils';", "import { cn } from '#studio/runtime';")
        .replace('utils.cn', 'cn'),
    );
    fs.unlinkSync(path.join(studio, 'src/lib/utils.ts'));
    commit(studio, 'Explicit manual helper resolution');
    const plan = repair();
    if (
      !plan.changes.some(c => c.path === tooltipFile) ||
      !plan.changes.some(c => c.path.endsWith('/retained-empty.tsx')) ||
      !plan.changes.some(c => c.path === 'src/systems/product/components.json')
    )
      throw new Error('Old-source fixture missed required runtime repairs.');
    const tooltip = fs.readFileSync(path.join(studio, tooltipFile), 'utf8');
    if (!tooltip.includes('fixture-tooltip-custom') || !tooltip.includes('dataset.fixtureHover = "retained"'))
      throw new Error('Customized component behavior was lost.');
    commit(studio, 'Reviewed runtime import repair');
    const meta = JSON.parse(fs.readFileSync(path.join(studio, repairBase, 'meta.json')));
    const browserFile = path.join(box, 'runtime-browser.json');
    fs.writeFileSync(
      browserFile,
      JSON.stringify({ ...JSON.parse(fs.readFileSync(browserFile)), prototypeId: meta.studioId }),
    );
  }
  run(studio, 'pnpm', ['install', '--frozen-lockfile']);
  run(studio, 'pnpm', ['studio', 'sync', '--check']);
  run(studio, 'pnpm', ['check']);
  run(studio, 'pnpm', ['build']);
  if (!repairRuntime) verify();
  if (repairRuntime) {
    console.log(
      `\n[upgrade] v0.3.0 preservation, explicit repair, idempotence, frozen install, checks, and production build passed. Browser fixture: ${path.join(box, 'runtime-browser.json')}`,
    );
    // The generic harness covers conflict/continue and failed checks separately. This mode keeps the repaired studio for runtime acceptance.
    process.exitCode = 0;
  } else {
    step('Stop on a real upstream conflict and finish through --continue');
    run(studio, 'git', ['switch', '-q', originalBranch]);
    edit(studio, stack, text => text.replace('Update fixture choice: base.', 'Update fixture choice: team.'));
    const conflictStart = commit(studio, 'Team platform edit');
    run(studio, 'git', ['branch', '-D', `studio-update/v${targetVersion}`]);
    requireFailure(attempt(targetVersion), /update stopped/);
    if (
      git(studio, 'rev-parse', 'MERGE_HEAD') !== targetCommit ||
      git(studio, 'rev-parse', originalBranch) !== conflictStart
    )
      throw new Error('Conflict handling lost the merge or original branch.');
    requireFailure(attempt('--continue'), /Resolve these files/);
    edit(studio, stack, text =>
      text.replace(/<<<<<<<[\s\S]*?>>>>>>>[^\n]*\n/g, 'Update fixture choice: reviewed resolution.\n'),
    );
    run(studio, 'git', ['add', stack]);
    cli('--continue');
    if (
      git(studio, 'status', '--porcelain') ||
      git(studio, 'rev-parse', originalBranch) !== conflictStart ||
      readLock(studio).platform.commit !== targetCommit
    )
      throw new Error('Continue did not finish cleanly with the original branch preserved.');

    step('Report an actual failed check without claiming update success');
    run(studio, 'git', ['switch', '-q', originalBranch]);
    run(studio, 'git', ['reset', '--hard', customized]);
    run(studio, 'git', ['branch', '-D', `studio-update/v${targetVersion}`]);
    write(
      studio,
      'src/modules/fixture-notes/check.ts',
      "export default () => ['Deliberate update acceptance failure.'];\n",
    );
    const failedStart = commit(studio, 'Fixture failing module check');
    const failed = attempt(targetVersion);
    requireFailure(failed, /is committed.*pnpm check failed/);
    if (
      /pnpm check and pnpm build passed/.test(failed.stdout) ||
      git(studio, 'rev-parse', originalBranch) !== failedStart ||
      readLock(studio).platform.commit !== targetCommit
    )
      throw new Error('Failed-check reporting claimed success or changed the original branch.');
    console.log(
      `\n[upgrade] Actual CLI dry-run, preservation, conflict/continue, and failed-check acceptance pass (${baseVersion} -> ${targetVersion}).`,
    );
  }
} finally {
  if (options.includes('--keep')) console.log(`[upgrade] Kept isolated fixtures at ${box}`);
  else fs.rmSync(box, { recursive: true, force: true });
}
