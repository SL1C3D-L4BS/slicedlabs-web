// SlicedLabs · commerce · © 2026 SlicedLabs
// Operator alerts → the Discord ops inbox (DISCORD_WEBHOOK_URL). Best-effort, never throws —
// a missing webhook or a network hiccup must never break a paid-order or status flow.
export async function notifyOperator(
  title: string,
  lines: string[],
  color = 0xd9583c,
): Promise<void> {
  const hook = process.env.DISCORD_WEBHOOK_URL || import.meta.env.DISCORD_WEBHOOK_URL;
  if (!hook) return;
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title,
            description: lines.filter(Boolean).join("\n"),
            color,
            footer: { text: "slicedlabs.io · ops" },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch {
    /* non-fatal */
  }
}
