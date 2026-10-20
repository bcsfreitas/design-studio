import type { SystemSpec } from '#studio/system';

// Endless Studios: select source key endless-studios in creation controls. Prototype metadata stores this installation’s permanent studioId.
export default {
  status: 'active',
  role: 'prototype',
  label: 'Endless Studios',
  themeClass: 'endless-studios-theme',
  styling: 'tailwind',
  colorModes: ['light'],
  docs: 'warn',
  libraries: [
    {
      kind: 'package',
      id: 'vue',
      label: 'Vue',
      package: 'vue',
      description: 'Renders the Endless Studios screens, mounted in a shadow root by VueScreen',
      entry: 'libraries/vue.tsx',
      docs: 'https://vuejs.org/guide/introduction.html',
    },
    {
      kind: 'package',
      id: 'nuxt-ui',
      label: 'Nuxt UI',
      package: '@nuxt/ui',
      description: 'The Endless Studios frontend component library, with its app.config customization',
      docs: 'https://ui.nuxt.com/docs/getting-started/installation/vue',
      components: ['button', 'card'],
    },
    {
      kind: 'package',
      id: 'lucide',
      label: 'Lucide',
      package: '@iconify-json/lucide',
      description: 'Icon catalog, used as i-lucide-* names',
      docs: 'https://lucide.dev/icons/',
    },
  ],
  origin: null,
  studioId: "8x5spen6xtvp96a9",
} satisfies SystemSpec;
