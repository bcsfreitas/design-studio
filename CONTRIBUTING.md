# Contributing

Design Studio is an early beta. The current priority is a reliable local workflow: studio initialization, contributor onboarding, prototypes and their file types, design systems, and the system content. Portable static publishing is part of the workflow; each studio chooses and configures its own host.

For local setup, follow [Install Design Studio](src/platform/context/installing.md) and the [Manual](src/platform/modules/documentation/pages/index.md). Coding agents should start with [AGENTS.md](AGENTS.md), which points to platform context, principles, personas, and task skills.

## Proposing a change

Open an issue for a substantial feature or architectural change before investing in an implementation. Small fixes can go straight to a pull request. Describe the problem, the resulting behavior, and how you verified it. Include screenshots for visible changes.

Create a branch in your fork and submit a pull request to `main`. Changes to the platform, systems, system content, tooling, and configuration need maintainer review. Prototype changes follow the contributor ownership requirements in [Contributor scope](src/platform/context/contributor-scope.md); when building a new prototype, use `pnpm new "Prototype Name"`.

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

The ongoing [public demo](https://itspatmorgan.com/design-studio-demo/) is included in the GitHub Pages deployment of `itspatmorgan/itspatmorgan.github.io`. The website's `/design-studio/` product page and `/design-studio-demo/` interactive demo are separate paths. This source repository does not deploy its own Pages site.

An isolated ChatGPT Sites fixture validates the optional publishing workflow with approved learning examples. Native Sites updates reuse that fixture's project identity and URL.

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

Maintainers record the public launch checks in [v0.3.0 acceptance](.github/releases/v0.3.0-acceptance.md) and follow [Releasing](src/platform/context/releasing.md) to cut the tag.

## License

Contributions are made under the repository's [MIT license](LICENSE). Keep applicable third-party notices when importing or adapting code.
