import { fileURLToPath } from 'node:url';
import { moduleBuilds } from '../lib/module-builds.js';
import { ENABLED_MODULES } from '../lib/modules.js';
import { buildAssetStore } from '../lib/build-assets.js';
const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const ID = 'virtual:studio-build-assets',
  RESOLVED = '\0' + ID;
export default function buildAssets() {
  const store = buildAssetStore(moduleBuilds(), { root: ROOT, enabled: ENABLED_MODULES.map(module => module.id) });
  let production = false;
  return {
    name: 'studio-build-assets',
    configResolved(config) {
      production = config.command === 'build';
    },
    resolveId(id) {
      if (id === ID) return RESOLVED;
    },
    async load(id) {
      if (id !== RESOLVED) return;
      const entries = [];
      for (const key of store.keys) {
        if (production) {
          const reference = this.emitFile({
            type: 'asset',
            name: key.replace('/', '-') + '.json',
            source: await store.read(key),
          });
          entries.push(`${JSON.stringify(key)}: import.meta.ROLLUP_FILE_URL_${reference}`);
        } else entries.push(`${JSON.stringify(key)}: ${JSON.stringify('/__studio/assets/' + key)}`);
      }
      return `export default {${entries.join(',')}};`;
    },
    configureServer(server) {
      server.middlewares.use('/__studio/assets/', async (req, res) => {
        if (req.method !== 'GET' || req.headers['sec-fetch-site'] !== 'same-origin') {
          res.statusCode = 403;
          return res.end();
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        try {
          res.end(await store.read(decodeURIComponent((req.url ?? '').split('?')[0])));
        } catch (error) {
          res.statusCode = error.status ?? 500;
          res.end(JSON.stringify({ code: 'asset_failed', error: error.message }));
        }
      });
      const stale = file => {
        for (const key of store.invalidate(file))
          server.ws.send({ type: 'custom', event: 'studio:asset', data: { key } });
      };
      for (const kind of ['add', 'unlink', 'change', 'addDir', 'unlinkDir']) server.watcher.on(kind, stale);
      server.watcher.add(store.watchRoots);
      server.httpServer?.once('close', () => {
        for (const kind of ['add', 'unlink', 'change', 'addDir', 'unlinkDir']) server.watcher.off(kind, stale);
      });
    },
  };
}
