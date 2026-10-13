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
  return structuredClone(await cache.read(key)) as T;
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
function notifySubscribers(key: string, subscribers: Set<() => void>) {
  const failed = (error: unknown) => console.error(`Build asset ${key} subscriber failed.`, error);
  for (const notify of [...subscribers]) {
    try {
      void Promise.resolve(notify()).catch(failed);
    } catch (error) {
      failed(error);
    }
  }
}
if (import.meta.hot) {
  const changed = ({ key }: { key: string }) => {
    cache.invalidate(key);
    const subscribers = listeners.get(key);
    if (subscribers) notifySubscribers(key, subscribers);
  };
  const connected = () => {
    // Custom watch events are not replayed after a disconnected socket.
    cache.invalidateAll();
    for (const [key, subscribers] of [...listeners]) notifySubscribers(key, subscribers);
  };
  import.meta.hot.on('studio:asset', changed);
  import.meta.hot.on('vite:ws:connect', connected);
  import.meta.hot.dispose(() => {
    import.meta.hot?.off('studio:asset', changed);
    import.meta.hot?.off('vite:ws:connect', connected);
  });
}
