---
title: Design Studio principles
description: The beliefs that guide Design Studio's product, architecture, and collaboration between people and agents.
toc: true
---

These are the principles behind Design Studio. They guide decisions about the starter kit and belong to the platform. Keep your team’s product principles in its system’s context folder so platform guidance and product guidance remain distinct.

## Give people ownership

People and teams should own their design work and the environment they use to create it. Design Studio is open source so they can run it, understand it, change it, and build their own versions. It should fit into their codebase and workflow, with their components, conventions, and context.

**In practice:** keep work and context in readable repository files. Make customization possible through ordinary code and configuration, and make local use a complete, useful experience.

## Curate a strong starting point

Design Studio takes an omakase approach: choose a coherent set of primitives and smart defaults so people can begin with confidence. The mise en place is ready; they can focus on what they want to make. Curation should reduce the decisions required to get started while leaving room to tailor the environment.

**In practice:** provide a working path through setup and the first prototype. Offer a useful default design system, explain what it is, and support replacing it with the team's own kit. Add options when they serve a concrete need.

## Provide minimum sufficient guidance for a high-quality outcome

Give people and agents the guidance they need to achieve a high-quality outcome. Each instruction should support a meaningful decision or prevent a concrete failure. Keep the common path clear and provide deeper detail when it is needed.

**In practice:** apply this standard to onboarding, documentation, context, and skills. Put repeatable mechanics in code. Use guidance to explain intent, choices, and recovery. Judge sufficiency by the resulting experience and work.

## Build with parts that compose and grow

Modularity, composability, extensibility, and scalability are product qualities as well as engineering qualities. Teams should be able to add capabilities, replace parts, and grow their studio without having to rebuild the whole environment. Clear boundaries help both people and agents understand what a change affects.

**In practice:** keep the platform, prototype design systems, prototypes, file types, and shared context in understandable scopes. Connect working code, canvases, wireframes, and documents so they support the same exploration. Keep performance usable as the number of prototypes and contributors grows.

## Declare what the system provides

Make behavioral configuration explicit across the platform, including studio settings, contributor profiles, capabilities, and system choices, even when it matches starter defaults. Designers and product managers should be able to discover what controls their experience by reading the configuration. Do not hide a setting or activate behavior through omission. Discovery finds available files; declarations determine registration, activation, supported surfaces, and operating policy. Validation must identify missing required declarations rather than silently infer a default. Theme token declarations define a curated inventory: omitted tokens are intentionally outside the system and must not leak in from upstream defaults or another system.

**In practice:** scaffolds and registration commands write useful defaults as concrete declarations, such as `preferences.onboarding.welcomeDismissed: false` on a new contributor's profile. Keep those declarations readable, validate them, and generate documentation from the same source. Introduce new required fields through explicit, reviewable configuration changes. This applies to contributor preferences, modules, systems, artifact capabilities, and themes.

## Let the human direct and the agent execute

The human should be able to work primarily as a creative director: set intent, judge the result, make edits, and guide refinement. The agent should perform the work it can do across the environment, including setup, implementation, organization, documentation, and verification. People should also be able to contribute directly on the surfaces where that is clearest or quickest for them.

**In practice:** ask for missing intent, decisions, or materials in clear language. Use text or the studio UI to exchange that context as appropriate. Carry out the work, make results reviewable, and keep the human able to supervise and fine-tune them.

## Make context part of the working environment

Good work depends on knowing the product, the people it serves, and the team's standards. That context should be deliberately curated, available to the agent, and maintained alongside the work. Principles, personas, references and skills help the agent make decisions that fit the team.

**In practice:** save supplied context in readable files that can be reviewed and updated. Distinguish known facts, working assumptions, and missing input. Ask for what is missing instead of inventing research, brand decisions, or requirements.

## Support an individual and a team

A studio should be useful to one person and dependable when others join. Personal use should be straightforward. Team use should preserve shared conventions while giving each contributor a clear place to work. Collaboration should remain understandable as the studio grows.

**In practice:** make initialization and contributor onboarding distinct, resumable workflows. Give each person their own identity and work area, and preserve the team's existing design systems and context when someone joins.

## Using these principles

Use these principles with the [personas](personas.md) when proposing features, reviewing designs, or changing the platform. Explain how a decision supports them and where it creates a tradeoff. When principles conflict, make that tradeoff visible to the human rather than treating the list as an automatic verdict.
