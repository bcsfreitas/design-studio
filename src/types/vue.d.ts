declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}

declare module '@nuxt/ui/vue-plugin' {
  import type { Plugin } from 'vue';
  const plugin: Plugin;
  export default plugin;
}
