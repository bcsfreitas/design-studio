import fs from 'node:fs';
import path from 'node:path';
import { dependencyResolver, importsOf, inside, realFile } from './imports.js';
import { apiEnvironmentPolicy } from './api-environments.js';

// Direct declarations use the public API and their own helpers. The shared graph policy validates every executable edge in Node.
export function fileTypeDeclarationProblems(root, directory, scopeOf = () => null) {
  root = realFile(root);
  directory = realFile(directory);
  const file = path.join(directory, 'type.ts'),
    resolve = dependencyResolver(root);
  const where = path.relative(root, file),
    problems = [];
  for (const { source } of importsOf(fs.readFileSync(file, 'utf8'), file)) {
    const target = source && resolve(source, file);
    if (source !== '#studio/files' && !(source?.startsWith('.') && target && inside(target, directory)))
      problems.push(
        `${where} imports ${JSON.stringify(source)}. A type.ts uses #studio/files and Node-safe local helpers only.`,
      );
  }
  return [...problems, ...apiEnvironmentPolicy({ root, scopeOf, resolve }).problems(file, 'node')];
}
