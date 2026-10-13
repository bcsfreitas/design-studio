---
title: Artifact service architecture
description: Approved ownership boundaries for Systems operations, artifact resolution, and shared presentation.
toc: true
---

The approved steps 9–11 architecture is implemented. The authoritative contracts are [Systems](../modules/systems/README.md#local-owner-routes), [artifact resolution and host declarations](file-types.md#artifact-resolution-and-host-declarations), and [Canvas hosting](../modules/canvas/README.md#shared-artifact-host).

## Ownership boundaries

| Owner | Responsibility |
| --- | --- |
| Platform services | Safe paths, source versions, contributor authorization, mutation synchronization, current inventories, and reference availability. |
| Systems | Source, skill, and component-documentation routes and their typed clients. |
| Artifact resolver | Synchronous metadata inspection and lazy inventory completion through one scope and availability policy. |
| Artifact host | Shared frames/cards, renderer preparation, module-owned pending feedback, and error containment. |
| Host callers | Dimensions, navigation, interaction, presentation preference, mounting, and visibility. |
| Format modules | Source loading, rendering, recovery, and displayed-output lifecycle evidence. |

Generic file operations no longer contain Systems creation cases. Systems resolves permanent identities before current authorization and source checks. Mutation receipts and other-tab notifications share one inventory; origin-tab synchronization uses the generic mutation queue. Source reads and writes retain bounded requests and typed conflicts.

Inspection does not import format renderers. Explicit host declarations own scope restrictions; absent hosts leave retained references valid but unavailable. Markdown's `document` host belongs to the shared reader and remains independent of the optional Document file type. Both supplied hosts preserve same-prototype references. Team hosts declare owner-prefixed IDs and use the same public services.

Published diagnostics use only published evidence. Disabled source is not published for diagnostic completeness. Persisted prototype identities and scene links retain their existing formats. The stable declaration changes belong to the unreleased 0.4.0 contract and follow released-baseline checks.

## Rendering and retention

Markdown supplies current origin metadata and responsive dimensions. Canvas supplies scene dimensions, admission, visibility, and overview labels. The shared host uses View's existing iframe protocol and preserves module-owned lifecycle evidence.

Canvas retains its 150 ms admission interval, target budget of 30, visibility margins, five-second retention grace, opening readiness, and camera behavior. Hiding a retained preview skips layout and paint without unmounting it. Overview transitions must not replace the child document or reset its readiness evidence.

## Verification and visual review

Regression coverage includes owner authorization, source conflicts, escaped/symlinked/stale targets, declared host validation, reference equivalence, lazy inventories, and renderer-free inspection. The existing team fixture exercises a namespaced host through public APIs. Release verification includes optional-module removal and retained-content upgrade fixtures.

The Markdown visual checkpoint covers responsive preview dimensions, compact cards, pending/error presentation, inert content, and opening links. The Canvas checkpoint covers shared frames/cards, overview labels, panning, zooming, opening feedback, and retained previews. Automated lifecycle and inventory evidence complements these visual checks.
