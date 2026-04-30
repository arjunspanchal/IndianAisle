// Server-only Airtable client for the Wedding Budget base.
// Uses a Personal Access Token (AIRTABLE_PAT) — never expose to the client.

import "server-only";
import {
  Budget,
  LineItem,
  MealConfig,
  RoomCategory,
  contingencyTotal,
  defaultBudget,
} from "./budget";

const BASE_ID = "appX3GYmlf0OQGXc7";

const TABLES = {
  rooms: "tble0mMAC1fj48jlP",
  meals: "tblH8Wy6uLHFPSu6x",
  lineItems: "tbljamvRLTv2j98Q5",
} as const;

// Map between budget section keys and Airtable's Section single-select values.
const SECTION_KEY_TO_NAME = {
  decor: "03 Decor & florals",
  entertainment: "04 Entertainment & AV",
  photography: "05 Photography & video",
  attire: "06 Attire & beauty",
  travel: "07 Travel & logistics",
  rituals: "08 Rituals & ceremonies",
  gifting: "09 Invitations & gifting",
  misc: "10 Miscellaneous",
} as const;

const CONTINGENCY_SECTION = "11 Contingency";
const CONTINGENCY_LABEL = "Contingency buffer (5%)";

const SECTION_NAME_TO_KEY: Record<string, keyof typeof SECTION_KEY_TO_NAME> = Object.fromEntries(
  Object.entries(SECTION_KEY_TO_NAME).map(([k, v]) => [v, k as keyof typeof SECTION_KEY_TO_NAME]),
);

type AirtableRecord<F = Record<string, unknown>> = { id: string; fields: F };
type AirtableList<F = Record<string, unknown>> = { records: AirtableRecord<F>[]; offset?: string };

function pat(): string {
  const v = process.env.AIRTABLE_PAT;
  if (!v) throw new Error("AIRTABLE_PAT env var is not set");
  return v;
}

async function airtable<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${pat()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

async function listAll<F>(tableId: string): Promise<AirtableRecord<F>[]> {
  const all: AirtableRecord<F>[] = [];
  let offset: string | undefined;
  do {
    const qs = offset ? `?offset=${encodeURIComponent(offset)}` : "";
    const page = await airtable<AirtableList<F>>(`/${tableId}${qs}`);
    all.push(...page.records);
    offset = page.offset;
  } while (offset);
  return all;
}

export const isAirtableConfigured = () => Boolean(process.env.AIRTABLE_PAT);

// --- read --------------------------------------------------------------------

type RoomFields = { Category?: string; Count?: number; "Rate / night"?: number; Nights?: number; "GST %"?: number; Total?: number };
type MealFields = { Meal?: string; Pax?: number; Rate?: number; "Tax %"?: number; Sittings?: number; Total?: number };
type LineFields = { Item?: string; Section?: string; Source?: "Confirmed" | "Estimate"; Amount?: number; Notes?: string };

export async function getBudget(): Promise<Budget> {
  const [roomsRes, mealsRes, itemsRes] = await Promise.all([
    listAll<RoomFields>(TABLES.rooms),
    listAll<MealFields>(TABLES.meals),
    listAll<LineFields>(TABLES.lineItems),
  ]);

  const base = defaultBudget();

  const rooms: RoomCategory[] = roomsRes.map((r) => ({
    id: r.id,
    airtableId: r.id,
    label: r.fields.Category ?? "",
    count: r.fields.Count ?? 0,
    ratePerNight: r.fields["Rate / night"] ?? 0,
  }));

  // Use the first room row's Nights/GST as the budget-wide setting.
  // (The PDF treats these as global; per-row overrides would need a model change.)
  const firstRoom = roomsRes[0]?.fields;
  const nights = firstRoom?.Nights ?? base.rooms.nights;
  const gstPct = firstRoom?.["GST %"] ?? base.rooms.gstPct;

  const meals: MealConfig[] = mealsRes.map((r) => ({
    id: r.id,
    airtableId: r.id,
    label: r.fields.Meal ?? "",
    pax: r.fields.Pax ?? 0,
    ratePerHead: r.fields.Rate ?? 0,
    taxPct: r.fields["Tax %"] ?? 0,
    sittings: r.fields.Sittings ?? 0,
  }));

  // Initialise empty buckets for all section keys.
  const buckets: Record<keyof typeof SECTION_KEY_TO_NAME, LineItem[]> = {
    decor: [], entertainment: [], photography: [], attire: [],
    travel: [], rituals: [], gifting: [], misc: [],
  };

  for (const r of itemsRes) {
    if (r.fields.Section === CONTINGENCY_SECTION) continue; // derived, not edited as a line item
    const sec = r.fields.Section ? SECTION_NAME_TO_KEY[r.fields.Section] : undefined;
    if (!sec) continue;
    buckets[sec].push({
      id: r.id,
      airtableId: r.id,
      label: r.fields.Item ?? "",
      amount: r.fields.Amount ?? 0,
      source: r.fields.Source,
      note: r.fields.Notes,
    });
  }

  return {
    ...base,
    rooms: { nights, gstPct, categories: rooms.length ? rooms : base.rooms.categories },
    meals: meals.length ? meals : base.meals,
    decor: buckets.decor,
    entertainment: buckets.entertainment,
    photography: buckets.photography,
    attire: buckets.attire,
    travel: buckets.travel,
    rituals: buckets.rituals,
    gifting: buckets.gifting,
    misc: buckets.misc,
  };
}

// --- write -------------------------------------------------------------------

type AnyFields = Record<string, unknown>;

async function batchCreate(tableId: string, fieldsList: AnyFields[]): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < fieldsList.length; i += 10) {
    const chunk = fieldsList.slice(i, i + 10);
    const res = await airtable<AirtableList>(`/${tableId}`, {
      method: "POST",
      body: JSON.stringify({ records: chunk.map((fields) => ({ fields })) }),
    });
    for (const r of res.records) ids.push(r.id);
  }
  return ids;
}

async function batchUpdate(tableId: string, updates: { id: string; fields: AnyFields }[]): Promise<void> {
  for (let i = 0; i < updates.length; i += 10) {
    const chunk = updates.slice(i, i + 10);
    await airtable(`/${tableId}`, {
      method: "PATCH",
      body: JSON.stringify({ records: chunk }),
    });
  }
}

async function batchDelete(tableId: string, ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const qs = chunk.map((id) => `records[]=${encodeURIComponent(id)}`).join("&");
    await airtable(`/${tableId}?${qs}`, { method: "DELETE" });
  }
}

// Compute the room total client-side (Airtable Total column may or may not be a formula).
function roomFields(c: RoomCategory, nights: number, gstPct: number): AnyFields {
  return {
    Category: c.label,
    Count: c.count,
    "Rate / night": c.ratePerNight,
    Nights: nights,
    "GST %": gstPct,
    Total: Math.round(c.ratePerNight * (1 + gstPct / 100) * c.count * nights),
  };
}

function mealFields(m: MealConfig): AnyFields {
  return {
    Meal: m.label,
    Pax: m.pax,
    Rate: m.ratePerHead,
    "Tax %": m.taxPct,
    Sittings: m.sittings,
    Total: Math.round(m.ratePerHead * (1 + m.taxPct / 100) * m.pax * m.sittings),
  };
}

function lineFields(it: LineItem, sectionName: string): AnyFields {
  return {
    Item: it.label,
    Section: sectionName,
    Source: it.source ?? "Estimate",
    Amount: it.amount,
    Notes: it.note ?? "",
  };
}

export async function saveBudget(budget: Budget): Promise<void> {
  // Snapshot current Airtable state to diff against.
  const [currentRooms, currentMeals, currentItems] = await Promise.all([
    listAll<RoomFields>(TABLES.rooms),
    listAll<MealFields>(TABLES.meals),
    listAll<LineFields>(TABLES.lineItems),
  ]);

  // ---- Rooms ----
  const roomCreate: AnyFields[] = [];
  const roomUpdate: { id: string; fields: AnyFields }[] = [];
  const roomKeep = new Set<string>();
  for (const c of budget.rooms.categories) {
    const f = roomFields(c, budget.rooms.nights, budget.rooms.gstPct);
    if (c.airtableId) {
      roomKeep.add(c.airtableId);
      roomUpdate.push({ id: c.airtableId, fields: f });
    } else {
      roomCreate.push(f);
    }
  }
  const roomDelete = currentRooms.map((r) => r.id).filter((id) => !roomKeep.has(id));

  // ---- Meals ----
  const mealCreate: AnyFields[] = [];
  const mealUpdate: { id: string; fields: AnyFields }[] = [];
  const mealKeep = new Set<string>();
  for (const m of budget.meals) {
    const f = mealFields(m);
    if (m.airtableId) {
      mealKeep.add(m.airtableId);
      mealUpdate.push({ id: m.airtableId, fields: f });
    } else {
      mealCreate.push(f);
    }
  }
  const mealDelete = currentMeals.map((r) => r.id).filter((id) => !mealKeep.has(id));

  // ---- Line items + contingency ----
  const itemCreate: AnyFields[] = [];
  const itemUpdate: { id: string; fields: AnyFields }[] = [];
  const itemKeep = new Set<string>();

  for (const [key, sectionName] of Object.entries(SECTION_KEY_TO_NAME) as [
    keyof typeof SECTION_KEY_TO_NAME,
    string,
  ][]) {
    for (const it of budget[key]) {
      const f = lineFields(it, sectionName);
      if (it.airtableId) {
        itemKeep.add(it.airtableId);
        itemUpdate.push({ id: it.airtableId, fields: f });
      } else {
        itemCreate.push(f);
      }
    }
  }

  // Contingency: keep at most one row in section "11 Contingency".
  const contingencyAmount = contingencyTotal(budget);
  const existingContingency = currentItems.find((r) => r.fields.Section === CONTINGENCY_SECTION);
  const contingencyFields: AnyFields = {
    Item: CONTINGENCY_LABEL,
    Section: CONTINGENCY_SECTION,
    Source: "Estimate",
    Amount: contingencyAmount,
    Notes: `${budget.contingencyPct}% of subtotal of all other sections`,
  };
  if (existingContingency) {
    itemKeep.add(existingContingency.id);
    itemUpdate.push({ id: existingContingency.id, fields: contingencyFields });
  } else {
    itemCreate.push(contingencyFields);
  }

  const itemDelete = currentItems.map((r) => r.id).filter((id) => !itemKeep.has(id));

  // ---- Apply (deletes first to avoid running into validation/limits) ----
  await Promise.all([
    roomDelete.length ? batchDelete(TABLES.rooms, roomDelete) : Promise.resolve(),
    mealDelete.length ? batchDelete(TABLES.meals, mealDelete) : Promise.resolve(),
    itemDelete.length ? batchDelete(TABLES.lineItems, itemDelete) : Promise.resolve(),
  ]);
  await Promise.all([
    roomUpdate.length ? batchUpdate(TABLES.rooms, roomUpdate) : Promise.resolve(),
    mealUpdate.length ? batchUpdate(TABLES.meals, mealUpdate) : Promise.resolve(),
    itemUpdate.length ? batchUpdate(TABLES.lineItems, itemUpdate) : Promise.resolve(),
  ]);
  await Promise.all([
    roomCreate.length ? batchCreate(TABLES.rooms, roomCreate) : Promise.resolve(),
    mealCreate.length ? batchCreate(TABLES.meals, mealCreate) : Promise.resolve(),
    itemCreate.length ? batchCreate(TABLES.lineItems, itemCreate) : Promise.resolve(),
  ]);
}
