import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readContributors } from '../lib/contributors.js';
import { resolveContributor } from './resolve-contributor.js';
import { planContributorPreferences, applyContributorPreferences } from '../lib/contributor-preferences.js';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const args = process.argv.slice(3);
const value = name => args[args.indexOf(name) + 1];
try {
  const actor = resolveContributor(readContributors(root, { initializingPreferences: true }).contributors);
  if (args.includes('--plan') && !args.includes('--apply')) {
    const plan = planContributorPreferences(root, actor, args.includes('--module') ? value('--module') : undefined);
    fs.writeFileSync(path.resolve(value('--plan')), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify(plan, null, 2));
    console.log('Review before/after source in the saved plan. Apply with pnpm studio preferences --apply <file>.');
  } else if (args.includes('--apply') && !args.includes('--plan')) {
    const plan = JSON.parse(fs.readFileSync(path.resolve(value('--apply')), 'utf8'));
    console.log(`Initialized ${applyContributorPreferences(root, actor, plan)} contributor profile(s).`);
  } else throw new Error('Use preferences [--module <id>] --plan <file>, or preferences --apply <file>.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
