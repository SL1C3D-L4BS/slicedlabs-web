# CRM + automation pipeline — the architecture

> How leads flow from a click to a closed catering gig / partnership, and which
> tool owns each step. Built around **HubSpot** (free tier) as the hub, **beehiiv**
> for email, **Apollo/Clay** for warming cold leads, **n8n** as the glue.

## The flow
```
   slicedlabs.io forms  ──►  /api/lead ──┬─► beehiiv      (email automations)
   (catering/contact/                    ├─► Discord      (live Lead Inbox)
    workshop/waitlist)                   └─► HubSpot      (contact + deal)  ← needs token
                                                 │
   Apollo / Clay  ──► enrich + find ─────────────┤  (outbound: caterers, venues, breweries)
   (warm cold leads)                             │
                                                 ▼
   n8n  ──► routes, tags, reminders, syncs everything on a schedule
```

## Who owns what
| Layer | Tool | Job | Status |
|---|---|---|---|
| **CRM hub** | HubSpot (free) | Contacts · Companies · Deals · Tasks. The source of truth for relationships. | ✅ connected |
| **Email** | beehiiv | The owned list + the 7 automations. | ✅ live |
| **Live inbox** | Discord | Instant ping on every inquiry. | ✅ live |
| **Inbound capture** | `/api/lead` | One endpoint, tags every source. | ✅ live |
| **Enrichment / prospecting** | **Apollo** (or Clay) | Find + warm cold B2B leads (caterers, breweries, event venues); enrich contacts. | ⬜ your account + API key |
| **Automation spine** | **n8n** (self-host Hetzner/DO) | Glue: form → HubSpot deal, daily syncs, follow-up reminders, Apollo→HubSpot. | ⬜ to stand up |

## The pipelines (HubSpot deals)
1. **Catering** — inbound from `/truck`. Stages: Inquiry → Quoted → Booked → Served → Repeat.
2. **Partnerships / sourcing** — the outreach board (farms, hubs, venues, breweries).
   Stages: To contact → Contacted → In conversation → Active relationship.
3. **Workshops** — interest → cohort. Stages: Interested → Registered → Attended → Upsell.

## Apollo — the "warm the leads up" layer (your call)
Apollo finds the businesses you'd cater for or partner with, enriches them with real
contacts, and sequences outreach. The fit: **B2B outbound** — breweries that want a
truck, offices that cater lunch, event planners. To wire it you need:
1. An Apollo account + API key (stored in Vercel/n8n env, never the repo).
2. n8n flow: Apollo search → HubSpot company+contact → a "Partnerships" deal → a Task.
**Clay** is the swap-in if you prefer waterfall enrichment + spreadsheet-native.

## What I can wire now vs. what needs you
- **Now (no keys):** seed HubSpot with the real outreach targets (the farms/venues/
  agencies from `outreach-targets.md`) as Companies + Deals → an instant Spokane board.
- **Needs your token:** `/api/lead` → HubSpot contact creation (a HubSpot **private-app
  token** in Vercel env). 10-min add once you generate it.
- **Needs your account:** Apollo/Clay API key + an n8n instance (Hetzner ~$5/mo).

## Next steps (in order)
1. Approve the HubSpot seed (the outreach board) — I create it.
2. Generate a HubSpot private-app token → I wire `/api/lead` → HubSpot.
3. Stand up n8n (I can scaffold the flows) → connect Apollo/Clay when ready.
