---
title: Runtime import repair
description: A separate command repairs retained runtime imports through reviewed plans without changing updater ownership rules.
toc: true
---

The updater remains separate. It preserves existing seed and team files, including unchanged seeds, under [Ownership and updates](ownership.md). Repair is an explicit operation on the resulting studio. It must not run inside update, update continuation, synchronization, development startup, or build.

## Purpose and scope

Shared runtime helpers and empty views have explicit API owners. A studio upgrading from an older release can retain components and empty views that still import obsolete paths. This command plans narrow source repairs. It does not replace retained files with newer scaffolds.

| Legacy target | Allowed named exports | Replacement |
| --- | --- | --- |
| `src/lib/utils.ts` | `cn` | `#studio/runtime` |
| `src/lib/portal.ts` | `PortalContext`, `usePortalContainer` | `#studio/runtime` |
| `src/lib/emptyView.ts` | `emptyView` | `@module/view` |
| A system's `components.json`, `aliases.utils` equal to `@/lib/utils` | Exact JSON string value | `#studio/runtime` |

This is the whole initial migration inventory. The command does not add compatibility files, aliases, or fallback exports. It does not migrate arbitrary private APIs, configuration formats, dependencies, or resource identities.

## Command contract

The command is `repair-runtime-imports`. Paths are repository-relative files or directories. Omitting paths inspects the supported roots.

```sh
# Preview only: summary, unified diffs, blockers, and manual repairs.
pnpm studio repair-runtime-imports
pnpm studio repair-runtime-imports src/systems/product src/prototypes/parker

# Machine-readable preview; stdout contains one JSON object.
pnpm studio repair-runtime-imports src/systems/product --json

# Save the same preview as a plan for subsequent application.
pnpm studio repair-runtime-imports src/systems/product --out /tmp/runtime-repair.json

# Revalidate and display the saved plan; no source writes.
pnpm studio repair-runtime-imports --apply /tmp/runtime-repair.json

# Explicitly apply exactly that plan after validation.
pnpm studio repair-runtime-imports --apply /tmp/runtime-repair.json --yes
```

Preview changes no repository files, Git state, generated files, or dependencies. `--out` creates only the explicitly named plan, using exclusive creation; an existing output requires a new filename. Refuse an output inside source roots or over a tracked repository file. Without `--out`, no plan is saved implicitly.

`--apply` cannot be combined with selection paths or `--out`. `--yes` is valid only with `--apply`; it cannot bypass blockers. Unknown flags fail. There is no force option, automatic subset selection, or interactive prompt.

Supported inputs are tracked `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.mts`, `.cjs`, and `.cts` files within `src/prototypes/`, `src/systems/`, and `src/modules/`, plus system-root `components.json` files. Seed files in these roots receive the same protection as team files. Upstream, generated, mixed, archived, and unregistered system paths are outside automatic repair. Custom module content sections outside these roots require manual repair in this first version.

Inspect disabled team-module source without enabling it or executing it. Exclude dependencies, build output, nested repositories, symlinks, and unsupported files. Explicit unsupported input produces a diagnostic rather than silently broadening the selection. Report candidate obsolete imports outside supported scope as manual work when discovered; do not claim a repository-wide repair from a narrower scan.

### Saved plan

JSON and human output describe the same plan. The versioned JSON includes:

| Field | Purpose |
| --- | --- |
| `schemaVersion`, `migrationId` | Identify the plan schema and this fixed migration inventory. |
| `root`, `head`, `toolFingerprint` | Bind the preview to the canonical checkout, Git revision, and repair implementation. |
| `actorId`, `selection` | Record the resolved contributor's permanent ID and explicit scan scope. |
| `inputs` | Hashes of ownership rules, settings, profiles, relevant system/prototype metadata, legacy-helper evidence, and destination entries used to plan. |
| `changes` | Sorted unique paths, tier, resource owner, byte hash and mode before repair, exact edits, resulting byte hash, and unified diff. |
| `diagnostics` | Path, source location where available, stable reason code, explanation, and manual next action. |
| `applicable` | True only if every candidate in the selected scope is supported and currently authorized. |

The plan is a local review artifact, not an authorization token or executable patch. Application rederives every edit using the fixed migration inventory and compares the result with the saved plan. Tampered paths, replacement text, hashes, or omitted candidates fail. A manually edited plan cannot choose a subset; select paths and create a fresh preview instead.

Preview returns exit 0 for an applicable plan, including an empty plan. Exit 1 means manual work or a scope/authority blocker remains. Exit 2 means invalid invocation, malformed plan, stale inputs, or operational failure. Diagnostics remain available with `--json` or `--out` on exit 1. Apply returns 0 only after all planned source writes succeed, 1 for a non-applicable plan, and 2 for validation or write failure.

## Transformation rules

Use the existing TypeScript parser to locate static named imports and named re-exports. Replace only the module-specifier contents. Preserve bindings, aliases, type modifiers, quotation style, comments, BOM, line endings, indentation, and all bytes outside edited ranges. Keep separate import declarations separate; merging them adds unnecessary edits.

Recognize `@/lib/<name>` and relative imports only when their normalized target is exactly a legacy entry in the inventory. Accept an explicit extension only when existing resolver rules identify that same entry. Never match by filename alone or redirect a system's own `lib/utils.ts`.

Every imported or re-exported name must appear in the allowed-export column. Default imports, namespace imports, star re-exports, side-effect imports, dynamic imports, `require`, import attributes, parse errors, and unknown exports need manual repair. If one candidate in a file is ambiguous, propose no automatic edits for that file. Do not modify examples inside comments, strings, Markdown, or generated output.

For `components.json`, locate the exact `aliases.utils` JSON value and replace only its string contents. Duplicate keys, invalid JSON, or a different alias value are manual cases. Preserve every other setting and byte; do not serialize the entire file.

A matching path alone does not prove matching helper behavior. If a legacy helper still exists, compare its bytes with the supported release's known implementation. If removed, inspect its last pre-removal Git blob. Custom code, missing provenance, or an unsupported implementation blocks repairs for consumers of that helper. Provide a manual explanation; never evaluate the helper or assume its custom behavior matches the new API. The implementation must include known helper evidence for the supported `v0.3.0` upgrade baseline.

Confirm destination exports and their executable environments using the existing API policy. A Node consumer of browser-only portal helpers requires manual redesign. `@module/view` requires the View library to be installed and enabled for that consumer. Repair must not enable a module, change a prototype's system assignment, or add a package to make a replacement valid.

## Contributor safeguards and application

Use [Contributor scope](contributor-scope.md) and the current identity/grant policies. A contributor can repair their owned prototypes; an assigned maintainer can repair their active system; an Admin can repair supported shared scopes. Resolve permanent IDs and prototype ownership from metadata. Seed tier alone grants no authority. Invalid or missing authority data blocks application.

Application follows these ordered requirements:

1. Load the saved plan as data. Resolve the current actor and canonical checkout. Refuse an active Git merge, changed HEAD, changed tool fingerprint, invalid ownership map, or malformed plan.
2. Re-read all planning inputs and selected source bytes. Recompute candidate inventory, permissions, safe destinations, and exact edits. A new candidate, revoked grant, changed owner/assignment, changed module availability, missing file, changed mode, or stale hash requires a new preview.
3. Require each selected repair target to be tracked and unchanged in the index and working tree relative to HEAD. Previously committed customization is supported. Unrelated dirty or untracked work may remain and must not be staged, reset, or rewritten. Preview can inspect dirty targets but marks them non-applicable until the person preserves their work and replans.
4. Reject absolute paths, traversal, duplicates, symlinked targets or ancestor directories, hard-linked targets, and paths escaping the canonical checkout. Reject source changes to upstream, mixed, or generated tiers even if a plan requests them. Recheck immediately before each write.
5. Apply only the reviewed source edits, with same-directory atomic replacement and preserved file mode. Reuse the transaction mechanics in `node/lib/studio-setup.js`; strengthen shared safety checks only as needed rather than creating another writer.
6. On a caught write failure, restore earlier writes only when their current bytes still equal this operation's result. Never overwrite a concurrent edit during rollback. Report restored files, remaining repairs, and any rollback failure. Same-file atomic replacement does not promise crash-atomicity across multiple files; after interruption, inspect Git diffs and create a new preview.
7. Report changed paths and resulting hashes. Leave Git index, branch, commits, tags, remotes, and installed-release records untouched. The command does not run installation, synchronization, checks, or build. Verification is an explicit next operation.

Checks must be refreshed from disk rather than cached authority. The CLI dispatches before the normal Studio runtime bootstrap, so obsolete imports cannot prevent preview. Reuse ownership, safe-path, declaration parsing, identity, permission, and API-policy primitives without executing team modules, system declarations, or prototype code. Avoid importing a helper that eagerly loads the runtime registry; separate its reusable policy only if required.

Filesystem checks provide the Studio workflow's safeguards, not a security boundary against an actor who can already rewrite the checkout. Do not claim that hashes or sequential checks lock the repository against concurrent processes.

## Representative diffs

These are illustrative outputs, not repairs to apply to this checkout. The first uses the released `v0.3.0` dialog imports; other examples model retained customization. Only the specifier or alias value changes.

### Retained seed dialog

```diff
--- a/src/systems/product/components/dialog/dialog.tsx
+++ b/src/systems/product/components/dialog/dialog.tsx
@@ -1,7 +1,7 @@
 import * as React from "react"
 import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
-import { cn } from "@/lib/utils"
-import { usePortalContainer } from "@/lib/portal"
+import { cn } from "#studio/runtime"
+import { usePortalContainer } from "#studio/runtime"
 
 import { Button } from "@/systems/product/components/button"
 import { XIcon } from "lucide-react"
```

This applies equally to an unchanged seed and a committed customized dialog. Its markup, portal container call, styling, and event handlers retain their original bytes.

### Customized helper and re-export

```diff
--- a/src/prototypes/alex/checkout/_classes.ts
+++ b/src/prototypes/alex/checkout/_classes.ts
@@ -1,4 +1,4 @@
 // Keep our compact spacing rule.
-import { cn as classes } from '../../../lib/utils';
+import { cn as classes } from '#studio/runtime';
 export const compact = (active: boolean) => classes('gap-2', active && 'font-bold');
-export { cn as mergeClasses } from '@/lib/utils';
+export { cn as mergeClasses } from '#studio/runtime';
```

The relative import resolves to `src/lib/utils.ts`. A relative import resolving to the prototype's own utility would remain unchanged.

### Retained empty view

```diff
--- a/src/prototypes/alex/checkout/review.tsx
+++ b/src/prototypes/alex/checkout/review.tsx
@@ -1,5 +1,5 @@
 /** @studio-id n4jk29wdmpxwge76 */
 /** @lofi */
-import { emptyView as pending } from '@/lib/emptyView';
+import { emptyView as pending } from '@module/view';
 // Alex will build the review screen after checkout testing.
 export default pending;
```

The view's permanent identity, fidelity declaration, custom comment, and default export remain unchanged. Repair does not identify an old view missing an ID; report that as separate identity work if verification finds it.

### Saved component-generator alias

```diff
--- a/src/systems/product/components.json
+++ b/src/systems/product/components.json
@@ -18,3 +18,3 @@
   "aliases": {
     "components": "@/systems/product/components",
-    "utils": "@/lib/utils",
+    "utils": "#studio/runtime",
```

### Manual case: custom exports

```ts
import { cn, teamDensity } from '@/lib/utils';
```

The diagnostic is `unsupported-export` at `teamDensity`. No diff is offered for this file. Preserve the custom helper in a team-owned location, update its consumer manually, then preview again. A namespace import or a customized legacy helper receives the same conservative treatment with its own reason code.

## After an update reports failed verification

An update can merge successfully, preserve retained files, and then fail checks or the production build because those files use obsolete imports. Stay on the update branch. Preview repair, resolve manual cases, preserve those edits in a separate commit, and create a fresh plan. Apply the reviewed plan, run `pnpm check` and `pnpm build`, then review and commit the repair separately. Review the update branch before merging it into the team's branch.

`update --continue` finishes an unresolved merge. It does not resume verification after a committed update or apply runtime repairs. A successful repair command confirms source writes only; the separate checks and runtime review establish whether the upgraded studio works.

The executable old-source acceptance fixture is:

```sh
node src/platform/node/check/upgrade-test.js --from v0.3.0 --repair-runtime
```

During platform development, add `--working` to test local candidate changes. Add `--keep` to retain the isolated studio for development and production browser verification. The fixture reports its `runtime-browser.json` with permanent prototype and artifact addresses.
