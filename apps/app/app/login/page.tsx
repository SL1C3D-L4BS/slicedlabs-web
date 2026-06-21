import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — SlicedLabs" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  // Same-origin guard (mirror the callback): reject absolute + protocol-relative targets.
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next);

  // Absolute origin for the magic-link redirect target.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "app.slicedlabs.io";
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;

  return (
    <section className="sl-rise mx-auto mt-16 max-w-md">
      <div className="sl-glass p-8">
        <p className="font-[family-name:var(--font-display)] text-[var(--step-2)] leading-tight">
          Member Cockpit
        </p>
        <p className="mt-2 text-[var(--muted)]">We don&apos;t pitch. We prove.</p>
        <LoginForm origin={origin} next={next} initialError={sp.error} />
      </div>
    </section>
  );
}
