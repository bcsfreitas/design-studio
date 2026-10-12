import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import path from 'node:path';
import { createServer } from 'vite';
const server = await createServer({
  configFile: path.resolve('vite.config.ts'),
  configLoader: 'native',
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true },
});
after(() => server.close());
const { inspectArtifact, resolveArtifact } = await server.ssrLoadModule('/platform/api/data.ts');
const proto = {
  studioId: '0123456789abcdef',
  id: 'demo',
  contributorKey: 'test',
  title: 'Demo',
  system: null,
  artifacts: [
    { studioId: 'abcdefghjkmnpqrs', path: 'research/notes.md', fileType: 'document' },
    { studioId: 'bcdefghjkmnpqrst', path: 'main.tsx', fileType: 'view' },
    { studioId: 'cdefghjkmnpqrst0', path: 'board.excalidraw', fileType: 'canvas' },
  ],
};
const manifest = { prototypes: [proto], sections: {}, systemContent: [] };
const request = (reference, surface = 'document') => ({
  reference,
  surface,
  origin: { proto, item: proto.artifacts[0] },
});
test('inspection has no format renderer in its dependency graph', () => {
  assert.equal(
    [...server.environments.ssr.moduleGraph.idToModuleMap.keys()].some(id => /\/modules\/[^/]+\/open\.tsx/.test(id)),
    false,
  );
});
test('declared hosts share scope, permanent identity, relative reference, and availability decisions', async () => {
  const permanent = '/prototypes/0123456789abcdef/artifacts/bcdefghjkmnpqrst';
  for (const surface of ['document', 'canvas']) {
    const live = inspectArtifact(request(permanent, surface), manifest);
    assert.equal(live.state, 'resolved', JSON.stringify(live));
    assert.equal(live.preview.available, true);
    assert.equal(live.typeLabel, 'View');
    assert.equal(inspectArtifact(request('../main.tsx', surface), manifest).href, permanent);
    for (const reference of ['../../outside/main.tsx', '../_helpers/main.tsx', 'https://outside.test/main.tsx'])
      assert.notEqual(inspectArtifact(request(reference, surface), manifest).state, 'resolved');
    assert.equal(
      inspectArtifact(request('/prototypes/zzzzzzzzzzzzzzzz/artifacts/bcdefghjkmnpqrst', surface), manifest).code,
      'unsupported_scope',
    );
    const missing = { ...manifest, prototypes: [{ ...proto, systemMissing: { label: 'Missing' } }] };
    assert.equal(inspectArtifact(request(permanent, surface), missing).preview.code, 'missing_system');
    const card = inspectArtifact(request('../research/notes.md', surface), manifest);
    assert.equal(card.state, 'resolved');
    assert.equal(card.presentation, 'card');
  }
  const moved = {
    ...manifest,
    prototypes: [
      { ...proto, artifacts: proto.artifacts.map(i => (i.fileType === 'view' ? { ...i, path: 'moved.tsx' } : i)) },
    ],
  };
  assert.equal(inspectArtifact(request(permanent), moved).target.item.path, 'moved.tsx');
  assert.equal(inspectArtifact(request(permanent, 'unknown/storyboard'), manifest).code, 'unsupported_surface');
  assert.equal(inspectArtifact(request('main.tsx'), { ...manifest, prototypes: [] }).code, 'unavailable');
  let fetches = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    fetches++;
    return new Response(JSON.stringify(proto.artifacts));
  };
  try {
    const lazy = { ...manifest, prototypes: [{ ...proto, artifacts: undefined }] };
    assert.equal(inspectArtifact(request(permanent), lazy).state, 'pending');
    assert.equal((await resolveArtifact(request(permanent), { manifest: lazy })).state, 'resolved');
    assert.equal(fetches, 1);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(resolveArtifact(request(permanent), { manifest: lazy, signal: controller.signal }), /abort/i);
  } finally {
    globalThis.fetch = original;
  }
});
