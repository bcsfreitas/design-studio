// Stand-ins for the Nuxt composables that Endless Studios components use without importing them.
// Navigation stays inside the prototype: it is logged instead of leaving the screen.
type Target = string | { path?: string; name?: string };

export function navigateTo(to: Target) {
  console.info('[Endless Studios] navigate to', to);
}

export function useRouter() {
  return { push: navigateTo, replace: navigateTo, back() {}, go() {} };
}

export function useRoute() {
  return { path: '/', fullPath: '/', params: {}, query: {}, hash: '', name: undefined, meta: {} };
}
