[![Design Studio — Design with intent. Build with an agent. A prototype sandbox for designers and product managers. Works with ChatGPT Codex, Claude Code, and Cursor.](public/images/design-studio-readme-share.jpg)](https://itspatmorgan.com/design-studio)

# Design Studio Starter

An open-source, local prototype sandbox for designers and product managers who build with coding agents. Turn ideas into interactive prototypes, keep the thinking behind them close, and shape an environment that fits your team.

**[View demo](https://itspatmorgan.com/design-studio-starter/) · [Set up Design Studio](https://github.com/itspatmorgan/design-studio-plugin/blob/main/SETUP.md)**

## What you can do

- **Connect the whole idea.** Keep working prototypes, diagrams, canvases, and documents together as you explore and refine a flow.
- **Give your agent a foundation.** Bring together your components, theme, product context, and instructions so prototypes reflect your team's design system.
- **Make it yours.** Start with included examples, customize the studio, and own the code and everything you create. Work individually or with a team.

## Get started

Ask your coding agent to set up Studio. It needs filesystem access and command execution where you want to save your work. No plugin is required.

> Set up Design Studio for me using https://github.com/itspatmorgan/design-studio-plugin/blob/main/SETUP.md. Follow direct setup without installing a plugin. Confirm where my files will live, preserve existing work, clone the pinned starter release with its history and upstream remote, and verify the local preview. Help me continue in my studio folder.

Use a release clone rather than **Use this template** or a ZIP download, so later releases can arrive with `pnpm studio update`. The [setup guide](https://github.com/itspatmorgan/design-studio-plugin/blob/main/SETUP.md) also covers manual installation and optional Codex, Claude Code, and Cursor plugins. Tool access and workspace handoff depend on your agent and environment.

To share a viewing site, use the [publishing prompt](https://github.com/itspatmorgan/design-studio-plugin/blob/main/SETUP.md#publish-to-a-static-host). If ChatGPT Sites tools are available, the [setup-and-publish prompt](https://github.com/itspatmorgan/design-studio-plugin/blob/main/SETUP.md#set-up-and-publish-with-chatgpt-sites) includes setup and a review link. Editing stays local.

## Explore further

Design Studio is in early beta. Explore the examples, then ask your agent to help build your first prototype.

- [Manual](src/platform/modules/documentation/pages/index.md) — using and customizing your studio.
- [Modules](src/platform/context/modules.md) — extending its capabilities.
- [Contributing](CONTRIBUTING.md) — feedback, issues, and pull requests.
- [Changelog](CHANGELOG.md) — what's changed.

Created by **[Patrick Morgan](https://itspatmorgan.com)**. Follow the thinking behind the work at [Unknown Arts](https://www.unknownarts.com/).

## License

[MIT](LICENSE). Includes [Flexoki](https://stephango.com/flexoki) by Steph Ango (MIT) and [Pragmatic drag and drop](https://atlassian.design/components/pragmatic-drag-and-drop/) by Atlassian (Apache-2.0).
