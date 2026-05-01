"use client";

import { useMemo, useState, useTransition } from "react";
import {
  RSVP_LABEL,
  RSVP_OPTIONS,
  SIDE_OPTIONS,
  blankGuest,
  summarize,
  type Guest,
} from "@/lib/guests";
import type { GuestSide, RsvpStatus } from "@/lib/supabase/types";
import {
  bulkCreateGuestsAction,
  createGuestAction,
  deleteGuestAction,
  updateGuestAction,
} from "@/app/weddings/[id]/guests/actions";

type Props = {
  weddingId: string;
  initial: Guest[];
};

type StatusMsg = { kind: "ok" | "err"; text: string } | null;

type RsvpFilter = "all" | RsvpStatus;
type InvitedFilter = "all" | "yes" | "no";
type HotelFilter = "all" | "yes" | "no";

export default function GuestManager({ weddingId, initial }: Props) {
  const [guests, setGuests] = useState<Guest[]>(initial);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [search, setSearch] = useState("");
  const [filterRsvp, setFilterRsvp] = useState<RsvpFilter>("all");
  const [filterInvited, setFilterInvited] = useState<InvitedFilter>("all");
  const [filterHotel, setFilterHotel] = useState<HotelFilter>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [status, setStatus] = useState<StatusMsg>(null);
  const [pending, startTransition] = useTransition();
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

  const summary = useMemo(() => summarize(guests), [guests]);

  const guestTypes = useMemo(() => {
    const s = new Set<string>();
    for (const g of guests) if (g.guestType.trim()) s.add(g.guestType.trim());
    return Array.from(s).sort();
  }, [guests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests.filter((g) => {
      if (filterRsvp !== "all" && g.rsvpStatus !== filterRsvp) return false;
      if (filterInvited === "yes" && !g.invited) return false;
      if (filterInvited === "no" && g.invited) return false;
      if (filterHotel === "yes" && !g.hotelRequired) return false;
      if (filterHotel === "no" && g.hotelRequired) return false;
      if (filterType !== "all" && g.guestType !== filterType) return false;
      if (q) {
        const hay = [g.name, g.guestType, g.address, g.phone, g.email, g.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [guests, search, filterRsvp, filterInvited, filterHotel, filterType]);

  const startAdd = () => setEditing(blankGuest());
  const startEdit = (g: Guest) => setEditing({ ...g });
  const cancelEdit = () => setEditing(null);

  const onSave = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      setStatus({ kind: "err", text: "Name is required." });
      return;
    }
    startTransition(async () => {
      if (editing.id) {
        const res = await updateGuestAction(weddingId, editing.id, editing);
        if (!res.ok) {
          setStatus({ kind: "err", text: `Save failed: ${res.error}` });
          return;
        }
        setGuests((prev) => prev.map((x) => (x.id === editing.id ? res.data : x)));
      } else {
        const res = await createGuestAction(weddingId, editing);
        if (!res.ok) {
          setStatus({ kind: "err", text: `Save failed: ${res.error}` });
          return;
        }
        setGuests((prev) => [...prev, res.data]);
      }
      setEditing(null);
      setStatus({ kind: "ok", text: "Saved." });
    });
  };

  const onDelete = (g: Guest) => {
    if (!g.id) {
      setEditing(null);
      return;
    }
    if (!confirm(`Remove ${g.name || "this guest"} from the list?`)) return;
    startTransition(async () => {
      const res = await deleteGuestAction(weddingId, g.id!);
      if (!res.ok) {
        setStatus({ kind: "err", text: `Delete failed: ${res.error}` });
        return;
      }
      setGuests((prev) => prev.filter((x) => x.id !== g.id));
      if (editing?.id === g.id) setEditing(null);
      setStatus({ kind: "ok", text: "Deleted." });
    });
  };

  const onImport = () => {
    const parsed = parseImport(importText);
    if (parsed.length === 0) {
      setStatus({ kind: "err", text: "No rows to import." });
      return;
    }
    startTransition(async () => {
      const res = await bulkCreateGuestsAction(weddingId, parsed);
      if (!res.ok) {
        setStatus({ kind: "err", text: `Import failed: ${res.error}` });
        return;
      }
      // Fetch new rows by re-running listGuests via action? simpler: append optimistically
      // but we need ids — so just reload by appending parsed entries with no id, then encourage a reload.
      // Cleanest: navigate to refresh the server data.
      setShowImport(false);
      setImportText("");
      setStatus({
        kind: "ok",
        text: `Imported ${res.data.count}. Reloading…`,
      });
      // hard refresh so we get DB ids
      setTimeout(() => window.location.reload(), 400);
    });
  };

  return (
    <div>
      {/* summary strip */}
      <SummaryStrip summary={summary} />

      {status && (
        <div
          className={`mb-3 rounded-md px-4 py-2 text-sm ${
            status.kind === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {status.text}
        </div>
      )}

      {/* toolbar */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <FilterField label="Search">
          <input
            className="text-input"
            placeholder="Name, type, phone, address, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </FilterField>
        <FilterField label="RSVP">
          <select
            className="text-input"
            value={filterRsvp}
            onChange={(e) => setFilterRsvp(e.target.value as RsvpFilter)}
          >
            <option value="all">Any</option>
            {RSVP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Invited">
          <select
            className="text-input"
            value={filterInvited}
            onChange={(e) => setFilterInvited(e.target.value as InvitedFilter)}
          >
            <option value="all">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </FilterField>
        <FilterField label="Hotel">
          <select
            className="text-input"
            value={filterHotel}
            onChange={(e) => setFilterHotel(e.target.value as HotelFilter)}
          >
            <option value="all">Any</option>
            <option value="yes">Needs room</option>
            <option value="no">No room</option>
          </select>
        </FilterField>
        <FilterField label="Group">
          <select
            className="text-input"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All groups</option>
            {guestTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FilterField>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-stone-500">
            {filtered.length} of {guests.length}
          </span>
          <button className="btn-ghost text-xs" onClick={() => setShowImport((v) => !v)} disabled={pending}>
            {showImport ? "Cancel import" : "Bulk import"}
          </button>
          <button className="btn-primary" onClick={startAdd} disabled={pending}>
            + Add guest
          </button>
        </div>
      </div>

      {showImport && (
        <ImportPanel
          value={importText}
          onChange={setImportText}
          onSubmit={onImport}
          pending={pending}
        />
      )}

      {editing && (
        <GuestForm
          value={editing}
          onChange={setEditing}
          onSave={onSave}
          onCancel={cancelEdit}
          onDelete={editing.id ? () => onDelete(editing) : undefined}
          saving={pending}
        />
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-sm text-stone-500">
          {guests.length === 0
            ? "No guests yet. Add one or use Bulk import to paste from a spreadsheet."
            : "No guests match the current filters."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Group</th>
                <th className="px-3 py-2 font-medium">Side</th>
                <th className="px-3 py-2 font-medium">Phone</th>
                <th className="px-3 py-2 font-medium">RSVP</th>
                <th className="px-3 py-2 font-medium text-center">+1s</th>
                <th className="px-3 py-2 font-medium text-center">Hotel</th>
                <th className="px-3 py-2 font-medium">Arrival</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((g) => (
                <GuestRow key={g.id ?? g.name} g={g} onEdit={() => startEdit(g)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Summary --------------------------------------------------------

function SummaryStrip({ summary }: { summary: ReturnType<typeof summarize> }) {
  const items: { label: string; value: number; tone?: string }[] = [
    { label: "Total", value: summary.total },
    { label: "Invited", value: summary.invited },
    { label: "Accepted", value: summary.accepted, tone: "emerald" },
    { label: "Declined", value: summary.declined, tone: "rose" },
    { label: "Pending", value: summary.pending, tone: "stone" },
    { label: "Maybe", value: summary.maybe, tone: "amber" },
    { label: "Hotel rooms", value: summary.hotelRooms },
    { label: "Headcount", value: summary.headcount },
  ];
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 shadow-sm"
        >
          <div className="text-[10px] uppercase tracking-wide text-stone-500">{it.label}</div>
          <div className={`mt-0.5 font-serif text-2xl ${toneToText(it.tone)}`}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function toneToText(tone?: string): string {
  switch (tone) {
    case "emerald":
      return "text-emerald-700";
    case "rose":
      return "text-rose-700";
    case "amber":
      return "text-amber-700";
    default:
      return "text-ink";
  }
}

// ---------- Row ------------------------------------------------------------

function GuestRow({ g, onEdit }: { g: Guest; onEdit: () => void }) {
  return (
    <tr className="hover:bg-stone-50">
      <td className="px-3 py-2">
        <div className="font-medium text-ink">{g.name || <span className="italic text-stone-400">(no name)</span>}</div>
        {!g.invited && <span className="mt-0.5 inline-block text-[10px] uppercase tracking-wide text-rose-700">Not invited</span>}
        {g.notes && (
          <div className="mt-0.5 line-clamp-1 max-w-[20rem] text-xs text-stone-500" title={g.notes}>
            {g.notes}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-stone-700">{g.guestType || <span className="text-stone-300">—</span>}</td>
      <td className="px-3 py-2 text-stone-600">{sideLabel(g.side)}</td>
      <td className="px-3 py-2 text-stone-700">
        {g.phone ? (
          <a className="hover:underline" href={`tel:${g.phone}`}>{g.phone}</a>
        ) : (
          <span className="text-stone-300">—</span>
        )}
      </td>
      <td className="px-3 py-2"><RsvpBadge status={g.rsvpStatus} /></td>
      <td className="px-3 py-2 text-center tabular-nums text-stone-700">{g.plusOnes || ""}</td>
      <td className="px-3 py-2 text-center text-stone-700">{g.hotelRequired ? "✓" : ""}</td>
      <td className="px-3 py-2 text-stone-700">{formatDate(g.arrivalDate)}</td>
      <td className="px-3 py-2 text-right">
        <button className="text-xs text-stone-600 hover:underline" onClick={onEdit}>
          Edit
        </button>
      </td>
    </tr>
  );
}

function RsvpBadge({ status }: { status: RsvpStatus }) {
  const opt = RSVP_OPTIONS.find((o) => o.value === status);
  const tone = opt?.tone ?? "stone";
  const cls =
    tone === "emerald"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : tone === "rose"
        ? "border-rose-300 bg-rose-50 text-rose-800"
        : tone === "amber"
          ? "border-amber-300 bg-amber-50 text-amber-800"
          : "border-stone-300 bg-stone-50 text-stone-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      {RSVP_LABEL[status]}
    </span>
  );
}

function sideLabel(s: GuestSide): React.ReactNode {
  const opt = SIDE_OPTIONS.find((o) => o.value === s);
  if (!opt || !opt.value) return <span className="text-stone-300">—</span>;
  return opt.label;
}

function formatDate(iso: string | null): React.ReactNode {
  if (!iso) return <span className="text-stone-300">—</span>;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ---------- Form -----------------------------------------------------------

function GuestForm({
  value,
  onChange,
  onSave,
  onCancel,
  onDelete,
  saving,
}: {
  value: Guest;
  onChange: (g: Guest) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving: boolean;
}) {
  const set = <K extends keyof Guest>(k: K, v: Guest[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <section className="mb-6 rounded-xl border border-ink/20 bg-white p-5 shadow-md">
      <h2 className="mb-4 font-serif text-2xl">{value.id ? "Edit guest" : "Add guest"}</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Name">
          <input
            className="text-input"
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Subhash P"
            autoFocus
          />
        </FormField>
        <FormField label="Group / type">
          <input
            className="text-input"
            value={value.guestType}
            onChange={(e) => set("guestType", e.target.value)}
            placeholder="Core Fam, Family, Friend, Work…"
            list="guest-type-suggestions"
          />
        </FormField>

        <FormField label="Side">
          <select
            className="text-input"
            value={value.side}
            onChange={(e) => set("side", e.target.value as GuestSide)}
          >
            {SIDE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="RSVP">
          <select
            className="text-input"
            value={value.rsvpStatus}
            onChange={(e) => set("rsvpStatus", e.target.value as RsvpStatus)}
          >
            {RSVP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Phone">
          <input
            type="tel"
            className="text-input"
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="+91 …"
          />
        </FormField>
        <FormField label="Email">
          <input
            type="email"
            className="text-input"
            value={value.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="optional"
          />
        </FormField>

        <FormField label="Address" className="sm:col-span-2">
          <input
            className="text-input"
            value={value.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="City or full address"
          />
        </FormField>

        <FormField label="Plus ones">
          <input
            type="number"
            min={0}
            step={1}
            className="num-input"
            value={value.plusOnes}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              set("plusOnes", Number.isFinite(n) && n >= 0 ? n : 0);
            }}
          />
        </FormField>
        <FormField label="Arrival date">
          <input
            type="date"
            className="text-input"
            value={value.arrivalDate ?? ""}
            onChange={(e) => set("arrivalDate", e.target.value || null)}
          />
        </FormField>

        <CheckboxField
          label="On the wedding guest list"
          checked={value.invited}
          onChange={(v) => set("invited", v)}
        />
        <CheckboxField
          label="Hotel room required"
          checked={value.hotelRequired}
          onChange={(v) => set("hotelRequired", v)}
        />

        <FormField label="Notes" className="sm:col-span-2">
          <textarea
            className="text-input min-h-[5rem]"
            value={value.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Dietary needs, travel plans, anything worth remembering…"
          />
        </FormField>
      </div>

      <datalist id="guest-type-suggestions">
        <option value="Core Fam" />
        <option value="Family" />
        <option value="Friend" />
        <option value="Work" />
        <option value="Plus one" />
      </datalist>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {onDelete && (
          <button
            className="mr-auto text-xs text-rose-700 hover:underline disabled:opacity-50"
            onClick={onDelete}
            disabled={saving}
          >
            Delete
          </button>
        )}
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

function FormField({
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
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-stone-500">{label}</span>
      {children}
    </label>
  );
}

// ---------- Bulk import ----------------------------------------------------

function ImportPanel({
  value,
  onChange,
  onSubmit,
  pending,
}: {
  value: string;
  onChange: (s: string) => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  const previewCount = parseImport(value).length;
  return (
    <section className="mb-6 rounded-xl border border-ink/20 bg-white p-5 shadow-md">
      <h2 className="mb-2 font-serif text-2xl">Bulk import</h2>
      <p className="mb-3 text-sm text-stone-600">
        Paste tab- or comma-separated rows. First row is treated as a header if it contains
        &ldquo;name&rdquo;. Recognised columns:{" "}
        <code className="rounded bg-stone-100 px-1 text-xs">
          name, address, invited, phone, guest type, rsvp, hotel, arrival
        </code>
        . Only <b>name</b> is required.
      </p>
      <textarea
        className="text-input min-h-[10rem] font-mono text-xs"
        placeholder={`name\taddress\tinvited\tphone\tguest type\trsvp\thotel\tarrival\nSubhash P\tMumbai\tYes\t\tCore Fam\tAccepted\tNo\t\nMinaxi P\tMumbai\tYes\t\tCore Fam\tAccepted\tNo\t`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="mt-3 flex items-center justify-end gap-3">
        <span className="text-xs text-stone-500">
          {previewCount} row{previewCount === 1 ? "" : "s"} detected
        </span>
        <button
          className="btn-primary"
          onClick={onSubmit}
          disabled={pending || previewCount === 0}
        >
          {pending ? "Importing…" : `Import ${previewCount}`}
        </button>
      </div>
    </section>
  );
}

// Parse pasted spreadsheet text into Guest[]. Tolerant of either tabs or commas.
// Recognises a header row when it contains a "name" column; otherwise assumes the
// fixed Excel order: Name, Address, Invited, Phone, Guest Type, RSVP status,
// Hotel Room Required, Arrival Date.
function parseImport(text: string): Guest[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const split = (l: string) => (l.includes("\t") ? l.split("\t") : splitCsv(l));

  const first = split(lines[0]).map((c) => c.trim().toLowerCase());
  const hasHeader = first.includes("name");
  const fixedOrder = [
    "name",
    "address",
    "invited",
    "phone",
    "guest type",
    "rsvp status",
    "hotel room required",
    "arrival date",
  ];
  const headers = hasHeader ? first : fixedOrder;
  const rows = (hasHeader ? lines.slice(1) : lines).map(split);

  const colIndex = (...names: string[]): number => {
    for (const n of names) {
      const idx = headers.findIndex((h) => h === n);
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const idxName = colIndex("name");
  const idxAddress = colIndex("address");
  const idxInvited = colIndex("invited", "wedding guest list", "wedding guest lIst");
  const idxPhone = colIndex("phone");
  const idxType = colIndex("guest type", "type", "group");
  const idxRsvp = colIndex("rsvp", "rsvp status", "status");
  const idxHotel = colIndex("hotel", "hotel room required", "hotel room required?");
  const idxArrival = colIndex("arrival", "arrival date");
  const idxNotes = colIndex("notes", "note");

  const out: Guest[] = [];
  for (const cells of rows) {
    const get = (i: number) => (i >= 0 && i < cells.length ? cells[i].trim() : "");
    const name = get(idxName);
    if (!name) continue;
    const g = blankGuest();
    g.name = name;
    g.address = get(idxAddress);
    g.phone = get(idxPhone);
    g.guestType = get(idxType);
    g.notes = get(idxNotes);
    g.invited = parseBool(get(idxInvited), true);
    g.hotelRequired = parseBool(get(idxHotel), false);
    g.rsvpStatus = parseRsvp(get(idxRsvp));
    g.arrivalDate = parseDate(get(idxArrival));
    out.push(g);
  }
  return out;
}

function splitCsv(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === ",") {
      cells.push(cur);
      cur = "";
    } else if (c === '"' && cur === "") {
      inQuotes = true;
    } else {
      cur += c;
    }
  }
  cells.push(cur);
  return cells;
}

function parseBool(raw: string, fallback: boolean): boolean {
  if (!raw) return fallback;
  const v = raw.trim().toLowerCase();
  if (["y", "yes", "true", "1", "x", "✓"].includes(v)) return true;
  if (["n", "no", "false", "0", ""].includes(v)) return false;
  return fallback;
}

function parseRsvp(raw: string): RsvpStatus {
  const v = raw.trim().toLowerCase();
  if (["accepted", "yes", "y", "confirmed", "attending"].includes(v)) return "accepted";
  if (["declined", "no", "regret", "regrets", "not attending"].includes(v)) return "declined";
  if (["maybe", "tentative"].includes(v)) return "maybe";
  return "pending";
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const v = raw.trim();
  // already ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
