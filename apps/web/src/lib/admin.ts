// SlicedLabs · commerce · © 2026 SlicedLabs
// Solo-operator admin gate: an allowlist of emails (ADMIN_EMAILS, comma-separated).
// Keeps /admin simple — no roles table yet. Writes still go through the service-role
// client AFTER this check passes.
import { env } from "./commerce/env";

export function adminEmails(): string[] {
  const raw = String(env.adminEmails() ?? "");
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  const list = adminEmails();
  return list.length > 0 && list.includes(email.toLowerCase());
}
