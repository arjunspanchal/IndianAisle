import "server-only";
import {
  Budget,
  LineItem,
  MealConfig,
  RoomCategory,
  contingencyTotal,
  defaultBudget,
} from "./budget";
import { createSupabaseServerClient } from "./supabase/server";
import type { SectionKey } from "./supabase/types";

const SECTION_KEYS: SectionKey[] = [
  "decor", "entertainment", "photography", "attire",
  "travel", "rituals", "gifting", "misc",
];

// --- list / create ---------------------------------------------------------

export type WeddingSummary = {
  id: string;
  brideName: string;
  groomName: string;
  venue: string;
  startDate: string | null;
  endDate: string | null;
  guests: number;
  events: number;
  updatedAt: string;
};

export async function listMyWeddings(): Promise<WeddingSummary[]> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("weddings")
    .select("id, bride_name, groom_name, venue, start_date, end_date, guests, events, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    brideName: r.bride_name,
    groomName: r.groom_name,
    venue: r.venue,
    startDate: r.start_date,
    endDate: r.end_date,
    guests: r.guests,
    events: r.events,
    updatedAt: r.updated_at,
  }));
}

export async function createWedding(seed?: Budget): Promise<string> {
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const b = seed ?? defaultBudget();

  const { data: wedding, error: e1 } = await sb
    .from("weddings")
    .insert({
      owner_id: user.id,
      bride_name: b.meta.brideName,
      groom_name: b.meta.groomName,
      venue: b.meta.venue,
      start_date: b.meta.startDate || null,
      end_date: b.meta.endDate || null,
      guests: b.meta.guests,
      events: b.meta.events,
      rooms_nights: b.rooms.nights,
      rooms_gst_pct: b.rooms.gstPct,
      contingency_pct: b.contingencyPct,
    })
    .select("id")
    .single();
  if (e1) throw new Error(e1.message);

  await seedChildren(wedding.id, b);
  return wedding.id;
}

async function seedChildren(weddingId: string, b: Budget): Promise<void> {
  const sb = createSupabaseServerClient();

  if (b.rooms.categories.length) {
    const { error } = await sb.from("wedding_rooms").insert(
      b.rooms.categories.map((c, i) => ({
        wedding_id: weddingId,
        label: c.label,
        count: c.count,
        rate_per_night: c.ratePerNight,
        position: i,
      })),
    );
    if (error) throw new Error(error.message);
  }

  if (b.meals.length) {
    const { error } = await sb.from("wedding_meals").insert(
      b.meals.map((m, i) => ({
        wedding_id: weddingId,
        label: m.label,
        pax: m.pax,
        rate_per_head: m.ratePerHead,
        tax_pct: m.taxPct,
        sittings: m.sittings,
        position: i,
      })),
    );
    if (error) throw new Error(error.message);
  }

  const lineRows: {
    wedding_id: string;
    section: SectionKey;
    label: string;
    amount: number;
    source: "Confirmed" | "Estimate";
    note: string | null;
    position: number;
  }[] = [];
  for (const key of SECTION_KEYS) {
    (b[key] as LineItem[]).forEach((it, i) =>
      lineRows.push({
        wedding_id: weddingId,
        section: key,
        label: it.label,
        amount: it.amount,
        source: it.source ?? "Estimate",
        note: it.note ?? null,
        position: i,
      }),
    );
  }
  if (lineRows.length) {
    const { error } = await sb.from("wedding_lines").insert(lineRows);
    if (error) throw new Error(error.message);
  }
}

// --- read ------------------------------------------------------------------

export async function getWeddingBudget(weddingId: string): Promise<Budget | null> {
  const sb = createSupabaseServerClient();

  const { data: wedding, error } = await sb
    .from("weddings")
    .select("*")
    .eq("id", weddingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!wedding) return null;

  const [roomsRes, mealsRes, linesRes] = await Promise.all([
    sb.from("wedding_rooms").select("*").eq("wedding_id", weddingId).order("position"),
    sb.from("wedding_meals").select("*").eq("wedding_id", weddingId).order("position"),
    sb.from("wedding_lines").select("*").eq("wedding_id", weddingId).order("position"),
  ]);
  if (roomsRes.error) throw new Error(roomsRes.error.message);
  if (mealsRes.error) throw new Error(mealsRes.error.message);
  if (linesRes.error) throw new Error(linesRes.error.message);

  const rooms: RoomCategory[] = (roomsRes.data ?? []).map((r) => ({
    id: r.id,
    airtableId: r.id, // reused field — now holds Supabase row id
    label: r.label,
    count: r.count,
    ratePerNight: Number(r.rate_per_night),
  }));

  const meals: MealConfig[] = (mealsRes.data ?? []).map((m) => ({
    id: m.id,
    airtableId: m.id,
    label: m.label,
    pax: m.pax,
    ratePerHead: Number(m.rate_per_head),
    taxPct: Number(m.tax_pct),
    sittings: m.sittings,
  }));

  const buckets: Record<SectionKey, LineItem[]> = {
    decor: [], entertainment: [], photography: [], attire: [],
    travel: [], rituals: [], gifting: [], misc: [],
  };
  for (const r of linesRes.data ?? []) {
    buckets[r.section].push({
      id: r.id,
      airtableId: r.id,
      label: r.label,
      amount: Number(r.amount),
      source: r.source,
      note: r.note ?? undefined,
    });
  }

  const base = defaultBudget();
  return {
    ...base,
    meta: {
      brideName: wedding.bride_name,
      groomName: wedding.groom_name,
      venue: wedding.venue,
      startDate: wedding.start_date ?? "",
      endDate: wedding.end_date ?? "",
      guests: wedding.guests,
      events: wedding.events,
    },
    rooms: {
      nights: wedding.rooms_nights,
      gstPct: Number(wedding.rooms_gst_pct),
      categories: rooms,
    },
    meals,
    decor: buckets.decor,
    entertainment: buckets.entertainment,
    photography: buckets.photography,
    attire: buckets.attire,
    travel: buckets.travel,
    rituals: buckets.rituals,
    gifting: buckets.gifting,
    misc: buckets.misc,
    contingencyPct: Number(wedding.contingency_pct),
  };
}

// --- save ------------------------------------------------------------------

export async function saveWeddingBudget(weddingId: string, b: Budget): Promise<void> {
  const sb = createSupabaseServerClient();

  // Top-level wedding row
  {
    const { error } = await sb
      .from("weddings")
      .update({
        bride_name: b.meta.brideName,
        groom_name: b.meta.groomName,
        venue: b.meta.venue,
        start_date: b.meta.startDate || null,
        end_date: b.meta.endDate || null,
        guests: b.meta.guests,
        events: b.meta.events,
        rooms_nights: b.rooms.nights,
        rooms_gst_pct: b.rooms.gstPct,
        contingency_pct: b.contingencyPct,
      })
      .eq("id", weddingId);
    if (error) throw new Error(error.message);
  }

  // Snapshot existing children to diff against.
  const [roomsRes, mealsRes, linesRes] = await Promise.all([
    sb.from("wedding_rooms").select("id").eq("wedding_id", weddingId),
    sb.from("wedding_meals").select("id").eq("wedding_id", weddingId),
    sb.from("wedding_lines").select("id").eq("wedding_id", weddingId),
  ]);
  if (roomsRes.error) throw new Error(roomsRes.error.message);
  if (mealsRes.error) throw new Error(mealsRes.error.message);
  if (linesRes.error) throw new Error(linesRes.error.message);

  const existingRooms = new Set((roomsRes.data ?? []).map((r) => r.id));
  const existingMeals = new Set((mealsRes.data ?? []).map((r) => r.id));
  const existingLines = new Set((linesRes.data ?? []).map((r) => r.id));

  const roomKeep = new Set<string>();
  const roomInserts: ReturnType<typeof roomInsertRow>[] = [];
  const roomUpdates: { id: string; fields: ReturnType<typeof roomUpdateRow> }[] = [];
  b.rooms.categories.forEach((c, i) => {
    if (c.airtableId && existingRooms.has(c.airtableId)) {
      roomKeep.add(c.airtableId);
      roomUpdates.push({ id: c.airtableId, fields: roomUpdateRow(c, i) });
    } else {
      roomInserts.push(roomInsertRow(c, i, weddingId));
    }
  });
  const roomDeletes = Array.from(existingRooms).filter((id) => !roomKeep.has(id));

  const mealKeep = new Set<string>();
  const mealInserts: ReturnType<typeof mealInsertRow>[] = [];
  const mealUpdates: { id: string; fields: ReturnType<typeof mealUpdateRow> }[] = [];
  b.meals.forEach((m, i) => {
    if (m.airtableId && existingMeals.has(m.airtableId)) {
      mealKeep.add(m.airtableId);
      mealUpdates.push({ id: m.airtableId, fields: mealUpdateRow(m, i) });
    } else {
      mealInserts.push(mealInsertRow(m, i, weddingId));
    }
  });
  const mealDeletes = Array.from(existingMeals).filter((id) => !mealKeep.has(id));

  const lineKeep = new Set<string>();
  const lineInserts: ReturnType<typeof lineInsertRow>[] = [];
  const lineUpdates: { id: string; fields: ReturnType<typeof lineUpdateRow> }[] = [];
  for (const section of SECTION_KEYS) {
    (b[section] as LineItem[]).forEach((it, i) => {
      if (it.airtableId && existingLines.has(it.airtableId)) {
        lineKeep.add(it.airtableId);
        lineUpdates.push({ id: it.airtableId, fields: lineUpdateRow(it, section, i) });
      } else {
        lineInserts.push(lineInsertRow(it, section, i, weddingId));
      }
    });
  }
  const lineDeletes = Array.from(existingLines).filter((id) => !lineKeep.has(id));

  // Apply: deletes → updates → inserts. Children are independent so parallelise per phase.
  await Promise.all([
    roomDeletes.length ? sb.from("wedding_rooms").delete().in("id", roomDeletes) : Promise.resolve({ error: null }),
    mealDeletes.length ? sb.from("wedding_meals").delete().in("id", mealDeletes) : Promise.resolve({ error: null }),
    lineDeletes.length ? sb.from("wedding_lines").delete().in("id", lineDeletes) : Promise.resolve({ error: null }),
  ]).then((rs) => {
    for (const r of rs as { error: { message: string } | null }[]) if (r.error) throw new Error(r.error.message);
  });

  for (const u of roomUpdates) {
    const { error } = await sb.from("wedding_rooms").update(u.fields).eq("id", u.id);
    if (error) throw new Error(error.message);
  }
  for (const u of mealUpdates) {
    const { error } = await sb.from("wedding_meals").update(u.fields).eq("id", u.id);
    if (error) throw new Error(error.message);
  }
  for (const u of lineUpdates) {
    const { error } = await sb.from("wedding_lines").update(u.fields).eq("id", u.id);
    if (error) throw new Error(error.message);
  }

  if (roomInserts.length) {
    const { error } = await sb.from("wedding_rooms").insert(roomInserts);
    if (error) throw new Error(error.message);
  }
  if (mealInserts.length) {
    const { error } = await sb.from("wedding_meals").insert(mealInserts);
    if (error) throw new Error(error.message);
  }
  if (lineInserts.length) {
    const { error } = await sb.from("wedding_lines").insert(lineInserts);
    if (error) throw new Error(error.message);
  }

  // Touch contingency: not stored — derived. Just make sure the % and totals are saved (already done via weddings.contingency_pct).
  void contingencyTotal;
}

// --- delete ----------------------------------------------------------------

export async function deleteWedding(weddingId: string): Promise<void> {
  const sb = createSupabaseServerClient();
  const { error } = await sb.from("weddings").delete().eq("id", weddingId);
  if (error) throw new Error(error.message);
}

// --- row shapes ------------------------------------------------------------

function roomInsertRow(c: RoomCategory, position: number, weddingId: string) {
  return {
    wedding_id: weddingId,
    label: c.label,
    count: c.count,
    rate_per_night: c.ratePerNight,
    position,
  };
}
function roomUpdateRow(c: RoomCategory, position: number) {
  return { label: c.label, count: c.count, rate_per_night: c.ratePerNight, position };
}
function mealInsertRow(m: MealConfig, position: number, weddingId: string) {
  return {
    wedding_id: weddingId,
    label: m.label,
    pax: m.pax,
    rate_per_head: m.ratePerHead,
    tax_pct: m.taxPct,
    sittings: m.sittings,
    position,
  };
}
function mealUpdateRow(m: MealConfig, position: number) {
  return {
    label: m.label,
    pax: m.pax,
    rate_per_head: m.ratePerHead,
    tax_pct: m.taxPct,
    sittings: m.sittings,
    position,
  };
}
function lineInsertRow(it: LineItem, section: SectionKey, position: number, weddingId: string) {
  return {
    wedding_id: weddingId,
    section,
    label: it.label,
    amount: it.amount,
    source: it.source ?? "Estimate",
    note: it.note ?? null,
    position,
  };
}
function lineUpdateRow(it: LineItem, section: SectionKey, position: number) {
  return {
    section,
    label: it.label,
    amount: it.amount,
    source: it.source ?? "Estimate",
    note: it.note ?? null,
    position,
  };
}
