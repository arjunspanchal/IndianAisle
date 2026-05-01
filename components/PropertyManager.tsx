"use client";

import { useMemo, useState } from "react";
import {
  blankProperty,
  FEATURE_FLAGS,
  PROPERTY_STATUS_OPTIONS,
  TIER_LABEL,
  type Property,
  type PropertyStatus,
  type PropertyTier,
} from "@/lib/properties";
import { formatINR } from "@/lib/budget";
import { removeProperty, saveProperty } from "@/app/properties/actions";

type Props = {
  initial: Property[];
  serverReady: boolean;
  loadError: string | null;
};

type StatusMsg = { kind: "ok" | "err"; text: string } | null;

export default function PropertyManager({ initial, serverReady, loadError }: Props) {
  const [items, setItems] = useState<Property[]>(initial);
  const [editing, setEditing] = useState<Property | null>(null);
  const [filterTier, setFilterTier] = useState<PropertyTier | "all">("all");
  const [filterBanquet, setFilterBanquet] = useState<"all" | "yes" | "no">("all");
  const [filterStatus, setFilterStatus] = useState<PropertyStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusMsg>(null);
  const [pending, setPending] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (filterTier !== "all" && p.tier !== filterTier) return false;
      if (filterBanquet === "yes" && !p.banquet) return false;
      if (filterBanquet === "no" && p.banquet) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (q) {
        const hay = [
          p.name,
          p.location,
          p.address,
          p.contactName,
          p.contactEmail,
          p.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filterTier, filterBanquet, filterStatus, search]);

  const startAdd = () => setEditing(blankProperty());
  const startEdit = (p: Property) => setEditing({ ...p });
  const cancelEdit = () => setEditing(null);

  const onSave = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      setStatus({ kind: "err", text: "Name is required." });
      return;
    }
    if (!serverReady) {
      setItems((prev) => {
        const exists = prev.find((x) => x.id === editing.id);
        if (exists) return prev.map((x) => (x.id === editing.id ? editing : x));
        return [...prev, editing];
      });
      setEditing(null);
      setStatus({ kind: "ok", text: "Saved locally (Supabase not configured)." });
      return;
    }
    void (async () => {
      setPending(true);
      try {
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
      } finally {
        setPending(false);
      }
    })();
  };

  const onDelete = (p: Property) => {
    if (!confirm(`Delete property “${p.name}”?`)) return;
    if (!serverReady) {
      setItems((prev) => prev.filter((x) => x.id !== p.id));
      setStatus({ kind: "ok", text: "Removed locally (Supabase not configured)." });
      return;
    }
    if (!p.airtableId) {
      setItems((prev) => prev.filter((x) => x.id !== p.id));
      return;
    }
    void (async () => {
      setPending(true);
      try {
        const res = await removeProperty(p.airtableId!);
        if (!res.ok) {
          setStatus({ kind: "err", text: `Delete failed: ${res.error}` });
          return;
        }
        setItems((prev) => prev.filter((x) => x.airtableId !== p.airtableId));
        setStatus({ kind: "ok", text: "Deleted." });
      } finally {
        setPending(false);
      }
    })();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Property manager</h1>
          <p className="mt-1 text-sm text-stone-600">
            Your candidate venues — only visible to you.
          </p>
        </div>
        <button className="btn-primary" onClick={startAdd} disabled={pending}>
          + Add property
        </button>
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          Couldn&apos;t load properties: {loadError}.
        </div>
      )}
      {!serverReady && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Supabase not configured — changes won&apos;t persist until <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set.
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
            placeholder="Name, location, contact, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <Field label="Tier">
          <select
            className="text-input"
            value={filterTier === "all" ? "all" : String(filterTier)}
            onChange={(e) =>
              setFilterTier(e.target.value === "all" ? "all" : (Number(e.target.value) as PropertyTier))
            }
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
        <Field label="Status">
          <select
            className="text-input"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as PropertyStatus | "all")}
          >
            <option value="all">Any status</option>
            {PROPERTY_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <div className="ml-auto text-xs text-stone-500">
          {filtered.length} of {items.length} shown
        </div>
      </div>

      {editing && (
        <PropertyForm
          value={editing}
          onChange={setEditing}
          onSave={onSave}
          onCancel={cancelEdit}
          saving={pending}
        />
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-sm text-stone-500">
          No properties match. Try clearing filters or add a new one.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p) => (
            <PropertyCard
              key={p.airtableId ?? p.id}
              p={p}
              onEdit={() => startEdit(p)}
              onDelete={() => onDelete(p)}
              busy={pending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- Card -----------------------------------------------------------

function PropertyCard({
  p,
  onEdit,
  onDelete,
  busy,
}: {
  p: Property;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const features = FEATURE_FLAGS.filter((f) => Boolean(p[f.key]));
  const hasPricing =
    p.avgRoomRate || p.banquetRental || p.perPlateCost || p.buyoutCost;
  const capacityBits = [
    `${p.rooms} room${p.rooms === 1 ? "" : "s"}`,
    p.maxGuests ? `${p.maxGuests} guests max` : null,
    p.eventSpaces ? `${p.eventSpaces} event space${p.eventSpaces === 1 ? "" : "s"}` : null,
    p.parkingSpots ? `${p.parkingSpots} parking` : null,
    p.airportKm ? `${p.airportKm} km from airport` : null,
  ].filter(Boolean) as string[];

  return (
    <li className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="font-serif text-xl">{p.name || "(unnamed)"}</h2>
            <TierBadge tier={p.tier} />
            {p.status && <StatusBadge status={p.status} />}
            {typeof p.rating === "number" && p.rating > 0 && (
              <span className="text-xs text-amber-700" title={`Rating: ${p.rating}/5`}>
                {"★".repeat(p.rating)}{"☆".repeat(Math.max(0, 5 - p.rating))}
              </span>
            )}
            {p.visited && <Badge tone="stone">Visited</Badge>}
          </div>
          <div className="mt-1 text-sm text-stone-600">
            {p.location || <span className="italic text-stone-400">No location</span>}
            {p.address && <span className="text-stone-500"> · {p.address}</span>}
          </div>
          {capacityBits.length > 0 && (
            <div className="mt-1 text-xs text-stone-500">{capacityBits.join(" · ")}</div>
          )}

          {features.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {features.map((f) => (
                <Badge key={f.key} tone="emerald">
                  {f.label}
                </Badge>
              ))}
            </div>
          )}

          {hasPricing && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
              {p.avgRoomRate ? <span>Room/night: <b className="font-medium">{formatINR(p.avgRoomRate)}</b></span> : null}
              {p.perPlateCost ? <span>Per plate: <b className="font-medium">{formatINR(p.perPlateCost)}</b></span> : null}
              {p.banquetRental ? <span>Banquet rental: <b className="font-medium">{formatINR(p.banquetRental)}</b></span> : null}
              {p.buyoutCost ? <span>Buyout: <b className="font-medium">{formatINR(p.buyoutCost)}</b></span> : null}
            </div>
          )}

          {(p.contactName || p.contactPhone || p.contactEmail || p.website) && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
              {p.contactName && <span>👤 {p.contactName}</span>}
              {p.contactPhone && (
                <a className="hover:underline" href={`tel:${p.contactPhone}`}>📞 {p.contactPhone}</a>
              )}
              {p.contactEmail && (
                <a className="hover:underline" href={`mailto:${p.contactEmail}`}>✉ {p.contactEmail}</a>
              )}
              {p.website && (
                <a className="hover:underline" href={p.website} target="_blank" rel="noreferrer">
                  🔗 Website
                </a>
              )}
            </div>
          )}

          {p.notes && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{p.notes}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="btn-ghost text-xs" onClick={onEdit} disabled={busy}>
            Edit
          </button>
          <button
            className="text-xs text-rose-700 hover:underline disabled:opacity-50"
            onClick={onDelete}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}

// ---------- Form -----------------------------------------------------------

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

  const setNum = (k: keyof Property, raw: string) => {
    const n = parseFloat(raw);
    onChange({ ...value, [k]: Number.isFinite(n) ? n : undefined } as Property);
  };

  return (
    <section className="mb-6 rounded-xl border border-ink/20 bg-white p-5 shadow-md">
      <h2 className="mb-4 font-serif text-2xl">
        {value.airtableId ? "Edit property" : "New property"}
      </h2>

      <FormGroup title="Identity">
        <Field label="Name">
          <input
            className="text-input"
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Storii by ITC Hotels"
            autoFocus
          />
        </Field>
        <Field label="Location (city / region)">
          <input
            className="text-input"
            value={value.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="City, region"
          />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <input
            className="text-input"
            value={value.address ?? ""}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Street / landmark"
          />
        </Field>
        <Field label="Website" className="sm:col-span-2">
          <input
            type="url"
            className="text-input"
            value={value.website ?? ""}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://…"
          />
        </Field>
      </FormGroup>

      <FormGroup title="Contact">
        <Field label="Contact name">
          <input
            className="text-input"
            value={value.contactName ?? ""}
            onChange={(e) => set("contactName", e.target.value)}
            placeholder="Sales / events manager"
          />
        </Field>
        <Field label="Phone">
          <input
            type="tel"
            className="text-input"
            value={value.contactPhone ?? ""}
            onChange={(e) => set("contactPhone", e.target.value)}
            placeholder="+91 …"
          />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <input
            type="email"
            className="text-input"
            value={value.contactEmail ?? ""}
            onChange={(e) => set("contactEmail", e.target.value)}
            placeholder="events@example.com"
          />
        </Field>
      </FormGroup>

      <FormGroup title="Capacity & tier">
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
        <Field label="Max guests (largest function)">
          <input
            type="number"
            min={0}
            step={1}
            className="num-input"
            value={value.maxGuests ?? ""}
            onChange={(e) => setNum("maxGuests", e.target.value)}
          />
        </Field>
        <Field label="Event spaces on site">
          <input
            type="number"
            min={0}
            step={1}
            className="num-input"
            value={value.eventSpaces ?? ""}
            onChange={(e) => setNum("eventSpaces", e.target.value)}
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
      </FormGroup>

      <FormGroup title="Spaces & facilities">
        <CheckboxField label="Banquet hall" checked={value.banquet} onChange={(v) => set("banquet", v)} />
        <CheckboxField label="Lawn / outdoor space" checked={value.lawn} onChange={(v) => set("lawn", v)} />
        <CheckboxField label="Poolside" checked={value.poolside} onChange={(v) => set("poolside", v)} />
        <CheckboxField label="Mandap setup supported" checked={value.mandap} onChange={(v) => set("mandap", v)} />
        <CheckboxField label="Bridal suite" checked={value.bridalSuite} onChange={(v) => set("bridalSuite", v)} />
        <CheckboxField label="Air conditioned" checked={value.airConditioned} onChange={(v) => set("airConditioned", v)} />
      </FormGroup>

      <FormGroup title="Vendor flexibility">
        <CheckboxField label="In-house catering" checked={value.inHouseCatering} onChange={(v) => set("inHouseCatering", v)} />
        <CheckboxField label="Outside catering allowed" checked={value.outsideCateringAllowed} onChange={(v) => set("outsideCateringAllowed", v)} />
        <CheckboxField label="Outside decor allowed" checked={value.outsideDecorAllowed} onChange={(v) => set("outsideDecorAllowed", v)} />
        <CheckboxField label="Liquor license" checked={value.liquorLicense} onChange={(v) => set("liquorLicense", v)} />
      </FormGroup>

      <FormGroup title="Pricing (₹, pre-tax)">
        <Field label="Avg room rate / night">
          <input
            type="number"
            min={0}
            step={100}
            className="num-input"
            value={value.avgRoomRate ?? ""}
            onChange={(e) => setNum("avgRoomRate", e.target.value)}
          />
        </Field>
        <Field label="Banquet rental / event">
          <input
            type="number"
            min={0}
            step={1000}
            className="num-input"
            value={value.banquetRental ?? ""}
            onChange={(e) => setNum("banquetRental", e.target.value)}
          />
        </Field>
        <Field label="Per plate cost">
          <input
            type="number"
            min={0}
            step={50}
            className="num-input"
            value={value.perPlateCost ?? ""}
            onChange={(e) => setNum("perPlateCost", e.target.value)}
          />
        </Field>
        <Field label="Buyout / night">
          <input
            type="number"
            min={0}
            step={10000}
            className="num-input"
            value={value.buyoutCost ?? ""}
            onChange={(e) => setNum("buyoutCost", e.target.value)}
          />
        </Field>
      </FormGroup>

      <FormGroup title="Logistics">
        <Field label="Parking spots">
          <input
            type="number"
            min={0}
            step={1}
            className="num-input"
            value={value.parkingSpots ?? ""}
            onChange={(e) => setNum("parkingSpots", e.target.value)}
          />
        </Field>
        <Field label="Distance from airport (km)">
          <input
            type="number"
            min={0}
            step={1}
            className="num-input"
            value={value.airportKm ?? ""}
            onChange={(e) => setNum("airportKm", e.target.value)}
          />
        </Field>
      </FormGroup>

      <FormGroup title="Decision tracking">
        <Field label="Status">
          <select
            className="text-input"
            value={value.status ?? "Not contacted"}
            onChange={(e) => set("status", e.target.value as PropertyStatus)}
          >
            {PROPERTY_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Rating (0–5)">
          <input
            type="number"
            min={0}
            max={5}
            step={1}
            className="num-input"
            value={value.rating ?? 0}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              const clamped = Math.max(0, Math.min(5, Number.isFinite(n) ? n : 0));
              set("rating", clamped);
            }}
          />
        </Field>
        <CheckboxField label="Already visited" checked={!!value.visited} onChange={(v) => set("visited", v)} />
      </FormGroup>

      <FormGroup title="Notes" cols={1}>
        <Field label="Notes">
          <textarea
            className="text-input min-h-[6rem]"
            value={value.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Pricing range, package details, pros & cons, anything worth remembering…"
          />
        </Field>
      </FormGroup>

      <div className="mt-2 flex items-center justify-end gap-2">
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

// ---------- shared bits ----------------------------------------------------

function FormGroup({
  title,
  cols = 2,
  children,
}: {
  title: string;
  cols?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="mb-5 border-t border-stone-200 pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <legend className="mb-3 text-xs font-medium uppercase tracking-wide text-stone-500">
        {title}
      </legend>
      <div className={`grid gap-4 ${cols === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        {children}
      </div>
    </fieldset>
  );
}

function TierBadge({ tier }: { tier: PropertyTier }) {
  const tone = tier === 1 ? "gold" : tier === 2 ? "stone" : "emerald";
  return <Badge tone={tone}>Tier {tier}</Badge>;
}

function StatusBadge({ status }: { status: PropertyStatus }) {
  const tone: "gold" | "stone" | "emerald" | "rose" =
    status === "Booked"
      ? "gold"
      : status === "Shortlisted" || status === "Visited"
        ? "emerald"
        : status === "Rejected"
          ? "rose"
          : "stone";
  return <Badge tone={tone}>{status}</Badge>;
}

function Badge({
  tone,
  children,
}: {
  tone: "gold" | "stone" | "emerald" | "rose";
  children: React.ReactNode;
}) {
  const cls =
    tone === "gold"
      ? "border-amber-300 bg-amber-50 text-amber-800"
      : tone === "emerald"
        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
        : tone === "rose"
          ? "border-rose-300 bg-rose-50 text-rose-800"
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

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50/50 px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
