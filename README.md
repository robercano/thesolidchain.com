# thesolidchain.com

Website for The Solid Chain — a static site (plain HTML/CSS/JS, no framework),
hosted on GitHub Pages at **https://thesolidchain.com**.

> 🚧 Placeholder — content coming soon.

## Development

Requires Node 20+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm run build     # regenerate site/index.html from site/content.json
pnpm run lint      # Prettier + html-validate
pnpm run test      # linkinator internal-link check
```

Page content is generated from `site/content.json` by `site/build.js`. Edit the
JSON, run `pnpm run build`, and commit **both** the JSON and the generated
`site/index.html` — never hand-edit the HTML. See [`CLAUDE.md`](CLAUDE.md) for the
full content-flow and contribution rules.

## Deployment

Pushes to `main` deploy to GitHub Pages via `.github/workflows/pages.yml`. Hosting,
DNS records, and how to fix a stuck TLS certificate are documented in
[`docs/deployment.md`](docs/deployment.md).
