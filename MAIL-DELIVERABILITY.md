# Email deliverability — "I don't get emails when I sign up"

The signup **code is correct**: both `apps/web/src/pages/api/subscribe.ts` and `…/api/lead.ts`
call beehiiv with `send_welcome_email: true` + `reactivate_existing: true`, and now ALSO
send an owned first-party confirmation via Resend (`sendListWelcome` in
`lib/commerce/email.ts`). So if mail still doesn't arrive, it's **configuration or domain
authentication**, not the app. Work this checklist top-down.

## 1. Is the beehiiv key even set? (most common cause)
With no `BEEHIIV_API_KEY` in Vercel, `/api/subscribe` silently 303s `?subscribe=error` and
no subscriber is created.
- Vercel → Project `slicedlabs-web` → Settings → Environment Variables → confirm
  `BEEHIIV_API_KEY` (and `BEEHIIV_PUBLICATION_ID`) exist for **Production**.
- After a test signup, check **Vercel → Logs**. The code now logs
  `beehiiv subscribe failed (<source>): <status> <body>` on any non-2xx — read the status:
  - `401` → bad/missing API key.  `400` → bad publication id or payload.

## 2. Is a welcome email actually configured in beehiiv?
`send_welcome_email: true` only sends if the publication HAS a welcome email built.
- beehiiv → Settings → **Welcome email** → ensure one exists and is **enabled**.

## 3. Double opt-in (confirmation) setting
If **double opt-in is ON**, beehiiv first sends a *confirmation* email; the welcome only
fires after the subscriber clicks confirm. If that confirmation isn't arriving, it's a
deliverability/domain problem (step 4) — or turn double opt-in off if you want single opt-in.
- beehiiv → Settings → Subscribe/opt-in.

## 4. Authenticate the sending domain (the real blocker)
This is the usual reason mail "vanishes" (dropped or spam-filed).
- **`slicedlabs.io` is not purchased yet.** Until it is, you cannot authenticate a custom
  sending domain, and the owned Resend send (`RESEND_FROM="… <orders@slicedlabs.io>"`) will
  NOT deliver from that address. Two consequences:
  - beehiiv's *shared* sending domain still works (that path doesn't need your domain).
  - Resend will only deliver to the account owner from `onboarding@resend.dev` until a
    domain is verified.
- **Action:** buy `slicedlabs.io`, then add **SPF, DKIM, DMARC** DNS records for:
  - **Resend** (required for the owned confirmation email) — verify the domain in Resend,
    set `RESEND_API_KEY` + `RESEND_FROM` in Vercel.
  - **beehiiv** (optional) — add a custom sending domain for branded `from:`.

## 5. Verify end-to-end
- Test signup on `/` (newsletter) and on a perk form (`/free`).
- Confirm in Vercel logs there's no `beehiiv … failed` line.
- Confirm the subscriber appears in beehiiv and an email lands (check spam).
- Perk signups (recipe/vault/debt) get a branded magic-link from `grantPerkForLead`; plain
  signups get `sendListWelcome`. No source gets two emails.
