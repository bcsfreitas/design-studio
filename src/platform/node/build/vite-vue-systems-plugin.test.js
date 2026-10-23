import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import vueSystems from './vite-vue-systems-plugin.js';

// The temporary studio has no node_modules, so packages resolve from this repository.
const resolve = createRequire(import.meta.url).resolve;
const tailwind = resolve('tailwindcss/index.css').split(path.sep).join('/');
const stylesheet = '/src/systems/fixture/styles/studios.shadow.css?inline';
const vue = template => `<template>${template}</template>\n`;

// A studio with one Vue system whose shadow-root stylesheet scans prototype and system SFCs, as Endless Studios does.
function studio() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-vue-styles-'));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
    return path.join(root, file);
  };
  write(
    'src/systems/fixture/styles/studios.shadow.css',
    `@import '${tailwind}' source(none);\n@source '../../../prototypes/**/*.vue';\n@source '../components';\n`,
  );
  // The stylesheet's importer accepts it, as the system's shadow-styles module does.
  write(
    'src/systems/fixture/styles/sheet.js',
    "import styles from './studios.shadow.css?inline';\nexport let sheet = styles;\nimport.meta.hot?.accept('./studios.shadow.css?inline', module => (sheet = module.default));\n",
  );
  write('src/systems/fixture/components/Badge.vue', vue('<span class="tracking-tight">Badge</span>'));
  write('src/prototypes/pat/demo/Screen.vue', vue('<main class="grid">Screen</main>'));
  write('src/prototypes/pat/demo/Mounted.vue', vue('<main class="flex">Mounted</main>'));
  return { root, write };
}

const settle = () => new Promise(resolve => setTimeout(resolve, 50));

test('created, edited and deleted Vue sources update the shadow-root stylesheet without a full reload', async t => {
  const { root, write } = studio();
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    resolve: { alias: { vue: path.dirname(resolve('vue/package.json')) } },
    plugins: [...(await vueSystems({ root, systems: ['fixture'] })), tailwindcss()],
    server: { middlewareMode: true, ws: false, watch: null },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true },
  });
  t.after(async () => {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const messages = [];
  t.mock.method(server.environments.client.hot, 'send', message => messages.push(message));
  const css = async () => (await server.transformRequest(stylesheet)).code;
  await server.transformRequest('/src/systems/fixture/styles/sheet.js');
  // A screen that a mounted view imports is compiled by the Vue plugin, which also handles its updates.
  await server.transformRequest('/src/prototypes/pat/demo/Mounted.vue');
  const before = await css();
  for (const rule of [/\.grid\b/, /\.flex\b/, /\.tracking-tight\b/]) assert.match(before, rule);
  assert.doesNotMatch(before, /\.columns-7\b/);

  const updated = async (event, file) => {
    messages.length = 0;
    server.watcher.emit(event, file);
    await settle();
    const report = `${event} ${path.relative(root, file)}: ${JSON.stringify(messages)}`;
    const updates = messages.filter(message => message.type === 'update').flatMap(message => message.updates);
    assert.ok(
      updates.some(update => update.acceptedPath === stylesheet),
      report,
    );
    assert.ok(!messages.some(message => message.type === 'full-reload'), report);
  };
  for (const [event, file, template, rule] of [
    ['add', 'src/prototypes/pat/demo/Created.vue', '<p class="columns-7">New</p>', /\.columns-7\b/],
    ['change', 'src/prototypes/pat/demo/Screen.vue', '<main class="grid gap-13">Screen</main>', /\.gap-13\b/],
    ['change', 'src/prototypes/pat/demo/Mounted.vue', '<main class="flex skew-x-6">Mounted</main>', /\.skew-x-6\b/],
    ['add', 'src/systems/fixture/components/Chip.vue', '<b class="indent-9">Chip</b>', /\.indent-9\b/],
  ]) {
    await updated(event, write(file, vue(template)));
    assert.match(await css(), rule);
  }

  const created = path.join(root, 'src/prototypes/pat/demo/Created.vue');
  fs.rmSync(created);
  await updated('unlink', created);
});
