"use client";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@slicedlabs/ui";

export function LoginForm({
  origin,
  next,
  initialError,
}: {
  origin: string;
  next: string;
  initialError?: string;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>(initialError);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const supabase = getBrowserSupabase();
    // signInWithOtp runs in the BROWSER so the PKCE code-verifier is stored in the
    // browser cookie that /auth/callback reads back. This is the supported path.
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo, shouldCreateUser: true },
    });
    setPending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-6">
        <p className="text-[var(--ink)]">Check your inbox.</p>
        <p className="mt-1 text-[var(--muted)]">
          We sent a sign-in link to{" "}
          <span className="text-[var(--muted-strong)]">{email}</span>. It opens this cockpit directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3">
      <label className="text-[var(--muted)]" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@kitchen.com"
        className="rounded-[var(--radius)] border border-[var(--stroke)] bg-[var(--bg-alt)] px-4 py-3 text-[var(--ink)] outline-none focus:border-[var(--mark)]"
      />
      {error && <p className="text-[var(--coral)]">{error}</p>}
      <Button type="submit" disabled={pending || !email}>
        {pending ? "Sending…" : "Send magic link"}
      </Button>
    </form>
  );
}
