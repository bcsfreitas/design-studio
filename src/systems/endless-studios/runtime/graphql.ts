// Stand-in for the app's GraphQL access: `useGraphQLQuery` (composables/useGraphQLQuery.ts) and the
// `$graphqlRequest` plugin. Both answer from the screen's sample responses, keyed by operation name:
//   sample.queries = { UpcomingEventInstances: { upcomingEventInstances: [...] } }
// A response is the query's `data` object, or a function of the variables that returns it. An unmocked query logs
// once and resolves empty: the query's `default()` when it has one, otherwise an empty list.
import { computed, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { noticeOnce } from './notice';

export type QueryResponse = Record<string, unknown> | ((variables: Record<string, unknown>) => Record<string, unknown>);
export type QuerySamples = Record<string, QueryResponse>;

// The app's QueryAuth enum, as a plain object.
export const QueryAuth = { Required: 'required', Anonymous: 'anonymous', Optional: 'optional' } as const;
type QueryAuthValue = (typeof QueryAuth)[keyof typeof QueryAuth];

export function operationName(query: unknown): string {
  const text = typeof query === 'string' ? query : String((query as { loc?: { source?: { body?: string } } })?.loc?.source?.body ?? '');
  return /\b(?:query|mutation|subscription)\s+(\w+)/.exec(text)?.[1] ?? /\{\s*(\w+)/.exec(text)?.[1] ?? 'anonymous';
}

export function createGraphQL(samples: QuerySamples = {}) {
  const respond = (kind: string, query: unknown, variables: Record<string, unknown> = {}) => {
    const name = operationName(query);
    const response = samples[name];
    if (response === undefined) {
      noticeOnce(`${kind}:${name}`, `${kind} "${name}" has no sample response; resolving empty`);
      return undefined;
    }
    return typeof response === 'function' ? response(variables) : response;
  };
  return {
    samples,
    respond,
    // The `$graphqlRequest` plugin API.
    request: {
      async query(query: unknown, variables?: Record<string, unknown>) {
        return { data: respond('query', query, variables) ?? {} };
      },
      async mutate(query: unknown, variables?: Record<string, unknown>) {
        return { data: respond('mutation', query, variables) ?? {} };
      },
      subscribe(payload: { query?: unknown }) {
        noticeOnce(`subscribe:${operationName(payload?.query)}`, 'subscriptions are not stood in; nothing is emitted');
        return () => {};
      },
    },
  };
}

export type GraphQL = ReturnType<typeof createGraphQL>;

type Options = {
  variables?: MaybeRefOrGetter<Record<string, unknown>>;
  skip?: MaybeRefOrGetter<boolean>;
  default?: (() => unknown) | null;
  flattenData?: boolean;
  transform?: (data: unknown) => unknown;
  auth?: QueryAuthValue;
  [option: string]: unknown;
};

type Context = { graphql: GraphQL; loggedIn: () => boolean };

// Mirrors useGraphQLQuery's contract: AsyncData with `data`, `status`, `error` and `refresh`, awaitable in setup.
export function sampleQuery(context: Context, query: MaybeRefOrGetter<unknown>, options: Options = {}) {
  const { flattenData = true, transform = (data: unknown) => data, auth = QueryAuth.Required } = options;
  const fallback = () => (options.default ? options.default() : []);
  const variables = computed(() => toValue(options.variables) ?? {});
  const skip = computed(() => !!toValue(options.skip));
  const data = shallowRef<unknown>(fallback());
  const run = () => {
    const signedIn = context.loggedIn();
    if (skip.value || (auth === QueryAuth.Required && !signedIn) || (auth === QueryAuth.Anonymous && signedIn)) {
      data.value = fallback();
      return;
    }
    let response: unknown = context.graphql.respond('query', toValue(query), variables.value);
    if (response === undefined) {
      data.value = fallback();
      return;
    }
    if (flattenData && response && typeof response === 'object') {
      const keys = Object.keys(response);
      if (keys.length === 1) response = (response as Record<string, unknown>)[keys[0]];
    }
    data.value = transform(response);
  };
  run();
  watch([variables, skip], run);
  const result = {
    data,
    pending: shallowRef(false),
    status: shallowRef('success'),
    error: shallowRef(null),
    refresh: async () => run(),
    execute: async () => run(),
    clear: () => {
      data.value = fallback();
    },
  };
  // `await useGraphQLQuery(...)` resolves to the same object, as Nuxt's AsyncData does.
  return Object.assign(Promise.resolve(result), result);
}

// Served as `~/composables/useGraphQLQuery` too, so copied components importing QueryAuth or the composable resolve.
export { useGraphQLQuery } from './nuxt-app';
