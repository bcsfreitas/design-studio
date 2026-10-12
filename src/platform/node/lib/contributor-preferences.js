import { parseConfigFile } from '../../core/config-file.ts';
import { discoverModuleFolders } from './module-folders.js';
import { readDeclaration } from '../../core/modules/pack.ts';
import { compatible, moduleProblems, preferenceProblems } from '../../core/modules/index.ts';
import { serializeJson } from '../../core/json.ts';
import { FORMAT_VERSIONS } from '../../core/formats.ts';
import { studioRole, isEnabled } from '../../core/config.ts';
import { readPersistedStudioConfig } from './persisted-studio-config.js';
import { readContributors, contributorProfileProblems } from './contributors.js';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { KEY } from './contributors.js';
import { applySetupChanges } from './studio-setup.js';

const fail = (message, status) => Object.assign(new Error(message), { status });

// Actor comes from the server/CLI identity resolver, never from the request body.
export function readPreferenceProfile(root, actor, contributor = actor, options = {}) {
  if (!actor || actor !== contributor) throw fail('Only the contributor can change their preferences.', 403);
  if (!KEY.test(contributor)) throw fail('Invalid contributor key.', 400);
  const directory = path.join(root, 'contributors');
  const file = path.join(directory, `${contributor}.json`);
  if (!fs.existsSync(file)) throw fail('Contributor is not registered.', 422);
  const validateFile = () => {
    for (const [target, directoryExpected] of [
      [directory, true],
      [file, false],
    ]) {
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink() || !(directoryExpected ? stat.isDirectory() : stat.isFile()))
        throw fail('Contributor profiles must use ordinary files and directories.', 422);
    }
  };
  validateFile();
  const source = fs.readFileSync(file, 'utf8');
  const profile = JSON.parse(source);
  const problems = contributorProfileProblems(profile, source, `contributors/${contributor}.json`, options);
  if (problems.length) throw fail(problems.join('\n'), 422);
  return { file, source, profile, version: createHash('sha256').update(source).digest('hex'), validateFile };
}

// Internal transaction primitive. Public callers can only update their module namespace.
export function transactPreferenceProfile(root, actor, { contributor = actor, base, update }) {
  const current = readPreferenceProfile(root, actor, contributor);
  if (base !== current.version) throw fail('Contributor preferences changed. Read them again before saving.', 409);
  const next = update(structuredClone(current.profile));
  const after = JSON.stringify(next, null, 2) + '\n';
  if (after !== current.source)
    applySetupChanges([{ file: current.file, before: current.source, after }], { validateFile: current.validateFile });
  return next;
}

// Module declarations are data. Read the current installed declaration, including in disposable studios.
export function preferenceDeclarations(root) {
  return discoverModuleFolders(root).map(({ dir, id }) => {
    const result = readDeclaration(fs.readFileSync(path.join(root, dir, 'module.ts'), 'utf8'));
    if ('error' in result) throw fail(`${id}: ${result.error}`, 422);
    const problems = moduleProblems(result.value, id, dir + '/');
    if (problems.length) throw fail(problems.join('\n'), 422);
    return result.value;
  });
}
function schemaFor(root, module) {
  const spec = preferenceDeclarations(root).find(spec => spec.id === module);
  if (!spec?.preferences || !compatible(spec))
    throw fail(`Module ${module} has no compatible preference declaration.`, 422);
  const file = path.join(root, 'studio.config.json');
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw fail('Studio configuration must be an ordinary file.', 422);
  const declaration = parseConfigFile(fs.readFileSync(file, 'utf8'));
  if ('error' in declaration) throw fail(declaration.error, 422);
  const config = declaration.value;
  if (!isEnabled(config, module)) throw fail(`Module ${module} is disabled. Its preferences are retained.`, 422);
  return spec.preferences;
}
function validate(value, schema, module) {
  const problems = preferenceProblems(value, schema);
  if (problems.length)
    throw fail(
      `preferences.${module}: ${problems.join('; ')}. Run pnpm studio preferences --module ${module} --plan <file>.`,
      422,
    );
}
export function readContributorPreferences(root, { actor, contributor = actor, module }) {
  const current = readPreferenceProfile(root, actor, contributor);
  const schema = schemaFor(root, module);
  const value = current.profile.preferences?.[module];
  validate(value, schema, module);
  return { value: structuredClone(value), version: current.version };
}
export function updateContributorPreferences(root, { actor, contributor = actor, module, base, value }) {
  const schema = schemaFor(root, module);
  validate(value, schema, module);
  try {
    serializeJson(value);
  } catch (error) {
    throw fail(error.message, 422);
  }
  const profile = transactPreferenceProfile(root, actor, {
    contributor,
    base,
    update: profile => {
      validate(profile.preferences?.[module], schema, module);
      return {
        ...profile,
        preferences: {
          ...profile.preferences,
          [module]: { ...profile.preferences[module], ...structuredClone(value) },
        },
      };
    },
  });
  return profile.preferences[module];
}

// Admin-only, explicit initialization. The updater never calls this transaction.
export function planContributorPreferences(root, actor, requestedModule) {
  const { contributors, problems } = readContributors(root, { initializingPreferences: true });
  if (problems.length) throw fail(problems.join('\n'), 422);
  const { config } = readPersistedStudioConfig(root, { initializingPreferences: true });
  if (studioRole(config, actor, Object.keys(contributors)) !== 'admin')
    throw fail('Only an Admin can initialize contributor preferences.', 403);
  const installed = preferenceDeclarations(root);
  if (requestedModule && !installed.some(spec => spec.id === requestedModule && spec.preferences && compatible(spec)))
    throw fail('Select an installed compatible module with a preference declaration.', 422);
  const edits = [];
  for (const [contributor, profile] of Object.entries(contributors)) {
    if (![1, FORMAT_VERSIONS.contributor].includes(profile.formatVersion))
      throw fail(`Unsupported profile version for ${contributor}.`, 422);
    const current = readPreferenceProfile(root, contributor, contributor, { initializingPreferences: true });
    const next = structuredClone(profile);
    if (next.preferences === undefined) next.preferences = {};
    if (!next.preferences || typeof next.preferences !== 'object' || Array.isArray(next.preferences))
      throw fail(`${contributor}: invalid preferences envelope.`, 422);
    for (const spec of installed) {
      if (!spec.preferences || !compatible(spec)) continue;
      const legacy = Object.entries(spec.preferences.legacy ?? {}).filter(([, old]) => Object.hasOwn(profile, old));
      if (!(isEnabled(config, spec.id) || requestedModule === spec.id || legacy.length)) continue;
      if (!Object.hasOwn(next.preferences, spec.id)) {
        next.preferences[spec.id] = structuredClone(spec.preferences.defaults);
        for (const [field, old] of legacy) next.preferences[spec.id][field] = profile[old];
      }
      validate(next.preferences[spec.id], spec.preferences, spec.id);
    }
    next.formatVersion = FORMAT_VERSIONS.contributor;
    const after = JSON.stringify(next, null, 2) + '\n';
    if (JSON.stringify(next) !== JSON.stringify(profile))
      edits.push({ contributor, file: path.relative(root, current.file), before: current.source, after });
  }
  return {
    version: 1,
    declarations: createHash('sha256').update(JSON.stringify(installed)).update(JSON.stringify(config)).digest('hex'),
    module: requestedModule ?? null,
    edits,
  };
}
export function applyContributorPreferences(root, actor, plan) {
  if (!plan || plan.version !== 1 || !Array.isArray(plan.edits))
    throw fail('Invalid preference initialization plan.', 422);
  const fresh = planContributorPreferences(root, actor, plan.module ?? undefined);
  if (JSON.stringify(fresh) !== JSON.stringify(plan))
    throw fail('Preferences or declarations changed. Preview initialization again.', 409);
  const edits = plan.edits.map(edit => {
    const current = readPreferenceProfile(root, edit.contributor, edit.contributor, { initializingPreferences: true });
    return { file: current.file, before: edit.before, after: edit.after };
  });
  applySetupChanges(edits, {
    validateFile: file => {
      const contributor = path.basename(file, '.json');
      readPreferenceProfile(root, contributor, contributor, { initializingPreferences: true }).validateFile();
    },
  });
  return edits.length;
}
