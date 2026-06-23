// SlicedLabs · kitchen · © 2026 SlicedLabs
// Food tools — a food-waste log + dietary preferences. Works for ANYONE in localStorage
// (SEO + lead capture); when signed in, syncs to Supabase (/api/food/*) so it follows you
// across devices. The page sets data-authed on the root; the API is RLS-scoped so the
// server is the source of truth once signed in. Progressive enhancement: no-JS still gets
// the (server-rendered) informational page; this only adds the live tool.
const KEY = "sl-food-v1";

export type Entry = {
  lid: string; // local id (stable client key)
  id?: string; // server id once synced
  item: string;
  kind: string;
  qty: number | null;
  unit: string | null;
  cost_cents: number | null;
  logged_at: string;
};
type Prefs = { diets: string[]; allergens: string[] };
type Store = { entries: Entry[]; prefs: Prefs };

const blankStore = (): Store => ({ entries: [], prefs: { diets: [], allergens: [] } });

function read(): Store {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "");
    if (v && typeof v === "object") {
      return {
        entries: Array.isArray(v.entries) ? v.entries : [],
        prefs: {
          diets: Array.isArray(v.prefs?.diets) ? v.prefs.diets : [],
          allergens: Array.isArray(v.prefs?.allergens) ? v.prefs.allergens : [],
        },
      };
    }
  } catch {
    /* fall through to blank */
  }
  return blankStore();
}
function write(s: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full / blocked — tool still works in-memory this session */
  }
}

const uid = (): string => `l_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
const money = (cents: number | null): string =>
  cents == null ? "" : `$${(cents / 100).toFixed(2)}`;
const sameMonth = (iso: string): boolean => {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
};
const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

type ServerEntry = {
  id: string;
  kind: string;
  item: string;
  qty: number | null;
  unit: string | null;
  cost_cents: number | null;
  logged_at: string;
};
const fromServer = (r: ServerEntry): Entry => ({
  lid: r.id,
  id: r.id,
  item: r.item,
  kind: r.kind,
  qty: r.qty,
  unit: r.unit,
  cost_cents: r.cost_cents,
  logged_at: r.logged_at,
});

export function initFoodTools(): void {
  const root = document.querySelector<HTMLElement>("[data-foodtools]");
  if (!root) return;
  const authed = root.dataset.authed === "true";

  const listEl = document.getElementById("fw-list");
  const countEl = document.getElementById("fw-count");
  const costEl = document.getElementById("fw-cost");
  const form = document.getElementById("fw-form") as HTMLFormElement | null;
  const prefsStatus = document.getElementById("prefs-status");
  const prefsSave = document.getElementById("prefs-save");

  let store = read();

  function render(): void {
    const entries = [...store.entries].sort(
      (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime(),
    );
    if (listEl) {
      listEl.innerHTML =
        entries.length === 0
          ? `<li class="mono" style="color:var(--muted); list-style:none; padding:.4rem 0;">Nothing logged yet — add what got tossed so you can stop tossing it.</li>`
          : entries
              .map((e) => {
                const bits = [
                  e.qty != null ? `${e.qty}${e.unit ? ` ${esc(e.unit)}` : ""}` : "",
                  money(e.cost_cents),
                  new Date(e.logged_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                ]
                  .filter(Boolean)
                  .join(" · ");
                return `<li class="fw-row glass island" style="display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.7rem 1rem;">
                  <span><strong>${esc(e.item)}</strong>${bits ? `<span class="mono" style="color:var(--muted); display:block; font-size:.78rem;">${bits}</span>` : ""}</span>
                  <button type="button" class="btn-ghost" data-remove="${esc(e.lid)}" style="padding:.3rem .7rem; font-size:.8rem;" aria-label="Remove ${esc(e.item)}">Remove</button>
                </li>`;
              })
              .join("");
    }
    const month = store.entries.filter((e) => sameMonth(e.logged_at));
    if (countEl) countEl.textContent = String(month.length);
    if (costEl)
      costEl.textContent = `$${(month.reduce((s, e) => s + (e.cost_cents ?? 0), 0) / 100).toFixed(2)}`;
  }

  async function syncFromServer(): Promise<void> {
    if (!authed) return;
    try {
      // push any local entries created before sign-in (no server id yet)
      const unsynced = store.entries.filter((e) => !e.id);
      if (unsynced.length) {
        await fetch("/api/food/log", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            entries: unsynced.map((e) => ({
              kind: e.kind,
              item: e.item,
              qty: e.qty,
              unit: e.unit,
              cost_cents: e.cost_cents,
              logged_at: e.logged_at,
            })),
          }),
        });
      }
      // pull the authoritative list
      const res = await fetch("/api/food/log", { headers: { accept: "application/json" } });
      const data = (await res.json()) as { ok: boolean; items?: ServerEntry[] };
      if (data.ok && Array.isArray(data.items)) {
        store.entries = data.items.map(fromServer);
        write(store);
        render();
      }
      // prefs: adopt server; if server empty but local has prefs, push local up
      const pRes = await fetch("/api/food/prefs", { headers: { accept: "application/json" } });
      const p = (await pRes.json()) as { ok: boolean; diets?: string[]; allergens?: string[] };
      const serverEmpty = !(p.diets?.length || p.allergens?.length);
      const localHas = store.prefs.diets.length || store.prefs.allergens.length;
      if (serverEmpty && localHas) {
        await savePrefs(store.prefs, false);
      } else if (p.ok) {
        store.prefs = { diets: p.diets ?? [], allergens: p.allergens ?? [] };
        write(store);
      }
      reflectPrefs();
    } catch {
      /* offline / failed → keep working from localStorage; next load re-syncs */
    }
  }

  async function addEntry(e: Omit<Entry, "lid">): Promise<void> {
    const entry: Entry = { ...e, lid: uid() };
    if (authed) {
      try {
        const res = await fetch("/api/food/log", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ entries: [{ kind: e.kind, item: e.item, qty: e.qty, unit: e.unit, cost_cents: e.cost_cents, logged_at: e.logged_at }] }),
        });
        const data = (await res.json()) as { ok: boolean; items?: ServerEntry[] };
        if (data.ok && data.items?.[0]) {
          store.entries.push(fromServer(data.items[0]));
          write(store);
          render();
          return;
        }
      } catch {
        /* fall through to local */
      }
    }
    store.entries.push(entry);
    write(store);
    render();
  }

  async function removeEntry(lid: string): Promise<void> {
    const e = store.entries.find((x) => x.lid === lid);
    store.entries = store.entries.filter((x) => x.lid !== lid);
    write(store);
    render();
    if (authed && e?.id) {
      try {
        await fetch("/api/food/log", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ remove: e.id }),
        });
      } catch {
        /* server delete failed — local already updated; re-sync will reconcile */
      }
    }
  }

  async function savePrefs(prefs: Prefs, showStatus = true): Promise<void> {
    store.prefs = prefs;
    write(store);
    if (authed) {
      try {
        await fetch("/api/food/prefs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(prefs),
        });
      } catch {
        /* keep local */
      }
    }
    if (showStatus && prefsStatus) {
      prefsStatus.textContent = "Saved ✓";
      window.setTimeout(() => {
        if (prefsStatus) prefsStatus.textContent = "";
      }, 2000);
    }
  }

  function reflectPrefs(): void {
    for (const cb of document.querySelectorAll<HTMLInputElement>("[data-diet]")) {
      cb.checked = store.prefs.diets.includes(cb.value);
    }
    for (const cb of document.querySelectorAll<HTMLInputElement>("[data-allergen]")) {
      cb.checked = store.prefs.allergens.includes(cb.value);
    }
  }

  // ── wire up ────────────────────────────────────────────────────────────────
  form?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const item = String(fd.get("item") ?? "").trim();
    if (!item) return;
    const qtyRaw = String(fd.get("qty") ?? "").trim();
    const costRaw = String(fd.get("cost") ?? "").trim();
    void addEntry({
      item,
      kind: "waste",
      qty: qtyRaw ? Number(qtyRaw) : null,
      unit: String(fd.get("unit") ?? "").trim() || null,
      cost_cents: costRaw ? Math.round(Number(costRaw) * 100) : null,
      logged_at: new Date().toISOString(),
    });
    form.reset();
    (form.querySelector('[name="item"]') as HTMLInputElement | null)?.focus();
  });

  listEl?.addEventListener("click", (ev) => {
    const btn = (ev.target as HTMLElement)?.closest<HTMLButtonElement>("[data-remove]");
    if (btn?.dataset.remove) void removeEntry(btn.dataset.remove);
  });

  prefsSave?.addEventListener("click", () => {
    const diets = Array.from(document.querySelectorAll<HTMLInputElement>("[data-diet]:checked")).map((c) => c.value);
    const allergens = Array.from(document.querySelectorAll<HTMLInputElement>("[data-allergen]:checked")).map((c) => c.value);
    void savePrefs({ diets, allergens });
  });

  reflectPrefs();
  render();
  void syncFromServer();
}
