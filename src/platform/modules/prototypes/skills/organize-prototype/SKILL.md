---
name: organize-prototype
description: "Rename, move, duplicate, archive, restore, or remove a Design Studio prototype and preserve its links and original work."
---

# Organize a prototype

Use `pnpm studio context src/prototypes/<key>/<id> --json` to inspect assignment, rebuild, and contributor scope. Inspect metadata and incoming links before structural changes. Read the relevant [prototype contract](../../README.md) sections for the requested operation.

For rename or move, update folder paths, metadata ordering, and internal links together. Report external incoming links for their owners to update. For duplication, preserve the source and operate in the new exploration; a requested system rebuild follows [build-prototype](../build-prototype/SKILL.md).

The running dev server repairs known internal references for app moves and identifiable filesystem renames. Check the result before making further replacements; avoid applying the same relative-path rewrite twice. For offline moves or dynamic paths, update references explicitly. Automatic repair does not update incoming links in another prototype.

## Archive or restore

Read the prototype contract's [archiving and deployment definition](../../README.md#archiving-and-deployment) before changing publication status. It owns status values, scope, and exclusion behavior.

- Prefer archiving when the person wants to set work aside for later. Delete only when requested.
- Archive or restore the whole prototype using its metadata or local controls. Do not invent per-artifact status fields.
- Check active links before archiving and resolve warnings about excluded targets.
- Apply the [contributor scope](../../../../context/contributor-scope.md).

The [Prototypes chapter](../../../documentation/pages/prototypes.md#how-do-i-organize-artifacts) explains the local controls when the Manual is enabled.

## Delete

Delete only when the person asks. Run `pnpm studio delete-prototype src/prototypes/<key>/<id>` first and show them its preview: incoming links from other prototypes, canvas and document references that would break, and untracked files or uncommitted changes that would be lost. Add `--json` for a structured preview. The command applies the same owner-or-Admin permissions as other prototype mutations.

Apply with `--yes` only after the person confirms what would be lost. The command removes the folder permanently and refreshes the manifest, so navigation and canvases show no ghost. If it reports a held folder, stop what holds it, then run the command again. Report the incoming links it listed for their owners to update. The app's Delete control moves the folder to the Trash instead.

## Verify

Check navigation, retained links, and requested publication status. Follow the platform working context for build and commit requirements. Report preserved originals and any unresolved incoming links.
