# Endless Studios

A design system for prototypes assigned to `endless-studios`.

- `AGENTS.md` selects relevant context and skills.
- `context/` holds shared product and design knowledge. [User types](context/user-types.md) describes who uses Endless Access: eight types, their jobs to be done, and the evidence behind each point.
- `skills/` holds task procedures when this system needs them.
- `components/` and `styles/theme.css` provide the interface toolkit.
- `assets/`, when needed, holds this system's fonts, icons, logos, and shared imagery. Package assets remain explicit dependencies.
- `package.json` owns dependencies; `libraries/` exposes selected APIs to assigned prototypes.
- `system.ts` declares the system; `intro.tsx` describes it in the app.

## Vue runtime

`libraries/vue-app.ts` exports `createStudiosApp`, the single entry point to the Vue runtime. `VueScreen`, `VueInline` (and so every documented component) and the system's server-render test create their app through it; nothing else calls Vue's `createApp`. It installs:

- Nuxt UI with the app's `app.config` (`nuxt-ui.config.ts`), inside `UApp`, with a `Suspense` boundary for components that `await` in setup;
- the Lucide icon collection;
- navigation stand-ins: `useRouter`, `useRoute`, `navigateTo` and a `<NuxtLink>` that log instead of navigating;
- `$t` and `useI18n()`, reading the app's locale files in `i18n/locales/`. English is the default and fallback; a missing key renders as the key and is reported once in the console;
- `$auth` and `useNuxtApp().$auth`, with the sample users `learner`, `mentor`, `admin`, or signed out;
- `$store`, `useStore()` and the `vuex` module: the app's initial state merged with sample state; unknown commits and actions are reported once and ignored;
- `useGraphQLQuery`, `$graphqlRequest` and the `graphql-request` module, answering from sample responses by operation name; an unmocked query is reported once and resolves to its `default()` or an empty list;
- `$dayjs` for the date formats the app uses;
- `useState`, and the app mixin's `resolveProfilePic`.

With `shell`, the factory wraps the screen in `runtime/AppShell.vue`: the app's `StudioLayout` frame with the copied `StudioSidebar`, `StudioTopBar` and `StudioFooter`, without the global modals it also mounts.

The stand-ins live in `runtime/`; `vue-runtime.config.ts` lists the names the Vue systems build auto-imports from `studios/nuxt-shims.ts` and the modules it answers with stand-ins.

The app's images are copied to `studios/assets/images/`. A script import such as `import logo from '~/assets/images/logo.svg'` resolves through `~/`. A template URL such as `<img src="~/assets/images/logo.svg">` compiles to an import of `assets/images/logo.svg`, as in Nuxt, so `vue-runtime.config.ts` lists each image a copied template names.

`VueScreen` and `VueInline` accept the same optional runtime props as the factory:

| Prop | Default | Meaning |
| --- | --- | --- |
| `locale` | `'en'` | A locale code from `i18n/locales/` (`en`, `es`). |
| `user` | `'learner'` | `'learner'`, `'mentor'`, `'admin'`, a user object shaped like the app's `User`, or `null` for signed out. |
| `shell` | `false` | Wrap the screen in the app's sidebar, top bar and footer. |
| `sample` | `{}` | `{ state, getters, mutations, actions, queries }`: store state merged over the app's initial state, optional store handlers by name, and GraphQL `data` objects (or functions of the variables) keyed by operation name. |

The app is recreated when one of these changes identity, so define samples outside the view function. `createStudiosApp({ component, props, slots, portal, ssr, locale, user, sample, shell })` returns the Vue app with its stand-ins at `app.runtime`.

`runtime/test/vue-app.test.js` renders copied app components with Vue's server renderer through the factory: `node --test src/systems/endless-studios/runtime/test/vue-app.test.js`.

Add context and skills only when needed. This system’s UI reads its original Context and Skills files alongside Theme and Components. See the [Systems module](../../platform/modules/systems/README.md) for the authoring contract.
