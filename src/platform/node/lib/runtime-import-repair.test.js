import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { test } from 'node:test';
import {
  runtimeSourceEdits,
  planRuntimeRepair,
  applyRuntimeRepair,
  repairFileSafety,
} from './runtime-import-repair.js';
import { writeProfiles } from './fixtures/contributors.js';
import { writeFixtureConfig } from './fixtures/identities.js';
import { createResourceId } from '../../core/resourceIdentity.ts';

const original = path.resolve(import.meta.dirname, '../../../..');
function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-runtime-repair-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim();
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Sam');
  git('config', 'user.email', 'sam@example.test');
  git('config', 'commit.gpgsign', 'false');
  for (const file of [
    'src/platform/api/runtime.ts',
    'src/platform/core/runtime/portal.ts',
    'src/platform/modules/view/lib/index.ts',
    'src/platform/modules/view/module.ts',
  ])
    write(file, fs.readFileSync(path.join(original, file)));
  write('src/platform/modules/contributors/module.ts', "export default {id:'contributors',optional:true,lib:false};\n");
  write('src/modules/test/module.ts', "export default {id:'test',optional:true,lib:false};\n");
  write(
    '.studio/ownership.json',
    JSON.stringify({
      schema: 1,
      rules: [
        { tier: 'upstream', paths: ['src/platform/**', 'src/lib/**'] },
        { tier: 'seed', paths: ['src/systems/product/**'] },
        { tier: 'team', paths: ['src/prototypes/**', 'src/modules/**'] },
      ],
    }),
  );
  writeProfiles(root, {
    sam: { name: 'Sam', email: 'sam@example.test' },
    other: { name: 'Other', email: 'other@example.test' },
  });
  const config = {
    formatVersion: 1,
    name: 'Repair fixture',
    tagline: '',
    usage: 'team',
    admins: ['other'],
    systems: ['product'],
    systemMaintainers: { product: ['sam'] },
    defaultSystem: 'product',
    modules: { view: true, contributors: true, test: false },
  };
  const { directory } = writeFixtureConfig(root, config);
  const base = 'src/prototypes/sam/flow';
  write(
    base + '/meta.json',
    JSON.stringify({
      formatVersion: 1,
      studioId: createResourceId(),
      ownerContributorId: directory.contributorIds.sam,
      systemId: directory.systemIds.product,
    }),
  );
  write(
    base + '/a.tsx',
    '/** @studio-id ' +
      createResourceId() +
      " */\nimport { emptyView } from '@/lib/emptyView';\nexport default emptyView;\n",
  );
  write(
    base + '/b.ts',
    "\uFEFFimport { cn as classes } from '../../../lib/utils';\r\nexport const custom = () => classes('gap-2');",
  );
  write(
    'src/systems/product/components/overlay.tsx',
    "import { usePortalContainer } from '@/lib/portal';\nexport const overlay=usePortalContainer;\n",
  );
  write('src/systems/product/components.json', '{"aliases":{"utils":"@/lib/utils","ui":"custom/ui"}}\n');
  for (const name of ['utils', 'portal', 'emptyView'])
    write(`src/lib/${name}.ts`, execFileSync('git', ['show', `v0.3.0:src/lib/${name}.ts`], { cwd: original }));
  const commit = () => {
    git('add', '-A');
    git('commit', '-qm', 'Fixture');
  };
  commit();
  for (const name of ['utils', 'portal', 'emptyView']) fs.unlinkSync(path.join(root, `src/lib/${name}.ts`));
  commit();
  return { root, git, write, commit, base, config };
}

test('AST repair preserves aliases, comments, BOM, CRLF, type modifiers and named re-exports', () => {
  const source =
    "\uFEFF// keep\r\nimport { cn as classes } from '../../../lib/utils';\r\nexport { type PortalContext as ThemePortal } from '@/lib/portal.ts';\r\nconst example='@/lib/utils';\r\n";
  const { edits, diagnostics } = runtimeSourceEdits(source, 'src/prototypes/sam/flow/_helper.ts');
  assert.deepEqual(diagnostics, []);
  assert.equal(edits.length, 2);
  const result = [...edits].reverse().reduce((s, e) => s.slice(0, e.start) + e.text + s.slice(e.end), source);
  assert.equal(
    result,
    source.replace("'../../../lib/utils'", "'#studio/runtime'").replace("'@/lib/portal.ts'", "'#studio/runtime'"),
  );
  assert.equal(
    runtimeSourceEdits("import {cn} from './lib/utils';", 'src/systems/product/component.ts').edits.length,
    0,
  );
});

test('ambiguous imports and JSON declarations produce manual cases without partial file edits', () => {
  for (const statement of [
    "import value from '@/lib/utils';",
    "import * as value from '@/lib/utils';",
    "export * from '@/lib/utils';",
    "import '@/lib/utils';",
    "const value=import('@/lib/utils');",
    "const value=require('@/lib/utils');",
    "import {cn, custom} from '@/lib/utils';",
    "import {cn} from '@/lib/utils' with {type:'json'};",
    "import {cn} from '@/lib/utils'; !;",
  ]) {
    const result = runtimeSourceEdits(
      "import {emptyView} from '@/lib/emptyView';\n" + statement,
      'src/prototypes/sam/flow/view.ts',
    );
    assert.ok(result.diagnostics.length, statement);
    assert.deepEqual(result.edits, [], statement);
  }
  for (const json of [
    '{"aliases":{"utils":"@/lib/utils","utils":"mine"}}',
    '{"aliases":{"utils":"mine"}}',
    '{"aliases":{"utils":"@/lib/utils"}',
  ])
    assert.ok(runtimeSourceEdits(json, 'src/systems/product/components.json').diagnostics.length);
  const result = runtimeSourceEdits(
    '{ "aliases": { "utils": "@/lib/utils", "ui":"mine" } }',
    'src/systems/product/components.json',
  );
  assert.equal(result.edits.length, 1);
  assert.equal(result.diagnostics.length, 0);
});

test('preview is read-only, respects current authority and disabled module source, and apply preserves Git and unrelated work', t => {
  const { root, git, base, write, commit } = fixture(t);
  const before = git('status', '--porcelain'),
    head = git('rev-parse', 'HEAD');
  const plan = planRuntimeRepair(root, 'sam', [base, 'src/systems/product']);
  assert.equal(plan.applicable, true, JSON.stringify(plan.diagnostics));
  assert.equal(plan.changes.length, 4);
  for (const change of plan.changes)
    execFileSync('git', ['apply', '--check', '-'], { cwd: root, input: change.diff, stdio: 'pipe' });
  assert.equal(git('status', '--porcelain'), before);
  assert.deepEqual(applyRuntimeRepair(root, 'sam', plan), plan);
  write('unrelated.txt', 'keep');
  const applied = applyRuntimeRepair(root, 'sam', plan, { yes: true });
  assert.equal(applied.applied.length, 4);
  assert.equal(git('rev-parse', 'HEAD'), head);
  assert.equal(git('diff', '--cached'), '');
  assert.equal(fs.readFileSync(path.join(root, 'unrelated.txt'), 'utf8'), 'keep');
  assert.match(fs.readFileSync(path.join(root, base + '/b.ts'), 'utf8'), /classes\('gap-2'\)/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'src/systems/product/components.json'))), {
    aliases: { utils: '#studio/runtime', ui: 'custom/ui' },
  });
  const empty = planRuntimeRepair(root, 'sam', [base, 'src/systems/product']);
  assert.equal(empty.changes.length, 0);
  assert.equal(empty.applicable, true);
  applyRuntimeRepair(root, 'sam', empty, { yes: true });
  write('src/modules/test/lib/helper.ts', "import {cn} from '@/lib/utils';export {cn};\n");
  commit();
  assert.equal(planRuntimeRepair(root, 'other', ['src/modules/test']).applicable, true);
  assert.equal(planRuntimeRepair(root, 'sam', ['src/modules/test']).diagnostics[0].code, 'authority');
});

test('stale source, plans, mode, authority, assignment, destinations, candidates and HEAD refuse with zero writes', t => {
  const f = fixture(t),
    { root, base, write, commit } = f;
  const mutations = [
    () => write(base + '/b.ts', "import {cn} from '@/lib/utils'; //changed\n"),
    () => fs.chmodSync(path.join(root, base + '/a.tsx'), 0o755),
    () => write('src/platform/modules/view/lib/index.ts', 'export const emptyView=()=>1;\n'),
    () => write(base + '/new.ts', "import {cn} from '@/lib/utils';\n"),
    () => {
      const file = path.join(root, 'studio.config.json');
      const c = JSON.parse(fs.readFileSync(file));
      c.modules.view = false;
      fs.writeFileSync(file, JSON.stringify(c));
    },
    () => {
      const file = path.join(root, base + '/meta.json');
      const m = JSON.parse(fs.readFileSync(file));
      m.systemId = null;
      fs.writeFileSync(file, JSON.stringify(m));
    },
    () => {
      write('advance-head.txt', 'new revision');
      commit();
    },
  ];
  for (const mutate of mutations) {
    const plan = planRuntimeRepair(root, 'sam', [base]);
    assert.equal(plan.applicable, true, JSON.stringify(plan.diagnostics));
    const a = fs.readFileSync(path.join(root, base + '/a.tsx'));
    mutate();
    assert.throws(() => applyRuntimeRepair(root, 'sam', plan, { yes: true }));
    assert.ok(a.equals(fs.readFileSync(path.join(root, base + '/a.tsx'))));
    f.git('reset', '--hard', plan.head);
    f.git('clean', '-fd');
  }
  const plan = planRuntimeRepair(root, 'sam', [base]);
  const forged = structuredClone(plan);
  forged.changes.pop();
  assert.throws(() => applyRuntimeRepair(root, 'sam', forged, { yes: true }), /stale|modified/);
  const duplicate = structuredClone(plan);
  duplicate.changes.push(duplicate.changes[0]);
  assert.throws(() => applyRuntimeRepair(root, 'sam', duplicate, { yes: true }));
  const revoked = planRuntimeRepair(root, 'sam', ['src/systems/product']);
  const file = path.join(root, 'studio.config.json'),
    c = JSON.parse(fs.readFileSync(file));
  c.systemMaintainers[Object.keys(c.systemMaintainers)[0]] = [];
  fs.writeFileSync(file, JSON.stringify(c));
  assert.throws(() => applyRuntimeRepair(root, 'sam', revoked, { yes: true }));
  assert.ok(planRuntimeRepair(root, 'sam', ['src/systems/product']).diagnostics.some(d => d.code === 'authority'));
});

test('dirty targets, custom helpers, namespace consumers, Node consumers and unsafe files are refused', t => {
  const { root, base, write, commit } = fixture(t);
  write(base + '/b.ts', "import {cn} from '@/lib/utils'; // draft\n");
  assert.ok(planRuntimeRepair(root, 'sam', [base]).diagnostics.some(d => d.code === 'dirty-target'));
  commit();
  write('src/lib/utils.ts', 'export const cn=()=>"custom";\n');
  assert.ok(planRuntimeRepair(root, 'sam', [base]).diagnostics.some(d => d.code === 'custom-helper'));
  fs.unlinkSync(path.join(root, 'src/lib/utils.ts'));
  write('src/modules/test/node/tool.ts', "import {cn} from '@/lib/utils';export {cn};\n");
  commit();
  assert.ok(planRuntimeRepair(root, 'other', ['src/modules/test']).diagnostics.some(d => d.code === 'destination'));
  write('src/modules/test/helper.ts', "export {cn} from '@/lib/utils';\n");
  write('src/modules/test/node/tool.ts', "import {cn} from '../helper';export {cn};\n");
  commit();
  assert.ok(
    planRuntimeRepair(root, 'other', ['src/modules/test/helper.ts']).diagnostics.some(d => d.code === 'destination'),
  );
  assert.throws(() => planRuntimeRepair(root, 'sam', ['../src/prototypes']));
  assert.throws(() => planRuntimeRepair(root, 'sam', [base, base]));
  const target = path.join(root, base + '/b.ts');
  fs.unlinkSync(target);
  fs.symlinkSync(path.join(root, base + '/a.tsx'), target);
  assert.ok(planRuntimeRepair(root, 'sam', [base]).diagnostics.some(d => d.code === 'unsafe-path'));
  fs.unlinkSync(target);
  fs.linkSync(path.join(root, base + '/a.tsx'), target);
  assert.throws(() => repairFileSafety(root, base + '/a.tsx'), /links/);
});

test('a later failure restores earlier writes and rollback never overwrites concurrent edits', t => {
  const { root, base } = fixture(t),
    plan = planRuntimeRepair(root, 'sam', [base]);
  const first = path.join(root, plan.changes[0].path),
    before = fs.readFileSync(first, 'utf8');
  assert.throws(
    () =>
      applyRuntimeRepair(root, 'sam', plan, {
        yes: true,
        beforeWrite(_change, index) {
          if (index === 1) throw new Error('injected write failure');
        },
      }),
    /injected/,
  );
  assert.equal(fs.readFileSync(first, 'utf8'), before);
  const legacyHelper = path.join(root, 'src/lib/utils.ts');
  assert.throws(
    () =>
      applyRuntimeRepair(root, 'sam', plan, {
        yes: true,
        beforeWrite(_change, index) {
          if (index === 0) fs.writeFileSync(legacyHelper, 'export const cn=()=>"custom";');
        },
      }),
    /appeared/,
  );
  assert.equal(fs.readFileSync(first, 'utf8'), before);
  fs.unlinkSync(legacyHelper);
  assert.throws(
    () =>
      applyRuntimeRepair(root, 'sam', plan, {
        yes: true,
        beforeWrite(_change, index) {
          if (index === 1) {
            fs.writeFileSync(first, 'concurrent edit');
            throw new Error('injected failure');
          }
        },
      }),
    AggregateError,
  );
  assert.equal(fs.readFileSync(first, 'utf8'), 'concurrent edit');
});

test('missing identities, ambiguous metadata, archived systems, invalid maps and disabled View block repair', t => {
  const { root, base, write, git } = fixture(t);
  const head = git('rev-parse', 'HEAD');
  const metadata = path.join(root, base, 'meta.json');
  for (const mutate of [
    () => {
      const m = JSON.parse(fs.readFileSync(metadata));
      delete m.ownerContributorId;
      fs.writeFileSync(metadata, JSON.stringify(m));
    },
    () => {
      const m = JSON.parse(fs.readFileSync(metadata));
      delete m.systemId;
      fs.writeFileSync(metadata, JSON.stringify(m));
    },
    () => {
      const source = fs.readFileSync(metadata, 'utf8');
      fs.writeFileSync(metadata, source.replace('{', '{"ownerContributorId":"' + createResourceId() + '",'));
    },
    () => {
      const file = 'src/systems/product/system.ts';
      write(file, fs.readFileSync(path.join(root, file), 'utf8').replace("'active'", "'archived'"));
    },
    () => {
      const file = path.join(root, 'studio.config.json'),
        c = JSON.parse(fs.readFileSync(file));
      c.modules.view = false;
      fs.writeFileSync(file, JSON.stringify(c));
    },
    () => write('.studio/ownership.json', '{"schema":2,"rules":[]}'),
  ]) {
    mutate();
    try {
      assert.equal(planRuntimeRepair(root, 'sam', [base, 'src/systems/product']).applicable, false);
    } catch (error) {
      assert.match(error.message, /declare|module|schema/);
    }
    git('reset', '--hard', head);
  }
});

test('CLI previews before runtime bootstrap, saves exclusively, and rejects forged plans and invalid invocations', t => {
  const { root, base, git, write, commit } = fixture(t);
  for (const folder of ['node/lib', 'node/cli', 'node/check', 'core'])
    fs.cpSync(path.join(original, 'src/platform', folder), path.join(root, 'src/platform', folder), {
      recursive: true,
    });
  fs.symlinkSync(path.join(original, 'node_modules'), path.join(root, 'node_modules'));
  write('package.json', fs.readFileSync(path.join(original, 'package.json')));
  write('src/modules/test/app.tsx', "throw new Error('Never execute team source during repair.');\n");
  commit();
  const cli = (...args) =>
    spawnSync(process.execPath, ['src/platform/node/cli/studio.js', 'repair-runtime-imports', ...args], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 32 << 20,
    });
  const before = git('status', '--porcelain');
  const preview = cli(base, '--json');
  assert.equal(preview.status, 0, preview.stderr);
  const plan = JSON.parse(preview.stdout);
  assert.equal(plan.changes.length, 2);
  assert.equal(git('status', '--porcelain'), before);
  const plain = cli(base);
  for (const change of plan.changes) assert.ok(plain.stdout.includes(change.diff));
  const file = path.join(root, 'repair.json');
  assert.equal(cli(base, '--out', file).status, 0);
  assert.deepEqual(JSON.parse(fs.readFileSync(file)), plan);
  assert.equal(cli(base, '--out', file).status, 2);
  assert.equal(cli(base, '--out', path.join(root, base, 'plan.json')).status, 2);
  for (const args of [['--yes'], ['--force'], ['--apply', file, base], ['--out'], ['/absolute'], [base, base]])
    assert.equal(cli(...args).status, 2, args.join(' '));
  const forged = structuredClone(plan);
  forged.changes[0].path = 'src/platform/api/runtime.ts';
  fs.writeFileSync(file, JSON.stringify(forged));
  assert.equal(cli('--apply', file, '--yes').status, 2);
  fs.writeFileSync(file, JSON.stringify(plan));
  assert.equal(cli('--apply', file).status, 0);
  assert.equal(git('diff'), '');
  assert.equal(cli('--apply', file, '--yes', '--json').status, 0);
});
