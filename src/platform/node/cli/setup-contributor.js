import { retainedResourceIds, allocateResourceIdentity } from '../lib/resource-identity-lifecycle.js';
import { INSTALLED_FILE_TYPES } from '../lib/file-types.js';
// Usage:
//   pnpm join                          (dry run: prints the entry it would add)
//   pnpm join --yes                    (adds it as contributors/<key>.json)
//   pnpm join --key sam --name "Sam Lee" --github samlee --email sam@yourcompany.com --yes
//   pnpm join --link sam --yes         (adds your Git email to an existing profile that matches your name or GitHub)
// When your email matches no profile but your name or GitHub account matches exactly one, join previews linking your
// email to that profile instead of adding a new one. Two or more matches are never linked without --link.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveContributor, loadContributors } from './resolve-contributor.js';
import { contributorCandidates, keysForEmail, withLinkedEmail } from '../lib/contributors.js';
import { SECTION_KEYS } from '../lib/modules.js';
import { CONFIG, ENABLED_MODULES } from '../lib/modules.js';
import { preferenceDefaults } from '../../core/modules/preferences.ts';
import { FORMAT_VERSIONS } from '../../core/formats.ts';
import { contributorFile } from '../lib/contributors.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
// Keys that are app page URLs, so they can't be contributor folders (/systems, /documentation, /examples): the modules' sections.
const RESERVED = SECTION_KEYS;
const PERSONAL = /@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|mac|aol|proton|protonmail|hey)\./i;

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

// --key value, --name value, ... and --yes
const args = process.argv.slice(2).filter(a => a !== '--');
const flag = name => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1].trim() : null;
};
const yes = args.includes('--yes');

if (RESERVED.has(flag('key'))) {
  console.error(`Key "${flag('key')}" is reserved (it's an app page URL, /${flag('key')}). Pass a different --key.`);
  process.exit(1);
}

const explicit = ['key', 'name', 'email', 'github', 'link'].some(key => flag(key) !== null);
const existing = explicit ? null : resolveContributor();
if (existing) {
  if (yes) ensureFolder(existing);
  console.log(`You're already a contributor: "${existing}". Your folder is src/prototypes/${existing}/.`);
  const entryName = loadContributors()[existing]?.name;
  const gitName = run('git', ['config', 'user.name']);
  if (entryName && gitName && entryName !== gitName)
    console.log(
      `Warning: that entry is for ${entryName}, but your Git name is ${gitName}. If that's not you, your GitHub account is shared with their entry.`,
    );
  process.exit(0);
}

const contributors = loadContributors();
const name = flag('name') ?? run('git', ['config', 'user.name']);
const email = flag('email') ?? run('git', ['config', 'user.email']);
const github =
  flag('github') ?? (CONFIG.usage === 'personal' || explicit ? '' : run('gh', ['api', 'user', '--jq', '.login']));

// An email that matches nothing, from someone whose name or GitHub account matches a profile, links to that profile.
const linkTo = flag('link');
if (!flag('key')) {
  const { candidate, candidates } = contributorCandidates(contributors, { name, github });
  if (linkTo) {
    const match = candidates.find(c => c.key === linkTo);
    if (!contributors[linkTo]) fail(`No contributor "${linkTo}" to link to. Check contributors/.`);
    if (!match)
      fail(
        `Profile "${linkTo}" matches neither your name nor your GitHub account, so join won't link to it. Correct --name or --github, or ask that person to add your email.`,
      );
    link(linkTo, match.matchedBy);
  }
  if (candidate) link(candidate, candidates[0].matchedBy);
  if (candidates.length > 1)
    fail(
      `Your email isn't registered, and several profiles match your name or GitHub account: ${candidates.map(c => c.key).join(', ')}. Nothing is linked automatically. Link one with --link <key>, or register a separate profile with --key <new-key>.`,
    );
} else if (linkTo) fail('Pass either --link to use an existing profile or --key to add a new one, not both.');

// Key: lowercase first name, with a number added if it's taken.
let key = flag('key');
if (!key) {
  const base = (name.split(/\s+/)[0] ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '');
  key = base;
  for (let n = 2; key && (contributors[key] || RESERVED.has(key)); n++) key = `${base}${n}`;
}

const problems = [];
if (!key) problems.push('No key. Pass --key, or set your Git name (git config user.name).');
else if (!/^[a-z0-9][a-z0-9-]*$/.test(key))
  problems.push(`Key "${key}" should be lowercase letters, numbers, and dashes.`);
else if (RESERVED.has(key))
  problems.push(`Key "${key}" is reserved (it's an app page URL, /${key}). Pass a different --key.`);
else if (contributors[key]) {
  const prior = contributors[key];
  if (
    prior.name === name &&
    keysForEmail({ [key]: prior }, email).length &&
    (prior.github ?? '').toLowerCase() === github.toLowerCase()
  ) {
    if (yes) ensureFolder(key);
    console.log(`You're already a contributor: "${key}". Your folder is src/prototypes/${key}/.`);
    process.exit(0);
  }
  problems.push(`Key "${key}" is already taken. Pass a different --key.`);
}
for (const [other, entry] of Object.entries(contributors)) {
  if (keysForEmail({ [other]: entry }, email).length)
    problems.push(`Email is already registered to ${other}. Use that entry or correct the email.`);
  if (github && entry.github?.toLowerCase() === github.toLowerCase())
    problems.push(`GitHub username is already registered to ${other}. Use that entry or correct the username.`);
}
if (!name) problems.push('No name. Pass --name, or set git config user.name.');
if (!email) problems.push('No email. Pass --email, or set git config user.email.');
if (problems.length) {
  for (const p of problems) console.error(p);
  process.exit(1);
}

const entry = {
  formatVersion: FORMAT_VERSIONS.contributor,
  studioId: allocateResourceIdentity(retainedResourceIds(ROOT, INSTALLED_FILE_TYPES)),
  name,
  github,
  email,
  preferences: preferenceDefaults(ENABLED_MODULES),
};
console.log(`${yes ? 'Adding' : 'Proposed'} contributors/${key}.json:\n${JSON.stringify(entry, null, 2)}`);
if (!yes)
  console.log(
    'Name and email come from your Git config, and the GitHub username from the GitHub CLI, unless passed as flags.',
  );
console.log(`Your folder will be src/prototypes/${key}/.`);
if (!github && CONFIG.usage !== 'personal')
  console.log(
    'Warning: no GitHub username (is the GitHub CLI installed and signed in?). Pass --github, or CI will not recognize your pushes.',
  );
if (CONFIG.usage !== 'personal' && PERSONAL.test(email))
  console.log(`Warning: ${email} looks like a personal email. Use your work email, the one in your Git config.`);

if (!yes) {
  console.log('Nothing written. Confirm these values, then rerun with --yes (and any corrections as flags).');
  process.exit(0);
}

fs.mkdirSync(path.dirname(contributorFile(key)), { recursive: true });
fs.writeFileSync(contributorFile(key), JSON.stringify(entry, null, 2) + '\n', { flag: 'wx' });
const folder = path.join(ROOT, 'src', 'prototypes', key);
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(path.join(folder, '.gitkeep'), '');
console.log(`Added contributors/${key}.json and created src/prototypes/${key}/.`);

function fail(message) {
  console.error(message);
  process.exit(1);
}

// Previews, or with --yes applies, adding the email to an existing profile. Creates no profile and no folder.
function link(key, matchedBy) {
  if (!email) fail('No email to link. Pass --email, or set git config user.email.');
  const owner = keysForEmail(contributors, email)[0];
  if (owner && owner !== key) fail(`Email is already registered to ${owner}. Use that entry or correct the email.`);
  const file = contributorFile(key);
  const profile = JSON.parse(fs.readFileSync(file, 'utf8'));
  const next = withLinkedEmail(profile, email);
  const by = matchedBy.map(field => (field === 'github' ? 'GitHub account' : field)).join(' and ');
  console.log(
    `${email} isn't registered, but contributors/${key}.json (${profile.name}) matches your ${by}. ${yes ? 'Linking' : 'Proposed'}: add it to that profile's emails.`,
  );
  console.log(JSON.stringify({ email: next.email, emails: next.emails }, null, 2));
  if (!yes) {
    console.log(
      `Nothing written. If this is your profile, rerun with --yes. If it's someone else's, pass --key <new-key> to register a separate profile.`,
    );
    process.exit(0);
  }
  fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
  console.log(`Linked ${email} to "${key}". Your folder is src/prototypes/${key}/.`);
  process.exit(0);
}

function ensureFolder(key) {
  const folder = path.join(ROOT, 'src', 'prototypes', key);
  fs.mkdirSync(folder, { recursive: true });
  const keep = path.join(folder, '.gitkeep');
  if (!fs.existsSync(keep)) fs.writeFileSync(keep, '', { flag: 'wx' });
}
