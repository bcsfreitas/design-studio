---
title: API foundations closure and backlog
description: Bounded completion criteria and deferred measurements for the API foundations refactor.
---

Status: closed. The bounded patch and its supported development/production workflows are verified.

## Completion boundary

The API foundations refactor covers explicit execution environments, shared runtime helpers, View-owned empty views, separate import repair, structured clients, identity and lifecycle contracts, centralized mutation synchronization, owner routes, shared artifact inspection and hosting, preferences, build assets, and system services.

The closing patch is limited to four reproduced defects: accessor-driven preference data loss, declaration-cache alias and native-export leakage, subscriber failure propagation, and mutable shared asset results. Completion requires their regressions, the full release suite, production compilation, and development/production workflows to pass while preserving contributor-owned sources.

The closing verification passed 549 release tests, production compilation, contract compatibility, formatting, and development/production workflows. Contributor-owned source fingerprints were unchanged. The refactor is closed. New findings use normal maintenance triage. Reopen this milestone only for a demonstrated failure of its accepted supported workflows or contributor-data protection; an additional architecture observation alone does not reopen it.

Authoritative contracts remain with [public API environments](../context/modules.md#environment-policy), [contributor preferences](../context/contributor-preferences.md), [build assets](../context/build-assets.md), [artifact resolution and hosting](../context/file-types.md#artifact-resolution-and-host-declarations), [Systems routes](../modules/systems/README.md#local-owner-routes), and [system services](../context/system-services.md).

## Design references

The lifecycle design drew on [Open CoDesign's separate source and preview revisions](https://github.com/OpenCoworkAI/open-codesign/blob/main/SOURCE_EDITING.md) and OpenDesign's pinned [runtime state](https://github.com/nexu-io/open-design/blob/802708f6c9f294347ef777b1fda49b9cbe26ef72/packages/contracts/src/runtime/preview-runtime-state.ts), [observability](https://github.com/nexu-io/open-design/blob/802708f6c9f294347ef777b1fda49b9cbe26ef72/packages/contracts/src/runtime/preview-observability.ts), and [bounded refresh service](https://github.com/nexu-io/open-design/blob/802708f6c9f294347ef777b1fda49b9cbe26ef72/apps/daemon/src/live-artifacts/refresh-service.ts). These are historical references, not Studio contracts or required task reads.

## Deferred improvements

- Benchmark representative large studios. Measure cold Systems props extraction, watched-source invalidation, payload size, asset-copy allocations, and theme changes with many mounted previews. Record sizes and latency before choosing optimizations.
- If measurements justify it, make Systems props computation incremental and index theme-class lookup to avoid cloning the entire system catalog per ThemeScope render. These remain performance follow-ups, not refactor completion requirements.
- Measure production startup and lazy feature loading before changing bundle boundaries. Existing chunk-size warnings belong to performance triage.

Keep future work in small issue-scoped changes with concrete acceptance criteria. Preserve the existing ownership boundaries; do not start another broad API redesign without a demonstrated need and an approved proposal.
