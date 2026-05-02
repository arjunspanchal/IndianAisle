"use client";

import { useMemo, useState } from "react";
import {
  blankVendor,
  isPersistedVendor,
  VENDOR_CATEGORIES,
  VENDOR_CATEGORY_LABEL,
  VENDOR_STATUS_OPTIONS,
  type Vendor,
  type VendorCategory,
  type VendorStatus,
} from "@/lib/vendors";
import { formatINR } from "@/lib/budget";
import { removeVendor, saveVendor } from "@/app/vendors/actions";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import NumberInput from "@/components/ui/NumberInput";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import IconButton from "@/components/ui/IconButton";

type Props = {
  initial: Vendor[];
  serverReady: boolean;
  loadError: string | null;
};

type StatusMsg = { kind: "ok" | "err"; text: string } | null;

const STATUS_TONE: Record<VendorStatus, string> = {
  "Not contacted": "bg-stone-100 text-stone-700",
  Inquired: "bg-amber-50 text-amber-800",
  Quoted: "bg-sky-50 text-sky-800",
  Booked: "bg-emerald-50 text-emerald-800",
  Rejected: "bg-rose-50 text-rose-800",
};

export default function VendorManager({ initial, serverReady, loadError }: Props) {
  const [items, setItems] = useState<Vendor[]>(initial);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [filterCategory, setFilterCategory] = useState<VendorCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<VendorStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusMsg>(null);
  const [pending, setPending] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((v) => {
      if (filterCategory !== "all" && v.category !== filterCategory) return false;
      if (filterStatus !== "all" && v.status !== filterStatus) return false;
      if (q) {
        const hay = [v.name, v.contactName, v.contactEmail, v.notes].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filterCategory, filterStatus, search]);

  // Group filtered list by category, preserving the order in VENDOR_CATEGORIES.
  const grouped = useMemo(() => {
    const out: { category: VendorCategory; vendors: Vendor[] }[] = [];
    for (const { value } of VENDOR_CATEGORIES) {
      const vendors = filtered.filter((v) => v.category === value);
      if (vendors.length) out.push({ category: value, vendors });
    }
    return out;
  }, [filtered]);

  const totalQuotes = useMemo(
    () => items.reduce((s, v) => s + (v.status === "Booked" ? v.quoteAmount : 0), 0),
    [items],
  );

  const startAdd = () => setEditing(blankVendor(filterCategory === "all" ? "photography" : filterCategory));
  const startEdit = (v: Vendor) => setEditing({ ...v });
  const cancelEdit = () => setEditing(null);

  const onSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      setStatus({ kind: "err", text: "Name is required." });
      return;
    }
    if (!serverReady) {
      // Optimistic local-only fallback (unlikely in practice — Supabase env required for /vendors).
      setItems((prev) => {
        const next = [...prev];
        const idx = next.findIndex((v) => v.id === editing.id && isPersistedVendor(editing));
        if (idx >= 0) next[idx] = editing;
        else next.push({ ...editing, id: editing.id || `local-${Date.now()}` });
        return next;
      });
      setEditing(null);
      setStatus({ kind: "ok", text: "Saved locally (Supabase not configured)." });
      return;
    }
    setPending(true);
    setStatus(null);
    try {
      const res = await saveVendor(editing);
      if (!res.ok) {
        setStatus({ kind: "err", text: `Save failed: ${res.error}` });
        return;
      }
      const saved = res.data;
      setItems((prev) => {
        const idx = prev.findIndex((v) => v.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
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
  };

  const onDelete = async (v: Vendor) => {
    if (!confirm(`Remove vendor "${v.name || "(unnamed)"}"?`)) return;
    if (!serverReady || !isPersistedVendor(v)) {
      setItems((prev) => prev.filter((x) => x.id !== v.id));
      return;
    }
    setPending(true);
    setStatus(null);
    try {
      const res = await removeVendor(v.id);
      if (!res.ok) {
        setStatus({ kind: "err", text: `Delete failed: ${res.error}` });
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== v.id));
      setStatus({ kind: "ok", text: "Deleted." });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Vendor manager</h1>
          <p className="mt-1 text-sm text-stone-600">
            Quotes, contacts, and status for everyone supplying your wedding.
          </p>
        </div>
        <Button onClick={startAdd} disabled={pending}>
          + New vendor
        </Button>
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          Couldn&apos;t load saved vendors: {loadError}
        </div>
      )}

      {!serverReady && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Supabase isn&apos;t configured for this environment. Edits stay in this tab only.
        </div>
      )}

      {status && (
        <div
          className={`mb-4 rounded-md px-4 py-2 text-sm ${
            status.kind === "ok" ? "border border-emerald-200 bg-emerald-50 text-emerald-800" : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {status.text}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <Field label="Search" className="min-w-[14rem] flex-1">
          <Input
            placeholder="Name, contact, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <Field label="Category" className="w-48">
          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as VendorCategory | "all")}
          >
            <option value="all">All</option>
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" className="w-44">
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as VendorStatus | "all")}
          >
            <option value="all">All</option>
            {VENDOR_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <div className="ml-auto text-xs text-stone-500">
          {filtered.length} vendor{filtered.length === 1 ? "" : "s"}
          {totalQuotes > 0 && (
            <>
              {" · "}Booked: <span className="font-medium tabular-nums">{formatINR(totalQuotes)}</span>
            </>
          )}
        </div>
      </div>

      {/* List */}
      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <p className="font-serif text-2xl">
            {items.length === 0 ? "No vendors yet" : "No matches"}
          </p>
          <p className="mt-1 text-sm text-stone-500">
            {items.length === 0
              ? "Add your first vendor to start tracking quotes and contacts."
              : "Try clearing the filters above."}
          </p>
          {items.length === 0 && (
            <div className="mt-4 flex justify-center">
              <Button onClick={startAdd}>+ New vendor</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, vendors }) => (
            <section key={category}>
              <header className="mb-2 flex items-baseline justify-between">
                <h2 className="font-serif text-xl text-ink">{VENDOR_CATEGORY_LABEL[category]}</h2>
                <span className="text-xs text-stone-500 tabular-nums">
                  {vendors.length} · {formatINR(vendors.reduce((s, v) => s + v.quoteAmount, 0))} quoted
                </span>
              </header>
              <ul className="space-y-2">
                {vendors.map((v) => (
                  <VendorCard
                    key={v.id}
                    vendor={v}
                    onEdit={() => startEdit(v)}
                    onDelete={() => onDelete(v)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <VendorEditor
          vendor={editing}
          onChange={setEditing}
          onCancel={cancelEdit}
          onSave={onSave}
          pending={pending}
        />
      )}
    </div>
  );
}

function VendorCard({
  vendor,
  onEdit,
  onDelete,
}: {
  vendor: Vendor;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tone = vendor.status ? STATUS_TONE[vendor.status] : "bg-stone-100 text-stone-500";
  return (
    <li className="rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm transition hover:border-stone-300">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="font-serif text-lg text-ink truncate">
              {vendor.name || "(unnamed vendor)"}
            </h3>
            {vendor.status && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${tone}`}>
                {vendor.status}
              </span>
            )}
            {vendor.rating > 0 && (
              <span className="text-xs text-amber-600" aria-label={`${vendor.rating}/5 rating`}>
                {"★".repeat(vendor.rating)}
                <span className="text-stone-300">{"★".repeat(5 - vendor.rating)}</span>
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
            {vendor.quoteAmount > 0 && (
              <span className="tabular-nums font-medium text-stone-800">
                {formatINR(vendor.quoteAmount)}
              </span>
            )}
            {vendor.contactName && <span>{vendor.contactName}</span>}
            {vendor.contactPhone && <span>{vendor.contactPhone}</span>}
            {vendor.contactEmail && (
              <a className="text-stone-700 underline-offset-2 hover:underline" href={`mailto:${vendor.contactEmail}`}>
                {vendor.contactEmail}
              </a>
            )}
            {vendor.website && (
              <a
                className="text-stone-700 underline-offset-2 hover:underline"
                href={vendor.website}
                target="_blank"
                rel="noreferrer"
              >
                Website ↗
              </a>
            )}
          </div>
          {vendor.notes && (
            <p className="mt-1 text-xs italic text-stone-500 line-clamp-2">{vendor.notes}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="secondary" onClick={onEdit}>
            Edit
          </Button>
          <IconButton label="Delete" onClick={onDelete}>
            ×
          </IconButton>
        </div>
      </div>
    </li>
  );
}

function VendorEditor({
  vendor,
  onChange,
  onCancel,
  onSave,
  pending,
}: {
  vendor: Vendor;
  onChange: (v: Vendor) => void;
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
}) {
  const set = <K extends keyof Vendor>(k: K, val: Vendor[K]) =>
    onChange({ ...vendor, [k]: val });

  return (
    <div
      role="dialog"
      aria-label={isPersistedVendor(vendor) ? "Edit vendor" : "New vendor"}
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4"
      onClick={onCancel}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-stone-200 bg-parchment p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl text-ink">
            {isPersistedVendor(vendor) ? "Edit vendor" : "New vendor"}
          </h2>
          <IconButton label="Close" onClick={onCancel}>
            ×
          </IconButton>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input
              autoFocus
              placeholder="e.g. 35mm Candids"
              value={vendor.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field label="Category">
            <Select
              value={vendor.category}
              onChange={(e) => set("category", e.target.value as VendorCategory)}
            >
              {VENDOR_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quote (₹)">
            <NumberInput
              value={vendor.quoteAmount}
              onChange={(v) => set("quoteAmount", v)}
              step={1000}
            />
          </Field>
          <Field label="Status">
            <Select
              value={vendor.status ?? ""}
              onChange={(e) => set("status", (e.target.value || null) as VendorStatus | null)}
            >
              <option value="">—</option>
              {VENDOR_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Rating (0-5)">
            <NumberInput
              value={vendor.rating}
              onChange={(v) => set("rating", Math.max(0, Math.min(5, Math.round(v))))}
              step={1}
            />
          </Field>

          <Field label="Contact name">
            <Input
              value={vendor.contactName}
              onChange={(e) => set("contactName", e.target.value)}
            />
          </Field>
          <Field label="Contact phone">
            <Input
              type="tel"
              value={vendor.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
            />
          </Field>
          <Field label="Contact email" className="sm:col-span-2">
            <Input
              type="email"
              value={vendor.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
            />
          </Field>
          <Field label="Website" className="sm:col-span-2">
            <Input
              type="url"
              placeholder="https://"
              value={vendor.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={vendor.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>

        <footer className="mt-6 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={pending}>
            {pending ? "Saving…" : "Save vendor"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
