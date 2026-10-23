import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inspectBuild, inspectVueStyles } from './inspect-build.js';

test('startup measurement follows static dependencies once and validates lazy references without counting them', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-output-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.vite'));
  const manifest = {
    'index.html': { isEntry: true, file: 'app.js', css: ['app.css'], imports: ['shared'], dynamicImports: ['lazy'] },
    shared: { file: 'shared.js', imports: ['cycle'] },
    cycle: { file: 'cycle.js', imports: ['shared'] },
    lazy: { file: 'lazy.js' },
  };
  for (const file of ['app.js', 'app.css', 'shared.js', 'cycle.js', 'lazy.js'])
    fs.writeFileSync(path.join(root, file), '12345');
  fs.writeFileSync(path.join(root, '.vite/manifest.json'), JSON.stringify(manifest));
  const result = inspectBuild(root);
  assert.equal(result.requests, 4);
  assert.equal(result.bytes, 20);
  assert.ok(!result.assets.some(asset => asset.file === 'lazy.js'));
  fs.rmSync(path.join(root, 'lazy.js'));
  assert.throws(() => inspectBuild(root), /ENOENT/);
  manifest.lazy.file = '../outside.js';
  fs.writeFileSync(path.join(root, '.vite/manifest.json'), JSON.stringify(manifest));
  assert.throws(() => inspectBuild(root), /escapes output/);
});

test('prototype Vue classes must have rules in the shadow-root stylesheet inlined into the Vue systems chunk', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-output-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dist = path.join(root, 'dist'),
    prototypes = path.join(root, 'prototypes');
  fs.mkdirSync(path.join(dist, '.vite'), { recursive: true });
  fs.mkdirSync(path.join(prototypes, 'pat/demo/_vue'), { recursive: true });
  assert.deepEqual(inspectVueStyles(dist, prototypes), { files: 0, classes: 0 });
  const manifest = { 'index.html': { isEntry: true, file: 'app.js' }, vue: { file: 'vue.js' } };
  fs.writeFileSync(path.join(dist, '.vite/manifest.json'), JSON.stringify(manifest));
  fs.writeFileSync(path.join(dist, 'app.js'), 'const studio = `/*! tailwindcss */\n.columns-7{columns:7}`;');
  fs.writeFileSync(path.join(dist, 'vue.js'), 'export {};');
  const screen = path.join(prototypes, 'pat/demo/_vue/Screen.vue');
  const write = classes =>
    fs.writeFileSync(
      screen,
      `<template><main class="${classes} group" :class="bound"><p class='own'>Hi</p></main></template>\n<style scoped>.own{color:red}</style>\n`,
    );
  write('flex md:grid w-1/2 2xl:p-1');
  assert.throws(() => inspectVueStyles(dist, prototypes), /no shadow-root stylesheet/);
  // As emitted: a template literal, so each backslash of a CSS escape is doubled.
  const sheet = String.raw`/*! tailwindcss */\n.flex{display:flex}.md\\:grid{display:grid}.w-1\\/2{width:50%}.\\32 xl\\:p-1{}`;
  fs.writeFileSync(path.join(dist, 'vue.js'), `const sheet = \`${sheet}\`; addEventListener('studio-vue-styles', f);`);
  assert.deepEqual(inspectVueStyles(dist, prototypes), { files: 1, classes: 4 });
  // Studio's own stylesheet does not count, and a prefix of a longer class is not a match.
  write('flex columns-7 md:grid-cols-2 fle');
  assert.throws(
    () => inspectVueStyles(dist, prototypes),
    error =>
      /pat\/demo\/_vue\/Screen\.vue: columns-7/.test(error.message) &&
      /Screen\.vue: md:grid-cols-2/.test(error.message) &&
      /Screen\.vue: fle$/m.test(error.message) &&
      !/: flex$/m.test(error.message),
  );
});
