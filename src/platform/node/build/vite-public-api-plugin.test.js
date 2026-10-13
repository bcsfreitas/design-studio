import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createServer } from 'vite';
import publicApi from './vite-public-api-plugin.js';
import importGuard from './vite-import-guard-plugin.js';
import { API_ENTRIES } from '../../core/modules/boundaries.ts';

test('development resolves public runtime imports inside a system workspace without hiding private imports', async t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-runtime-system-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  };
  write('package.json', JSON.stringify({ type: 'module', imports: { '#studio/*': './src/platform/api/*.ts' } }));
  write(
    'tsconfig.app.json',
    JSON.stringify({
      compilerOptions: {
        moduleResolution: 'bundler',
        paths: {
          '@/*': ['./src/*'],
          '#studio/*': ['./src/platform/api/*.ts'],
        },
      },
    }),
  );
  write('src/systems/product/package.json', JSON.stringify({ name: '@studio-system/probe', type: 'module' }));
  for (const entry of API_ENTRIES) write(`src/platform/api/${entry}.ts`, 'export {};');
  write('src/platform/api/runtime.ts', 'export const cn = (...args: string[]) => args.join(" ");');
  const file = 'src/systems/product/components/button.tsx';
  write(file, "import {cn} from '#studio/runtime'; export const classes = cn('button');");
  const server = await createServer({
    configFile: false,
    root: path.join(root, 'src'),
    server: { middlewareMode: true, hmr: false, watch: null },
    resolve: { alias: { '@': path.join(root, 'src') } },
    plugins: [
      importGuard({ root, systems: { product: { dir: 'src/systems/product' } }, modules: [] }),
      publicApi({ root }),
    ],
  });
  t.after(() => server.close());
  const transformed = await server.transformRequest('/systems/product/components/button.tsx');
  assert.match(transformed.code, /\/platform\/api\/runtime\.ts/);
  write(
    'src/systems/product/components/private.tsx',
    "import {cn} from '@/platform/api/runtime'; export const value=cn('private');",
  );
  await assert.rejects(server.transformRequest('/systems/product/components/private.tsx'), /public API/);
});
