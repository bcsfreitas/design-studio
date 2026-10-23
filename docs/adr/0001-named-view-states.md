# Named states in one view file

Date: 2026-10-21. Status: accepted.

## Context

Designers show variations of one screen (a signed-in member, a new user, an error) by writing one view file per variation, which repeats the screen and scatters it across navigation. Canvases and documents need to address each variation with a permanent link that survives renames, as they do for any artifact.

## Decision

A view file may export `states`, a list of `{ title, props }`. Each state renders the view's default export with its props.

- A state is a child artifact of its view with its own permanent resource ID, kept in the view's leading comments as `/** @studio-state <id> <title> */` and matched to its state by title.
- The platform's identity adapter interface gains optional `children` (`src/platform/core/resourceIdentity.ts`). The View adapter implements it, so the identity audit checks state IDs for duplicates with every other resource, and assignment and duplication allocate them through `assignChildIdentities` and `replaceChildIdentities`.
- The build reads state titles statically and writes them, with their IDs, on the view's manifest record. Identity lookup resolves a state ID to the view's record carrying the state, so routes, links and embeds use the existing address `/prototypes/<prototype-id>/artifacts/<state-id>`.
- Navigation lists states under their view. Views without states, and one-file-per-state prototypes, are unchanged.
- Renaming a state means changing its title in code and comment together. A comment that names no state is a build error, so a rename in code alone is reported rather than silently minting a new link.

The contract lives in the [prototype contract](../../src/platform/modules/prototypes/README.md#named-view-states) and the [View module README](../../src/platform/modules/view/README.md#named-states).

## Alternatives considered

- **One file per state (status quo).** No platform change, but it duplicates the screen and doesn't group variations in navigation. It stays supported.
- **Identity in the state object (`{ id: '…', title, props }`).** It keeps everything in one place, but identity would live in executable code, which the identity grammar deliberately avoids. Tooling would have to rewrite code, not comments, and a pasted state would carry a duplicate ID.
- **Address states by query or fragment (`…/artifacts/<view-id>?state=member`).** It needs no new IDs, but the link breaks when the state is renamed, and canvases, documents and route handling would each need state-aware parsing.
- **Derive the state ID from the view ID and title.** It's deterministic, but it changes on every title rename, and a hash of mutable names breaks the rule that identity is never derived from content or names.
- **Separate state records in the manifest's artifact list.** Every lookup by ID would work unchanged, but every consumer that walks artifacts (file tree, command palette, counts, path lookup) would see duplicate paths. Nesting states on the view record and resolving them in one lookup keeps the file list faithful to the filesystem.
- **Evaluate the module at build time to read `states`.** It would allow computed titles, but the manifest build is deliberately fast and never runs prototype code. Static plain-text titles are enough for navigation.

## Consequences

- An agent or designer adds a state in code; assignment writes its comment. Builds never allocate IDs.
- A canvas tool can place every state of a view by listing `statesOf(view)` and embedding each record's permanent address.
- State titles must be plain quoted text in an in-place list.
