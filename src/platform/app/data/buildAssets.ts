import assets from 'virtual:studio-build-assets';
import { requestJson } from './client.ts';
import { ClientError } from '../../core/client-error.ts';

const cache = new Map<string, Promise<unknown>>();
const revisions = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();
export async function loadModuleAsset<T = unknown>(module: string, asset: string): Promise<T> {
  const key = module + '/' + asset,
    url = assets[key];
  if (!url) throw new ClientError('unavailable_asset', `Build asset ${key} is unavailable.`);
  const revision = revisions.get(key) ?? 0;
  let pending = cache.get(key);
  if (!pending) {
    pending = requestJson(url);
    cache.set(key, pending);
    const request = pending;
    request.catch(() => {
      if (cache.get(key) === request) cache.delete(key);
    });
  }
  const value = await pending;
  return revision === (revisions.get(key) ?? 0) ? (value as T) : loadModuleAsset<T>(module, asset);
}
export function subscribeModuleAsset(module: string, asset: string, listener: () => void): () => void {
  const key = module + '/' + asset;
  const set = listeners.get(key) ?? new Set();
  listeners.set(key, set);
  set.add(listener);
  return () => {
    set.delete(listener);
    if (!set.size) listeners.delete(key);
  };
}
if (import.meta.hot)
  import.meta.hot.on('studio:asset', ({ key }: { key: string }) => {
    revisions.set(key, (revisions.get(key) ?? 0) + 1);
    cache.delete(key);
    listeners.get(key)?.forEach(notify => notify());
  });
