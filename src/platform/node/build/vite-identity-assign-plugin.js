// Gives a view, document or canvas created directly during `pnpm dev` (by an agent or your editor) its identity,
// the same way the file menu's "New file" does (src/platform/node/build/files/ops.js): one fresh ID from the
// retained inventory, written through the file type's identity adapter. Named view states get theirs too.
//
// Only files in the running contributor's own prototypes are touched, and only ones with no identity: an existing ID
// is never rewritten, so a copied file that kept its original's ID stays a duplicate for the identity audit to
// reject. While the studio has identity problems nothing is assigned, as with the file menu.
//
// It runs before the manifest watch (vite.config.ts), so the manifest rebuilt for the new file already has its ID.
// A file that starts empty, as editors often create it, waits for its first content.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assignChildIdentities } from "../../core/resourceIdentity.ts";
import { isHelper, matchFileType } from "../../core/fileTypes.ts";
import { FILE_TYPES, INSTALLED_FILE_TYPES } from "../lib/file-types.js";
import {
  allocateResourceIdentity,
  retainedResourceIds,
} from "../lib/resource-identity-lifecycle.js";
import { canonicalDirectory } from "../lib/safe-paths.js";
import { resolveContributor } from "../cli/resolve-contributor.js";
import { ROOT } from "./files/paths.js";

const DEFAULTS = {
  root: ROOT,
  types: FILE_TYPES,
  retained: INSTALLED_FILE_TYPES,
};
const STALE_MS = 10_000;

// More than one dev server can watch the same studio. One lock per studio (outside it, so no watcher sees it) lets
// one of them assign at a time; the others then find the identity already written.
function withStudioLock(root, run) {
  const lock = path.join(
    os.tmpdir(),
    `studio-identity-${crypto.createHash("sha1").update(root).digest("hex")}.lock`,
  );
  const deadline = Date.now() + 2000;
  for (;;) {
    try {
      fs.closeSync(fs.openSync(lock, "wx"));
      break;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs > STALE_MS)
          fs.rmSync(lock, { force: true });
      } catch {
        /* released meanwhile */
      }
      if (Date.now() > deadline)
        throw new Error("another dev server is still assigning identities.");
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
    }
  }
  try {
    return run();
  } finally {
    fs.rmSync(lock, { force: true });
  }
}

// Assigns a missing identity to one file. Returns { assigned, studioId? , reason? }; `pending` means try again on
// its next change (it's still empty). Throws when the studio's identity inventory has problems.
export function assignNewArtifactIdentity(file, contributor, options = {}) {
  const { root, types, retained } = { ...DEFAULTS, ...options };
  const parts = path.relative(root, file).split(path.sep);
  const [src, prototypes, owner, prototype, ...rest] = parts;
  if (src !== "src" || prototypes !== "prototypes" || !rest.length)
    return { assigned: false, reason: "outside" };
  if (!contributor || owner !== contributor)
    return { assigned: false, reason: "not-own" };
  if (
    [prototype, ...rest].some(
      (part) =>
        part.startsWith(".") || isHelper(part) || part === "node_modules",
    )
  )
    return { assigned: false, reason: "not-artifact" };
  const spec = types[matchFileType(types, file)];
  if (!spec?.inPrototype) return { assigned: false, reason: "not-artifact" };
  if (!spec.identity) return { assigned: false, reason: "no-adapter" };
  const prototypeDir = path.join(root, "src", "prototypes", owner, prototype);
  if (
    !canonicalDirectory(path.dirname(file), root) ||
    !fs.existsSync(path.join(prototypeDir, "meta.json"))
  )
    return { assigned: false, reason: "not-prototype" };
  if (!fs.existsSync(file) || !fs.lstatSync(file).isFile())
    return { assigned: false, reason: "gone" };
  return withStudioLock(root, () => {
    const source = fs.readFileSync(file, "utf8");
    if (!source.trim()) return { assigned: false, reason: "pending" };
    try {
      if (spec.identity.read(source) !== null)
        return { assigned: false, reason: "identified" };
    } catch {
      return { assigned: false, reason: "unreadable" };
    }
    const used = retainedResourceIds(root, retained);
    const studioId = allocateResourceIdentity(used);
    const next = assignChildIdentities(
      spec.identity.write(source, studioId),
      spec,
      () => allocateResourceIdentity(used),
    );
    // Written only if nothing else wrote the file meanwhile; its next change gets another try.
    if (fs.readFileSync(file, "utf8") !== source)
      return { assigned: false, reason: "pending" };
    fs.writeFileSync(file, next);
    return { assigned: true, studioId };
  });
}

export default function identityAssign(options = {}) {
  return {
    name: "studio-identity-assign",
    apply: "serve",
    configureServer(server) {
      const root = options.root ?? ROOT;
      let contributor;
      const me = () =>
        contributor === undefined
          ? (contributor = (options.contributor ?? resolveContributor)())
          : contributor;
      // Files added this session that are still waiting for content (or lost a race with another write).
      const pending = new Set();
      const assign = (file) => {
        let result;
        try {
          result = assignNewArtifactIdentity(file, me(), options);
        } catch (error) {
          pending.delete(file);
          server.config.logger.warn(
            `${path.relative(root, file)} was not given an identity: ${error.message}\nFix the problem, then run \`pnpm studio identify <prototype-folder> --yes\`.`,
          );
          return;
        }
        if (result.reason === "pending") pending.add(file);
        else pending.delete(file);
        if (result.assigned)
          server.config.logger.info(
            `Assigned identity ${result.studioId} to ${path.relative(root, file)}`,
            {
              timestamp: true,
            },
          );
      };
      server.watcher.on("add", assign);
      server.watcher.on("change", (file) => {
        if (pending.has(file)) assign(file);
      });
      server.watcher.on("unlink", (file) => pending.delete(file));
    },
  };
}
