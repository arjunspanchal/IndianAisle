"use client";

import { useMemo, useState, useTransition } from "react";
import {
  blankProperty,
  TIER_LABEL,
  type Property,
  type PropertyTier,
} from "@/lib/properties";
import { removeProperty, saveProperty } from "@/app/properties/actions";

type Props = {
  initial: Property[];
  airtableReady: boolean;
  loadError: string | null;
};

type StatusMsg = { kind: "ok" | "err"; text: string } | null;

export default function PropertyManager({ initial, airtableReady, loadError }: Props) {
  const [items, setItems] = useState<Property[]>(initial);
  const [editing, setEditing] = useState<Property | null>(null);
  const [filterTier, setFilterTier] = useState<PropertyTier | "all">("all");
  const [filterBanquet, setFilterBanquet] = useState<"all" | "yes" | "no">("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusMsg>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (filterTier !== "all" && p.tier !== filterTier) return false;
      if (filterBanquet === "yes" && !p.banquet) return false;
      if (filterBanquet === "no" && p.banquet) return false;
      if (q && !`${p.name} ${p.location} ${p.notes ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, filterTier, filterBanquet, search]);

  const startAdd = () => setEditing(blankProperty());
  const startEdit = (p: Property) => setEditing({ ...p });
  const cancelEdit = () => setEditing(null);

  const onSave = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      setStatus({ kind: "err", text: "Name is required." });
      return;
    }
    if (!airtableReady) {
      // Local-only: keep changes in memory so the user can still try the UI.
      setItems((prev) => {
        const exists = prev.find((x) => x.id === editing.id);
        if (exists) return prev.map((x) => (x.id === editing.id ? editing : x));
        return [...prev, editing];
      });
      setEditing(null);
      setStatus({ kind: "ok", text: "Saved locally (Airtable not configured)." });
      return;
    }
    startTransition(async () => {
      const res = await saveProperty(editing);
      if (!res.ok) {
        setStatus({ kind: "err", text: `Save failed: ${res.error}` });
        return;
      }
      const saved = res.data;
      setItems((prev) => {
        const idx = prev.findIndex((x) => x.airtableId === saved.airtableId || x.id === editing.id);
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      setEditing(null);
      setStatus({ kind: "ok", text: "Saved." });
    });
  };

  const onDelete = (p: Property) => {
    if (!confirm(`Delete property “${p.name}”? This affects everyone using the app.`)) return;
    if (!airtableReady) {
      setItems((prev) => prev.filter((x) => x.id !== p.id));
      setStatus({ kind: "ok", text: "Removed locally (Airtable not configured)." });
      return;
    }
    if (!p.airtableId) {
      setItems((prev) => prev.filter((x) => x.id !== p.id));
      return;
    }
    startTransition(async () => {
      const res = await removeProperty(p.airtableId!);
      if (!res.ok) {
        setStatus({ kind: "err", text: `Delete failed: ${res.error}` });
        return;
      }
      setItems((prev) => prev.filter((x) => x.airtableId !== p.airtableId));
      setStatus({ kind: "ok", text: "Deleted." });
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Property manager</h1>
          <p className="mt-1 text-sm text-stone-600">
            Shared directory of candidate venues — visible to everyone using The Indian Aisle.
          </p>
        </div>
        <button className="btn-primary" onClick={startAdd} disabled={pending}>
          + Add property
        </button>
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          Couldn&apos;t load from Airtable: {loadError}. Showing in-memory defaults.
          {" "}If this is the first run, create a table named <code>Properties</code> in your base
          with fields Name, Location, Rooms, Tier, Banquet, Notes.
        </div>
      )}
      {!airtableReady && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Airtable not configured — changes won&apos;t persist or be visible to other users until <code>AIRTABLE_PAT</code> is set.
        </div>
      )}
      {status && (
        <div
          className={`mb-4 rounded-md px-4 py-2 text-sm ${
            status.kind === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {status.text}
        </div>
      )}

      {/* filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <Field label="Search">
          <input
            className="text-input"
            placeholder="Name, location, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <Field label="Tier">
          <select
            className="text-input"
            value={filterTier === "all" ? "all" : String(filterTier)}
            onChange={(e) => setFilterTier(e.target.value === "all" ? "all" : (Number(e.target.value) as PropertyTier))}
          >
            <option value="all">All tiers</option>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
            <option value="3">Tier 3</option>
          </select>
        </Field>
        <Field label="Banquet">
          <select
            className="text-input"
            value={filterBanquet}
            onChange={(e) => setFilterBanquet(e.target.value as "all" | "yes" | "no")}
          >
            <option value="all">Any</option>
            <option value="yes">Has banquet</option>
            <option value="no">No banquet</option>
          </select>
        </Field>
        <div className="ml-auto text-xs text-stone-500">
          {filtered.length} of {items.length} shown
        </div>
      </div>

      {/* edit drawer */}
      {editing && (
        <PropertyForm
          value={editing}
          onChange={setEditing}
          onSave={onSave}
          onCancel={cancelEdit}
          saving={pending}
        />
      )}

      {/* list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-sm text-stone-500">
          No properties match. Try clearing filters or add a new one.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <li
              key={p.airtableId ?? p.id}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="font-serif text-xl">{p.name || "(unnamed)"}</h2>
                    <TierBadge tier={p.tier} />
                    {p.banquet && <Badge tone="emerald">Banquet</Badge>}
                  </div>
                  <div className="mt-1 text-sm text-stone-600">
                    {p.location || <span className="italic text-stone-400">No location</span>}
                  </div>
                  <div className="mt-1 text-xs text-stone-500">
                    {p.rooms} room{p.rooms === 1 ? "" : "s"}
                  </div>
                  {p.notes && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{p.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button className="btn-ghost text-xs" onClick={() => startEdit(p)} disabled={pending}>
                    Edit
                  </button>
                  <button
                    className="text-xs text-rose-700 hover:underline disabled:opacity-50"
                    onClick={() => onDelete(p)}
                    disabled={pending}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PropertyForm({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  value: Property;
  onChange: (p: Property) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const set = <K extends keyof Property>(k: K, v: Property[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <section className="mb-6 rounded-xl border border-ink/20 bg-white p-5 shadow-md">
      <h2 className="mb-4 font-serif text-2xl">
        {value.airtableId ? "Edit property" : "New property"}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input
            className="text-input"
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Storii by ITC Hotels"
            autoFocus
          />
        </Field>
        <Field label="Location">
          <input
            className="text-input"
            value={value.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="City, region"
          />
        </Field>
        <Field label="Number of rooms">
          <input
            type="number"
            min={0}
            step={1}
            className="num-input"
            value={Number.isFinite(value.rooms) ? value.rooms : 0}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              set("rooms", Number.isFinite(n) ? n : 0);
            }}
          />
        </Field>
        <Field label="Tier">
          <select
            className="text-input"
            value={String(value.tier)}
            onChange={(e) => set("tier", Number(e.target.value) as PropertyTier)}
          >
            <option value="1">{TIER_LABEL[1]}</option>
            <option value="2">{TIER_LABEL[2]}</option>
            <option value="3">{TIER_LABEL[3]}</option>
          </select>
        </Field>
        <Field label="Banquet hall">
          <label className="inline-flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              checked={value.banquet}
              onChange={(e) => set("banquet", e.target.checked)}
            />
            <span className="text-sm">{value.banquet ? "Yes" : "No"}</span>
          </label>
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea
            className="text-input min-h-[5rem]"
            value={value.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Anything worth remembering — pricing range, contact, pros/cons…"
          />
        </Field>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="btn-primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}

function TierBadge({ tier }: { tier: PropertyTier }) {
  const tone = tier === 1 ? "gold" : tier === 2 ? "stone" : "emerald";
  return <Badge tone={tone}>Tier {tier}</Badge>;
}

function Badge({ tone, children }: { tone: "gold" | "stone" | "emerald"; children: React.ReactNode }) {
  const cls =
    tone === "gold"
      ? "border-amber-300 bg-amber-50 text-amber-800"
      : tone === "emerald"
        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
        : "border-stone-300 bg-stone-50 text-stone-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      {children}
    </span>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs uppercase tracking-wide text-stone-500">{label}</span>
      {children}
    </label>
  );
}
