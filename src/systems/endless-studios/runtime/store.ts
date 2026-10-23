// Stand-in for the app's Vuex store (store/index.js), also served as the `vuex` module so `useStore()` imports
// resolve. State starts from the app's initial shape, deep-merged with the screen's sample state. Mutations and
// actions are not reproduced: a commit or dispatch is logged once and ignored, unless the sample supplies it.
import { inject, reactive, type App } from 'vue';
import { noticeOnce } from './notice';

type State = Record<string, unknown>;
type Handler = (context: { state: State; commit: Store['commit'] }, payload?: unknown) => unknown;

export type StoreSample = {
  state?: State;
  getters?: Record<string, unknown>;
  /** Optional handlers by name, for screens that need a commit or dispatch to change state. */
  mutations?: Record<string, (state: State, payload?: unknown) => void>;
  actions?: Record<string, Handler>;
};

export type Store = {
  state: State;
  getters: Record<string, unknown>;
  commit: (type: string, payload?: unknown) => void;
  dispatch: (type: string, payload?: unknown) => Promise<unknown>;
  subscribe: () => () => void;
  subscribeAction: () => () => void;
  watch: () => () => void;
  replaceState: (state: State) => void;
  install: (app: App) => void;
};

// The app's initial state (store/index.js `state()`), so components that read it before any data arrives render.
const appState = (): State => ({
  user: {
    joinedIndividualProgramsIdsSet: [],
    joinedTeamsProgramsIdsSet: [],
    adminForProgramsIdSet: [],
    individualPrograms: [],
    teamPrograms: [],
    completedOnboarding: true,
  },
  loading: { userData: false, userPrograms: false },
  modalsControl: { currentOpenModal: { id: null, show: false, data: {} } },
  newFeed: null,
  systemNotificationCount: 0,
});

const plain = (value: unknown): value is State => !!value && typeof value === 'object' && !Array.isArray(value);

function merge(target: State, source: State = {}): State {
  for (const [key, value] of Object.entries(source))
    target[key] = plain(value) && plain(target[key]) ? merge({ ...(target[key] as State) }, value) : value;
  return target;
}

export const STORE_KEY = 'store';

export function createSampleStore(sample: StoreSample = {}): Store {
  const state = reactive(merge(appState(), sample.state));
  const store: Store = {
    state,
    getters: { ...sample.getters },
    commit(type, payload) {
      const mutation = sample.mutations?.[type];
      if (mutation) mutation(state, payload);
      else noticeOnce(`commit:${type}`, `store mutation "${type}" is not stood in; ignored`, payload ?? '');
    },
    async dispatch(type, payload) {
      const action = sample.actions?.[type];
      if (action) return action({ state, commit: store.commit }, payload);
      noticeOnce(`dispatch:${type}`, `store action "${type}" is not stood in; ignored`, payload ?? '');
      return undefined;
    },
    subscribe: () => () => {},
    subscribeAction: () => () => {},
    watch: () => () => {},
    replaceState(next) {
      for (const key of Object.keys(state)) delete state[key];
      Object.assign(state, next);
    },
    install(app) {
      app.config.globalProperties.$store = store;
      app.provide(STORE_KEY, store);
    },
  };
  return store;
}

// The `vuex` exports the app uses.
export function useStore(): Store {
  const store = inject<Store | null>(STORE_KEY, null);
  if (!store) throw new Error('[Endless Studios] useStore() outside a screen created by createStudiosApp');
  return store;
}

export function createStore(): Store {
  noticeOnce('createStore', 'the app store is replaced by the sample store; createStore() returns an empty one');
  return createSampleStore();
}
