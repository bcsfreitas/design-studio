import type { ModuleBuild } from '#studio/module';
export default {
  assets: {
    props: {
      watch: [
        'src/systems/**',
        'src/platform/systems/**',
        'src/platform/api/**',
        'src/platform/core/**',
        'tsconfig*.json',
        'package.json',
        'pnpm-lock.yaml',
      ],
      load: async ({ root }) => (await import('./node/props.js')).componentProps(root),
    },
  },
} satisfies ModuleBuild;
