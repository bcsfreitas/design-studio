import { canvasIdentity } from './identity.ts';
// The canvas tools on a canvas file, from the command line, for agents that have no browser:
//
//   pnpm canvas <file.excalidraw> <tool> '<json>'             run a tool on a canvas
//   pnpm canvas <file.excalidraw> <tool> --json-file <path>   the arguments from a file
//   pnpm canvas <file.excalidraw> <tool> -                    the arguments from standard input
//   pnpm canvas <file.excalidraw> states '{"artifact":"Home.tsx"}'  every state of a view, side by side
//   pnpm canvas help [tool]                                    list the tools, or explain one
//
// These are the same tools as the live API in the open canvas (tools.ts), with the same arguments.
// Read the result on stdout; a change is written to the file, and an open canvas takes it in as it
// happens. The file is JSON in, JSON out, so nothing is run from the arguments.
// Before a tool runs, the prototype must be in the manifest with an identity for every artifact; if it
// isn't, the CLI prints the command that fixes it, and --identify runs that command and continues.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { artifactSlug, type FileTypeSpec } from '../../core/fileTypes.ts';
import { artifactTitle } from '../../core/artifactTitle.ts';
import { prototypeAddress, artifactAddress, parsePrototypeAddress, resourceId } from '#studio/files';
import { addressOf, canonicalPath, parseAddress } from '../../core/roots.ts';
import { FORMAT_VERSION, stringifyScene } from './slim.ts';
import { help, run, ToolError, type Ctx, type El, type ArtifactInfo } from './tools.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const PROTOS = path.join(ROOT, 'src', 'prototypes');

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const USAGE = [
  "pnpm canvas <file.excalidraw> <tool> '<json>'",
  'pnpm canvas <file.excalidraw> <tool> --json-file <path>',
  'pnpm canvas <file.excalidraw> <tool> -   (the JSON on standard input)',
  'Add --identify to assign missing identities and refresh the manifest before the tool runs.',
];
const positional: string[] = [];
let jsonFile: string | undefined;
let identify = false;
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--identify') identify = true;
  else if (arg === '--json-file') jsonFile = process.argv[++i] ?? fail('--json-file needs the path of a JSON file.');
  else if (arg.startsWith('--json-file=')) jsonFile = arg.slice('--json-file='.length);
  else positional.push(arg);
}
const [first, second, third] = positional;
if (!first || first === 'help' || first === '--help') {
  const text = help(second);
  console.log(JSON.stringify(second ? text : { usage: USAGE, ...text }, null, 2));
  process.exit(0);
}

// The canvas file, inside a prototype's folder and nowhere else.
const file = path.resolve(process.cwd(), first);
if (!file.endsWith('.excalidraw')) fail(`${first} isn't a canvas. Canvases are .excalidraw files in a prototype.`);
if (!fs.existsSync(file))
  fail(
    `${first} doesn't exist. Make a canvas with + → New canvas in the app, or write an empty one (src/platform/modules/canvas/skills/use-canvas/SKILL.md).`,
  );
const real = fs.realpathSync(file);
// A prototype is src/prototypes/<contributor>/<prototype>/; an artifact of a module's section of prototype-shaped
// folders (a section artifact, src/examples/<id>/) is opened under the section's key (src/platform/core/roots.ts).
const { PROTOTYPE_SECTIONS } = (await import(
  pathToFileURL(path.join(ROOT, 'src', 'platform', 'node', 'lib', 'modules.js')).href
)) as {
  PROTOTYPE_SECTIONS: { key: string; dir: string }[];
};
const inSection = PROTOTYPE_SECTIONS.map(s => ({
  key: s.key,
  rel: fs.existsSync(s.dir) ? path.relative(fs.realpathSync(s.dir), real).split(path.sep) : ['..'],
})).find(s => s.rel[0] !== '..' && !path.isAbsolute(s.rel[0]) && s.rel.length >= 2);
const inProtos = path.relative(fs.realpathSync(PROTOS), real).split(path.sep);
if (!inSection && (inProtos[0] === '..' || path.isAbsolute(path.relative(PROTOS, real)) || inProtos.length < 3))
  fail(
    `${first} isn't in a prototype. A canvas is at src/prototypes/<contributor>/<prototype>/….excalidraw or inside an installed module's prototype section.`,
  );
const [contributor, prototype] = inSection ? [inSection.key, inSection.rel[0]] : inProtos;

const tool = second ?? fail(`Usage:\n  ${USAGE.join('\n  ')}\nTools: pnpm canvas help`);
// The arguments: inline, from a file, or from standard input, all read the same way. A file or pipe written
// by PowerShell can start with a byte-order mark, which isn't JSON, so it's dropped.
if (jsonFile !== undefined && third !== undefined)
  fail('Give the arguments once: inline JSON, --json-file <path>, or - for standard input.');
const input =
  jsonFile !== undefined
    ? {
        from: jsonFile,
        text: fs.existsSync(jsonFile) ? fs.readFileSync(jsonFile, 'utf8') : fail(`${jsonFile} doesn't exist.`),
      }
    : third === '-'
      ? { from: 'standard input', text: fs.readFileSync(0, 'utf8') }
      : third !== undefined
        ? { from: 'the arguments', text: third }
        : undefined;
// V8 doesn't always say where JSON goes wrong ("Unexpected token"). Then the first offending character is
// where a growing prefix fails for a reason other than ending too soon.
const positionOf = (text: string, message: string) => {
  const stated = /at position (\d+)/.exec(message);
  if (stated) return { position: Number(stated[1]), stated: true };
  for (let end = 1; end <= text.length; end++)
    try {
      JSON.parse(text.slice(0, end));
    } catch (error) {
      const at = /at position (\d+)/.exec((error as Error).message);
      if (at ? Number(at[1]) < end : !/end of JSON input/.test((error as Error).message))
        return { position: at ? Number(at[1]) : end - 1, stated: false };
    }
  return undefined;
};
let args: unknown = {};
try {
  if (input) args = JSON.parse(input.text.replace(/^﻿/, ''));
} catch (error) {
  const text = input!.text.replace(/^﻿/, '');
  const found = positionOf(text, (error as Error).message);
  const lines = found && text.slice(0, found.position).split('\n');
  fail(
    `${input!.from === 'the arguments' ? "the arguments aren't" : `${input!.from} isn't`} valid JSON: ${(error as Error).message}` +
      (found && lines && !found.stated
        ? ` (at position ${found.position}, line ${lines.length} column ${lines.at(-1)!.length + 1})`
        : '') +
      (process.platform === 'win32' && input!.from === 'the arguments'
        ? '\nOn Windows the shell can change quotes in inline JSON. Write it to a file and pass --json-file <path>, or pipe it with -.'
        : ''),
  );
}

const text = fs.readFileSync(real, 'utf8');
let scene: {
  elements?: El[];
  appState?: { viewBackgroundColor?: string; gridSize?: number | null };
  studioVersion?: number;
};
try {
  scene = JSON.parse(text);
} catch (error) {
  fail(`${first} isn't valid JSON: ${(error as Error).message}`);
}
if (!Array.isArray(scene!.elements)) fail(`${first} isn't a canvas: it has no list of elements.`);
if ((scene!.studioVersion ?? 1) > FORMAT_VERSION)
  fail(`${first} was written by a newer copy of the app. Update before changing it.`);

// What the tools need to know about the app: the artifacts in this canvas's prototype, from the manifest.
const manifestFile = path.join(ROOT, 'public', 'prototypes', 'manifest.json');
type PrototypeRef = { contributorKey: string; id: string; studioId?: string };
type Manifest = { prototypes: PrototypeRef[]; sections?: Record<string, PrototypeRef[]> };
// A prototype's artifacts are in a file of their own (src/platform/node/build/build-manifest.js).
type ManifestItem = {
  path: string;
  fileType: string;
  studioId?: string;
  states?: { studioId?: string; title: string }[];
};
const itemsOf = (x: PrototypeRef): ManifestItem[] => {
  const file = path.join(ROOT, 'public', 'prototypes', 'artifacts', x.contributorKey, `${x.id}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
};
const { FILE_TYPES } = (await import(
  pathToFileURL(path.join(ROOT, 'src', 'platform', 'node', 'lib', 'file-types.js')).href
)) as {
  FILE_TYPES: Record<string, FileTypeSpec>;
};
const loadManifest = () =>
  fs.existsSync(manifestFile) ? (JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as Manifest) : undefined;
const findCurrent = (m: Manifest) =>
  [...m.prototypes, ...Object.values(m.sections ?? {}).flat()].find(
    x => x.contributorKey === contributor && x.id === prototype,
  );

// Files written directly have no identity and aren't in the manifest until someone runs the command for it.
// Find that out before a tool runs, and name the command, rather than fail on a missing resource ID.
const folder = inSection ? undefined : `src/prototypes/${contributor}/${prototype}`;
const BUILD = 'node src/platform/node/build/build-manifest.js';
type Remedy = { problem: string; command: string; args: string[] };
const remedyFor = async (): Promise<Remedy | undefined> => {
  const identifyIt = (problem: string): Remedy => ({
    problem,
    command: `pnpm studio identify ${folder} --yes`,
    args: ['src/platform/node/cli/studio.js', 'identify', folder!, '--yes'],
  });
  const rebuild = (problem: string): Remedy => ({
    problem,
    command: BUILD,
    args: ['src/platform/node/build/build-manifest.js'],
  });
  if (folder) {
    const [{ auditResourceIdentities }, { INSTALLED_FILE_TYPES }] = await Promise.all([
      import(pathToFileURL(path.join(ROOT, 'src/platform/node/lib/resource-identity-audit.js')).href),
      import(pathToFileURL(path.join(ROOT, 'src/platform/node/lib/installed-file-types.js')).href),
    ]);
    const audit = auditResourceIdentities(ROOT, INSTALLED_FILE_TYPES) as {
      resources: { kind: string; path: string; parent?: string; fileType?: string; studioId: string | null }[];
    };
    const own = audit.resources.filter(r => r.path === `${folder}/meta.json` || r.parent === folder);
    const unidentified = own.filter(r => !r.studioId).map(r => r.path.slice(folder.length + 1));
    if (unidentified.length) return identifyIt(`These files have no identity yet: ${unidentified.join(', ')}.`);
    const m = loadManifest();
    const found = m && findCurrent(m);
    if (!found) return identifyIt('This canvas prototype is missing from the manifest.');
    const listed = itemsOf(found);
    if (!found.studioId || listed.some(i => !i.studioId))
      return identifyIt('The manifest lists artifacts of this prototype without their identities.');
    const paths = new Set(listed.map(i => i.path));
    const unlisted = own
      .filter(r => r.kind === 'artifact' && r.fileType && FILE_TYPES[r.fileType])
      .map(r => r.path.slice(folder.length + 1))
      .filter(p => !paths.has(p));
    if (unlisted.length) return rebuild(`The manifest is out of date: it doesn't list ${unlisted.join(', ')}.`);
    return undefined;
  }
  const m = loadManifest();
  if (!m) return rebuild('There is no manifest yet.');
  if (!findCurrent(m)) return rebuild('This canvas prototype is missing from the manifest.');
  return undefined;
};
let remedy = await remedyFor();
if (remedy && identify) {
  console.error(`${remedy.problem} Running: ${remedy.command}`);
  // Its report goes to stderr, so stdout stays the tool's JSON result.
  const ran = spawnSync(process.execPath, remedy.args, { cwd: ROOT, stdio: ['ignore', 2, 2] });
  if (ran.status !== 0) fail(`${remedy.command} didn't finish. Fix what it reports, then run the tool again.`);
  remedy = await remedyFor();
}
if (remedy) fail(`${remedy.problem}\nRun: ${remedy.command}\nOr add --identify to run it and continue.`);
const manifest = loadManifest()!;
const everything = [...manifest.prototypes, ...Object.values(manifest.sections ?? {}).flat()];

const title = (p: string) => artifactTitle(artifactSlug(p).split('/').pop()!);
const current = findCurrent(manifest)!;
const base = inSection ? addressOf(contributor, prototype) : prototypeAddress(resourceId(current.studioId));
const linkOf = (x: PrototypeRef, item: { path: string; studioId?: string }) =>
  inSection
    ? `${addressOf(x.contributorKey, x.id)}/${artifactSlug(item.path)}`
    : artifactAddress(resourceId(x.studioId), resourceId(item.studioId));
const ctx: Ctx = {
  base,
  artifact(appPath) {
    // A canvas shows only its own prototype's artifacts.
    if (!appPath.startsWith(`${base}/`)) return null;
    const identityAddress = !inSection && parsePrototypeAddress(appPath);
    const address = inSection && parseAddress(appPath.split('/').map(decodeURIComponent).join('/'));
    const proto = identityAddress
      ? everything.find(x => x.studioId === identityAddress.prototypeId)
      : address
        ? everything.find(x => x.contributorKey === address.contributor && x.id === address.id)
        : undefined;
    const items = proto ? itemsOf(proto) : [];
    // A view's named state has an identity of its own and resolves to its view, as that state.
    const state =
      identityAddress &&
      items.flatMap(i => i.states ?? []).find(s => s.studioId && s.studioId === identityAddress.artifactId);
    const artifact = items.find(i =>
      identityAddress
        ? i.studioId === identityAddress.artifactId || (state && i.states?.includes(state))
        : address && artifactSlug(i.path) === address.rest.join('/'),
    );
    if (!artifact) return null;
    const type = FILE_TYPES[artifact.fileType];
    // States are addressed by identity, which a module's section of prototypes doesn't have.
    const states = inSection ? [] : (artifact.states ?? []).filter(s => s.studioId);
    return {
      path: appPath,
      sourcePath: artifact.path,
      title: title(artifact.path),
      type: artifact.fileType,
      typeLabel: type?.label ?? 'File',
      preview: Boolean(type?.capabilities.embeds.includes('canvas')),
      ...(state ? { state: state.title } : {}),
      ...(states.length && proto
        ? {
            states: states.map(s => ({
              title: s.title,
              path: linkOf(proto, { path: artifact.path, studioId: s.studioId }),
            })),
          }
        : {}),
    };
  },
  artifacts: () =>
    everything
      .filter(x => x.contributorKey === contributor && x.id === prototype)
      .flatMap(x => itemsOf(x).map(i => linkOf(x, i)))
      .map(p => ctx.artifact(p))
      .filter((i): i is ArtifactInfo => i !== null),
  linkPath: link =>
    inSection
      ? link.startsWith('/') && !link.startsWith('//')
        ? canonicalPath(link)
        : null
      : parsePrototypeAddress(link)?.artifactId
        ? link
        : null,
};

try {
  const result = run(scene!.elements!, tool, args, ctx);
  if (!['describe', 'help', 'artifacts'].includes(tool)) {
    const { resolveContributor } = await import(
      pathToFileURL(path.join(ROOT, 'src/platform/node/cli/resolve-contributor.js')).href
    );
    const { canChange } = await import(pathToFileURL(path.join(ROOT, 'src/platform/node/build/files/policy.js')).href);
    const prototypeRoot = inSection
      ? path.join(PROTOTYPE_SECTIONS.find(section => section.key === contributor)!.dir, prototype)
      : path.join(PROTOS, contributor, prototype);
    if (!canChange(contributor, resolveContributor(), prototypeRoot))
      fail('Only the prototype owner or an Admin can change this canvas.');
    const metadata = JSON.parse(fs.readFileSync(path.join(prototypeRoot, 'meta.json'), 'utf8'));
    if (metadata.status !== undefined && metadata.status !== 'active')
      fail('Restore this prototype before changing its canvas.');
    resourceId(canvasIdentity.read(text));
    if (fs.readFileSync(real, 'utf8') !== text)
      fail('The canvas changed. Read it again before applying this operation.');
    const next = stringifyScene(result.elements, scene!.appState, undefined, canvasIdentity.read(text));
    const tmp = `${real}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, next);
    fs.renameSync(tmp, real);
  }
  console.log(JSON.stringify(result.result, null, 2));
} catch (error) {
  if (error instanceof ToolError) fail(error.message);
  throw error;
}
