# Atlas — the AI lead-warming engine

*The layer on top of n8n. Atlas turns cold Spokane prospects into warm, ready-to-talk
leads — by researching each one, scoring fit, and drafting genuinely personal,
value-first outreach. It's "Sell Without Sleaze," automated: never spam, always
relevant, always in the founder's voice. Atlas carries the outbound weight so you
carry the relationships.*

## The loop
```
  Apollo / Clay ──► HubSpot ──► ATLAS ──► founder gate ──► warm nurture ──► "ready" alert
   (find)          (store)    (research·   (approve in     (researched      (→ a real
                              score·draft)  Discord)        multi-touch)      conversation)
```
1. **Source** — Apollo/Clay find businesses that fit the ICP (breweries wanting a
   truck, offices that cater lunch, event venues) → HubSpot Companies.
2. **Enrich** — firmographics, their site, recent news, the right contact.
3. **Research (Atlas)** — Claude reads it all and writes a one-paragraph brief:
   who they are, the real hook, the angle.
4. **Score** — fit 0–100 against the catering/partnership ICP.
5. **Draft** — a personal first touch referencing something *true* about them (their
   new taproom, their event series), value-first — never a template blast.
6. **Gate** — high-fit drafts go to you in Discord for one-tap approve/edit. Approved →
   send + log to HubSpot + create a follow-up Task.
7. **Warm** — a researched multi-touch sequence, each touch relevant, until they reply
   or opt out (hard-respected).
8. **Hand off** — a warm/replied lead becomes a HubSpot Deal + a founder alert:
   *"this one's ready."*

## Build phases (honest)
- **A · Data plumbing** *(scaffolded)* — Apollo/Clay → HubSpot via n8n workflow 02.
- **B · Atlas-research** — a Claude agent: HubSpot company in → `{brief, fit_score,
  draft}` out. n8n triggers it; drafts land in Discord for approval.
- **C · Atlas-warm** — multi-touch sequencing with memory (who got what, when), reply
  detection, opt-out respect.
- **D · Atlas-MCP** — expose Atlas's tools through n8n's MCP server so you (and Claude)
  operate it directly by chat.

## The tech
- **Brain:** Claude via the Anthropic API / Agent SDK — **Opus 4.8** (`claude-opus-4-8`)
  for the hard research + judgment, **Sonnet 4.6** (`claude-sonnet-4-6`) for volume
  drafting. (See the website repo's claude-api reference for current model IDs/pricing.)
- **Tools Atlas can call:** HubSpot (read/write), Apollo + Clay (enrich), web-read
  (their site), beehiiv (nurture send), Discord/`sl-alert` (the founder gate).
- **Orchestration:** n8n schedules + triggers; Atlas is the agent it calls.
- **Memory:** HubSpot notes + a small touch-log (who/what/when) so it never repeats.
- **Guardrails (non-negotiable):**
  - Never auto-send a cold first touch without approval.
  - Hard opt-out + suppression list.
  - Rate limits (you're a person, not a spam cannon).
  - The "Sell Without Sleaze" system prompt: **problem-finder, not pitcher** — the
    Clarity Close (Connect → Uncover → Amplify → Resolve → Commit).

## Why it fits SlicedLabs
It's the Marketing pillar, automated honestly: own the outreach, keep it human, show
the work. The warm leads become catering gigs and partnerships — the truck's
between-service revenue — and every interaction is on-brand: *we don't pitch, we prove.*

## Phase B — BUILT (`atlas.py`)
The research → score → draft agent is here and syntax-verified. It reads a prospect's
site, asks Claude (Opus 4.8) for a brief + fit score + a personal, value-first draft,
and (with `--notify`) posts it to Discord for your one-tap approval.

```bash
# one prospect:
ANTHROPIC_API_KEY=sk-ant-… ./atlas.py --name "No-Li Brewhouse" --domain nolibrewhouse.com --notify
# or store the key once (sovereign):  pass insert -m sl/anthropic-api-key
```

**Needs:** a real Anthropic API key (`sk-ant-…`) in `pass show sl/anthropic-api-key`
or `ANTHROPIC_API_KEY`. (The Claude Code session token is NOT a usable API key — make
one at console.anthropic.com.) For `--notify`, set `DISCORD_LEAD_WEBHOOK`.

**Wire it into n8n (Phase C):** have workflow 02 (Apollo → HubSpot) call `atlas.py`
per new company (Execute Command node, or an HTTP call to a tiny Atlas service), so
every prospect auto-gets a researched draft in Discord. Sequencing + reply-detection
is the rest of Phase C.
