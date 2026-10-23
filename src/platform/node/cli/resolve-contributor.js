import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import fs from 'node:fs';
import { CONFIG_FILE } from '../../core/config.ts';
import { parseConfigFile } from '../../core/config-file.ts';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
import { loadContributors, keysForEmail, contributorCandidates } from '../lib/contributors.js';

export { loadContributors };

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function usage() {
  const declaration = parseConfigFile(fs.readFileSync(path.join(ROOT, CONFIG_FILE), 'utf8'));
  if ('error' in declaration) throw new Error(declaration.error);
  return declaration.value.usage;
}

/** Key for a GitHub username (used by CI with GITHUB_ACTOR). */
export function keyForGithub(login, contributors = loadContributors()) {
  if (!login) return null;
  const l = login.toLowerCase();
  const matches = Object.keys(contributors).filter(key => contributors[key].github?.toLowerCase() === l);
  return matches.length === 1 ? matches[0] : null;
}

/**
 * How the current Git identity relates to the profiles. `key` is the linked contributor: the only identity that may
 * change content. When nothing is linked, `candidate` is the one profile matching the Git name or GitHub account
 * (`candidates` lists every match, so two or more means ambiguous). `readOnlyKey` is what read-only resolution may use:
 * the linked key, or in a personal studio the candidate. `matchedBy` says how `key` was found.
 * `identity` overrides the Git name, email, or GitHub account, as `pnpm join` flags do.
 */
export function resolveIdentity(contributors = loadContributors(), identity = {}, { candidates = true } = {}) {
  const email = (identity.email ?? run('git', ['config', 'user.email'])).toLowerCase();
  const name = (identity.name ?? run('git', ['config', 'user.name'])).toLowerCase();
  let github = identity.github;
  let personal;
  const isPersonal = () => (personal ??= usage() === 'personal');
  const login = () => (github ??= isPersonal() ? '' : run('gh', ['api', 'user', '--jq', '.login']));
  const result = (key, matchedBy) => {
    const unlinked =
      key || !candidates
        ? { candidate: null, candidates: [] }
        : contributorCandidates(contributors, { name, github: login() });
    return {
      key,
      matchedBy,
      email,
      ...unlinked,
      readOnlyKey: key ?? (unlinked.candidate && isPersonal() ? unlinked.candidate : null),
    };
  };
  const byEmail = keysForEmail(contributors, email);
  if (byEmail.length === 1) return result(byEmail[0], 'email');
  if (byEmail.length > 1) return { ...result(null, null), candidate: null, readOnlyKey: null };
  const matches = Object.keys(contributors).filter(key => name && contributors[key].name?.toLowerCase() === name);
  // Profiles with an explicitly unavailable email can resolve through an unambiguous Git name.
  if (matches.length === 1 && !contributors[matches[0]].email) return result(matches[0], 'name');
  // A configured, unregistered identity must not inherit a different global GitHub account.
  if (email) return result(null, null);
  const byGh = isPersonal() ? null : keyForGithub(login(), contributors);
  if (byGh) return result(byGh, 'github');
  if (!name) return result(null, null);
  return matches.length === 1 ? result(matches[0], 'name') : result(null, null);
}

/** Current contributor's key: Git email first, with unambiguous alternatives for unavailable email. Linked only. */
export function resolveContributor(contributors = loadContributors()) {
  return resolveIdentity(contributors, {}, { candidates: false }).key;
}

/**
 * The contributor one command acts as. Without `as`, the linked key. With `as` (the documented `--as <key>` flag), that
 * key, only when its profile matches the Git name or GitHub account and the Git email isn't linked to someone else.
 * It never grants a role: the key's own permissions apply. Throws a sentence when refused.
 */
export function resolveActor(as, contributors = loadContributors(), identity = {}) {
  if (as === undefined || as === null) return resolveIdentity(contributors, identity, { candidates: false }).key;
  if (!Object.hasOwn(contributors, as)) throw new Error(`--as ${as}: there is no contributors/${as}.json profile.`);
  const resolved = resolveIdentity(contributors, identity);
  if (resolved.key === as) return as;
  if (resolved.key)
    throw new Error(
      `--as ${as} refused: your Git identity (${resolved.email}) already resolves to "${resolved.key}", and --as never acts as another contributor.`,
    );
  if (!resolved.candidates.some(candidate => candidate.key === as))
    throw new Error(
      `--as ${as} refused: that profile matches neither your Git name nor your GitHub account. --as only recovers your own profile; ask its owner or an Admin.`,
    );
  return as;
}

/** The next step for an unrecognised identity, naming a candidate profile when there is one. */
export function identityHint(identity) {
  const email = identity.email || '<email>';
  if (identity.candidate)
    return `Profile "${identity.candidate}" matches your ${identity.candidates[0].matchedBy.join(' and ')}. Link this email with \`pnpm join --link ${identity.candidate} --yes\`, or run this one command with \`--as ${identity.candidate}\`.`;
  if (identity.candidates?.length > 1)
    return `Several profiles match your name or GitHub account (${identity.candidates.map(c => c.key).join(', ')}). Link yours with \`pnpm join --link <key>\`.`;
  return `Run \`pnpm join\` to register, or to link this email to your existing profile (\`pnpm join --link <key>\`, or \`pnpm studio profile --as <key> --add-email ${email}\`).`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const identity = resolveIdentity();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(identity, null, 2));
    process.exit(identity.readOnlyKey ? 0 : 1);
  }
  const link = `Run \`pnpm join\` to preview linking ${identity.email || 'your Git email'} to it.`;
  if (!identity.key && identity.readOnlyKey) {
    console.error(
      `Your Git email isn't linked to a profile; reading as "${identity.readOnlyKey}", which matches your ${identity.candidates[0].matchedBy.join(' and ')}. Changes need the link. ${link}`,
    );
    console.log(identity.readOnlyKey);
  } else if (!identity.key) {
    if (identity.candidate)
      console.error(
        `Your Git email isn't linked to a contributor profile, but "${identity.candidate}" matches your ${identity.candidates[0].matchedBy.join(' and ')}. ${link}`,
      );
    else if (identity.candidates.length > 1)
      console.error(
        `Your Git email isn't linked to a contributor profile, and several profiles match your name or GitHub account (${identity.candidates.map(c => c.key).join(', ')}). Link one with \`pnpm join --link <key>\`.`,
      );
    else console.error('Not a contributor yet. Run `pnpm join` to add yourself.');
    process.exit(1);
  } else console.log(identity.key);
}
