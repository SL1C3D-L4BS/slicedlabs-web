# SlicedLabs — beehiiv automation copy

Copy-paste into the beehiiv automation builder. Each automation uses the
**"Add by API" trigger**, filtered by `utm_campaign` (the `source` tag every
`/api/lead` submit sends). Voice: PNW, honest, receipts — *we don't pitch, we prove.*
Keep links pointing at `slicedlabs-web.vercel.app` until `slicedlabs.io` is live.

> Subject lines are A/B-able. The `{{ }}` tokens are beehiiv merge fields
> (`first_name`, custom fields). Where a field may be empty, the fallback text is
> written so the line still reads.

---

## 1 · Welcome — `utm_campaign = newsletter`
**Trigger:** Add by API · filter `utm_campaign is newsletter`
**Wait:** none (send immediately)

**Subject:** You're on the list — here's what you just signed up for
**Preview:** The real numbers, weekly. No hype.

```
Hey{{ first_name | default: " there" }},

You're in. SlicedLabs Weekly is the owned list — the one no algorithm can
throttle — and it does exactly one thing: shows you the real build of a
PNW food company, with the actual numbers.

Every week you get the receipts: the budget, the permit filed, the first
sale, the failures. No dream-selling. We don't pitch. We prove.

Three things worth doing right now:

  • Grab the free drops (the $85k truck budget + more) → /free
  • Watch + cook along on the channel → /watch
  • This month's free recipe: The Smash → /kitchen

Reply and tell me what you're building. I read every one.

— The SlicedLabs kitchen
```

---

## 2 · Free Drops delivery — `utm_campaign = vault`
**Trigger:** Add by API · filter `utm_campaign is vault`
**Wait:** none

**Subject:** Your receipts are here — all three
**Preview:** The $85k budget, the Atomise Machine, the running numbers.

```
Here they are — no catch, like we said.

  • The $85k Truck Budget — the real pro-forma: revenue, COGS, break-even.
    → [LINK TO ASSET]
  • The Atomise Machine — film once, publish six. The 1-page system.
    → [LINK TO ASSET]
  • The Build Receipts — the running numbers, updated as we climb.
    → [LINK TO ASSET]

That's the whole point of SlicedLabs: we show the machine instead of
selling the dream. You'll get the weekly receipts from here on — and if
it's ever not for you, one click unsubscribes. No sleaze.

Go build your slice.

— The SlicedLabs kitchen
```

> **Action item:** replace each `[LINK TO ASSET]` once the files exist (host
> them in beehiiv or a Drive public link). The capture is already tagging
> `vault`; this is the only piece waiting on the asset files.

---

## 3 · Catering auto-reply — `utm_campaign = catering`
**Trigger:** Add by API · filter `utm_campaign is catering`
**Wait:** none (the real reply comes from you, via the Discord Lead Inbox)

**Subject:** Got your catering note — we'll be in touch
**Preview:** Brewery, market, private event — we'd love to feed it.

```
Hey{{ first_name | default: " there" }},

Thanks for thinking of us for{{ Event Type | default: " your event" }}.
We've got the details{{ Event Date | prepend: " for " }} and we'll follow
up personally with availability and a quote.

Straight talk: the truck isn't open yet — we're in the build (permits, the
commissary, the ~$85k setup). Bookings open to this list first, so you're
already in the right place. When we're rolling, you'll be among the first
we call.

In the meantime, the whole build is public → /truck

— The SlicedLabs kitchen
```

---

## 4 · Contact auto-reply — `utm_campaign = contact`
**Trigger:** Add by API · filter `utm_campaign is contact`
**Wait:** none

**Subject:** Got it — thanks for reaching out
**Preview:** We read everything.

```
Hey{{ first_name | default: " there" }},

Your message landed — thanks for reaching out about
{{ Topic | default: "SlicedLabs" }}. We read every one, and the
build-in-public crowd gets a real reply, not a canned one.

Give us a day or two. If it's time-sensitive, just reply here and flag it.

— The SlicedLabs kitchen
```

---

## 5 · Workshop interest — `utm_campaign = workshop`
**Trigger:** Add by API · filter `utm_campaign is workshop`
**Wait:** none

**Subject:** You're on the workshop list — first dibs on dates
**Preview:** Cook it, or build it. PNW in person + virtual.

```
Hey{{ first_name | default: " there" }},

You're on the early list for SlicedLabs workshops — and the list gets
first access to dates and seats before anything goes public.

You said you're interested in: {{ Interest | default: "the workshops" }}
({{ Topic | default: "cook + build" }}).

Two tracks, taught for real: how to cook it, and how to build it. In
person across the PNW, live virtual, or on-demand on the channel. The
live virtual room runs on a tool we're building on camera — honest as
ever: it's not finished, and you'll watch it come together.

We'll email you the moment the first dates open.

— The SlicedLabs kitchen
```

---

## 6 · Monthly recipe — `utm_campaign = recipe`
**Trigger:** Add by API · filter `utm_campaign is recipe`
**Wait:** none

**Subject:** Welcome to the Kitchen — here's where to start
**Preview:** One free recipe a month. First up: The Smash.

```
Hey{{ first_name | default: " there" }},

You're on the recipe list — one real recipe from the chaos menu, free,
every month. No spam, no garbage ingredients.

Start here: The Smash — a PNW Cubano smashburger with mojo aioli and
IPA-caramelized sweet onions. Spokane meets Havana.
→ /kitchen

Cook it, then send me a photo of your plate. Next month's drop hits your
inbox automatically.

— The SlicedLabs kitchen
```

---

## 7 · Waitlists — `merch-waitlist` / `playbooks-waitlist` / `food-preorder`
**Trigger:** Add by API · filter `utm_campaign is <the tag>`
**Wait:** none. One short confirm each; they share a shape.

**Subject (merch):** You're on the merch list
**Subject (playbooks):** You'll get the playbooks first
**Subject (food):** You'll know the second food drops

```
You're on the list — you'll hear it here first, before it goes public.

While you wait, the whole build is open: the numbers, the recipes, the
climb. → /build

— The SlicedLabs kitchen
```

---

### Notes
- **Double opt-in:** beehiiv sends its confirmation first; these automations
  fire after the subscriber confirms (status `active`).
- **Unsubscribe** is automatic in beehiiv's footer — the "no sleaze" promise is
  real, keep it one click.
- **Discord Lead Inbox** already pings you live for `catering` / `contact` /
  `workshop`, so the auto-replies above are the subscriber's receipt while *you*
  reply personally from Discord.
