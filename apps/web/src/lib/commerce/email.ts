// SlicedLabs · commerce · © 2026 SlicedLabs
// Resend = transactional email. Fully env-gated: with no RESEND_API_KEY every send
// is a no-op ({ sent: false }) so checkout/webhooks never fail for lack of email.
import { Resend } from "resend";
import { env } from "./env";
import { formatMoney } from "./cart";

export function emailConfigured(): boolean {
  return Boolean(env.resendKey());
}

function client(): Resend | null {
  const key = env.resendKey();
  return key ? new Resend(key) : null;
}

const shell = (inner: string) => `
  <div style="font-family:Inter,system-ui,sans-serif;background:#FBF6EE;color:#1C1A17;padding:32px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e7ddc9;border-radius:16px;padding:28px">
      <p style="font:600 13px/1 ui-monospace,monospace;letter-spacing:.08em;color:#7A6E5C;margin:0 0 12px">SLICEDLABS</p>
      ${inner}
      <p style="color:#7A6E5C;font-size:13px;margin-top:24px">Own your slice. — slicedlabs.io</p>
    </div>
  </div>`;

export async function sendOrderConfirmation(o: {
  to: string;
  orderId: string;
  items: { title: string; qty: number; unitPriceCents: number }[];
  totalCents: number;
  currency: string;
}): Promise<{ sent: boolean }> {
  const resend = client();
  if (!resend) return { sent: false };
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.qty}× ${i.title}</td><td style="padding:6px 0;text-align:right">${formatMoney(
          i.unitPriceCents * i.qty,
          o.currency,
        )}</td></tr>`,
    )
    .join("");
  const html = shell(`
    <h1 style="font-size:22px;margin:0 0 4px">Order confirmed</h1>
    <p style="color:#7A6E5C;margin:0 0 16px">Thanks — we're on it. Order <strong>${o.orderId.slice(0, 8)}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
      <tr><td style="padding:10px 0 0;border-top:1px solid #e7ddc9;font-weight:700">Total</td>
      <td style="padding:10px 0 0;border-top:1px solid #e7ddc9;text-align:right;font-weight:700">${formatMoney(
        o.totalCents,
        o.currency,
      )}</td></tr>
    </table>`);
  const r = await resend.emails.send({ from: env.resendFrom(), to: o.to, subject: "Your SlicedLabs order", html });
  return { sent: !r.error };
}

export async function sendShippingUpdate(args: {
  to: string;
  orderId: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
}): Promise<{ sent: boolean }> {
  const resend = client();
  if (!resend) return { sent: false };
  const track = args.trackingUrl
    ? `<p><a href="${args.trackingUrl}" style="color:#CB6820">Track your package →</a></p>`
    : args.trackingNumber
      ? `<p>Tracking: <strong>${args.trackingNumber}</strong>${args.carrier ? ` (${args.carrier})` : ""}</p>`
      : "";
  const html = shell(`
    <h1 style="font-size:22px;margin:0 0 4px">It's on the way</h1>
    <p style="color:#7A6E5C;margin:0 0 16px">Order <strong>${args.orderId.slice(0, 8)}</strong> has shipped.</p>
    ${track}`);
  const r = await resend.emails.send({
    from: env.resendFrom(),
    to: args.to,
    subject: "Your SlicedLabs order shipped",
    html,
  });
  return { sent: !r.error };
}

export async function sendPerkDelivery(args: {
  to: string;
  perkLabel: string;
  signInUrl: string;
}): Promise<{ sent: boolean }> {
  const resend = client();
  if (!resend) return { sent: false };
  const html = shell(`
    <h1 style="font-size:22px;margin:0 0 4px">Your drop is ready</h1>
    <p style="color:#7A6E5C;margin:0 0 18px"><strong>${args.perkLabel}</strong> is unlocked on your account. Tap to sign in — no password.</p>
    <p style="margin:0 0 20px">
      <a href="${args.signInUrl}" style="display:inline-block;background:#CB6820;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">Open my drop →</a>
    </p>
    <p style="color:#7A6E5C;font-size:13px;margin:0">This sign-in link expires shortly. If it lapses, sign in anytime at slicedlabs.io/account.</p>`);
  const r = await resend.emails.send({
    from: env.resendFrom(),
    to: args.to,
    subject: `${args.perkLabel} — your SlicedLabs drop`,
    html,
  });
  return { sent: !r.error };
}

// Owned, first-party confirmation for a list signup / inquiry. This is the
// belt-and-suspenders behind beehiiv: beehiiv's welcome email can be unconfigured,
// gated behind double-opt-in, or undelivered — so we ALSO send our own from Resend.
// Env-gated (no RESEND_API_KEY → no-op) so /api/lead never fails for lack of email.
export async function sendListWelcome(args: {
  to: string;
  label?: string | null;
  inquiry?: boolean;
}): Promise<{ sent: boolean }> {
  const resend = client();
  if (!resend) return { sent: false };
  const inquiry = Boolean(args.inquiry);
  const heading = inquiry ? "We got it" : "You're in";
  const body = inquiry
    ? `Thanks for reaching out${args.label ? ` about ${args.label.toLowerCase()}` : ""} — your note landed with us and a human will be in touch. Meanwhile, the receipts keep coming.`
    : `You're on the SlicedLabs list — a food · media · marketing company building a real food empire in public. Expect the build, the recipes, and the receipts. The future, sliced.`;
  const html = shell(`
    <h1 style="font-size:22px;margin:0 0 4px">${heading}</h1>
    <p style="color:#7A6E5C;margin:0 0 16px">${body}</p>
    <p style="margin:0"><a href="https://slicedlabs.io" style="color:#CB6820;font-weight:600;text-decoration:none">Own your slice → slicedlabs.io</a></p>`);
  const r = await resend.emails.send({
    from: env.resendFrom(),
    to: args.to,
    // Replies land with a human; List-Unsubscribe lifts inbox placement (the list itself is
    // managed in beehiiv — this owned confirmation is transactional, so a mailto opt-out is
    // the honest, always-valid header here).
    replyTo: "hello@slicedlabs.io",
    headers: { "List-Unsubscribe": "<mailto:unsubscribe@slicedlabs.io?subject=unsubscribe>" },
    subject: inquiry ? "We got your note — SlicedLabs" : "Welcome to SlicedLabs",
    html,
  });
  return { sent: !r.error };
}

export async function sendWorkshopTicket(args: {
  to: string;
  title: string;
  slug: string;
  startsAt: string | null;
}): Promise<{ sent: boolean }> {
  const resend = client();
  if (!resend) return { sent: false };
  const when = args.startsAt
    ? new Date(args.startsAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : null;
  const html = shell(`
    <h1 style="font-size:22px;margin:0 0 4px">You're in</h1>
    <p style="color:#7A6E5C;margin:0 0 18px">Your ticket to <strong>${args.title}</strong> is confirmed${when ? ` — ${when}` : ""}. The live room opens from your account at start time.</p>
    <p style="margin:0 0 20px">
      <a href="https://slicedlabs.io/account" style="display:inline-block;background:#CB6820;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">View my ticket →</a>
    </p>`);
  const r = await resend.emails.send({
    from: env.resendFrom(),
    to: args.to,
    subject: `Ticket confirmed — ${args.title}`,
    html,
  });
  return { sent: !r.error };
}

export async function sendPlaybookReady(args: {
  to: string;
  title: string;
  slug: string;
}): Promise<{ sent: boolean }> {
  const resend = client();
  if (!resend) return { sent: false };
  const html = shell(`
    <h1 style="font-size:22px;margin:0 0 4px">Your playbook is ready</h1>
    <p style="color:#7A6E5C;margin:0 0 18px"><strong>${args.title}</strong> is unlocked on your account — the system, packaged. Tap to open it.</p>
    <p style="margin:0 0 20px">
      <a href="https://slicedlabs.io/account" style="display:inline-block;background:#CB6820;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">Open my playbook →</a>
    </p>`);
  const r = await resend.emails.send({
    from: env.resendFrom(),
    to: args.to,
    subject: `Your playbook is ready — ${args.title}`,
    html,
  });
  return { sent: !r.error };
}
