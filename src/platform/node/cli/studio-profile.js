// pnpm studio profile: update your own contributor profile instead of editing its JSON. It previews, and writes only
// with --yes. Studio ID, onboarding progress and other preferences are kept as they are.
//
//   pnpm studio profile                                   show your profile
//   pnpm studio profile --name "Sam Lee"                  change your display name
//   pnpm studio profile --add-email sam@home.example      answer to another Git email (repeatable)
//   pnpm studio profile --remove-email old@work.example   stop answering to one (repeatable)
//   pnpm studio profile --primary-email sam@home.example  make one of your emails the primary
//   pnpm studio profile --github samlee                   set your GitHub account; --github "" clears it
//   ... --as <key>                                        act as your profile when your Git email isn't linked yet,
//                                                         only if it matches your Git name or GitHub account
// The email your current Git identity resolves through can't be removed: you would lose access to your own work.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contributorFile, keysForEmail, profileEmails, readContributors } from '../lib/contributors.js';
import { resolveActor, resolveIdentity } from './resolve-contributor.js';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GITHUB = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const LISTS = ['--add-email', '--remove-email'];
const VALUES = ['--name', '--primary-email', '--github', '--as'];

function parse(args) {
  const options = { yes: false, add: [], remove: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') continue;
    if (arg === '--yes') options.yes = true;
    else if (LISTS.includes(arg) || VALUES.includes(arg)) {
      const value = args[++i];
      if (value === undefined) throw new Error(`${arg} needs a value.`);
      if (arg === '--add-email') options.add.push(value.trim());
      else if (arg === '--remove-email') options.remove.push(value.trim());
      else options[arg.slice(2).replace('-e', 'E')] = value.trim();
    } else throw new Error(`Unknown option ${arg}. See the top of src/platform/node/cli/studio-profile.js.`);
  }
  return options;
}

// Every problem names the field and the form it expects.
function plan(contributors, key, options, identity) {
  const entry = contributors[key];
  const problems = [];
  const lower = value => value.toLowerCase();
  const emailProblem = (field, value) =>
    EMAIL.test(value) ? null : `${field}: expected an email address such as sam@example.com, not "${value}".`;
  const owner = email => keysForEmail(contributors, email).find(other => other !== key);

  if (options.name !== undefined && !options.name) problems.push('name: expected a nonempty name, such as "Sam Lee".');
  if (options.github !== undefined && options.github && !GITHUB.test(options.github))
    problems.push(
      `github: expected a GitHub username (letters, numbers and single hyphens, at most 39 characters), or "" to clear it; not "${options.github}".`,
    );
  if (options.github) {
    const other = Object.keys(contributors).find(
      k => k !== key && lower(contributors[k].github ?? '') === lower(options.github),
    );
    if (other) problems.push(`github: "${options.github}" is already registered to ${other}.`);
  }
  for (const [field, values] of [
    ['add-email', options.add],
    ['remove-email', options.remove],
    ...(options.primaryEmail === undefined ? [] : [['primary-email', [options.primaryEmail]]]),
  ])
    for (const value of values) {
      const problem = emailProblem(field, value);
      if (problem) problems.push(problem);
      else if (field !== 'remove-email' && owner(value))
        problems.push(`${field}: ${value} is already registered to ${owner(value)}.`);
    }

  const current = profileEmails(entry);
  const removed = new Set(options.remove.map(lower));
  for (const email of removed)
    if (!current.includes(email))
      problems.push(`remove-email: ${email} isn't on this profile. Its emails are ${current.join(', ') || 'none'}.`);
  if (identity.key === key && identity.matchedBy === 'email' && removed.has(identity.email))
    problems.push(
      `remove-email: ${identity.email} is your current Git email, the one the Studio recognises you by, so removing it would lock you out of your own work. Set \`git config user.email\` to another email on this profile first.`,
    );

  let primary = options.primaryEmail ?? entry.email ?? '';
  if (options.primaryEmail && removed.has(lower(options.primaryEmail)))
    problems.push('primary-email: the new primary email is also listed in --remove-email.');
  if (options.primaryEmail === undefined && removed.has(lower(primary))) {
    const remaining = [...(entry.emails ?? []), ...options.add].filter(email => !removed.has(lower(email)));
    problems.push(
      `primary-email: removing the primary email ${primary} needs a new one, such as --primary-email ${remaining[0] ?? '<email>'}.`,
    );
  }
  if (problems.length) return { problems };

  // Additional emails keep their order; the old primary joins them when another becomes primary.
  const others = [];
  for (const email of [entry.email ?? '', ...(entry.emails ?? []), ...options.add]) {
    if (!email || removed.has(lower(email)) || lower(email) === lower(primary)) continue;
    if (!others.some(other => lower(other) === lower(email))) others.push(email);
  }
  const next = {};
  for (const [field, value] of Object.entries(entry)) {
    if (field === 'emails') continue;
    if (field === 'name') next.name = options.name ?? value;
    else if (field === 'github') next.github = options.github ?? value;
    else if (field === 'email') {
      next.email = primary;
      if (others.length) next.emails = others;
    } else next[field] = value;
  }
  if (!('email' in next)) next.email = primary;
  if (others.length && !next.emails) next.emails = others;

  const changes = [];
  const show = value => (Array.isArray(value) ? value.join(', ') || 'none' : value === '' ? '""' : value);
  for (const field of ['name', 'email', 'emails', 'github']) {
    const before = entry[field] ?? (field === 'emails' ? [] : '');
    const after = next[field] ?? (field === 'emails' ? [] : '');
    if (JSON.stringify(before) !== JSON.stringify(after))
      changes.push(`${field === 'email' ? 'email (primary)' : field}: ${show(before)} → ${show(after)}`);
  }
  return { problems, next, changes };
}

try {
  const options = parse(process.argv.slice(3));
  const { contributors } = readContributors(root);
  const key = resolveActor(options.as, contributors);
  if (!key) {
    const identity = resolveIdentity(contributors);
    throw new Error(
      `Your Git identity (${identity.email || 'no Git email set'}) doesn't match a contributor profile. Run \`pnpm join\` to register or link it${identity.candidate ? `, or add --as ${identity.candidate} to update the profile that matches your ${identity.candidates[0].matchedBy.join(' and ')}` : ''}.`,
    );
  }
  const file = path.relative(root, contributorFile(key)).split(path.sep).join('/');
  const result = plan(contributors, key, options, resolveIdentity(contributors, {}, { candidates: false }));
  if (result.problems.length) throw new Error(`Nothing written.\n${result.problems.join('\n')}`);
  if (!result.changes.length) {
    const entry = contributors[key];
    console.log(
      `${file} (${key})\nname: ${entry.name}\nemail (primary): ${entry.email || '""'}\nemails: ${(entry.emails ?? []).join(', ') || 'none'}\ngithub: ${entry.github || '""'}`,
    );
    const requested = ['name', 'github', 'primaryEmail'].some(field => options[field] !== undefined);
    if (requested || options.add.length || options.remove.length) console.log('No changes.');
  } else {
    console.log(`${options.yes ? 'Updating' : 'Proposed changes to'} ${file}:`);
    for (const change of result.changes) console.log(`  ${change}`);
    if (!options.yes) console.log('Nothing written. Apply with --yes. Studio ID and preferences stay as they are.');
    else {
      fs.writeFileSync(contributorFile(key), JSON.stringify(result.next, null, 2) + '\n');
      console.log(`Updated ${file}. Studio ID and preferences are unchanged.`);
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
