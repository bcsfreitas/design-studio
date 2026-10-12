// Pending work and completed values belong to a generation. Superseded failures and
// successes both follow the newest generation; current failures stay retryable.
export function generationCache<K, V>(load: (key: K) => V | PromiseLike<V>) {
  const states = new Map<K, { revision: number; pending?: Promise<V> }>();
  const stateFor = (key: K) => {
    let state = states.get(key);
    if (!state) states.set(key, (state = { revision: 0 }));
    return state;
  };
  return {
    async read(key: K): Promise<V> {
      const state = stateFor(key);
      for (;;) {
        const revision = state.revision;
        const pending = (state.pending ??= Promise.resolve().then(() => load(key)));
        try {
          const value = await pending;
          if (revision === state.revision) return value;
        } catch (error) {
          if (revision !== state.revision) continue;
          if (state.pending === pending) state.pending = undefined;
          throw error;
        }
      }
    },
    invalidate(key: K) {
      const state = stateFor(key);
      state.revision++;
      state.pending = undefined;
    },
    invalidateAll() {
      for (const state of states.values()) {
        state.revision++;
        state.pending = undefined;
      }
    },
  };
}
