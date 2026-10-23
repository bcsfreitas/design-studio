// The single entry point to the Endless Studios Vue runtime. Full screens (VueScreen), inline components
// (VueInline) and the system's tests all create their app here, so they share one set of plugins and stand-ins.
import { createApp, createSSRApp, h, Suspense, type App, type Component, type VNodeChild } from 'vue';
import ui from '@nuxt/ui/vue-plugin';
import UApp from '@nuxt/ui/components/App.vue';
import { addCollection } from '@iconify/vue';
import lucide from '@iconify-json/lucide/icons.json';
import { createAuth, sampleUsers, type SampleUser, type SampleUserName, type UserOption } from '../runtime/auth';
import { createGraphQL, type QuerySamples } from '../runtime/graphql';
import { createI18n, defaultLocale } from '../runtime/i18n';
import { NuxtLink } from '../runtime/navigation';
import { createDayjs, NUXT_APP_KEY, type NuxtAppStandIn } from '../runtime/nuxt-app';
import { createSampleStore, type StoreSample } from '../runtime/store';
import { mixin } from '../runtime/mixin';
import AppShell from '../runtime/AppShell.vue';

addCollection(lucide);

export { sampleUsers };
export type { SampleUser, SampleUserName, UserOption, QuerySamples, StoreSample };

/** Per-screen sample data for the stand-ins. Every part is optional. */
export type StudiosSample = StoreSample & {
  /** GraphQL responses by operation name: the query's `data`, or a function of its variables. */
  queries?: QuerySamples;
};

/** What a screen sees of the app around it. Defaults: English, the sample learner, empty data. */
export type StudiosRuntimeOptions = {
  /** A locale code from the app's locale files: `en` (default) or `es`. */
  locale?: string;
  /** `learner` (default), `mentor`, `admin`, a user object, or `null` for signed out. */
  user?: UserOption;
  sample?: StudiosSample;
  /** Wrap the screen in the app's sidebar, top bar and footer (runtime/AppShell.vue). Off by default. */
  shell?: boolean;
};

export type StudiosAppOptions = StudiosRuntimeOptions & {
  component: Component;
  /** The component's props. Pass a reactive object to update them without recreating the app. */
  props?: Record<string, unknown>;
  slots?: Record<string, (...args: never[]) => VNodeChild>;
  /** Where Nuxt UI overlays render. Omitted on the server. */
  portal?: HTMLElement;
  /** Create an app for Vue's server renderer, as the tests do. */
  ssr?: boolean;
};

export type StudiosApp = App & { runtime: NuxtAppStandIn };

export function createStudiosApp({ component, props, slots, portal, ssr = false, locale = defaultLocale, user, sample = {}, shell = false }: StudiosAppOptions): StudiosApp {
  const i18n = createI18n(locale);
  const auth = createAuth(user);
  const store = createSampleStore(sample);
  const graphql = createGraphQL(sample.queries);
  const runtime: NuxtAppStandIn = {
    $auth: auth,
    $i18n: i18n,
    $store: store,
    $graphqlRequest: graphql.request,
    $dayjs: createDayjs(() => i18n.locale.value),
    $config: { public: {} },
    graphql,
  };

  // Suspense lets copied components that `await` in setup (such as useGraphQLQuery) render.
  const screen = () => h(component, { ...props }, slots);
  const content = shell ? () => h(AppShell, null, { default: screen }) : screen;
  const root = { render: () => h(UApp, { portal }, () => h(Suspense, null, { default: content })) };
  const app = (ssr ? createSSRApp(root) : createApp(root)) as StudiosApp;
  app.use(ui);
  app.use(store);
  app.component('NuxtLink', NuxtLink);
  app.provide(NUXT_APP_KEY, runtime);
  Object.assign(app.config.globalProperties, {
    $t: i18n.t,
    $te: i18n.te,
    $tm: i18n.tm,
    $i18n: i18n,
    $auth: auth,
    $graphqlRequest: graphql.request,
    $dayjs: runtime.$dayjs,
    ...mixin,
  });
  app.runtime = runtime;
  return app;
}
