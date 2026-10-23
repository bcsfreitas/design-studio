import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import identityAssign, {
  assignNewArtifactIdentity,
} from "./vite-identity-assign-plugin.js";
import { FILE_TYPES } from "../lib/file-types.js";
import { auditResourceIdentities } from "../lib/resource-identity-audit.js";

const read = (spec, file) =>
  FILE_TYPES[spec].identity.read(fs.readFileSync(file, "utf8"));

// A studio with two contributors' prototypes in a temporary folder.
function fixture() {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "identity-assign-")),
  );
  for (const owner of ["ana", "bea"]) {
    const dir = path.join(root, "src", "prototypes", owner, "sample");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "meta.json"),
      JSON.stringify({ title: "Sample", systemId: null }, null, 2) + "\n",
    );
  }
  const at = (owner, ...rel) =>
    path.join(root, "src", "prototypes", owner, "sample", ...rel);
  return {
    root,
    at,
    done: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

// The plugin against a stand-in dev server: its watcher is an event emitter and its logger collects messages.
function serve(root, contributor = "ana") {
  const watcher = new EventEmitter();
  const log = [];
  const logger = {
    info: (message) => log.push(["info", message]),
    warn: (message) => log.push(["warn", message]),
  };
  const plugin = identityAssign({ root, contributor: () => contributor });
  assert.equal(plugin.apply, "serve");
  plugin.configureServer({ watcher, config: { logger } });
  return { emit: (kind, file) => watcher.emit(kind, file), log };
}

test("a view, document and canvas created in your own prototype get an identity, and the audit accepts them", () => {
  const { root, at, done } = fixture();
  try {
    const { emit, log } = serve(root);
    const files = [
      [
        "view",
        at("ana", "screen.tsx"),
        "export default function Screen() { return null; }\n",
      ],
      ["document", at("ana", "notes", "brief.md"), "# Brief\n"],
      [
        "canvas",
        at("ana", "board.excalidraw"),
        '{"type":"excalidraw","elements":[]}\n',
      ],
    ];
    for (const [, file, text] of files) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text);
      emit("add", file);
    }
    const ids = files.map(([type, file]) => read(type, file));
    assert.ok(ids.every((id) => typeof id === "string" && id.length > 0));
    assert.equal(new Set(ids).size, 3);
    assert.equal(log.filter(([level]) => level === "info").length, 3);
    const audit = auditResourceIdentities(root, FILE_TYPES);
    assert.deepEqual(audit.problems, []);
    assert.deepEqual(
      audit.missing.filter((file) => !file.endsWith("meta.json")),
      [],
    );
  } finally {
    done();
  }
});

test("named view states receive their identities with the view", () => {
  const { root, at, done } = fixture();
  try {
    const file = at("ana", "states.tsx");
    fs.writeFileSync(
      file,
      "export const states = [{ title: 'Empty', props: {} }, { title: 'Full', props: {} }];\nexport default function S() { return null; }\n",
    );
    const result = assignNewArtifactIdentity(file, "ana", { root });
    assert.equal(result.assigned, true);
    const children = FILE_TYPES.view.identity.children.read(
      fs.readFileSync(file, "utf8"),
    );
    assert.deepEqual(
      children.map((child) => child.key),
      ["Empty", "Full"],
    );
    assert.ok(
      children.every(
        (child) => child.studioId && child.studioId !== result.studioId,
      ),
    );
  } finally {
    done();
  }
});

test("existing identities are never rewritten, and a copy that kept its ID stays rejected", () => {
  const { root, at, done } = fixture();
  try {
    const { emit } = serve(root);
    const original = at("ana", "screen.tsx");
    fs.writeFileSync(
      original,
      "export default function Screen() { return null; }\n",
    );
    emit("add", original);
    const text = fs.readFileSync(original, "utf8");
    emit("add", original);
    emit("change", original);
    assert.equal(fs.readFileSync(original, "utf8"), text);

    const copy = at("ana", "screen copy.tsx");
    fs.writeFileSync(copy, text);
    emit("add", copy);
    assert.equal(fs.readFileSync(copy, "utf8"), text);
    assert.match(
      auditResourceIdentities(root, FILE_TYPES).problems.join("\n"),
      /already declared/,
    );

    // While that duplicate stands, nothing new is assigned, as with the file menu; the dev server says why.
    const { emit: emitAgain, log } = serve(root);
    const next = at("ana", "other.tsx");
    fs.writeFileSync(
      next,
      "export default function Other() { return null; }\n",
    );
    emitAgain("add", next);
    assert.equal(read("view", next), null);
    assert.match(
      log.find(([level]) => level === "warn")[1],
      /already declared/,
    );
  } finally {
    done();
  }
});

test("no identity is assigned outside the contributor's own prototype", () => {
  const { root, at, done } = fixture();
  try {
    const { emit } = serve(root);
    const write = (
      file,
      text = "export default function X() { return null; }\n",
    ) => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text);
      emit("add", file);
      return file;
    };
    const others = [
      write(at("bea", "screen.tsx")),
      write(at("ana", "_helpers", "part.tsx")),
      write(at("ana", "_part.tsx")),
      write(path.join(root, "src", "prototypes", "ana", "loose.tsx")),
      write(
        path.join(root, "src", "prototypes", "ana", "no-meta", "screen.tsx"),
      ),
      write(path.join(root, "src", "systems", "demo", "screen.tsx")),
    ];
    for (const file of others) assert.equal(read("view", file), null, file);
    const unknown = write(at("ana", "data.json"), "{}\n");
    assert.equal(fs.readFileSync(unknown, "utf8"), "{}\n");

    // Not a registered contributor: nothing is assigned anywhere.
    const { emit: anonymous } = serve(root, null);
    const mine = at("ana", "later.tsx");
    fs.writeFileSync(mine, "export default function L() { return null; }\n");
    anonymous("add", mine);
    assert.equal(read("view", mine), null);
  } finally {
    done();
  }
});

test("a file created empty gets its identity with its first content", () => {
  const { root, at, done } = fixture();
  try {
    const { emit } = serve(root);
    const file = at("ana", "notes.md");
    fs.writeFileSync(file, "");
    emit("add", file);
    assert.equal(fs.readFileSync(file, "utf8"), "");
    fs.writeFileSync(file, "# Notes\n");
    emit("change", file);
    assert.ok(read("document", file));
  } finally {
    done();
  }
});
