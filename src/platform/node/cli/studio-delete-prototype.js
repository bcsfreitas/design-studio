// pnpm studio delete-prototype <prototype-folder> [--yes] [--json] [--as <key>]
// Previews what deleting a prototype would break or lose, and with --yes removes it and refreshes the manifest.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { refusalMessage } from '../../core/permissions.ts';
import { applyPrototypeDeletion, deletionPreview, planPrototypeDeletion } from '../lib/prototype-deletion.js';
import { identityHint, resolveActor, resolveIdentity } from './resolve-contributor.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const args = process.argv.slice(3);
const positional = [],
  flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--') continue;
  if (['--yes', '--json'].includes(args[i])) flags[args[i].slice(2)] = true;
  else if (args[i] === '--as' && args[i + 1] && !args[i + 1].startsWith('--')) flags.as = args[++i];
  else if (args[i].startsWith('--')) fail(`Unknown or incomplete option ${args[i]}.`);
  else positional.push(args[i]);
}
if (positional.length !== 1)
  fail('Usage: pnpm studio delete-prototype <prototype-folder> [--yes] [--json] [--as <key>]');

function fail(message) {
  console.error(message);
  process.exit(1);
}

let actor, plan;
try {
  actor = resolveActor(flags.as);
  plan = planPrototypeDeletion(ROOT, positional[0], actor);
} catch (error) {
  // An unrecognised identity names the Git email and how to link it.
  if (error.refusal === 'identity') {
    const identity = resolveIdentity();
    fail(refusalMessage('identity', { email: identity.email, hint: identity.email && identityHint(identity) }));
  }
  fail(error.message);
}
const emit = (value, lines) => console.log(flags.json ? JSON.stringify(value, null, 2) : lines.join('\n'));

if (!flags.yes) emit(plan, [...deletionPreview(plan), 'Preview only. Apply with --yes.']);
else {
  const { buildManifest } = await import('../build/build-manifest.js');
  let problems = 0;
  try {
    // Navigation and canvases read the manifest, so it is refreshed before the removal is final.
    const result = applyPrototypeDeletion(ROOT, plan, actor, {
      finish: () => ({ errors: problems } = buildManifest({ quiet: true })),
    });
    emit({ ...result, manifest: { refreshed: true, problems } }, [
      `Deleted ${plan.folder}.`,
      ...(plan.incoming.length || plan.breaking.length
        ? [`${plan.incoming.length + plan.breaking.length} file(s) in other prototypes still link to it; update them.`]
        : []),
      `Refreshed the manifest${problems ? ` with ${problems} problem(s); see them with node src/platform/node/build/build-manifest.js` : ''}.`,
    ]);
  } catch (error) {
    // The folder is back; make the manifest list it again in case the refresh ran.
    try {
      buildManifest({ quiet: true });
    } catch {}
    fail(`Nothing was deleted. ${error.message}`);
  }
}
