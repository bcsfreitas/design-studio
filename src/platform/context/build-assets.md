---
title: Module build assets
description: Named serializable assets with lazy loading, caching, and declared dependency watches.
toc: true
---

An enabled module can contribute `assets` from `build.ts`, alongside its manifest contribution. Each named asset declares `load({root, enabled})` and 1–64 repository-relative `watch` patterns. Names use lowercase letters, digits, and dashes. Watches use ordinary relative paths or Node glob patterns; absolute paths, traversal, and negation are rejected. Include every source dependency that affects the result, including shared types and compiler configuration. Module declaration changes require a server restart.

Asset values must contain JSON primitives, arrays, and plain objects. Undefined values, nonfinite numbers, functions, cycles, special object instances, and accessors fail clearly. Serialization uses one validated data snapshot without invoking getters or serialization hooks. Do not include secrets or private contributor data: production assets are public viewing data.

Development validates declarations without computing values. The first request starts computation, and concurrent requests share it. Successful work is cached until a watched addition, change, or deletion. Invalidation during computation prevents publishing the old generation. Superseded successes and failures both follow the latest generation. Current failures reject all waiting callers and remain retryable on a subsequent request. Server and browser caches use the same environment-neutral generation primitive. The shared server route accepts same-origin GET requests only.

Production computes declared assets during the build and emits hashed JSON files. Browser code loads the emitted files only when requested. Disabled or removed modules contribute no loaders or assets.

`#studio/data` exposes `loadModuleAsset<T>(module, asset)` and `subscribeModuleAsset(module, asset, listener)`. The client shares pending and completed requests, clears invalidated values, and retries after failures. A development socket connection invalidates all cached assets and notifies subscribed owners, catching up after missed watch events. HMR disposal removes the connection and watch handlers. Subscription callbacks let the owner refresh its route or component. Errors use the shared `ClientError` contract. The platform owns transport, caching, and watch dispatch; the module owns computation and its domain-specific presentation.

Systems contributes `systems/props`. Its owner extracts TypeScript component props; shared asset watches cover system sources, public/core types, compiler settings, and dependency declarations. There is no Systems-specific props endpoint or virtual module.
