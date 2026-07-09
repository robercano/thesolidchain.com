# Deployment & DNS

How `thesolidchain.com` is hosted, and how to fix the things that go wrong.

## Overview

- **Host:** GitHub Pages, served from this repo (`robercano/thesolidchain.com`).
- **Deploy method:** GitHub Actions (`.github/workflows/pages.yml`), **not** classic
  branch-deploy. The site lives in `site/`, and classic Pages only serves from repo
  root or `/docs`, so we upload `site/` as a Pages artifact instead.
- **Custom domain:** `thesolidchain.com` (apex), set via `site/CNAME`. That file is
  included in the artifact, so GitHub picks up the domain on each deploy — never edit
  the domain in the Pages UI in a way that fights the `CNAME` file.
- **DNS provider:** SiteGround (nameservers `ns1/ns2.siteground.net`).
- **TLS:** GitHub provisions a free Let's Encrypt certificate automatically once DNS
  is correct. Turn on **Enforce HTTPS** after it's issued.

## Required DNS records

Set these at the DNS provider (SiteGround DNS panel).

### Apex (`thesolidchain.com`)

Four A records pointing at GitHub Pages:

```
thesolidchain.com  A  185.199.108.153
thesolidchain.com  A  185.199.109.153
thesolidchain.com  A  185.199.110.153
thesolidchain.com  A  185.199.111.153
```

Four AAAA records (IPv6) — recommended so the apex is reachable over IPv6 like `www`:

```
thesolidchain.com  AAAA  2606:50c0:8000::153
thesolidchain.com  AAAA  2606:50c0:8001::153
thesolidchain.com  AAAA  2606:50c0:8002::153
thesolidchain.com  AAAA  2606:50c0:8003::153
```

> The apex must use A/AAAA records, **not** a CNAME — CNAME on a zone apex is invalid.

### `www`

A single CNAME to the GitHub Pages host:

```
www.thesolidchain.com  CNAME  robercano.github.io
```

GitHub automatically redirects between apex and `www`, and its certificate covers
both names.

### CAA — leave unset (or explicitly allow Let's Encrypt)

The certificate is issued by **Let's Encrypt**. If there is **no** CAA record on the
apex, any CA may issue — that's fine. If you ever add CAA records, they **must**
include:

```
thesolidchain.com  CAA  0 issue "letsencrypt.org"
```

A CAA record that omits `letsencrypt.org` will silently block certificate issuance.

### Leftover records (harmless)

The zone still carries SiteGround-era records — an SPF `TXT` (`v=spf1 …
dnssmarthost.net`) and an `openai-domain-verification=…` `TXT`. These are email /
verification records and do **not** affect Pages or the certificate. Leave them
unless you're deliberately cleaning up mail config.

## Verifying DNS without `dig`

If `dig`/`nslookup` aren't installed, query Google's public resolver directly:

```bash
getent hosts thesolidchain.com          # apex A records
getent hosts www.thesolidchain.com       # www (shows the github.io canonical name)
```

For record types `getent` can't show (CAA, AAAA, TXT), a small raw-DNS script against
`8.8.8.8` works — see the project history, or use any online DNS lookup tool.

## Certificate not provisioning? (most common issue)

Symptom: DNS is correct, the site deploys, but **Settings → Pages** never issues the
HTTPS certificate (Enforce HTTPS stays greyed out).

Cause: GitHub tried to provision the cert **before** the apex A-records finished
switching to GitHub (e.g. while they still pointed at the old host), cached the
failure, and doesn't retry on its own.

Fix — force a retry:

1. Repo **Settings → Pages**.
2. Under **Custom domain**, delete `thesolidchain.com`, click **Save**.
3. Wait ~1 minute, re-enter `thesolidchain.com`, **Save** again.
4. Watch for "DNS check successful" → "Certificate is being provisioned…". It
   completes in a few minutes to ~an hour.
5. Once issued, tick **Enforce HTTPS**.

## Optional: verify the domain (takeover protection)

In your GitHub **account** settings → **Pages** → **Add a domain**, GitHub gives you a
`_github-pages-challenge-robercano` `TXT` record to add. This binds the domain to your
account so no one else can claim it on Pages. Not required for the certificate, but
recommended.

## Editing site content

Content changes never touch DNS. Edit `site/content.json`, run `pnpm run build` to
regenerate `site/index.html`, and commit both. See the repo root `CLAUDE.md` for the
full content-flow rules.
