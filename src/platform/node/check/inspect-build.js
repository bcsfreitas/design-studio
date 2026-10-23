// Inspect static startup dependencies without downloading a browser or contacting a host.
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

export function inspectBuild(directory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, '.vite/manifest.json'), 'utf8'));
  const entry = Object.keys(manifest).find(key => manifest[key].isEntry && key.endsWith('index.html'));
  if (!entry) throw new Error('The production manifest has no HTML entry.');
  const initial = new Set();
  const visited = new Set();
  const read = file => {
    const absolute = path.resolve(directory, file);
    if (!absolute.startsWith(path.resolve(directory) + path.sep))
      throw new Error(`Build asset escapes output: ${file}`);
    return fs.readFileSync(absolute);
  };
  // Validate every emitted reference, including lazy chunks, without loading them at startup.
  for (const item of Object.values(manifest)) {
    for (const file of [item.file, ...(item.css || []), ...(item.assets || [])]) read(file);
    for (const key of [...(item.imports || []), ...(item.dynamicImports || [])]) {
      if (!manifest[key]) throw new Error(`Missing build dependency: ${key}`);
    }
  }
  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const item = manifest[key];
    initial.add(item.file);
    for (const file of item.css || []) initial.add(file);
    for (const dependency of item.imports || []) visit(dependency);
  }
  visit(entry);
  const assets = [...initial].map(file => ({ file, bytes: read(file).length, gzipBytes: gzipSync(read(file)).length }));
  return {
    requests: assets.length,
    bytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
    gzipBytes: assets.reduce((sum, asset) => sum + asset.gzipBytes, 0),
    assets,
  };
}

const TAILWIND_BANNER = '/*! tailwindcss';
// Marker classes for group and peer variants produce no rule of their own.
const MARKER = /^(?:group|peer)(?:\/[\w-]+)?$/;

function vueFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : vueFiles(file);
    return entry.name.endsWith('.vue') ? [file] : [];
  });
}

// Static class attributes in the template; bound classes and classes the SFC styles itself are left out.
function templateClasses(source) {
  const styles = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]).join('\n');
  const template = source.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, '');
  const classes = [...template.matchAll(/(?<![\w:@.-])class=(["'])(.*?)\1/gs)].flatMap(match => match[2].split(/\s+/));
  return [...new Set(classes)].filter(
    name => name && !MARKER.test(name) && !/[{}$<>]/.test(name) && !styles.includes(`.${name}`),
  );
}

// The selector Tailwind writes for a class: CSS identifiers escape other characters and a leading digit.
function selector(name) {
  const escaped = name.replace(/[^\w-]/g, '\\$&');
  return '.' + (/^\d/.test(escaped) ? `\\3${escaped[0]} ${escaped.slice(1)}` : escaped);
}

// A stylesheet imported with ?inline is emitted as a JavaScript string literal.
function inlineStylesheets(code) {
  const sheets = [];
  for (let start = code.indexOf(TAILWIND_BANNER); start > 0; start = code.indexOf(TAILWIND_BANNER, start + 1)) {
    const quote = code[start - 1];
    if (!['`', '"', "'"].includes(quote)) continue;
    let end = start;
    while (end < code.length && code[end] !== quote) end += code[end] === '\\' ? 2 : 1;
    sheets.push(code.slice(start, end).replace(/\\(.)/gs, (_, character) => (character === 'n' ? '\n' : character)));
  }
  return sheets;
}

// Vue screens render in a shadow root whose stylesheet, compiled from the same Tailwind sources, ships inside the
// Vue systems' script chunk. Every class a prototype Vue screen uses must have a rule there.
export function inspectVueStyles(directory, prototypes) {
  const files = vueFiles(prototypes);
  if (!files.length) return { files: 0, classes: 0 };
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, '.vite/manifest.json'), 'utf8'));
  const css = [...new Set(Object.values(manifest).map(item => item.file))]
    .filter(file => file.endsWith('.js'))
    .map(file => fs.readFileSync(path.join(directory, file), 'utf8'))
    .filter(code => code.includes('studio-vue-styles'))
    .flatMap(inlineStylesheets)
    .join('\n');
  if (!css) throw new Error('Prototype Vue screens exist, but the build emitted no shadow-root stylesheet.');
  const present = name => {
    const target = selector(name);
    for (let index = css.indexOf(target); index >= 0; index = css.indexOf(target, index + 1))
      if (!/[\w\\-]/.test(css[index + target.length] ?? '')) return true;
    return false;
  };
  const missing = [];
  let classes = 0;
  for (const file of files) {
    for (const name of templateClasses(fs.readFileSync(file, 'utf8'))) {
      classes++;
      if (!present(name)) missing.push(`${path.relative(prototypes, file).split(path.sep).join('/')}: ${name}`);
    }
  }
  if (missing.length)
    throw new Error(`The shadow-root stylesheet is missing prototype Vue classes:\n  ${missing.join('\n  ')}`);
  return { files: files.length, classes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const directory = path.resolve(process.argv[2] || 'dist');
  const result = inspectBuild(directory);
  console.log(
    `Initial JavaScript/CSS: ${result.requests} files, ${(result.bytes / 1024).toFixed(1)} KiB raw, ${(result.gzipBytes / 1024).toFixed(1)} KiB gzip. All manifest references exist.`,
  );
  const vue = inspectVueStyles(directory, path.resolve('src/prototypes'));
  if (vue.files)
    console.log(
      `Prototype Vue screens: ${vue.classes} classes in ${vue.files} files, all in the shadow-root stylesheet.`,
    );
}
