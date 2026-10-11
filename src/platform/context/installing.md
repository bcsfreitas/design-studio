---
title: Install Design Studio
description: Install a local studio, open it in your agent harness, and start working with your agent.
toc: true
---

Design Studio lives in an ordinary folder on your computer. Install it once, then open that folder in your preferred agent harness. A GitHub account is not required for local use.

These are the installation steps for both you and your agent. If you want your agent to handle them, use a session that can create files and run commands on your computer and ask:

> Install Design Studio using https://github.com/itspatmorgan/design-studio-starter/blob/main/src/platform/context/installing.md. Help me choose a folder, preserve existing files, and verify the running preview. Then help me open the studio folder in my agent harness.

## 1. Prepare your computer

Install [Git](https://git-scm.com/downloads) and [mise](https://mise.jdx.dev/getting-started.html) if you do not already have them. Git downloads Studio; mise installs the Node.js and pnpm versions the project declares.

## 2. Create your studio folder

Open a terminal in the folder where you keep your projects. Run:

```sh
git clone --filter=blob:none --branch v0.2.0 https://github.com/itspatmorgan/design-studio-starter.git my-studio
cd my-studio
git remote rename origin upstream
git switch -c main
```

`my-studio` is your new studio folder. You can choose a different name. If the folder already exists, choose another name or open the existing studio; do not replace its files.

These commands install release `v0.2.0` and preserve the history needed for future updates. Use them rather than **Use this template** or a ZIP download. The `upstream` remote is for receiving Studio releases. If you later connect your own hosted repository, use `origin` for it.

## 3. Install dependencies and open the preview

From inside your studio folder, run:

```sh
mise install
mise exec -- pnpm install --frozen-lockfile
mise exec -- pnpm dev
```

If mise asks you to trust the project's tool configuration, review `mise.toml` before accepting. Open the local address printed by the server. Keep that terminal running while you use Studio.

You can explore the examples before configuring anything. The browser shows your studio; the working files stay in `my-studio`.

## 4. Open the folder in your agent harness

Open the `my-studio` folder as your agent harness's project or workspace. Use a coding agent that can read files and run commands in that folder. Opening the browser preview alone does not select the folder for your agent.

Ask:

> Read AGENTS.md and help me configure my Design Studio. Start with the included examples and show me the running preview.

Your agent follows the repository's instructions to register you and configure Studio. Agent harnesses that do not automatically discover project instructions can still use them when you ask the agent to read `AGENTS.md`. Keep the included examples until you decide what to customize.

## Return to your studio

Open the same folder in your agent harness and ask:

> Open my Design Studio and show me the running preview.

To start it yourself, run `mise exec -- pnpm dev` from that folder. If installation or startup fails, share the command and its error with your agent and ask it to diagnose the existing folder.

See the [Manual](../modules/documentation/pages/index.md) for using Studio. When you are ready to share a viewing site, ask your agent to follow [Publishing](publishing.md). Installation does not publish your work.

## For the agent performing installation

Confirm the destination and where that filesystem lives before creating files. Preserve existing studios and confirmed choices. Follow the commands above using the person's supported tools; do not install a plugin or use plugin bootstrap tooling for this path.

After cloning, read the installed repository's `AGENTS.md` and linked guidance. Verify the release ancestry, local `main` branch, and `upstream` remote. A release clone does not need a hand-written `studio.lock.json`; see [Ownership and updates](ownership.md#the-installed-release).

Verify the actual local preview and report the absolute studio path. Help the person open that folder in their agent harness; distinguish instructions to open it from a verified workspace handoff. Use [Configure Studio](../skills/configure-studio/SKILL.md) when they request configuration. Installation alone does not authorize creating a hosted repository, pushing, or publishing.
