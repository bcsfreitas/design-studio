# Team guidance

Add your team's own guidance for coding agents here, such as conventions, product context, and review expectations. `pnpm studio sync` appends this file to `AGENTS.md`, and updates never overwrite it.

## Agent skills

### Issue tracker

Issues and specs are local markdown files under `.scratch/<feature>/`, which is gitignored and stays on this machine. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage roles, recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
