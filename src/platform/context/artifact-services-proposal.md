---
title: Artifact services proposal
description: Architecture review for Systems routes, shared artifact resolution, and one rendering host in steps 9–11.
toc: true
---

**Status: proposed for review.** Steps 9–11 are not implemented. This proposal builds on the completed client, identity, and synchronization boundaries in steps 5–8.

## Recommended boundaries

| Owner | Responsibility | Removals |
| --- | --- | --- |
| Generic platform services | Safe paths, source versions, transactions, contributor authority, mutation synchronization, reference normalization, and artifact availability. | Repeated transport, conflict, path, and availability decisions. |
| Systems | System source routes, skill creation, component documentation, and their typed clients. | `/__studio/system-source`, Systems branches in the generic file-operation union and endpoint. |
| Platform artifact resolver | Resolve references against current inventories and report scope, availability, and supported presentation without mounting content. | Competing Document and Canvas resolution paths. |
| Platform artifact host | Shared preview/card/frame, pending and error rendering, and renderer preparation. | Duplicate host rendering and public consumers reading raw registries. |
| Host callers | Explicit surface, dimensions, interaction policy, navigation, and mounting/visibility decisions. | No caller-owned renderer lookup or availability policy. |
| Format modules | Source loading, format rendering, source recovery, and lifecycle evidence. | No format-specific branches in the generic resolver or host. |

Keep executable resolution in `#studio/data` and rendering in `#studio/ui`, both application-only. There is no need for another API entry or a Systems runtime library. Keep `FILE_TYPES`, `fileTypeModules`, React component lookup, and discovery private.

## Step 9: Systems routes

Use Systems' existing `server.ts` dispatcher. Add three narrow routes:

| Route | Request | Result |
| --- | --- | --- |
| `systems/source` | Read, write, or reveal a system source target. Writes carry the last-read version. | Content/version for reads; new version and warnings for writes; explicit reveal result. |
| `systems/skill` | Active system identity, skill name, and description. | Created location and updated manifest. |
| `systems/component-docs` | Active system identity and component selector. | Created locations and updated manifest. |

Resolve a permanent system ID through the current directory before authorizing a write. Any source path stays relative to that resolved scope. Do not let request paths, stale labels, or proposed grants select authority. Preserve Studio's separate Admin-only scope and active-system maintainer policy. Do not expand which source files can be edited.

Reuse the existing source version and ordinary-file/ancestor checks, declaration readers, and transaction writer. Move the existing format-specific mechanics into Systems without writing another filesystem safety or permission layer. Source conflicts must still reach the editor as `SourceChanged`; use shared client failure conversion rather than message matching.

Mutation routes provide the same manifest in their HTTP receipt and the dispatcher's HMR publication. The origin tab applies the receipt through the existing mutation queue; other tabs apply the existing notification. Publish a typed `callModuleMutation` client only when these routes provide its demonstrated consumers. Ordinary `callModule` reads and onboarding claims remain transport-only.

Migrate Systems source editors, new-skill controls, and component-documentation generation first. Then remove `create-skill` and `add-docs` from the internal generic union and handlers. The public generic `FileOp` already excludes them. Do not retain forwarding endpoints or compatibility branches.

**Accept when:** component documentation and skill creation update navigation in two tabs; authorized source writes retain version conflicts; unauthorized, archived, escaped, symlinked, and stale targets fail without writes; generic file operations contain no Systems cases; CLI and editor workflows retain their existing results.

## Step 10: Resolve before rendering

Use one request and one result model for Documents, Canvas, and the existing team fixture. The following sketches describe the shape, not final TypeScript signatures:

```ts
type ArtifactRequest = {
  reference: string;
  origin: ArtifactContext; // validated against the current inventory
  surface: HostSurface;
};

type ArtifactResolution =
  | { state: 'pending'; reason: 'inventory' }
  | { state: 'unavailable'; code: AvailabilityCode; message: string }
  | {
      state: 'resolved';
      target: Readonly<ArtifactContext>;
      href: string;
      presentation: 'preview' | 'card';
      preview: { available: boolean; code?: AvailabilityCode; message?: string };
    };
```

`inspectArtifact(request)` performs a synchronous lookup against loaded metadata. `resolveArtifact(request, { signal })` completes missing inventory through the existing lazy loader, then uses the same lookup and policy engine. Neither loads a format renderer or mounts React. This supports Canvas's synchronous initial sizing without making production download all artifact catalogs.

Expose metadata already public through `ArtifactContext`, not declarations or component constructors. Do not trust caller-supplied system assignments or renderer labels. Resolve them from the inventory. Unknown IDs never become filesystem paths. Keep permanent ID addresses distinct from source-relative references and declared content addresses; normalization remains private.

Return machine-readable reasons for invalid reference, unavailable inventory, inactive format, unsupported scope/surface, and missing assigned system. A resolved artifact can still use a card when preview is unavailable. Renderer/source preparation errors belong to step 11, not reference resolution.

The current published inventory omits disabled formats. An absent permanent ID cannot prove whether its file was deleted or its module disabled. Preserve that distinction in the contract: return `unavailable` when published evidence is insufficient. Development can give a precise inactive-format reason using retained metadata. Do not publish additional disabled-file metadata or source merely to sharpen an error message. All three consumers must agree within the same environment and evidence set.

### Explicit host surfaces

Replace the closed surface union with declared surface IDs and owner policies. Host declarations specify supported content scopes and reference restrictions. The resolver enforces those policies; callers cannot loosen them.

- The shared Markdown reader owns `document`. It remains available when the optional Documents file type is disabled or removed.
- Canvas owns `canvas`; its host is available only while Canvas is enabled.
- Team surfaces use their module namespace, such as `fixture/storyboard`. Reject malformed IDs and duplicate claims.
- Capability declarations may retain references to an absent host. Absence means unavailable presentation, not invalid retained file content. Do not infer that a surface is enabled from its name.

Preserve both current supplied restrictions: Canvas resolves only its own prototype, and document source references stay inside their origin prototype. Reject other origins, traversal, helper files, and unsupported content scopes. A future cross-prototype host needs an explicit policy proposal rather than a new boolean at a call site.

**Accept when:** a common table of references yields equivalent decisions in Documents, Canvas, and a team host; permanent references survive source renames; relative references preserve current scope rules; disabled/removed formats and hosts are recoverable; missing systems block only consuming previews; production loads only the required inventory; no renderer is imported during inspection.

## Step 11: One host, caller-owned lifecycle policy

Export `ArtifactHost` through `#studio/ui`. It consumes the request/resolution service and explicit layout/presentation inputs. It rechecks current availability when inventories or module state change. Do not make a cached resolution authoritative after its underlying inventory changes.

The host owns renderer preparation, shared frame/card presentation, module-owned pending surfaces, error containment, and consistent recovery actions. It uses the existing View iframe host; it does not render prototype components in Studio's document or introduce another iframe protocol. Keep View's preview bootstrap private.

The caller supplies width/height, optional label, preview-versus-card preference, and interaction mode. A caller may choose a card even when preview is available; it cannot force an unavailable preview. Documents retains responsive measurement and inert embedded content. Canvas retains its own element dimensions and inert preview policy.

Canvas continues to own admission and retention: one new live preview per 150 ms, a target budget of 30, visibility margins, a five-second grace period, overview cards, and viewport readiness. Hiding an admitted preview must keep its component mounted. Overview and offscreen transitions must not reset the child document or create fresh loading deadlines.

Format modules retain their source/preparation/displayed evidence. The host must not equate a mount, timeout, or HTTP success with fresh rendered output. Preserve existing lifecycle attributes and View readiness acknowledgments. The team fixture uses the same host rather than returning a component registry entry.

Migrate the shared Markdown `ArtifactEmbed` first, then Canvas's resolution/render branches and agent metadata queries. Keep sizing, camera behavior, mount budgets, and scene mutation code in Canvas. Finish by removing migrated callers' raw registry access and redundant `embedFor` decisions.

**Accept when:** both supplied hosts and the team host render the same availability, pending, card, and error outcomes; source failures remain repairable; retained Canvas previews keep state and lifecycle evidence across visibility changes; missing or disabled targets recover after inventory changes; development and production work under a non-root base path.

## Ordered delivery and verification

1. Move Systems routes and clients, then remove old endpoints and union cases. Keep this separate from host work.
2. Define surface declarations and the shared resolution table. Extend the existing team fixture. Review stable-contract implications before changing public declarations.
3. Extract synchronous inspection, lazy completion, and availability policy. Migrate resolution consumers while retaining their existing renderers.
4. Extract the host and migrate Markdown. Verify size, inert behavior, pending surfaces, errors, and View iframe isolation.
5. Migrate Canvas while preserving its mounting controller. Verify overview, pan/zoom, deferred mounting, recovery, and lifecycle evidence.
6. Run the full suite, disable/removal matrix, real retained-content upgrade fixture, and development/production browser acceptance. Update canonical contracts and remove the proposal status only after implementation.

Changing the stable `EmbedSurface`/capability declaration is a public contract change even if new service exports are experimental. Apply the repository's released-contract/version policy; do not bypass it by adding an experimental tag. Persisted prototype identities and Canvas scene links keep their formats. No content rewriting or compatibility aliases are proposed.

## Decisions for review

The recommendation is to approve these boundaries together:

- Systems owns its three routes; shared source safety and mutation synchronization remain platform services.
- Resolution has synchronous inspection and lazy completion backed by one policy engine.
- Host declarations own scope restrictions; Documents and Canvas retain their current same-prototype behavior.
- The shared host owns presentation and preparation, while Canvas retains mounting, camera, and visibility policy.
- Published diagnostics use only published evidence; disabled source is not exposed for diagnostic completeness.

After architecture approval, visual review is useful at the first shared Markdown host and the final Canvas cutover. Those checkpoints should show concrete before/after workflows, not ask for another review of unchanged policy.
