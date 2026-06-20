# SlicedLabs — lead engine setup (beehiiv + Discord)

Every intake on the site captures into beehiiv (tagged by source) and can ping a
Discord channel for live inquiries. Two things to switch on.

## 1. Vercel environment variables
Project → Settings → Environment Variables (Production):

| Key | Value | Notes |
|---|---|---|
| `BEEHIIV_API_KEY` | _(your key)_ | already set |
| `BEEHIIV_PUBLICATION_ID` | `pub_fa6993a4-…` | already set |
| `DISCORD_WEBHOOK_URL` | `https://discord.com/api/webhooks/…` | optional — the live inquiry inbox |
| `SITE_URL` | `https://slicedlabs.io` | set the day the domain goes live |

**Discord webhook:** target channel → Edit Channel → Integrations → Webhooks →
New Webhook → Copy URL. Paste it to me and I'll add it via the Vercel API, or add
it yourself above. Until it's set, inquiries still land in beehiiv — Discord is
just skipped.

## 2. beehiiv custom fields (create once)
Audience → Custom Fields → add as **Text**: `Source`, `Name`, `Event Date`,
`Event Type`, `Headcount`, `Topic`, `Interest`, `Message`.
(beehiiv discards unknown fields, so a missing one won't break the intake — the
data just won't be stored until the field exists.)

## 3. beehiiv automations (one funnel per intake)
Every intake sends `utm_campaign = <source>`. Create automations with the
**"Add by API"** trigger, filtered by `utm_campaign`, to run the right sequence:

| `utm_campaign` | Intake | Suggested automation |
|---|---|---|
| `newsletter` | SlicedLabs Weekly | Welcome → weekly |
| `vault` | Free Drops / exit gate | Deliver the 3 drops → nurture |
| `catering` | Truck catering | Auto-reply (you reply from Discord) |
| `contact` | Get in touch | Auto-reply + route |
| `merch-waitlist` | Shop · Merch | "You're on the list" → notify on drop |
| `playbooks-waitlist` | Shop · Playbooks | Nurture → notify on launch |
| `food-preorder` | Shop · Food | Notify when the truck opens |
| `recipe` | The Kitchen | Send the latest recipe → monthly |

## The flywheel
Content (Build · Watch · Kitchen) → **capture** (every page) → trust (the
receipts) → offer (Truck catering · Shop) → sell it on camera → more content →
repeat. The owned list is the hub; the tags route the sequences.

## Lead magnets to drop in
The `vault` automation should deliver three assets (create them when ready):
**The $85k Truck Budget** (the pro-forma export), **The Atomise Machine**
(film-once-publish-six 1-pager), **The Build Receipts** (the running numbers).
The capture + tagging already work; only the asset files + the automation email
need adding.
