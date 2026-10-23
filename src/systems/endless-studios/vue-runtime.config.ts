// What the Vue systems build provides to this system's .vue files beyond Nuxt UI: names auto-imported from
// studios/nuxt-shims.ts, as Nuxt auto-imports them in the app, and bare modules answered by stand-ins (paths relative
// to this folder). Copied app sources stay unchanged; these entries are how their imports reach the stand-ins.

// A template's `src="~/assets/..."` compiles to an import of `assets/...`, which Nuxt answers with its `assets`
// alias. Aliases here match whole specifiers, so each image a copied template names is listed. Script imports such
// as `import logo from '~/assets/...'` resolve through `~/` and need no entry.
const templateAssets = [
  'images/Icons/trash-icon.svg',
  'images/logo-endless-navbar.svg',
  'images/logo-endless-studios-orange.svg',
  'images/logo-endless.svg',
];

export default {
  imports: ['useRouter', 'useRoute', 'navigateTo', 'useNuxtApp', 'useI18n', 'useGraphQLQuery', 'useStore', 'useState', 'useNotificationsCount'],
  aliases: {
    'graphql-request': 'runtime/graphql-request.ts',
    vuex: 'runtime/store.ts',
    'vue-i18n': 'runtime/nuxt-app.ts',
    '~/composables/useGraphQLQuery': 'runtime/graphql.ts',
    '~/composables/useStreamingGraphQLQuery.js': 'runtime/streaming-graphql.ts',
    '~/composables/useBackendError': 'runtime/composables.ts',
    '~/components/Generic/InfiniteScroll.vue': 'runtime/InfiniteScroll.vue',
    '~/utils/dashboardRoute': 'runtime/app-modules.ts',
    '~/graphql_schemas/notifications': 'runtime/app-modules.ts',
    ...Object.fromEntries(templateAssets.map(file => [`assets/${file}`, `studios/assets/${file}`])),
  },
};
