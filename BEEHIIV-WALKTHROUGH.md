# beehiiv setup — the click-by-click walkthrough

Everything the SlicedLabs lead engine needs on the beehiiv side. The website +
API are already wired; this connects the *sequences*. ~20 minutes, one time.

The email copy for every step lives in **`BEEHIIV-AUTOMATIONS.md`** — keep it
open beside this.

---

## What's already done (no action needed)
- ✅ The 8 **custom fields** exist (created via API): `Source`, `Name`, `Event Date`,
  `Event Type`, `Headcount`, `Topic`, `Interest`, `Message`.
- ✅ The website posts to `/api/lead`, which adds the subscriber with
  `utm_campaign = <source>` + those custom fields.
- ✅ The **Discord Lead Inbox** pings you live for catering/contact/workshop.
- ✅ End-to-end tested: a real submit returns `{ok:true}`.

## What you're doing here
Turning each `utm_campaign` tag into an **automation** that sends the right email.

---

## Step 1 — Confirm the custom fields (30 sec)
1. Log in to beehiiv → your **SlicedLabs Weekly** publication.
2. Left sidebar → **Audience** → **Custom Fields**.
3. You should see the 8 fields listed. If any is missing, click **New Custom
   Field**, type the exact name (e.g. `Event Date`), kind **Text**, save.

## Step 2 — Build the first automation (the Welcome)
This is the template; the other six are the same shape with different filters/copy.

1. Left sidebar → **Automations** → **New Automation** → **Start from scratch**.
2. Name it `Welcome — newsletter`.
3. **Trigger:** click the trigger block → choose **Add by API**.
   - This is the key: every website submit hits the API, so this trigger catches them.
4. **Add a filter** right after the trigger → **Custom field / UTM** → set
   **`utm_campaign` is `newsletter`**.
   - ⚠️ This filter is what keeps each automation to its own intake. Without it,
     every automation would fire for every signup.
5. **+ Add step** → **Send Email**.
6. Click the email → **Subject** + **body** from `BEEHIIV-AUTOMATIONS.md` §1.
   - Replace the `/free`, `/watch`, `/kitchen` links with the full
     `https://slicedlabs-web.vercel.app/...` URL (swap to `slicedlabs.io` later).
7. **Save & publish** the automation (toggle it **Live**).

## Step 3 — Repeat for the other six
Same steps, new automation each time. Name · filter · copy source:

| Automation | Filter: `utm_campaign is` | Copy |
|---|---|---|
| Welcome — newsletter | `newsletter` | §1 |
| Free Drops delivery | `vault` | §2 |
| Catering auto-reply | `catering` | §3 |
| Contact auto-reply | `contact` | §4 |
| Workshop interest | `workshop` | §5 |
| Monthly recipe welcome | `recipe` | §6 |
| Waitlist confirm ×3 | `merch-waitlist`, `playbooks-waitlist`, `food-preorder` | §7 |

> The 3 waitlists can be **one automation** with a filter of
> `utm_campaign is any of [merch-waitlist, playbooks-waitlist, food-preorder]`,
> or three tiny ones if you want different subject lines.

## Step 4 — The Free Drops asset links (when ready)
Automation §2 has three `[LINK TO ASSET]` placeholders.
1. Host each file: in beehiiv (**Designs/Uploads**) or a public Google Drive link.
2. Edit the `vault` automation's email → paste each URL over its placeholder.
3. Until then, leave the automation **paused** (or send a "they're coming"
   holding email) so nobody gets a dead link.

## Step 5 — Test each one
1. Open the live site, submit the matching form with a test email you control
   (use `+tags`: `you+catering@gmail.com`, `you+vault@gmail.com`, …).
2. Confirm: the double opt-in email arrives → confirm it → the automation email
   lands. For catering/contact/workshop, also confirm the **Discord ping**.
3. In beehiiv → **Automations** → open the automation → the **subscriber count**
   should tick up.

---

## How it maps (the whole chain)
```
website form  →  /api/lead  →  beehiiv subscriber
                   │             (utm_campaign = source, + custom fields)
                   │                     │
                   │                     └─►  Automation (Add by API + filter)  →  Email
                   │
                   └─►  Discord Lead Inbox  (catering / contact / workshop only)
```

## Troubleshooting
- **Automation didn't fire:** check it's **Live**, and the filter value exactly
  matches the `source` (e.g. `merch-waitlist`, hyphen, lowercase).
- **No custom field data:** the field name in beehiiv must match exactly
  (`Event Date`, not `event_date`). Re-check Step 1.
- **Subscriber stuck `validating`:** that's beehiiv double opt-in — they must
  click the confirm email before automations send. Normal.
- **Test POST returns 403 from curl:** expected — that's CSRF protection. Real
  browser submits from the site pass fine.
