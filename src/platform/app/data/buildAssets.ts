import assets from 'virtual:studio-build-assets';
import { requestJson } from './client.ts';
import { generationCache } from '../../core/generationCache.ts';
import { ClientError } from '../../core/client-error.ts';

const cache = generationCache<string, unknown>(key => requestJson(assets[key]));
const listeners = new Map<string, Set<() => void>>();
export async function loadModuleAsset<T = unknown>(module: string, asset: string): Promise<T> {
  const key = module + '/' + asset,
    url = assets[key];
  if (!url) throw new ClientError('unavailable_asset', `Build asset ${key} is unavailable.`);
  return (await cache.read(key)) as T;
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
if (import.meta.hot) {
  const changed = ({ key }: { key: string }) => {
    cache.invalidate(key);
    listeners.get(key)?.forEach(notify => notify());
  };
  const connected = () => {
    // Custom watch events are not replayed after a disconnected socket.
    cache.invalidateAll();
    listeners.forEach(subscribers => subscribers.forEach(notify => notify()));
  };
  import.meta.hot.on('studio:asset', changed);
  import.meta.hot.on('vite:ws:connect', connected);
  import.meta.hot.dispose(() => {
    import.meta.hot?.off('studio:asset', changed);
    import.meta.hot?.off('vite:ws:connect', connected);
  });
}
