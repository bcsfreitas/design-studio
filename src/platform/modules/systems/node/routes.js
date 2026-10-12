import fs from 'node:fs';
import path from 'node:path';
import { refreshSystems, SYSTEM_SPECS, SYSTEM_SOURCES, PLATFORM_ID } from './systems.js';
import { scaffold } from './scaffold-docs.js';
import { skillTemplate } from './skill-template.js';
import { nameProblem, descriptionProblem, SKILL_FILE } from '../content/skills.ts';
import { buildManifest } from '../../../node/build/build-manifest.js';
import { sourceFile } from '../../../node/build/files/source.js';
import { canWriteSource } from '../../../node/build/files/policy.js';
import { reveal } from '../../../node/build/files/ops.js';
import { canonicalDirectory } from '../../../node/lib/safe-paths.js';
import { knowledgeOwners } from '../../../node/lib/agent-skills.js';
import { ENABLED_MODULES } from '../../../node/lib/modules.js';

const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
function system(body) {
  refreshSystems();
  const entries = Object.entries(SYSTEM_SPECS).filter(
    ([key, spec]) => SYSTEM_SOURCES[key] && spec.studioId === body.systemId,
  );
  if (entries.length !== 1 || entries[0][1].status !== 'active') fail('This active system is unavailable.', 404);
  const [key, spec] = entries[0];
  return { key, spec, source: SYSTEM_SOURCES[key] };
}
function authorize(root, me, target, content) {
  if (!canWriteSource(me, target, root, content))
    fail('Only an Admin or an assigned system maintainer can change this resource.', 403);
}
function receipt(result) {
  const { manifest } = buildManifest();
  return { body: { ...result, manifest }, manifest };
}
export async function systemRoute(root, route, me, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Provide a Systems request.');
  if (route === 'skill') {
    let owner;
    if (body.systemId) {
      const { key } = system(body);
      owner = knowledgeOwners([], SYSTEM_SOURCES).find(o => o.id === key);
    } else {
      refreshSystems();
      owner = knowledgeOwners(ENABLED_MODULES, {}).find(o => o.id === body.owner);
    }
    if (!owner) fail('This knowledge owner is unavailable.', 404);
    const target = `${owner.root}/skills`;
    authorize(root, me, target);
    const dir = path.join(root, target);
    if (!canonicalDirectory(dir, root)) fail('This skills folder is unavailable.', 404);
    const problem = nameProblem(body.name) || descriptionProblem(body.description);
    if (problem) fail(problem);
    const folder = path.join(dir, body.name);
    if (fs.existsSync(folder)) fail(`Something named “${body.name}” already exists here.`);
    fs.mkdirSync(folder);
    try {
      fs.writeFileSync(path.join(folder, SKILL_FILE), skillTemplate(body.name, body.description), { flag: 'wx' });
    } catch (error) {
      fs.rmdirSync(folder);
      throw error;
    }
    return receipt({ path: `${body.name}/${SKILL_FILE}` });
  }
  const { key, source } = system(body);
  if (route === 'component-docs') {
    authorize(root, me, source.components);
    if (typeof body.component !== 'string') fail('Say which component.');
    const moved = [];
    const written = scaffold(key, body.component, moved);
    return receipt({ written, moved });
  }
  if (route !== 'source') fail('Choose a Systems route.');
  if (
    typeof body.path !== 'string' ||
    body.path.split('/').some(p => !p || p === '.' || p === '..') ||
    body.path.includes('\\')
  )
    fail('Choose a source path inside this system.');
  const target = source.dir + body.path;
  const manifest = buildManifest({ write: false, quiet: true }).manifest;
  const allowed = [
    source.theme,
    ...(key === PLATFORM_ID ? [] : [source.dir + 'system.ts']),
    source.dir + 'intro.tsx',
    ...(manifest.systems[key]?.components ?? []).flatMap(c =>
      Object.values(c.files)
        .filter(Boolean)
        .map(f => source.components + '/' + f),
    ),
  ];
  if (body.action === 'write') authorize(root, me, target, body.content);
  const result = sourceFile(root, allowed, { ...body, path: target });
  if (result.reveal) await reveal(result.reveal);
  return result;
}
