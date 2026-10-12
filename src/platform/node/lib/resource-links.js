// Repair known browser references without rewriting source imports or prose.
// Mapping is exact, includes containment, and leaves external origins untouched.
import { installedReferenceAdapters, referenceAdapterFor, rewriteWithAdapter } from './reference-adapters.js';

export function rewriteResourceLinks(
  text,
  file,
  routes,
  prefixes = new Map(),
  sceneUpdate = {},
  adapters = installedReferenceAdapters(),
) {
  const target = value => {
    const suffixAt = value.search(/[?#]/);
    const route = suffixAt < 0 ? value : value.slice(0, suffixAt);
    const prefix = [...prefixes.keys()].find(prefix => route === prefix || route.startsWith(prefix + '/'));
    const next = routes.get(route) ?? (prefix ? prefixes.get(prefix) + route.slice(prefix.length) : undefined);
    if (next === undefined) sceneUpdate.unresolved?.(route);
    return next === undefined ? value : next + (suffixAt < 0 ? '' : value.slice(suffixAt));
  };
  return rewriteWithAdapter(referenceAdapterFor(adapters, file), 'copy', text, file, { target, sceneUpdate });
}
