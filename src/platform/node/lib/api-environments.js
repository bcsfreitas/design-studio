// Executable dependency graphs for public APIs and their consumers. Both pnpm check and Vite use this
// service through scopePolicy. Type-only edges are erased; literal imports, re-exports and require share
// the existing AST resolver. npm implementations are checked by their own package/runtime contracts.
import fs from 'node:fs';
import path from 'node:path';
import { isBuiltin } from 'node:module';
import ts from 'typescript';
import {
  API_ENTRIES,
  API_FOLDER,
  API_POLICY,
  apiEntryOf,
  apiEnvironmentProblem,
  isTeamCode,
  platformImportProblem,
} from '../../core/modules/boundaries.ts';
import { moduleIdOfPath, systemIdOfPath } from '../../core/roots.ts';
import { dependencyResolver, importsOf, inside, realFile } from './imports.js';

const BROWSER_GLOBALS = new Set([
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'HTMLElement',
  'MutationObserver',
  'ResizeObserver',
  'DOMParser',
]);

function browserFeatures(code, file) {
  const tree = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  // A file-local checker distinguishes an actual browser global from a parameter/local declaration.
  const host = ts.createCompilerHost({});
  host.getSourceFile = name => (name === file ? tree : undefined);
  const checker = ts.createProgram([file], { noLib: true, noResolve: true, allowJs: true }, host).getTypeChecker();
  const features = new Set();
  const visit = node => {
    if (ts.isTypeNode(node) || ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isMetaProperty(node.expression) &&
      ['env', 'hot', 'glob'].includes(node.name.text)
    )
      features.add(`import.meta.${node.name.text}`);
    if (
      ts.isElementAccessExpression(node) &&
      ts.isMetaProperty(node.expression) &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      ['env', 'hot', 'glob'].includes(node.argumentExpression.text)
    )
      features.add(`import.meta.${node.argumentExpression.text}`);
    if (
      (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'globalThis' &&
      !checker.getSymbolAtLocation(node.expression)?.declarations?.length
    ) {
      const name = ts.isPropertyAccessExpression(node)
        ? node.name.text
        : ts.isStringLiteralLike(node.argumentExpression)
          ? node.argumentExpression.text
          : undefined;
      if (BROWSER_GLOBALS.has(name)) features.add(`globalThis.${name}`);
    }
    if (
      ts.isIdentifier(node) &&
      BROWSER_GLOBALS.has(node.text) &&
      !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node) &&
      !((ts.isPropertyAssignment(node.parent) || ts.isMethodDeclaration(node.parent)) && node.parent.name === node) &&
      !(ts.isShorthandPropertyAssignment(node.parent)
        ? checker.getShorthandAssignmentValueSymbol(node.parent)
        : checker.getSymbolAtLocation(node))
    )
      features.add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return [...features];
}

export function apiEnvironmentPolicy({ root, scopeOf, resolve = dependencyResolver(root) }) {
  root = realFile(root);
  const relative = file => path.relative(root, realFile(file)).split(path.sep).join('/');
  const environmentOf = file => {
    const rel = relative(file);
    const entry = apiEntryOf(rel);
    if (entry && API_POLICY[entry].length === 1 && API_POLICY[entry][0] === 'node') return 'node';
    if (scopeOf(file)) return 'runtime';
    const moduleFile = /^src\/(?:platform\/)?modules\/[^/]+\/(.*)$/.exec(rel)?.[1];
    if (
      (moduleFile && /^(?:node\/|(?:module|type|server|check|build|references|cli)\.[cm]?[jt]s$)/.test(moduleFile)) ||
      (systemIdOfPath(rel) !== undefined && /\/system\.ts$/.test(rel)) ||
      rel.startsWith('src/platform/node/')
    )
      return 'node';
    // Ordinary module helpers inherit the environment of an executable entry. A .ts helper can serve
    // a server without becoming application code merely because it is outside node/.
    if (moduleIdOfPath(rel) !== undefined && !/\/(?:app|open)\.[jt]sx$|\/loader\.[jt]s$|\.[jt]sx$/.test(rel))
      return undefined;
    return 'application';
  };
  const edgeProblem = (source, importer, target, options = {}) => {
    const { typeOnly = false, environment = environmentOf(importer) } = options;
    const rel = relative(importer);
    const destination = target && relative(target);
    const owner = options.publicImporter && !rel.startsWith('src/platform/') ? options.publicImporter : rel;
    const privateProblem = destination && platformImportProblem(owner, destination, source);
    if (privateProblem) return privateProblem;
    if (typeOnly) return null;
    if (!environment) return null;
    const entry = destination && apiEntryOf(destination);
    if (
      entry &&
      (options.environment ||
        isTeamCode(rel) ||
        scopeOf(importer) ||
        apiEntryOf(rel) ||
        moduleIdOfPath(rel) !== undefined)
    )
      return apiEnvironmentProblem(entry, environment);
    // Supplied implementations may share internals. Enforce their environment when reached from a public
    // graph, rather than imposing a new global ownership restriction on existing platform tooling/tests.
    if (!options.environment && !isTeamCode(rel) && !scopeOf(importer) && !apiEntryOf(rel)) return null;
    if ((environment === 'application' || environment === 'runtime') && isBuiltin(source ?? ''))
      return `${source} is Node-only and cannot execute in ${environment}.`;
    if (
      environment === 'node' &&
      (source === 'react' || source?.startsWith('react/') || source === 'react-dom' || source?.startsWith('react-dom/'))
    )
      return `${source} is a renderer dependency and cannot execute in a Node entry.`;
    if (!destination) return null;
    if (environment !== 'node' && destination.startsWith('src/platform/node/'))
      return `${destination} is Node-only and cannot execute in ${environment}.`;
    if (environment === 'node' && (destination.startsWith('src/platform/app/') || /\.[jt]sx$/.test(destination)))
      return `${destination} is browser code and cannot execute in a Node entry.`;
    if (
      environment === 'runtime' &&
      (destination.startsWith('src/platform/app/') || destination.startsWith('src/platform/systems/studio/'))
    )
      return `${destination} belongs to the Studio application and cannot execute in prototype runtime.`;
    return null;
  };
  const problems = (entry, environment = environmentOf(entry)) => {
    if (!environment) return [];
    const seen = new Set();
    const failures = [];
    const visit = (file, chain) => {
      file = realFile(file);
      if (seen.has(file) || !inside(file, root) || file.split(path.sep).includes('node_modules')) return;
      seen.add(file);
      if (!fs.existsSync(file) || !/\.[cm]?[jt]sx?$/.test(file)) return;
      const code = fs.readFileSync(file, 'utf8');
      const report = message => failures.push(`${chain.join(' -> ')}: ${message}`);
      if (environment === 'node')
        for (const feature of browserFeatures(code, file))
          report(`${feature} requires a browser in a Node dependency graph.`);
      for (const { source, typeOnly } of importsOf(code, file)) {
        if (typeOnly) continue;
        if (source === null) {
          // The supplied application owns compiled glob loaders; Node and runtime contracts cannot use them.
          if (environment !== 'application' || isTeamCode(relative(file)))
            report('Computed imports cannot be checked; use literal import paths.');
          continue;
        }
        const target = resolve(source, file);
        const problem = edgeProblem(source, file, target, {
          environment,
          publicImporter: isTeamCode(relative(entry)) ? relative(entry) : undefined,
        });
        if (problem) report(problem);
        else if (target) visit(target, [...chain, relative(target)]);
        else if (/^(?:\.|@\/|#studio\/)/.test(source)) report(`Cannot resolve executable dependency ${source}.`);
      }
    };
    visit(entry, [relative(entry)]);
    return failures;
  };
  const computedImportProblem = file =>
    scopeOf(file) ||
    isTeamCode(relative(file)) ||
    (moduleIdOfPath(relative(file)) !== undefined && environmentOf(file) === 'application')
      ? `${relative(file)}: computed imports cannot be checked; use literal import paths.`
      : null;
  return {
    environmentOf,
    edgeProblem,
    problems,
    computedImportProblem,
    entryProblems: (entries = API_ENTRIES) =>
      entries.flatMap(entry =>
        API_POLICY[entry].flatMap(environment => problems(path.join(root, API_FOLDER, `${entry}.ts`), environment)),
      ),
  };
}
