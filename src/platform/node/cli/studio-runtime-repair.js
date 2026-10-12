import fs from 'node:fs';
import path from 'node:path';
import { planRuntimeRepair, applyRuntimeRepair } from '../lib/runtime-import-repair.js';
import { resolveContributor } from './resolve-contributor.js';
import { trackedFiles } from '../lib/ownership.js';

const root = fs.realpathSync(path.resolve(import.meta.dirname, '../../../..'));
try {
  const selection = [],
    flags = {};
  const args = process.argv.slice(3);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') continue;
    if (['--yes', '--json'].includes(arg)) {
      if (flags[arg]) throw new Error(`Repeated option ${arg}.`);
      flags[arg] = true;
    } else if (['--out', '--apply'].includes(arg)) {
      if (flags[arg] || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${arg} requires one value.`);
      flags[arg] = args[++i];
    } else if (arg.startsWith('-')) throw new Error(`Unknown option ${arg}.`);
    else selection.push(arg);
  }
  if ((flags['--apply'] && (selection.length || flags['--out'])) || (flags['--yes'] && !flags['--apply']))
    throw new Error('Use --apply <saved-plan> [--yes], or preview paths [--json] [--out <new-plan>].');
  const actor = resolveContributor();
  const result = flags['--apply']
    ? applyRuntimeRepair(root, actor, JSON.parse(fs.readFileSync(flags['--apply'], 'utf8')), {
        yes: Boolean(flags['--yes']),
      })
    : planRuntimeRepair(root, actor, selection.length ? selection : undefined);
  if (flags['--out']) {
    const output = path.resolve(flags['--out']);
    const canonical = path.join(fs.realpathSync(path.dirname(output)), path.basename(output));
    const rel = path.relative(root, canonical).split(path.sep).join('/');
    if (rel === 'src' || rel.startsWith('src/') || trackedFiles(root).includes(rel))
      throw new Error('Save the repair plan outside source roots and tracked files.');
    fs.writeFileSync(canonical, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  }
  if (flags['--json']) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(
      `Runtime import repair: ${result.changes.length} file(s), ${result.diagnostics.length} manual case(s).`,
    );
    for (const change of result.changes) console.log(change.diff);
    for (const diagnostic of result.diagnostics)
      console.log(
        `${diagnostic.path}${diagnostic.line ? ':' + diagnostic.line : ''} [${diagnostic.code}] ${diagnostic.message}\n${diagnostic.action}`,
      );
    if (result.applied)
      console.log(
        `Applied ${result.applied.length} reviewed repair(s). Run pnpm check and pnpm build; review and commit the source diff separately.`,
      );
    else
      console.log(
        result.applicable
          ? 'Preview only. Save with --out, then apply the reviewed plan with --apply <plan> --yes.'
          : 'No source changes applied. Resolve manual cases or select a narrower scope and preview again.',
      );
  }
  process.exitCode = result.applicable ? 0 : 1;
} catch (error) {
  console.error(`Runtime import repair failed: ${error.message}`);
  if (error instanceof AggregateError) for (const cause of error.errors) console.error(cause.message);
  if (error.restored)
    console.error(`Restored: ${error.restored.map(file => path.relative(root, file)).join(', ') || 'none'}.`);
  if (error.remaining?.length)
    console.error(`Inspect remaining files: ${error.remaining.map(file => path.relative(root, file)).join(', ')}.`);
  process.exitCode = 2;
}
