import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { loadOwnership, mapProblems, tierOf, trackedFiles } from './ownership.js';
import { canonicalDirectory } from './safe-paths.js';
import { readPersistedStudioConfig } from './persisted-studio-config.js';
import { readContributors } from './contributors.js';
import { discoverModuleFolders } from './module-folders.js';
import { readDeclaration } from '../../core/declarations.ts';
import { canPerform } from '../../core/permissions.ts';
import { resourceId, jsonIdentity } from '../../core/resourceIdentity.ts';
import { configProblems } from '../../core/config.ts';
import { SYSTEM_ROOTS } from '../../core/roots.ts';
import { prototypeAssignment } from './prototype-assignment.js';
import { scopePolicy } from './scope.js';
import { apiEnvironmentPolicy } from './api-environments.js';
import { dependencyResolver, importsOf } from './imports.js';
import { applySetupChanges } from './studio-setup.js';

const ROOTS = ['src/prototypes', 'src/systems', 'src/modules'];
// Exact released implementations, including their comments; custom helpers need manual review.
export const RUNTIME_REPAIRS = [
  {
    file: 'src/lib/utils.ts',
    names: ['cn'],
    to: '#studio/runtime',
    hash: 'a8950be0d3981383f2897a00a5a58913ae927d96e51557d915a76e81fbef4f30',
  },
  {
    file: 'src/lib/portal.ts',
    names: ['PortalContext', 'usePortalContainer'],
    to: '#studio/runtime',
    hash: 'da7f8ba80bc81f42db4c2e61bc7ed6b8dd00356bc25e842b5179fec782581133',
  },
  {
    file: 'src/lib/emptyView.ts',
    names: ['emptyView'],
    to: '@module/view',
    hash: '55c8395eccf3d31f78a1db329317a19639237a01f0165e02db2f5d2f0574401a',
  },
];
const hash = value => createHash('sha256').update(value).digest('hex');
const git = (root, ...args) =>
  execFileSync('git', ['--literal-pathspecs', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 << 20,
  });
const supported = file =>
  ROOTS.some(base => file.startsWith(base + '/')) &&
  (/\.(?:[cm]?[jt]s|[jt]sx)$/.test(file) || /^src\/systems\/[^/]+\/components\.json$/.test(file));
const relativePath = file =>
  typeof file === 'string' &&
  file &&
  !path.isAbsolute(file) &&
  !file.includes('\\') &&
  !file.split('/').some(p => !p || p === '.' || p === '..');

export function repairFileSafety(root, file) {
  if (!relativePath(file) || !canonicalDirectory(path.dirname(path.join(root, file)), root))
    throw new Error(`${file}: unsafe source path.`);
  const stat = fs.lstatSync(path.join(root, file));
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1)
    throw new Error(`${file}: use an ordinary file without links.`);
  let dir = path.dirname(path.join(root, file));
  while (dir !== root) {
    if (fs.existsSync(path.join(dir, '.git')))
      throw new Error(`${file}: nested repositories are outside repair scope.`);
    dir = path.dirname(dir);
  }
  if (file.split('/').some(part => ['node_modules', 'dist', 'build'].includes(part)))
    throw new Error(`${file}: dependency and build output is outside repair scope.`);
  return stat;
}

function legacy(source, file) {
  let target;
  if (source.startsWith('@/')) target = path.posix.join('src', source.slice(2));
  else if (source.startsWith('.')) target = path.posix.normalize(path.posix.join(path.posix.dirname(file), source));
  else return undefined;
  return RUNTIME_REPAIRS.find(rule => target === rule.file || target === rule.file.slice(0, -3));
}

// Pure AST edits. Diagnostics suppress all edits in the affected file.
export function runtimeSourceEdits(text, file) {
  const tree = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.json') ? ts.ScriptKind.JSON : undefined,
  );
  const edits = [],
    diagnostics = [],
    rules = new Set();
  const report = (node, code, message) => {
    const location = tree.getLineAndCharacterOfPosition(node?.getStart(tree) ?? 0);
    diagnostics.push({
      path: file,
      line: location.line + 1,
      column: location.character + 1,
      code,
      message,
      action: 'Repair this source manually, preserve your work, and preview again.',
    });
  };
  if (file.endsWith('.json')) {
    const visitObject = node => {
      if (ts.isObjectLiteralExpression(node)) {
        const keys = node.properties.map(p => p.name?.text);
        if (new Set(keys).size !== keys.length)
          report(node, 'duplicate-json-key', 'Duplicate JSON keys are ambiguous.');
        for (const p of node.properties)
          if (p.name?.text === 'aliases' && ts.isObjectLiteralExpression(p.initializer)) {
            const value = p.initializer.properties.find(p => p.name?.text === 'utils')?.initializer;
            if (value && ts.isStringLiteral(value) && value.text === '@/lib/utils') {
              rules.add(RUNTIME_REPAIRS[0]);
              edits.push({ start: value.getStart(tree) + 1, end: value.end - 1, text: '#studio/runtime' });
            } else if (value && (!ts.isStringLiteral(value) || value.text !== '#studio/runtime'))
              report(value, 'custom-alias', 'The utility alias is customized; preserve its meaning manually.');
          }
      }
      ts.forEachChild(node, visitObject);
    };
    visitObject(tree);
  } else {
    const visit = node => {
      let specifier;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
      else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      )
        specifier = node.arguments[0];
      else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference))
        specifier = node.moduleReference.expression;
      else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) specifier = node.argument.literal;
      if (specifier && ts.isStringLiteralLike(specifier)) {
        const rule = legacy(specifier.text, file);
        if (rule) {
          rules.add(rule);
          const clause = ts.isImportDeclaration(node) ? node.importClause : undefined;
          const bindings = clause?.namedBindings;
          const named =
            ts.isImportDeclaration(node) && !clause?.name && bindings && ts.isNamedImports(bindings)
              ? bindings
              : ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)
                ? node.exportClause
                : null;
          if (!named || !named.elements.length || node.attributes)
            report(node, 'unsupported-import', 'Only static named imports and named re-exports can be repaired.');
          else {
            const unknown = named.elements.find(e => !rule.names.includes((e.propertyName ?? e.name).text));
            if (unknown)
              report(
                unknown,
                'unsupported-export',
                `Unknown legacy export ${(unknown.propertyName ?? unknown.name).text}.`,
              );
            else
              edits.push({
                start: specifier.getStart(tree) + 1,
                end: specifier.end - 1,
                text: rule.to,
                names: named.elements.map(e => (e.propertyName ?? e.name).text),
                typeOnly: Boolean(clause?.isTypeOnly || node.isTypeOnly || named.elements.every(e => e.isTypeOnly)),
              });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
  }
  if (tree.parseDiagnostics.length) report(tree, 'parse-error', 'Source must parse unambiguously before repair.');
  return { edits: diagnostics.length ? [] : edits, diagnostics, rules: [...rules] };
}

const patched = (source, edits) =>
  [...edits]
    .sort((a, b) => b.start - a.start)
    .reduce((text, e) => text.slice(0, e.start) + e.text + text.slice(e.end), source);
function unifiedDiff(file, before, after) {
  const a = before.split('\n'),
    b = after.split('\n');
  const lines = [`--- a/${file}`, `+++ b/${file}`];
  // A full-file hunk is deterministic and keeps every unchanged byte available for review.
  const oldLines = before.endsWith('\n') ? a.slice(0, -1) : a;
  const newLines = after.endsWith('\n') ? b.slice(0, -1) : b;
  lines.push(`@@ -1,${oldLines.length} +1,${newLines.length} @@`);
  const add = (prefix, line, index, list, text) => {
    lines.push(prefix + line);
    if (index === list.length - 1 && !text.endsWith('\n')) lines.push('\\ No newline at end of file');
  };
  if (oldLines.length !== newLines.length) {
    oldLines.forEach((line, i) => add('-', line, i, oldLines, before));
    newLines.forEach((line, i) => add('+', line, i, newLines, after));
  } else
    oldLines.forEach((line, i) => {
      if (line === newLines[i]) add(' ', line, i, oldLines, before);
      else {
        add('-', line, i, oldLines, before);
        add('+', newLines[i], i, newLines, after);
      }
    });
  return lines.join('\n') + '\n';
}

export function planRuntimeRepair(root, actor, selection = ROOTS) {
  root = fs.realpathSync(root);
  if (
    !Array.isArray(selection) ||
    !selection.length ||
    new Set(selection).size !== selection.length ||
    selection.some(p => !relativePath(p) || !ROOTS.some(base => p === base || p.startsWith(base + '/')))
  )
    throw new Error('Select unique repository-relative paths within the supported roots.');
  if (selection.some((p, i) => selection.some((q, j) => i !== j && p.startsWith(q + '/'))))
    throw new Error('Selection paths must not overlap.');
  const inputs = {},
    diagnostics = [],
    changes = [];
  const read = file => {
    repairFileSafety(root, file);
    const bytes = fs.readFileSync(path.join(root, file));
    if (!Buffer.from(bytes.toString('utf8')).equals(bytes))
      throw new Error(`${file}: repair requires valid UTF-8 source.`);
    inputs[file] = hash(bytes);
    return bytes.toString('utf8');
  };
  const report = (file, code, message) =>
    diagnostics.push({ path: file, code, message, action: 'Resolve this case manually and create a fresh preview.' });
  const map = loadOwnership(root);
  if (mapProblems(map).length) throw new Error(mapProblems(map).join('\n'));
  read('.studio/ownership.json');
  const { config, directory } = readPersistedStudioConfig(root);
  read('studio.config.json');
  const { contributors, problems } = readContributors(root);
  if (problems.length) throw new Error(problems.join('\n'));
  for (const key of Object.keys(contributors)) read(`contributors/${key}.json`);
  const systems = {};
  for (const base of SYSTEM_ROOTS)
    if (fs.existsSync(path.join(root, base)))
      for (const item of fs.readdirSync(path.join(root, base), { withFileTypes: true })) {
        if (!item.isDirectory() || item.name.startsWith('.')) continue;
        const file = `${base}/${item.name}/system.ts`,
          declaration = readDeclaration(read(file));
        if ('error' in declaration) throw new Error(declaration.error);
        systems[item.name] = { ...declaration.value, dir: `${base}/${item.name}` };
      }
  const modules = discoverModuleFolders(root).map(({ id, dir }) => {
    const declaration = readDeclaration(read(`${dir}module.ts`));
    if ('error' in declaration) throw new Error(declaration.error);
    return { ...declaration.value, id, dir };
  });
  const configErrors = configProblems(
    config,
    modules,
    Object.keys(systems).filter(key => systems[key].role === 'prototype'),
    'studio',
    Object.keys(contributors),
  );
  if (configErrors.length) throw new Error(configErrors.join('\n'));
  const policy = scopePolicy({ root, systems, modules: modules.filter(m => config.modules[m.id]) });
  const api = apiEnvironmentPolicy({ root, scopeOf: policy.scopeOf });
  const resolve = dependencyResolver(root);
  const tracked = trackedFiles(root);
  // Ordinary helpers inherit their executable callers' environments, using the same entry policy as checks.
  const environments = new Map(),
    graphSeen = new Set();
  const inherit = (file, environment) => {
    if (!file.startsWith(root + path.sep) || file.includes('/node_modules/') || !fs.existsSync(file)) return;
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (!supported(relative) || relative.endsWith('.json')) return;
    const key = environment + ':' + relative;
    if (graphSeen.has(key)) return;
    graphSeen.add(key);
    let source;
    try {
      source = read(relative);
    } catch {
      return;
    } // The selected-source scan reports unsafe paths separately.
    if (!environments.has(relative)) environments.set(relative, new Set());
    environments.get(relative).add(environment);
    for (const edge of importsOf(source, file))
      if (!edge.typeOnly && edge.source) {
        const next = resolve(edge.source, file);
        if (next) inherit(next, environment);
      }
  };
  for (const file of tracked.filter(supported)) {
    const environment = api.environmentOf(path.join(root, file));
    if (environment) inherit(path.join(root, file), environment);
  }
  for (const selected of selection) {
    if (
      !tracked.some(f => f === selected || f.startsWith(selected + '/')) ||
      (fs.existsSync(path.join(root, selected)) &&
        fs.lstatSync(path.join(root, selected)).isFile() &&
        !supported(selected))
    )
      report(selected, 'unsupported-selection', 'Selection has no supported tracked source.');
  }
  const evidence = new Map();
  const knownHelper = rule => {
    if (evidence.has(rule.file)) return evidence.get(rule.file);
    let source;
    if (fs.existsSync(path.join(root, rule.file))) source = read(rule.file);
    else {
      const commits = git(root, 'log', '--first-parent', '--format=%H', '--', rule.file)
        .trim()
        .split('\n')
        .filter(Boolean);
      for (const commit of commits) {
        try {
          source = git(root, 'show', `${commit}:${rule.file}`);
          break;
        } catch {
          /* deletion commit */
        }
      }
      inputs[`history:${rule.file}`] = source === undefined ? null : hash(source);
    }
    const known = source !== undefined && hash(source) === rule.hash;
    evidence.set(rule.file, known);
    return known;
  };
  const untracked = git(root, 'ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean);
  for (const file of [...new Set([...tracked, ...untracked])]
    .filter(f => selection.some(p => f === p || f.startsWith(p + '/')))
    .sort()) {
    if (!supported(file)) continue;
    let source, stat;
    try {
      stat = repairFileSafety(root, file);
      source = read(file);
    } catch (error) {
      report(file, 'unsafe-path', error.message);
      continue;
    }
    const parsed = runtimeSourceEdits(source, file);
    // Parse failures matter only where an obsolete entry or component-generator configuration is present.
    if (!parsed.rules.length && !file.endsWith('/components.json')) continue;
    diagnostics.push(...parsed.diagnostics);
    if (!parsed.edits.length) continue;
    const start = diagnostics.length;
    if (!tracked.includes(file))
      report(file, 'untracked-target', 'Track and preserve this source before planning a repair.');
    const tier = tierOf(map, file);
    if (!['seed', 'team', 'unknown'].includes(tier))
      report(file, 'ownership-tier', 'Only seed and team source can be repaired.');
    const parts = file.split('/');
    let resource, owner;
    if (parts[1] === 'prototypes') {
      const metadata = `${parts.slice(0, 4).join('/')}/meta.json`;
      try {
        const metadataSource = read(metadata);
        jsonIdentity(metadataSource);
        const meta = JSON.parse(metadataSource);
        resourceId(meta.studioId);
        if (resourceId(meta.ownerContributorId) !== contributors[parts[2]]?.studioId)
          throw new Error('Prototype owner identity does not match its source contributor.');
        const assignment = prototypeAssignment(meta, systems);
        if (assignment.problems.length) throw new Error(assignment.problems.join('\n'));
        resource = { kind: 'prototype', owner: parts[2] };
        owner = meta.ownerContributorId;
      } catch (error) {
        report(file, 'prototype-metadata', error.message);
      }
    } else if (parts[1] === 'systems') {
      const spec = systems[parts[2]];
      if (!spec) report(file, 'system-metadata', 'System is not declared.');
      else {
        resource = { kind: 'system', id: parts[2], role: spec.role, status: spec.status };
        owner = spec.studioId;
      }
    } else {
      resource = { kind: 'module' };
      owner = parts[2];
    }
    if (!resource || !canPerform(config, actor, Object.keys(contributors), resource, 'edit'))
      report(file, 'authority', 'Current contributor cannot edit this resource.');
    if (git(root, 'status', '--porcelain', '--', file).trim())
      report(file, 'dirty-target', 'Commit or otherwise preserve changes to this repair target before replanning.');
    for (const rule of parsed.rules)
      if (!knownHelper(rule))
        report(file, 'custom-helper', `${rule.file} has custom or unavailable implementation provenance.`);
    for (const edit of parsed.edits) {
      const target =
        edit.text === '#studio/runtime' ? 'src/platform/api/runtime.ts' : 'src/platform/modules/view/lib/index.ts';
      try {
        const targetSource = read(target);
        if (edit.text === '@module/view' && (!config.modules.view || !modules.find(m => m.id === 'view')?.lib))
          throw new Error('Enable/install View explicitly before repairing this consumer.');
        const tree = ts.createSourceFile(target, targetSource, ts.ScriptTarget.Latest, true);
        const exports = new Set(
          tree.statements.flatMap(node =>
            ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)
              ? node.exportClause.elements.map(e => e.name.text)
              : node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) && ts.isVariableStatement(node)
                ? node.declarationList.declarations.map(d => d.name.getText(tree))
                : [],
          ),
        );
        if ((edit.names ?? ['cn']).some(n => !exports.has(n)))
          throw new Error('Destination does not declare all required exports.');
        const problem = policy.problem(edit.text, path.join(root, file), path.join(root, target), {
          typeOnly: edit.typeOnly,
        });
        if (problem) throw new Error(problem);
        if (!edit.typeOnly) {
          for (const environment of environments.get(file) ?? [
            api.environmentOf(path.join(root, file)) ?? 'application',
          ]) {
            const problem = api.edgeProblem(edit.text, path.join(root, file), path.join(root, target), { environment });
            if (problem) throw new Error(problem);
            const failures = api.problems(path.join(root, target), environment);
            if (failures.length) throw new Error(failures.join('\n'));
          }
        }
        // Bind every local executable dependency of the destination to the saved plan.
        const seen = new Set();
        const bind = file => {
          if (seen.has(file) || !file.startsWith(root + path.sep) || file.includes('/node_modules/')) return;
          seen.add(file);
          const rel = path.relative(root, file).split(path.sep).join('/');
          const text = read(rel);
          for (const edge of importsOf(text, file))
            if (!edge.typeOnly && edge.source) {
              const next = resolve(edge.source, file);
              if (next && fs.existsSync(next)) bind(next);
            }
        };
        bind(path.join(root, target));
      } catch (error) {
        report(file, 'destination', error.message);
      }
    }
    if (diagnostics.length !== start) continue;
    const after = patched(source, parsed.edits);
    changes.push({
      path: file,
      tier: tier === 'unknown' ? 'team' : tier,
      owner,
      beforeHash: hash(source),
      mode: stat.mode & 0o777,
      edits: parsed.edits,
      afterHash: hash(after),
      diff: unifiedDiff(file, source, after),
    });
  }
  let merging = false;
  try {
    git(root, 'rev-parse', '-q', '--verify', 'MERGE_HEAD');
    merging = true;
  } catch {
    /* no merge */
  }
  if (merging) report('', 'active-merge', 'Finish or abort the current Git merge before repair.');
  const toolFiles = tracked
    .filter(
      f =>
        f === 'package.json' ||
        f.startsWith('src/platform/node/lib/') ||
        f.startsWith('src/platform/node/cli/') ||
        f.startsWith('src/platform/core/'),
    )
    .sort();
  const toolFingerprint = hash(toolFiles.map(f => `${f}:${hash(fs.readFileSync(path.join(root, f)))}`).join('\n'));
  return {
    schemaVersion: 1,
    migrationId: 'runtime-imports-v1',
    root,
    head: git(root, 'rev-parse', 'HEAD').trim(),
    toolFingerprint,
    actorId: contributors[actor]?.studioId ?? null,
    selection: [...selection].sort(),
    inputs: Object.fromEntries(Object.entries(inputs).sort(([a], [b]) => a.localeCompare(b))),
    changes,
    diagnostics,
    applicable: diagnostics.length === 0,
  };
}

export function applyRuntimeRepair(root, actor, plan, { yes = false, beforeWrite } = {}) {
  if (!plan || plan.schemaVersion !== 1 || plan.migrationId !== 'runtime-imports-v1')
    throw new Error('Invalid repair plan schema.');
  const current = planRuntimeRepair(root, actor, plan.selection);
  if (!isDeepStrictEqual(current, plan))
    throw new Error('Repair plan is stale or was modified. Create a fresh preview.');
  if (!plan.applicable || !yes) return current;
  const changes = plan.changes.map(change => {
    const before = fs.readFileSync(path.join(current.root, change.path), 'utf8');
    return { file: path.join(current.root, change.path), before, after: patched(before, change.edits) };
  });
  applySetupChanges(changes, {
    validateFile(file) {
      repairFileSafety(current.root, path.relative(current.root, file));
    },
    beforeWrite(change, index) {
      const file = plan.changes[index].path;
      beforeWrite?.(change, index);
      const stat = repairFileSafety(current.root, file);
      if ((stat.mode & 0o777) !== plan.changes[index].mode) throw new Error(`${file}: mode changed during repair.`);
      // The complete planning input set remains unchanged apart from this operation's earlier writes.
      for (const [input, expected] of Object.entries(plan.inputs)) {
        if (input.startsWith('history:')) {
          if (fs.existsSync(path.join(current.root, input.slice(8))))
            throw new Error(`${input.slice(8)} appeared during repair. Create a fresh preview.`);
          continue;
        }
        const applied = plan.changes.slice(0, index).find(c => c.path === input);
        repairFileSafety(current.root, input);
        if (hash(fs.readFileSync(path.join(current.root, input))) !== (applied?.afterHash ?? expected))
          throw new Error(`${input} changed. Create a fresh preview.`);
      }
      if (git(current.root, 'rev-parse', 'HEAD').trim() !== plan.head) throw new Error('HEAD changed during repair.');
    },
  });
  return { ...current, applied: plan.changes.map(({ path, afterHash }) => ({ path, afterHash })) };
}
