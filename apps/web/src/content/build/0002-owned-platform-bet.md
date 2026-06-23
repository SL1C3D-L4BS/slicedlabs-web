---
title: "Why we own the store instead of renting one"
date: 2026-06-20
summary: "We built one Astro app on a stack we own so a marketplace can't rent us our own audience."
tags: ["the-build", "platform"]
draft: false
---

The easy path is to rent a storefront. Sign up, get a theme, list your stuff, ship. We looked hard at that path and walked away from it on purpose.

Here's the build. It's one Astro app. Checkout goes Stripe-direct through our own merchant account — we pay Stripe's standard rate, around 2.9% plus 30 cents, and that's it. No marketplace sitting on top taking a cut of every sale on top of the processor. Supabase is our owned ledger and the source of truth for what happened. Printful handles print-on-demand merch so we hold no inventory. The email list lives in beehiiv, and we can export every address any time we want. Resend sends our own transactional email — receipts, confirmations, the boring stuff that has to just work.

We evaluated the obvious off-the-shelf answers — Shopify with Hydrogen, and a Next.js storefront — and dropped both. Not because they're bad. Because every layer we didn't own was a layer that owned a piece of us.

**A marketplace doesn't sell you a store. It rents you your own audience and skims every sale.**

That's the part nobody says out loud. When you build on rented land, the platform owns the customer relationship, the platform owns the data, and the platform takes its margin first. You get what's left, and you get it on their terms — until the terms change. They always change.

So we drew a hard line. Own the customer. Own the data. Own the margin. The customer's email is ours, not a list we lease back from a middleman. The order history is in a database we control. The margin is the spread between what we charge and what Stripe and Printful cost — nobody else has a hand in it.

Honest caveat: owning the stack is more work. We wrote the checkout flow. We wired the ledger. When something breaks, there's no support queue to blame — it's us. We took that trade knowingly. The work is one-time. The ownership compounds.

This is the same bet underneath everything we're building. The truck is owned. The list is owned. The audience is the one asset nobody can rent us, so we refuse to build it on land we don't hold.

The future, sliced.

Own your slice.
