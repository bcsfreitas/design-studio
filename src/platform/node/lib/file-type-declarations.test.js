import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileTypeDeclarationProblems } from './file-type-declarations.js';

test('file declarations permit own Node-safe adapters and reject transitive browser or private dependencies', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-type-graph-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, source) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), source);
  };
  const directory = path.join(root, 'src/modules/probe');
  write(
    'tsconfig.app.json',
    JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '#studio/*': ['src/platform/api/*.ts'] } } }),
  );
  write('src/platform/api/files.ts', 'export const jsonIdentityMetadata = {};');
  write('src/modules/probe/type.ts', "import {identity} from './identity';export default identity;");
  write('src/modules/probe/identity.ts', "export {jsonIdentityMetadata as identity} from '#studio/files';");
  assert.deepEqual(fileTypeDeclarationProblems(root, directory), []);
  write('src/modules/probe/identity.ts', "import './nested';export const identity={};");
  for (const source of [
    "import {createElement} from 'react';",
    'export const value=window.location;',
    "export {secret} from '../../../platform/private';",
  ]) {
    write('src/modules/probe/nested.ts', source);
    write('src/platform/private.ts', 'export const secret=1;');
    assert.ok(fileTypeDeclarationProblems(root, directory).length, source);
  }
  write('src/modules/probe/type.ts', "export * from '../../../platform/private';");
  assert.match(fileTypeDeclarationProblems(root, directory).join('\n'), /Node-safe local helpers|public API/);
});
