// Stand-in for the app's `useStreamingGraphQLQuery` (composables/useStreamingGraphQLQuery.ts), a paged list query.
// It answers from the screen's sample responses like useGraphQLQuery: the first page is the sample's list, keyed by
// operation name, and there are no further pages. An unmocked query logs once and gives an empty list.
import { shallowRef, toValue, type MaybeRefOrGetter } from 'vue';
import { useNuxtApp } from './nuxt-app';

type Options = {
  variables?: MaybeRefOrGetter<Record<string, unknown>>;
  cursorVariables?: (cursor: unknown) => Record<string, unknown>;
  defaultCursor?: unknown;
  [option: string]: unknown;
};

export function useStreamingGraphQLQuery(query: MaybeRefOrGetter<unknown>, options: Options = {}) {
  const app = useNuxtApp();
  const items = shallowRef<unknown[]>([]);
  const load = () => {
    if (!app.$auth.loggedIn) return (items.value = []);
    const variables = { ...toValue(options.variables), ...options.cursorVariables?.(options.defaultCursor) };
    const response = app.graphql.respond('query', toValue(query), variables);
    const list = response && typeof response === 'object' && !Array.isArray(response) ? Object.values(response)[0] : response;
    items.value = Array.isArray(list) ? list : [];
  };
  load();
  return {
    items,
    status: shallowRef('success'),
    error: shallowRef(null),
    hasMore: shallowRef(false),
    fetchNext: async () => {},
    refresh: async () => load(),
  };
}
