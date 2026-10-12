import { defineReferenceAdapter, type CopyReferenceContext } from '#studio/references';

function rewrite(source: string, target: (value: string) => string, update: CopyReferenceContext['sceneUpdate'] = {}) {
  const scene = JSON.parse(source);
  let changed = false;
  for (const element of scene.elements ?? []) {
    if (typeof element.link !== 'string') continue;
    const next = target(element.link);
    if (next === element.link) continue;
    element.link = next;
    element.version = (element.version ?? 0) + 1;
    element.versionNonce = update.nonce?.(element, next) ?? Math.floor(Math.random() * 2 ** 31);
    element.updated = update.updated ?? Date.now();
    changed = true;
  }
  return changed ? JSON.stringify(scene, null, 2) + '\n' : source;
}

export default [
  defineReferenceAdapter({
    extensions: ['.excalidraw'],
    move(source, _path, context) {
      try {
        return rewrite(source, context.appTarget);
      } catch {
        return source;
      } // Retain the existing move behavior for a broken scene.
    },
    copy: (source, _path, context) => rewrite(source, context.target, context.sceneUpdate),
  }),
];
