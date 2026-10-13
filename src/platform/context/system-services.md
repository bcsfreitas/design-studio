---
title: Application system services
description: Public system queries, source paths, and theme boundaries for application consumers.
---

`#studio/systems` is an application-only entry. The existing singular `#studio/system` remains the neutral declaration types. Prototype runtime code uses its assigned system libraries and `#studio/runtime`.

`getSystems({role?, status?})` returns registered declarations keyed by source key. `getSystem(key)` returns one declaration or `undefined` for a missing system. Both return independent copies; changing a result cannot mutate discovery state. `defaultSystemKey()` names the configured creation default. `platformSystemKey()` names the required platform system.

`systemPath(key)` creates a permanent browser address. `systemKeyFromIdentity(id)` resolves a permanent identity to its current source key. `getSystemSource(key)` returns the repository directory, component folder, theme file, and theme selectors, or `undefined` when unavailable. The service owns discovery and registration; consumers do not scan folders or recreate platform theme selectors.

`ThemeScope` applies a registered theme class and its supported global color mode. Custom unstyled views retain the global mode. View receives its prototype’s assigned theme, and missing-system recovery remains owned by its loading workflow. View’s separate preview entry is supplied-only; this entry does not grant team code access to that entry.

Systems, Prototypes, View, and shared shell services use these queries. Source writes remain authorized through Systems routes; query results grant no write authority.
