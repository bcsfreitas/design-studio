# Endless Studios system instructions

This system renders the Endless Studios frontend's own Vue code: Nuxt UI 4 with the app's `app.config` customization and stylesheets. Follow the repository's platform working context.

- A prototype view stays a `.tsx` file whose default export renders `<VueScreen component={Screen} />` from `@/systems/endless-studios/libraries/vue`. The screen itself is a `.vue` file in the prototype's `_vue/` folder.
- React views can also use the documented components, such as `Button` and `Card` from `@/systems/endless-studios/components/<name>`; each wraps the Nuxt UI component through `VueInline`. React content passed to a slot (a card's header, body, footer) renders inside the app's shadow root, so its classes use the app's Tailwind vocabulary (`text-muted`, `bg-elevated`), not Studio's.
- In `.vue` files, use Nuxt UI components (`UButton`, `UCard`, `UModal`...) without importing them, as in the app. Vue's `ref`, `computed` and similar are auto-imported too. Icons are Lucide names such as `i-lucide-user-plus`.
- Import copied app components with the app's own paths, such as `~/components/App/AppSimplePage.vue`. `~/` resolves to `studios/`, a copy of the app's `frontend/app/` folder; see `studios/README.md` for its revision and adaptations. Copy further components there unchanged.
- `useRouter`, `useRoute` and `navigateTo` are stand-ins (`studios/nuxt-shims.ts`) that log navigation. Components that need i18n (`$t`), GraphQL or the Vuex store do not run yet; pass sample data as props instead.
- `styles/theme.css` holds the app's tokens for the Theme pages and for React code: the DESIGN.md roles as `--color-text-muted`, `--color-bg-elevated` and so on, the eight palettes behind them, and Studio's shared semantic names (`--background`, `--muted-foreground`...) mapped onto those roles. Vue screens don't read it; they use the app's own stylesheet. Change both together when the app's tokens change.
- Screens mount in a shadow root, so overlays stay inside it and Studio's colour mode does not reach them. The app has one light theme.
