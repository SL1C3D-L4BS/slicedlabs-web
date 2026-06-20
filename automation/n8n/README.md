# n8n — the SlicedLabs automation spine

Self-hosted n8n that glues the lead engine together: website/beehiiv leads → HubSpot,
and **Apollo/Clay** outbound prospecting → HubSpot → your alerts. Loopback-only by
default (sovereign — nothing public until you choose).

## Quick start
```bash
cd automation/n8n
cp .env.example .env
openssl rand -hex 24            # paste into N8N_ENCRYPTION_KEY in .env
podman compose up -d            # or: docker compose up -d
# open http://localhost:5678  → create your owner account
```

## Import the workflows
In n8n: **Workflows → ⋯ → Import from File** → pick each file in `workflows/`:
- **01-lead-to-hubspot** — inbound: a lead → HubSpot contact + Discord ping.
- **02-apollo-prospect-to-hubspot** — outbound: Apollo finds Spokane prospects → HubSpot company + alert.

## Credentials (set in the n8n UI, never in the repo)
- **HubSpot** — create a HubSpot *private app* token (Settings → Integrations →
  Private Apps; scopes: crm.objects.contacts/companies/deals read+write) → add it
  as a HubSpot credential in n8n.
- **Apollo** — `pass show sl/apollo-api-key`; in n8n add a **Variable** `APOLLO_API_KEY`
  (Settings → Variables) or a Header-Auth credential (`x-api-key`).
- **Clay** — `pass show sl/clay-api-key` (for the Clay-enrichment variant).
- **Discord** — add a Variable `DISCORD_LEAD_WEBHOOK` = your Lead Inbox webhook URL.
- **beehiiv** — `BEEHIIV_API_KEY` (already in Vercel) if you sync list events.

> Keys live in `pass` (sovereign). Pull them into n8n credentials/variables; don't
> paste them into workflow files. Rotate the Apollo + Clay keys after setup — they
> were shared in plaintext once.

## Wire the website into it
Add n8n as a second sink in `src/pages/api/lead.ts` (after beehiiv/Discord): one more
`fetch` to `http://localhost:5678/webhook/sl-lead` (or your tunnel URL) with the lead
JSON. Then HubSpot gets every inbound lead automatically.

## Add n8n as a Claude connector (the MCP server URL it asks for)
Claude's connector wants an **MCP server URL**. n8n can BE that server:
1. New workflow → add the **MCP Server Trigger** node. It generates a URL like
   `https://<your-host>/mcp/<id>`.
2. n8n must be reachable at a public HTTPS URL for Claude to call it. Options:
   - **Cloudflare Tunnel** (`cloudflared tunnel`) or **Tailscale Funnel** — point it
     at `localhost:5678`. Sovereign, no open ports.
   - A small reverse proxy (Caddy) on a Hetzner/DO box if you host n8n there.
3. Behind that MCP Server Trigger, add tool nodes (e.g. "create HubSpot deal",
   "search Apollo", "send alert"). Each becomes a tool Claude can call.
4. Paste the public MCP URL into Claude's **Add connector** → server URL field.

Until you set up the tunnel, run n8n loopback and drive it from its own UI +
webhooks. The MCP connector is the upgrade once you want Claude to operate it directly.

## Next: Atlas
The AI lead-warming layer that sits ON TOP of this. See
[`../atlas/README.md`](../atlas/README.md).
