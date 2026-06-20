#!/usr/bin/env -S uv run --quiet --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["anthropic>=0.40", "httpx>=0.27"]
# ///
"""atlas.py — SlicedLabs AI lead-warming (Phase B): research → score → draft.

Takes a prospect (name + domain), reads their website, and asks Claude for a brief,
a fit score (0-100), and a personal, value-first first-touch draft — GATED for
founder approval, never auto-sent. "Sell Without Sleaze": the Clarity Close, a
problem-finder, not a pitcher.

  ./atlas.py --name "No-Li Brewhouse" --domain nolibrewhouse.com [--notify]

Keys (sovereign): ANTHROPIC_API_KEY (env) or `pass show sl/anthropic-api-key`.
Discord (for --notify): DISCORD_LEAD_WEBHOOK env = your Lead Inbox webhook.
"""
import argparse, json, os, re, subprocess, sys
import httpx
from anthropic import Anthropic

# The research/judgment brain. Use Sonnet 4.6 (claude-sonnet-4-6) for high volume.
MODEL = "claude-opus-4-8"

ICP = """SlicedLabs is a PNW (Spokane) food truck + media + marketing company.
An ideal prospect is a business we could CATER for or PARTNER with:
- breweries / cideries / taprooms that want a food truck on site
- event venues, markets, festivals needing food vendors
- offices / companies that cater team lunches
- local food / farm orgs for sourcing + cross-promotion
Fit is HIGH when there's a clear, real reason they'd want a chaos-menu truck."""

SYSTEM = f"""You are Atlas, SlicedLabs' lead-warming strategist. You warm cold leads
the honest way — the Clarity Close (Connect, Uncover, Amplify, Resolve, Commit): a
problem-finder, never a pitcher. Write in the founder's voice: direct, warm, PNW, no
hype, no sleaze.

{ICP}

Given a prospect and their website text, return STRICT JSON only:
{{
 "brief": "2-3 sentences: who they are + the real hook",
 "fit_score": 0,
 "fit_reason": "one line",
 "angle": "the single most relevant reason they'd want the truck",
 "draft": "a short, personal first-touch (<=120 words) referencing something TRUE
           about them, value-first, ending with a soft question — no pressure, no
           template feel"
}}
No prose outside the JSON."""


def get_key() -> str:
    k = os.environ.get("ANTHROPIC_API_KEY")
    if k:
        return k
    try:
        return subprocess.run(["pass", "show", "sl/anthropic-api-key"],
                              capture_output=True, text=True, timeout=10).stdout.strip()
    except Exception:
        return ""


def site_text(domain: str) -> str:
    if not domain:
        return "(no domain provided)"
    url = domain if domain.startswith("http") else f"https://{domain}"
    try:
        r = httpx.get(url, follow_redirects=True, timeout=15,
                      headers={"user-agent": "SlicedLabs-Atlas/1.0"})
        t = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", r.text, flags=re.S | re.I)
        t = re.sub(r"<[^>]+>", " ", t)
        return re.sub(r"\s+", " ", t).strip()[:6000]
    except Exception as e:
        return f"(could not fetch site: {e})"


def main() -> None:
    ap = argparse.ArgumentParser(description="Atlas — research, score, draft a warm touch")
    ap.add_argument("--name", required=True)
    ap.add_argument("--domain", default="")
    ap.add_argument("--notify", action="store_true", help="post the draft to Discord for approval")
    a = ap.parse_args()

    key = get_key()
    if not key:
        sys.exit("Atlas: no ANTHROPIC_API_KEY (env) or `pass show sl/anthropic-api-key`.")

    client = Anthropic(api_key=key)
    text = site_text(a.domain)
    msg = client.messages.create(
        model=MODEL, max_tokens=1200, system=SYSTEM,
        messages=[{"role": "user", "content": f"Prospect: {a.name}\nDomain: {a.domain}\n\nWebsite text:\n{text}"}],
    )
    raw = re.sub(r"^```(json)?|```$", "", msg.content[0].text.strip(), flags=re.M).strip()
    data = json.loads(raw)
    print(json.dumps(data, indent=2))

    if a.notify:
        hook = os.environ.get("DISCORD_LEAD_WEBHOOK", "")
        if not hook:
            print("(--notify set but DISCORD_LEAD_WEBHOOK is empty)", file=sys.stderr)
            return
        score = int(data.get("fit_score", 0))
        emb = {"embeds": [{
            "title": f"Atlas · {a.name} — fit {score}/100",
            "description": f"**{data.get('fit_reason','')}**\n\n{data.get('brief','')}\n\n"
                           f"*Angle:* {data.get('angle','')}\n\n**Draft (approve / edit):**\n{data.get('draft','')}",
            "color": 0x18C5A9 if score >= 70 else 0xB8A789,
            "footer": {"text": "Atlas · approve before sending — we don't pitch, we prove."},
        }]}
        httpx.post(hook, json=emb, timeout=10)
        print("→ posted to Discord for your approval")


if __name__ == "__main__":
    main()
