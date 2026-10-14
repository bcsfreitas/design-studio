# Contributing

Design Studio is an early beta, and you get the source code to make it your own. The encouraged contribution flow is to build on your local instance, share what works with the community, and let useful ideas inform the core project over time.

The project is not currently seeking public contributors to the core. Patrick Morgan reaches out privately to selected potential collaborators and vets changes before bringing them into the maintained platform.

For local setup, follow [Install Design Studio](src/platform/context/installing.md) and the [Manual](src/platform/modules/documentation/pages/index.md). Coding agents should start with [AGENTS.md](AGENTS.md), which points to platform context, principles, personas, and task skills.

## Customize your own studio

If you want to change or improve Design Studio, start by making that change in your own instance. You can adapt the interface, workflows, modules, design systems, tooling, and agent guidance to fit your needs. Local customization does not need approval from the core project.

Keep your work in your own repository and choose when to take upstream releases. [Ownership and updates](src/platform/context/ownership.md) explains which paths keep updates simple and how local platform edits are merged. Within a shared studio, follow your team's permissions and the [contributor ownership requirements](src/platform/context/contributor-scope.md).

## Share what works

If a customization proves useful, share it with the community in a form others can learn from or try: a repository, module, walkthrough, or example. Explain the problem it solves, show the resulting behavior, and describe how you verified it. Include screenshots for visible changes and enough setup information for someone else to use it.

Community experiments can remain independently maintained. As ideas gain use and demonstrate value, Patrick may consider adapting and formalizing them in the core project. Sharing a change does not imply that it will be included upstream.

Bugs, questions, and feedback are welcome through [GitHub issues](https://github.com/itspatmorgan/design-studio/issues). Core code contributions are coordinated directly with Patrick before a pull request is prepared. Only changes he has fully vetted and is confident belong in the core become part of the maintained platform.

The [API foundations closure and backlog](src/platform/maintenance/api-foundations.md) records completed work and deferred measurements for core maintenance.

## Checking your work

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm format:check
pnpm studio sync --check
pnpm build:release
pnpm build:inspect
```

Use `pnpm test:changed <base> <head>` for affected regression groups, or add `--plan-only` to review the decision. [Checks and fixes](src/platform/context/checks.md#minimum-sufficient-verification) owns the dependency map and fallback policy. Use `pnpm test` during development for all focused regressions. `pnpm test:release` also exercises disposable setup and production fixtures. `pnpm build` validates current source, types, and static output without rerunning tests. `pnpm build:release` performs both release regressions and the build. Keep committed files below 750 KB. Include useful tests for behavior changes, and update the Manual or agent instructions when a workflow changes.

Run `pnpm studio sync` after changing canonical project skills. It synchronizes project routing and skill adapters. Edit canonical sources instead of generated files. See [Agent context routing](src/platform/context/agent-context.md) for ownership and installed-studio packaging.

Use fictional sample data. Do not commit credentials, local environment files, proprietary design-system code, or company information you do not have permission to share. Check both files and commit history before publishing your own studio.

## Project repository publishing

The starter uses Parker Moss, a fictional sample contributor with a bundled illustrated avatar. Maintainer profiles and personal prototypes stay local through checkout-specific Git exclusions. Upstream CI and the release command check that distributed source contains only sample profiles and no personal grants or local contributor work. Build releases from a clean clone; see [Maintainer workspace and distributed source](src/platform/context/releasing.md#maintainer-workspace-and-distributed-source).

The ongoing [public demo](https://itspatmorgan.com/design-studio-demo/) is included in the GitHub Pages deployment of `itspatmorgan/itspatmorgan.github.io`. The website's `/design-studio/` product page and `/design-studio-demo/` interactive demo are separate paths. This source repository does not deploy its own Pages site.

An isolated ChatGPT Sites fixture validates the optional publishing workflow with approved learning examples. Native Sites updates reuse that fixture's project identity in `.openai/hosting.json` and its URL. Use native Sites tools with static output `dist`, SPA fallback, and the root base path. Retain release ancestry and use the pinned mise environment. Deploy the saved source commit and matching build archive, and verify a successful native deployment result and the actual viewer. Set public access only when authorized; preserve the audience on updates.

The fixture's SPA fallback returns HTML with HTTP 200 for missing assets. Verify referenced assets, browser errors, and direct-link reloads after publication. This provider behavior does not replace the portable [hosting requirements](src/platform/context/publishing.md#serve-updates-reliably).

For any host, install with Node 24 and pnpm 12, run `pnpm build`, and publish `dist/`. Use `pnpm test` for focused regressions or `pnpm build:release` for full release verification. `pnpm build:inspect` reports startup asset size and requests. Your chosen host owns routing, caching, access, and deployment configuration.

The [Checks workflow](.github/workflows/checks.yml) preserves the required `scope` and `build` checks. Upstream-only checks identify this repository by its permanent GitHub repository ID, `1401250166`, so a repository rename does not disable them. Copies run checks without triggering the public website.

After a successful upstream push to `main`, [Publish demo](.github/workflows/demo.yml) triggers the website's `deploy.yml` workflow. Set the `WEBSITE_DEPLOY_TOKEN` Actions secret here to a fine-grained GitHub token with **Actions: Read and write** access to **only** `itspatmorgan/itspatmorgan.github.io`. A missing token fails the publishing notification with a setup message; it does not bypass Studio checks. Pull requests and forks cannot trigger publication.

The website resolves the source repository by permanent ID and checks out the latest successful `main` push from `checks.yml` at its exact commit. It builds Studio with its declared mise toolchain and `STUDIO_BASE_PATH=/design-studio-demo/`, copies the output into the website's `dist/design-studio-demo/`, and uploads the combined Pages artifact. Set `STUDIO_PUBLIC_URL=https://itspatmorgan.com/design-studio-demo/` in that build to emit absolute social image URLs. Studio code remains in this repository. Failed Studio checks leave the prior passing version available for website builds.

The website's root `404.html` loads the demo's entry document only for demo application routes, preserving direct links and reloads. It also redirects the former `/design-studio-starter/` path while preserving the route, query, and fragment. These are browser redirects and Pages fallback responses retain HTTP 404 status. Disable this repository's old Pages site when switching to the combined deployment; otherwise it can claim `/design-studio/` after the rename.

To preview the demo's subpath locally:

```sh
STUDIO_PUBLIC_URL=https://itspatmorgan.com/design-studio-demo/ STUDIO_BASE_PATH=/design-studio-demo/ pnpm build
STUDIO_BASE_PATH=/design-studio-demo/ pnpm preview
```

See [Publishing](src/platform/context/publishing.md) for portable hosting, direct-link routing, and access requirements.

Maintainers record the public launch checks in [v0.4.0 acceptance](.github/releases/v0.4.0-acceptance.md) and follow [Releasing](src/platform/context/releasing.md) to cut the tag.

## License

Contributions are made under the repository's [MIT license](LICENSE). Keep applicable third-party notices when importing or adapting code.
