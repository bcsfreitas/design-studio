import path from 'node:path';
import { serializeJson as serializeBuildAsset } from '../../core/json.ts';

const NAME = /^[a-z][a-z0-9-]*$/;
const validPattern = value =>
  typeof value === 'string' &&
  value.length > 0 &&
  !value.startsWith('/') &&
  !value.includes('\\') &&
  !value.split('/').some(part => part === '..' || part === '.') &&
  /^[a-zA-Z0-9_./*?{},@-]+$/.test(value);
export { serializeJson as serializeBuildAsset } from '../../core/json.ts';

// Construction validates declarations without computing assets. The cache owns in-flight work and failures.
export function buildAssetStore(builds, { root, enabled }) {
  const entries = new Map();
  for (const [module, build] of builds) {
    if (!enabled.includes(module) || build.assets === undefined) continue;
    if (!build.assets || typeof build.assets !== 'object' || Array.isArray(build.assets))
      throw new Error(`${module}: assets must be a named object.`);
    for (const [name, asset] of Object.entries(build.assets)) {
      if (
        !NAME.test(name) ||
        !asset ||
        typeof asset.load !== 'function' ||
        !Array.isArray(asset.watch) ||
        !asset.watch.length ||
        asset.watch.length > 64 ||
        asset.watch.some(pattern => !validPattern(pattern))
      )
        throw new Error(`${module}/${name}: declare an asset loader and 1–64 repository-relative watch patterns.`);
      entries.set(`${module}/${name}`, { asset, revision: 0, cache: null });
    }
  }
  const read = async key => {
    const entry = entries.get(key);
    if (!entry) throw Object.assign(new Error(`Build asset ${key} is unavailable.`), { status: 404 });
    const revision = entry.revision;
    if (!entry.cache) {
      const pending = Promise.resolve()
        .then(() => entry.asset.load({ root, enabled }))
        .then(serializeBuildAsset);
      entry.cache = pending;
      pending.catch(() => {
        if (entry.cache === pending) entry.cache = null;
      });
    }
    const data = await entry.cache;
    // An edit during computation cannot publish an old generation.
    return revision === entry.revision ? data : read(key);
  };
  return {
    keys: [...entries.keys()],
    read,
    watchRoots: [
      ...new Set(
        [...entries.values()].flatMap(({ asset }) =>
          asset.watch.map(pattern =>
            path.resolve(
              root,
              /[?*{]/.test(pattern) && pattern.split(/[?*{]/)[0].endsWith('/')
                ? pattern.split(/[?*{]/)[0]
                : path.dirname(pattern.split(/[?*{]/)[0]),
            ),
          ),
        ),
      ),
    ],
    invalidate(file) {
      const relative = path.relative(root, file).split(path.sep).join('/');
      const changed = [];
      for (const [key, entry] of entries)
        if (entry.asset.watch.some(pattern => path.matchesGlob(relative, pattern))) {
          entry.revision++;
          entry.cache = null;
          changed.push(key);
        }
      return changed;
    },
  };
}
