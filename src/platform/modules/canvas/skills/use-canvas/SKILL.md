---
name: use-canvas
description: "Create or edit a Design Studio canvas containing views, diagrams, documents, notes, and arrows. Use only when Canvas is enabled."
---

# Use Canvas

This skill applies when Canvases is enabled. The [module README](../../README.md) describes rendering and storage.

- Keep embedded artifacts within the canvas's own prototype. Copy another prototype's artifact before embedding it.
- Do not store images in a canvas. Embed the working view instead.
- Apply the [contributor scope](../../../../context/contributor-scope.md) before editing.
- Prefer native Excalidraw tools for canvas composition: text for annotations, with shapes, lines, arrows, and frames as needed. Use library assets when they serve the requested design; the example sticky note demonstrates extending the library and is optional, not the default for screen annotations.
- Inspect the current scene before changing it. Inspect the result afterward.
- Preserve the person's arrangements. Move existing content only when the request requires it.
- Keep changes small enough to review and undo. Live tool operations support undo. External file edits may not be separate undo steps.

## Discover and use tools

Read current tool help instead of assuming argument names or defaults:

```sh
pnpm canvas help
pnpm canvas help create
```

For file operations, run `pnpm canvas <file.excalidraw> <tool> '<json>'`. When shell quoting could change the JSON, as in PowerShell or cmd on Windows, pass it as `--json-file <path>` or pipe it with `-` instead. All three forms give the same result.

If the CLI reports artifacts without identities or an outdated manifest, run the command it names, or repeat the call with `--identify` to run it and continue.

For an open local canvas, compatible browser tools can use `window.__studioCanvas`. Read its `help()` before use.

Use `describe` before and after changes. For live tools, use `context` when the request refers to the current selection or viewport.

Prefer tools over manual JSON edits. They maintain element bindings and versions. Use `point` to identify an artifact when live access supports it.

To show a view's named states, use `states` with the view's source path, such as `{ "artifact": "Exploration/Home.tsx" }`. One call places every state side by side, each under its title, and links each embed to the state's permanent address, so it survives renaming the view file. `artifacts` lists a view's states, and `describe` names the state of each embed. Without `x` and `y`, `below`, or `rightOf`, the row goes below everything. `width` and `height` size each state. For a view without states, use `create` with `type: "artifact"`. Placing states one by one with `create` can put titles on embeds.

Canvas tools edit existing scenes. Create a canvas through the file menu, or use the empty-scene `template` from this module's [file-type declaration](../../type.ts) for direct authoring.

For new directly authored artifacts, preview and apply [identity assignment](../../../../context/resource-identity.md#direct-authoring-and-verification). `pnpm studio identify <prototype folder> --yes` also refreshes the manifest. Preserve existing identity metadata when editing.

## Verify

Inspect the updated scene with describe, then inspect the rendered canvas and embedded artifacts. Preserve bindings and existing arrangements. Follow the platform working context for required checks and report the canvas link.
