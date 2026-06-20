# slicedlabs.io — go-live runbook

Everything is staged so attaching **slicedlabs.io** is a ~10-minute flip. The site
is already live on the free Vercel domain (`slicedlabs-web.vercel.app`); this only
swaps the public domain + flips the canonical URL.

> The Astro `site` is already migration-ready: `astro.config.mjs` reads
> `process.env.SITE_URL` and falls back to the Vercel domain. Setting `SITE_URL`
> in Vercel is the *only* code-side change needed — no source edits.

---

## Step 1 — Buy the domain (pick one)

**Route A — Register through Vercel (simplest, one vendor).**
Vercel dashboard → Domains → search `slicedlabs.io` → buy. It auto-attaches to the
project and provisions DNS + SSL automatically. Skip to **Step 3**.

**Route B — Register at Cloudflare Registrar (cheapest, at-cost) or any registrar.**
Buy `slicedlabs.io`, then continue to **Step 2**.

## Step 2 — Point DNS at Vercel (Route B only)

First add the domain in Vercel: **Project → Settings → Domains → Add** both
`slicedlabs.io` and `www.slicedlabs.io`. Vercel prints the exact records. Then, at
your DNS host, pick one:

- **Easiest — hand DNS to Vercel:** set the registrar's nameservers to
  `ns1.vercel-dns.com` and `ns2.vercel-dns.com`. Vercel manages records + SSL.

- **Keep Cloudflare DNS:** add these records and set the proxy to **DNS only
  (grey cloud)** — do *not* orange-cloud a Vercel site (double-CDN/SSL):

  | Type  | Name | Value                 |
  |-------|------|-----------------------|
  | A     | `@`  | `76.76.21.21`         |
  | CNAME | `www`| `cname.vercel-dns.com`|

  Via the local `wrangler` CLI (already installed) or the API — use a **scoped
  token** (`Zone → DNS → Edit`), created at
  `dash.cloudflare.com/profile/api-tokens`. **Never the Global API Key.**

## Step 3 — Flip the canonical URL

Vercel → **Project → Settings → Environment Variables** → add (Production):

```
SITE_URL = https://slicedlabs.io
```

Then redeploy production:

```
vercel deploy --prod --yes
```

This makes canonical links, Open Graph URLs, and the sitemap resolve to
`slicedlabs.io`.

## Step 4 — Verify

```
curl -sI https://slicedlabs.io | head -1          # expect HTTP/2 200
curl -sI https://www.slicedlabs.io | head -1      # expect 308 redirect to apex (or vice-versa)
curl -s https://slicedlabs.io | grep -o '<meta property="og:image"[^>]*>'
```

Check: padlock/SSL valid, `www` ↔ apex redirect is the canonical you chose, and the
OG card resolves to `https://slicedlabs.io/og-image.png`.

---

### Notes
- SSL: Vercel auto-issues Let's Encrypt once DNS resolves (minutes).
- `.io` propagation is usually fast (< 1 hr), occasionally up to 24–48 hr.
- Rollback: the free `slicedlabs-web.vercel.app` keeps working throughout, so there
  is no downtime window — the domain just starts resolving when DNS is live.
