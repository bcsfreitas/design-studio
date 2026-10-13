import { requestJson } from './client';
import { setManifest } from './manifest';
import type { Manifest } from './types';
import { ClientError } from '../../core/client-error';

const listeners = new Set<() => void>();
let pending: Promise<unknown> = Promise.resolve();
export const onMutation = (refresh: () => void) => {
  listeners.add(refresh);
  return () => {
    listeners.delete(refresh);
  };
};

// Serialize this tab's writes, apply only checked successful replies, then let the shell schedule loader refresh.
// Navigation belongs to the caller and can run against the updated inventory before the scheduled refresh.
export function requestMutation<T extends { manifest: Manifest }>(
  url: string,
  init: RequestInit,
  validate: (reply: T) => T = reply => reply,
): Promise<T> {
  const operation = pending
    .catch(() => {})
    .then(async () => {
      const reply = await requestJson<T>(url, init);
      const manifest = reply?.manifest;
      if (
        !manifest ||
        !Array.isArray(manifest.prototypes) ||
        !Array.isArray(manifest.systemContent) ||
        !manifest.sections ||
        typeof manifest.sections !== 'object' ||
        Array.isArray(manifest.sections) ||
        !Object.values(manifest.sections).every(Array.isArray)
      )
        throw new ClientError('invalid_response', 'Studio mutation reply is missing a valid content inventory.');
      let result: T;
      try {
        result = validate(reply);
      } catch (cause) {
        throw cause instanceof ClientError
          ? cause
          : new ClientError(
              'invalid_response',
              'Studio mutation reply contains invalid resource metadata.',
              undefined,
              cause,
            );
      }
      setManifest(result.manifest);
      listeners.forEach(refresh => refresh());
      return result;
    });
  pending = operation;
  return operation;
}
