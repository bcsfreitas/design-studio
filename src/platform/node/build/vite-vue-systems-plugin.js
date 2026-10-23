import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vue from '@vitejs/plugin-vue';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
// Vite ids and generated imports use forward slashes, including on Windows.
const posix = file => file.split(path.sep).join('/');
const STYLE_IMPORT = /import\s+(["'])([^"']+\.vue\?vue&type=style&[^"']*?)(&lang\.[a-z]+)\1;?/g;

// A shadow root never sees the document's <style> elements, so each SFC style block becomes a string that
// VueScreen adopts into the shadow roots it mounts.
function shadowStyles() {
  return {
    name: 'studio-vue-shadow-styles',
    transform(code, id) {
      if (!/\.vue$/.test(id) || !code.includes('type=style')) return null;
      let index = 0;
      const registrations = [];
      const next = code.replace(STYLE_IMPORT, (_, quote, request, lang) => {
        const name = `__studioVueStyle${index++}`;
        registrations.push(name);
        return `import ${name} from ${quote}${request}&inline${lang}${quote};`;
      });
      if (!registrations.length) return null;
      const key = JSON.stringify(id);
      // The leading semicolon stops a compiled `export default _export_sfc(...)` without one from calling it.
      const register = `;(globalThis.__studioVueStyles ??= new Map()).set(${key}, [${registrations.join(', ')}].join('\\n'));\nglobalThis.dispatchEvent?.(new Event('studio-vue-styles'));\n`;
      return { code: `${next}\n${register}`, map: null };
    },
  };
}

// Tailwind watches only the SFCs it has already scanned, so a new, deleted or edited one would leave the
// shadow-root stylesheet stale. Its importer accepts the stylesheet, so the update swaps it without a reload.
function shadowStylesheet(root, id) {
  const system = posix(path.join(root, 'src/systems', id)) + '/';
  const prototypes = posix(path.join(root, 'src/prototypes')) + '/';
  return {
    name: `studio-vue-stylesheet:${id}`,
    apply: 'serve',
    // Before Tailwind, which reloads the page for a scanned file that no module imports.
    enforce: 'pre',
    hotUpdate({ file, modules }) {
      file = posix(file);
      if (!file.endsWith('.vue') || file.includes('/node_modules/')) return;
      if (!file.startsWith(prototypes) && !file.startsWith(system)) return;
      const sheets = [...this.environment.moduleGraph.idToModuleMap.values()].filter(
        module => module.file?.endsWith('.shadow.css') && posix(module.file).startsWith(`${system}styles/`),
      );
      if (sheets.length) return [...modules, ...sheets.filter(sheet => !modules.includes(sheet))];
    },
  };
}

// Nuxt UI's resolver writes node_modules file paths, which Studio's import guard refuses, so components are
// imported by package name instead. In a plain Vue app, UIcon and ULink come from the Vue overrides.
function packageComponent(dir) {
  const runtime = path.join(dir, 'node_modules/@nuxt/ui/dist/runtime');
  const overrides = { Icon: 'vue/components/Icon.vue', Link: 'vue/overrides/none/Link.vue' };
  return name => {
    if (!name.startsWith('U')) return;
    const component = name.slice(1);
    if (overrides[component]) return { name: 'default', from: `@nuxt/ui/runtime/${overrides[component]}` };
    if (fs.existsSync(path.join(runtime, 'components', `${component}.vue`)))
      return { name: 'default', from: `@nuxt/ui/components/${component}.vue` };
  };
}

// Systems that render Vue: compiled by @vitejs/plugin-vue, with Nuxt UI wired as in a plain Vue + Vite app.
// Nuxt UI's own Tailwind instance is dropped, because Studio already runs one for every stylesheet.
export default async function vueSystems({ root = ROOT, systems = ['endless-studios'] } = {}) {
  const plugins = [vue({ include: /\.vue$/ }), shadowStyles()];
  for (const id of systems) {
    const dir = path.join(root, 'src/systems', id);
    plugins.push(shadowStylesheet(root, id));
    const unplugin = path.join(dir, 'node_modules/@nuxt/ui/dist/unplugin.mjs');
    if (!fs.existsSync(unplugin)) continue;
    const { NuxtUIPlugin } = await import(pathToFileURL(unplugin).href);
    const configFile = path.join(dir, 'nuxt-ui.config.ts');
    const ui = fs.existsSync(configFile) ? (await import(pathToFileURL(configFile).href)).default : {};
    const sources = posix(path.join(dir, 'studios'));
    const prototypes = posix(path.join(root, 'src/prototypes'));
    // A system may name its own shim imports and exact-match aliases (paths relative to the system).
    const runtimeFile = path.join(dir, 'vue-runtime.config.ts');
    const runtime = fs.existsSync(runtimeFile) ? (await import(pathToFileURL(runtimeFile).href)).default : {};
    const shims = runtime.imports ?? ['useRouter', 'useRoute', 'navigateTo'];
    const aliases = Object.entries(runtime.aliases ?? {}).map(([name, target]) => ({
      find: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      replacement: posix(path.resolve(dir, target)),
    }));
    plugins.push({
      name: `studio-vue-sources:${id}`,
      enforce: 'pre',
      // Exact aliases come first, because some of them also start with `~/`.
      config: () => ({ resolve: { alias: [...aliases, { find: /^~\//, replacement: `${sources}/` }] } }),
      // Prototype SFCs reach Nuxt UI from the system's workspace, the way their .tsx views reach its libraries.
      resolveId(source, importer, options) {
        if (!importer || !source.startsWith('@nuxt/ui/')) return null;
        const file = posix(importer.split('?')[0]);
        if (!file.endsWith('.vue') || !file.startsWith(prototypes)) return null;
        return this.resolve(source, path.join(dir, 'package.json'), { ...options, skipSelf: true });
      },
    });
    const nuxtUi = [
      NuxtUIPlugin.vite({
        router: false,
        colorMode: false,
        dts: false,
        autoImport: {
          dts: false,
          include: [/\.vue$/, /\.vue\?vue/],
          imports: ['vue', { from: `${sources}/nuxt-shims.ts`, imports: shims }],
        },
        components: { dts: false, resolvers: [packageComponent(dir)] },
        theme: { colors: ['primary', 'secondary', 'kids', 'info', 'success', 'warning', 'error', 'neutral'] },
        ui,
      }),
    ].flat(Infinity);
    for (const plugin of nuxtUi) {
      if (plugin?.name?.startsWith('@tailwindcss/vite')) continue;
      // Generated theme files go to the repository's node_modules, outside the sources Studio verifies.
      if (plugin?.name === 'nuxt:ui:templates') {
        const writeTemplates = plugin.config;
        plugin.config = config => writeTemplates.call(plugin, { ...config, root });
      }
      plugins.push(plugin);
    }
  }
  return plugins;
}
