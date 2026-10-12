import { compiledLifecycle } from '#studio/data';
import type { ArtifactLifecycle } from '#studio/lifecycle';
import type { Target } from './protocol';

export function previewLifecycle(target: Target, publish: (state: ArtifactLifecycle) => void) {
  return compiledLifecycle(
    { contributor: target.contributor, prototype: target.prototype, path: target.artifact },
    publish,
  );
}
