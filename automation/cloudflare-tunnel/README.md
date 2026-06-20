# Cloudflare Tunnel — the public MCP URL for n8n

Exposes your local n8n (`http://localhost:5678`) at a public HTTPS URL so Claude's
connector can reach n8n's **MCP Server Trigger** — sovereign, no open ports.
`cloudflared` is installed (`/usr/bin/cloudflared`).

## ⚠️ Do this FIRST (security gate)
Open `http://localhost:5678` and **create your n8n owner account** (email + strong
password). A fresh n8n with no owner lets *anyone who hits the URL* claim it — never
tunnel an unclaimed instance.

## Option A — Quick tunnel (instant, ephemeral URL, no account)
Best for a fast test. The URL is random and changes on restart.
```bash
cloudflared tunnel --url http://localhost:5678
# prints:  https://<random-words>.trycloudflare.com
```
The MCP endpoint is then `https://<random>.trycloudflare.com/mcp/<your-trigger-id>`.

## Option B — Named tunnel (persistent URL, your domain)
Best once you own `slicedlabs.io`. One-time login (opens a browser):
```bash
cloudflared tunnel login
cloudflared tunnel create sl-n8n
# note the Tunnel ID + the credentials file it writes (~/.cloudflared/<id>.json)
cloudflared tunnel route dns sl-n8n n8n.slicedlabs.io
cp config.yml.example ~/.cloudflared/config.yml   # edit: tunnel id + hostname
systemctl --user enable --now sl-n8n-tunnel.service   # (unit below)
```
Stable MCP endpoint: `https://n8n.slicedlabs.io/mcp/<your-trigger-id>`.

## Get the MCP URL (in n8n)
1. New workflow → add the **MCP Server Trigger** node → it generates a path/URL.
2. Behind it, add tool nodes (create HubSpot deal · search Apollo · send alert · run
   Atlas). Each becomes a tool Claude can call.
3. Activate the workflow. The public URL = tunnel host + the trigger's path.
4. In Claude → **Add connector** → paste that URL.

## Files here
- `config.yml.example` — cloudflared named-tunnel config (ingress → localhost:5678).
- `sl-n8n-tunnel.service` — systemd --user unit for the persistent tunnel.

> Keep n8n itself logged-in/owner-secured; the tunnel only carries traffic. Rotate /
> tear down the tunnel any time with `cloudflared tunnel delete sl-n8n`.
