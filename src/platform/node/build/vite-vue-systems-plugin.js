import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vue from '@vitejs/plugin-vue';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
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
      const register = `(globalThis.__studioVueStyles ??= new Map()).set(${key}, [${registrations.join(', ')}].join('\\n'));\nglobalThis.dispatchEvent?.(new Event('studio-vue-styles'));\n`;
      return { code: `${next}\n${register}`, map: null };
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
    const unplugin = path.join(dir, 'node_modules/@nuxt/ui/dist/unplugin.mjs');
    if (!fs.existsSync(unplugin)) continue;
    const { NuxtUIPlugin } = await import(pathToFileURL(unplugin).href);
    const configFile = path.join(dir, 'nuxt-ui.config.ts');
    const ui = fs.existsSync(configFile) ? (await import(pathToFileURL(configFile).href)).default : {};
    const sources = path.join(dir, 'studios');
    const prototypes = path.join(root, 'src/prototypes');
    plugins.push({
      name: `studio-vue-sources:${id}`,
      enforce: 'pre',
      config: () => ({ resolve: { alias: [{ find: /^~\//, replacement: `${sources}/` }] } }),
      // Prototype SFCs reach Nuxt UI from the system's workspace, the way their .tsx views reach its libraries.
      resolveId(source, importer, options) {
        if (!importer || !source.startsWith('@nuxt/ui/')) return null;
        const file = importer.split('?')[0];
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
          imports: [
            'vue',
            { from: path.join(sources, 'nuxt-shims.ts'), imports: ['useRouter', 'useRoute', 'navigateTo'] },
          ],
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
