# thesolidchain.com

## What this project is
The public website for The Solid Chain — a static marketing/landing site built with plain HTML, CSS, and
JavaScript (no framework). Served as static files. Page content is generated from JSON by a tiny
zero-dependency Node script (owner-approved decision, issue #1) — see "Content flow" below.

## Stack & layout
- Language / runtime: HTML/CSS/JavaScript, no framework or bundler. Node + pnpm are used for dev tooling
  and the content generator only.
- Package manager: pnpm (pinned via `packageManager` in `package.json`; works on Node 20+).
- Key directories (mirror `.claude/gates.json` → `modules`):
  - `site/` — HTML pages, CSS, and client-side JS (the deployable site)
  - `assets/` — images, fonts, and media referenced by the site
  - `docs/` — project documentation

## Content flow (owner-approved build step, issue #1)
- `site/content.json` is the single source of truth for ALL page content (profile, metrics, experience,
  skills, socials, CV, products/subdomains).
- `site/build.js` (plain Node, zero npm dependencies) reads it and regenerates `site/index.html`.
- Editing flow: edit `site/content.json` → `pnpm run build` → commit **both** JSON and generated HTML.
  Never hand-edit `site/index.html`. The `build` gate enforces the committed HTML is up to date
  (`pnpm run build && git diff --exit-code site/index.html`).
- A product goes live by flipping its `status` from `provisioning` to `live` in `content.json` — no HTML edits.

## Conventions
- Code style: Prettier formats `site/` and `docs/` (`pnpm run format`); `pnpm run lint` checks formatting
  and validates HTML with html-validate.
- Testing approach: `pnpm run test` runs linkinator over `site/` checking internal links and anchors
  (external URLs are skipped to keep CI deterministic).
- Definition of done: lint passes, link check passes, reviewers approve.

## Multi-agent orchestration (this template)
This repo is set up for orchestrated multi-agent development.
- **Agents:** orchestrator, implementer (worktree-isolated), reviewer, test-runner (from the orchestrator plugin).
- **Adapter:** `.claude/gates.json` — module map, gate commands, model routing. **This is the file to keep current.**
- **Gates run via** `.claude/scripts/gate.sh <name>` (also used by CI in `.github/workflows/gates.yml`).
- **Workflow:** `.claude/workflows/feature-fanout.js` for deterministic fan-out.

### Module boundaries (hard rule)
A worker assigned to a module MUST NOT edit files outside that module's `path`. Cross-module work is
re-scoped by the orchestrator, never reached across by a worker.

### Merge policy
pr-per-agent — base branch `main`. (Mirror in `gates.json` → `merge`.)

## Don'ts
- Don't put secrets in the repo.
- Don't bypass the gates.
- Don't `git add -A` / `git add .` / `git commit -a` — **stage explicit paths by name.** Under the sandbox,
  masked config paths (`.mcp.json`, `.gitconfig`, `.claude/{launch.json,routines,…}`, editor dirs) appear as
  `/dev/null` character-device nodes; git can't index a device node, so a blanket add aborts the whole commit
  (`can only add regular files, symbolic links or git-directories`). Ignore any `crw-` entries in `git status`
  — they're sandbox masks, not your changes.
- Don't add a framework or bundler without an explicit owner decision — the only approved build step is the
  zero-dependency `site/build.js` content generator (owner decision, issue #1).
- Don't hand-edit `site/index.html` — it is generated from `site/content.json` by `pnpm run build`.
