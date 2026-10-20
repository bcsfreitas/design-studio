import styles from '../styles/studios.shadow.css?inline';

declare global {
  var __studioVueStyles: Map<string, string> | undefined;
}

export const sheet = new CSSStyleSheet();
let base = styles;

// Custom properties registered with @property only take effect from the document, never from a shadow root.
function registerProperties() {
  const properties = base.match(/@property[^{]+\{[^}]*\}/g) ?? [];
  document.head.querySelector('style[data-vue-system="endless-studios"]')?.remove();
  const registrations = document.createElement('style');
  registrations.dataset.vueSystem = 'endless-studios';
  registrations.textContent = properties.join('\n');
  document.head.append(registrations);
}

// Nuxt UI writes its colour scales to a <style id="nuxt-ui-colors"> in the document head. They refer to the
// app's palettes (--color-cornflower-500...), which exist only in the shadow root, so the rules must apply there.
let colors = '';

export function refreshSheet() {
  colors = document.getElementById('nuxt-ui-colors')?.textContent ?? colors;
  const components = [...(globalThis.__studioVueStyles?.values() ?? [])];
  sheet.replaceSync([base, colors, ...components].join('\n'));
}

registerProperties();
refreshSheet();
globalThis.addEventListener('studio-vue-styles', refreshSheet);
new MutationObserver(() => {
  if ((document.getElementById('nuxt-ui-colors')?.textContent ?? colors) !== colors) refreshSheet();
}).observe(document.head, { childList: true, subtree: true, characterData: true });

// Tailwind rebuilds this stylesheet whenever a scanned SFC changes; swapping it in place keeps the mounted
// Vue apps, and their state, instead of re-running the modules that mount them.
if (import.meta.hot)
  import.meta.hot.accept('../styles/studios.shadow.css?inline', module => {
    if (!module) return;
    base = module.default;
    registerProperties();
    refreshSheet();
  });
