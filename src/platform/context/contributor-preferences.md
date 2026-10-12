---
title: Contributor preferences
description: Module-owned preference schemas, authorized writes, and explicit initialization of retained profiles.
toc: true
---

Contributor format version 2 declares `preferences` as an object of module namespace objects. Identity fields and custom profile fields remain outside it. A module declares `preferences.fields` and matching explicit `preferences.defaults` in `module.ts`. The bounded schema supports required boolean, string, and finite number fields. A module check may add domain validation. Unknown fields remain intact.

Registration writes defaults for enabled, compatible modules. The shared checker validates their namespaces. Disabled modules retain their values and do not validate or write them. Re-enabling preserves existing state. Missing namespaces prevent enablement until initialization is reviewed.

## Node transactions

`#studio/preferences` exposes `readContributorPreferences(root, {actor, contributor?, module})` and `updateContributorPreferences(root, {actor, contributor?, module, base, value})`. Reads return `value` and an opaque source `version`; writes require that version. Only the server- or CLI-resolved contributor can access their own profile through this service. Never take actor identity from request data.

The service validates the current installed schema and enabled state, rejects symbolic paths and stale source, and updates only the selected namespace. Omitted fields, including unknown fields inside that namespace, retain their current values. Submitted values must be JSON; this API does not delete fields. Shared setup transactions provide atomic replacement and rollback. Other namespaces, identity, and custom fields remain intact.

## Explicit initialization

An Admin previews retained profiles with `pnpm studio preferences --plan /tmp/preferences.json`. Before enabling a module, use `--module <id>` to include its defaults while it remains disabled. Review each saved `before` and `after` source, then run `pnpm studio preferences --apply /tmp/preferences.json`. The apply command rechecks authority, declarations, ordinary paths, and every source before writing. Use a fresh plan after edits.

Version 1 profiles are upgraded to version 2 only through this explicit operation. A module can declare `preferences.legacy` as destination field to old top-level field mappings. Onboarding maps its prior dismissed flag, preserving whether the introduction was already shown. Legacy fields remain for human review; initialization does not delete custom data. Invalid or unknown profile versions require manual review.

The updater preserves contributor files and never invokes initialization. After an update, run the saved initialization workflow before checks and build. Repeating initialization on current profiles produces an empty plan.

Identity discovery validates ordinary files and unambiguous identity fields independently of preference-format checks. This allows update synchronization to commit preserved old profiles, then report their required initialization. Normal contributor validation and ordinary preference transactions share the same profile validator and require the current format, valid identity, and namespace envelope. Only explicit initialization accepts version 1.
