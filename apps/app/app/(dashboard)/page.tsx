import { getServerSupabase } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { Button } from "@slicedlabs/ui";

// Every query is RLS-scoped to auth.uid() — the user only ever sees their own rows.
// We never use the service-role client here.
export default async function CockpitPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Awaited sequentially (not Promise.all): the Supabase typed query builders are
  // PromiseLike, and Promise.all over a heterogeneous tuple collapses their row types
  // to `never`. Three RLS-scoped reads are cheap.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, lead_score")
    .maybeSingle();
  const { data: entitlements } = await supabase
    .from("entitlements")
    .select("kind, source, ref_id, granted_at, expires_at")
    .order("granted_at", { ascending: false });
  const { data: recipes } = await supabase
    .from("saved_recipes")
    .select("recipe_slug, note, saved_at")
    .order("saved_at", { ascending: false });

  const now = Date.now();
  const active = (entitlements ?? []).filter(
    (e) => !e.expires_at || new Date(e.expires_at).getTime() > now,
  );
  const isMember = active.some((e) => e.kind === "member");
  const vaultDrops = active.filter((e) => e.kind === "vault_drops");
  const playbooks = active.filter((e) => e.kind.startsWith("playbook:"));

  return (
    <>
      <header className="sl-rise flex items-end justify-between gap-4">
        <div>
          <p className="font-[family-name:var(--font-display)] text-[var(--step-3)] leading-none">
            {profile?.full_name ?? "Welcome"}
          </p>
          <p className="mt-1 text-[var(--muted)]">
            {profile?.email ?? user?.email}
            {isMember && (
              <span className="ml-2 rounded-full border border-[var(--stroke)] px-2 py-0.5 text-[var(--teal)]">
                Member
              </span>
            )}
          </p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </header>

      {/* VAULT DROPS — rendered as a real download list from the perk entitlement. */}
      <section className="sl-glass sl-rise p-6">
        <h2 className="font-[family-name:var(--font-display)] text-[var(--step-1)]">Vault drops</h2>
        {vaultDrops.length === 0 ? (
          <p className="mt-3 text-[var(--muted)]">
            No drops yet. Your perk unlocks downloads here the moment it&apos;s granted.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {vaultDrops.map((d) => (
              <li
                key={`${d.ref_id}-${d.granted_at}`}
                className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--stroke)] bg-[var(--bg-alt)] px-4 py-3"
              >
                <span className="text-[var(--ink)]">{d.ref_id ?? "Drop"}</span>
                <a
                  className="text-[var(--mark)] underline-offset-4 hover:underline"
                  href={`/api/vault/${encodeURIComponent(d.ref_id ?? "")}`}
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {playbooks.length > 0 && (
        <section className="sl-glass p-6">
          <h2 className="font-[family-name:var(--font-display)] text-[var(--step-1)]">Playbooks</h2>
          <ul className="mt-4 grid gap-2">
            {playbooks.map((p) => (
              <li key={p.kind} className="text-[var(--muted-strong)]">
                {p.kind.replace("playbook:", "")}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* SAVED RECIPES — empty-state ok. */}
      <section className="sl-glass p-6">
        <h2 className="font-[family-name:var(--font-display)] text-[var(--step-1)]">Saved recipes</h2>
        {(recipes ?? []).length === 0 ? (
          <p className="mt-3 text-[var(--muted)]">
            Nothing saved yet. Save a recipe from the site and it shows up here.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {recipes!.map((r) => (
              <li
                key={r.recipe_slug}
                className="rounded-[var(--radius)] border border-[var(--stroke)] px-4 py-3"
              >
                <a className="text-[var(--ink)] hover:text-[var(--mark)]" href={`/recipes/${r.recipe_slug}`}>
                  {r.recipe_slug}
                </a>
                {r.note && <p className="mt-1 text-[var(--muted)]">{r.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
