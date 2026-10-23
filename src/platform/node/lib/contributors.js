import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsonIdentity } from '../../core/resourceIdentity.ts';
import { formatVersionProblem } from '../../core/formats.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const CONTRIBUTORS_DIR = path.join(ROOT, 'contributors');
export const KEY = /^[a-z0-9][a-z0-9-]*$/;

const readJson = file => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`${path.relative(ROOT, file)} isn't valid JSON (${e.message}).`);
  }
};

export function contributorProfileProblems(entry, source, file, { identityOnly = false } = {}) {
  const problems = [];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    problems.push(`${file} must be an object with name, github, and email declarations.`);
    return problems;
  }
  const version = formatVersionProblem(entry.formatVersion, 'contributor', `${file}`);
  if (version && !identityOnly) problems.push(version);
  if (typeof entry.name !== 'string' || !entry.name.trim()) problems.push(`${file}: declare a nonempty name.`);
  try {
    jsonIdentity(source);
  } catch (error) {
    problems.push(`${file}: ${error.message}`);
  }
  for (const field of ['email', 'github'])
    if (typeof entry[field] !== 'string')
      problems.push(`${file}: declare ${field} as a string. Use an empty string when unavailable.`);
  // Optional additional emails, such as a second Git identity; `email` stays the primary one.
  if (
    entry.emails !== undefined &&
    (!Array.isArray(entry.emails) || entry.emails.some(email => typeof email !== 'string' || !email.trim()))
  )
    problems.push(`${file}: emails must be a list of nonempty email strings, in addition to email.`);
  if (
    entry.avatar !== undefined &&
    (typeof entry.avatar !== 'string' ||
      !/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(svg|png|jpe?g|webp)$/i.test(entry.avatar))
  )
    problems.push(`${file}: avatar must be a relative image path inside public/, such as images/person.svg.`);
  if (
    !identityOnly &&
    (!entry.preferences ||
      typeof entry.preferences !== 'object' ||
      Array.isArray(entry.preferences) ||
      Object.values(entry.preferences).some(value => !value || typeof value !== 'object' || Array.isArray(value)))
  )
    problems.push(`${file}: declare preferences as module namespace objects.`);
  return problems;
}

// Each regular contributors/<key>.json profile is the sole declaration for that key.
export function readContributors(root = ROOT, { identityOnly = false } = {}) {
  const directory = path.join(root, 'contributors');
  const contributors = Object.create(null);
  const problems = [];
  if (fs.existsSync(directory) && (!fs.lstatSync(directory).isDirectory() || fs.lstatSync(directory).isSymbolicLink()))
    throw new Error('Contributor profiles must use an ordinary directory.');
  const files = fs.existsSync(directory)
    ? fs
        .readdirSync(directory)
        .filter(f => f.endsWith('.json'))
        .sort()
    : [];
  for (const file of files) {
    const key = file.slice(0, -5);
    if (!KEY.test(key)) {
      problems.push(`contributors/${file}: a contributor's key is lowercase letters, numbers, and dashes.`);
      continue;
    }
    const profile = path.join(directory, file);
    const stat = fs.lstatSync(profile);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      problems.push(`contributors/${file} must be an ordinary file.`);
      continue;
    }
    const entry = readJson(profile);
    problems.push(
      ...contributorProfileProblems(entry, fs.readFileSync(profile, 'utf8'), `contributors/${file}`, {
        identityOnly,
      }),
    );
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    contributors[key] = entry;
    if (typeof entry.avatar === 'string' && !fs.existsSync(path.join(root, 'public', entry.avatar)))
      problems.push(`contributors/${file}: avatar public/${entry.avatar} is missing.`);
  }
  for (const [key, entry] of Object.entries(contributors)) {
    if (entry?.sample !== undefined && entry.sample !== true)
      problems.push(`Contributor "${key}": sample must be true; omit it for a real contributor.`);
  }
  for (const field of ['email', 'github', 'studioId']) {
    const identities = new Map();
    for (const [key, entry] of Object.entries(contributors)) {
      const values =
        field === 'email'
          ? profileEmails(entry)
          : [typeof entry[field] === 'string' ? entry[field].trim().toLowerCase() : ''];
      for (const identity of new Set(values)) {
        if (!identity) continue;
        if (identities.has(identity))
          problems.push(`Contributor "${key}": ${field} is also registered to ${identities.get(identity)}.`);
        else identities.set(identity, key);
      }
    }
  }
  return { contributors, problems };
}

export const loadContributors = () => {
  const { contributors, problems } = readContributors();
  if (problems.length) throw new Error(problems.join('\n'));
  return contributors;
};

// Changes when anyone is added or edited: what a cache of anything worked out from the contributors must key on.
export function contributorsSignature() {
  const stat = f => {
    try {
      const s = fs.statSync(f);
      return `${s.mtimeMs}:${s.size}`;
    } catch {
      return '-';
    }
  };
  const files = fs.existsSync(CONTRIBUTORS_DIR) ? fs.readdirSync(CONTRIBUTORS_DIR).sort() : [];
  return files.map(f => `${f}:${stat(path.join(CONTRIBUTORS_DIR, f))}`).join('|');
}

export const contributorFile = key => path.join(CONTRIBUTORS_DIR, `${key}.json`);

const normalized = value => (typeof value === 'string' ? value.trim().toLowerCase() : '');

/** Every nonempty email a profile answers to, lowercased: the primary `email`, then any additional `emails`. */
export function profileEmails(entry) {
  const emails = [entry?.email, ...(Array.isArray(entry?.emails) ? entry.emails : [])].map(normalized);
  return [...new Set(emails.filter(Boolean))];
}

/** Keys whose profile lists this email. */
export function keysForEmail(contributors, email) {
  const wanted = normalized(email);
  return wanted ? Object.keys(contributors).filter(key => profileEmails(contributors[key]).includes(wanted)) : [];
}

/**
 * Profiles that may belong to someone whose email matched nothing: an exact name or GitHub account match. Sample
 * profiles are never candidates. `candidate` is set only when exactly one profile matches; a candidate identifies,
 * it never authorizes, until the email is linked to the profile.
 */
export function contributorCandidates(contributors, { name = '', github = '' } = {}) {
  const wantedName = normalized(name),
    wantedGithub = normalized(github);
  const candidates = [];
  for (const [key, entry] of Object.entries(contributors)) {
    if (entry?.sample === true) continue;
    const matchedBy = [];
    if (wantedName && normalized(entry.name) === wantedName) matchedBy.push('name');
    if (wantedGithub && normalized(entry.github) === wantedGithub) matchedBy.push('github');
    if (matchedBy.length) candidates.push({ key, matchedBy });
  }
  return {
    candidate: candidates.length === 1 ? candidates[0].key : null,
    candidates,
  };
}

/** The profile with `email` added to its additional emails, keeping its other declarations and their order. */
export function withLinkedEmail(entry, email) {
  if (keysForEmail({ entry }, email).length) return entry;
  const next = {};
  for (const [field, value] of Object.entries(entry)) {
    if (field === 'emails') continue;
    next[field] = value;
    if (field === 'email') next.emails = [...(entry.emails ?? []), email.trim()];
  }
  if (!next.emails) next.emails = [...(entry.emails ?? []), email.trim()];
  return next;
}
