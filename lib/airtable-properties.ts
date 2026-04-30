// Server-only Airtable client for the shared Properties directory.
// Reuses the BASE_ID + PAT from lib/airtable.ts. Stores in a table named
// "Properties" (referenced by name so no table-id constant needs to change).
//
// Expected Airtable schema for table "Properties":
//   Name      — single-line text   (primary)
//   Location  — single-line text
//   Rooms     — number (integer)
//   Tier      — number (integer 1-3)   OR single-select with options "1" "2" "3"
//   Banquet   — checkbox (boolean)
//   Notes     — long text

import "server-only";
import type { Property, PropertyTier } from "./properties";

const BASE_ID = "appX3GYmlf0OQGXc7";
const TABLE = "Properties";

type AirtableRecord<F = Record<string, unknown>> = { id: string; fields: F };
type AirtableList<F = Record<string, unknown>> = { records: AirtableRecord<F>[]; offset?: string };

type PropertyFields = {
  Name?: string;
  Location?: string;
  Rooms?: number;
  Tier?: number | string;
  Banquet?: boolean;
  Notes?: string;
};

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

const tableUrl = `/${encodeURIComponent(TABLE)}`;

function normaliseTier(raw: number | string | undefined): PropertyTier {
  const n = typeof raw === "string" ? parseInt(raw, 10) : raw;
  return n === 1 || n === 2 || n === 3 ? (n as PropertyTier) : 2;
}

function fromRecord(r: AirtableRecord<PropertyFields>): Property {
  return {
    id: r.id,
    airtableId: r.id,
    name: r.fields.Name ?? "",
    location: r.fields.Location ?? "",
    rooms: r.fields.Rooms ?? 0,
    tier: normaliseTier(r.fields.Tier),
    banquet: Boolean(r.fields.Banquet),
    notes: r.fields.Notes ?? "",
  };
}

function toFields(p: Property): PropertyFields {
  return {
    Name: p.name,
    Location: p.location,
    Rooms: p.rooms,
    Tier: p.tier,
    Banquet: p.banquet,
    Notes: p.notes ?? "",
  };
}

export async function listProperties(): Promise<Property[]> {
  const all: AirtableRecord<PropertyFields>[] = [];
  let offset: string | undefined;
  do {
    const qs = offset ? `?offset=${encodeURIComponent(offset)}` : "";
    const page = await airtable<AirtableList<PropertyFields>>(`${tableUrl}${qs}`);
    all.push(...page.records);
    offset = page.offset;
  } while (offset);
  return all.map(fromRecord);
}

export async function createProperty(p: Property): Promise<Property> {
  const res = await airtable<AirtableList<PropertyFields>>(tableUrl, {
    method: "POST",
    body: JSON.stringify({ records: [{ fields: toFields(p) }] }),
  });
  const rec = res.records[0];
  if (!rec) throw new Error("Airtable create returned no record");
  return fromRecord(rec);
}

export async function updateProperty(p: Property): Promise<Property> {
  if (!p.airtableId) throw new Error("updateProperty requires an airtableId");
  const res = await airtable<AirtableList<PropertyFields>>(tableUrl, {
    method: "PATCH",
    body: JSON.stringify({ records: [{ id: p.airtableId, fields: toFields(p) }] }),
  });
  const rec = res.records[0];
  if (!rec) throw new Error("Airtable update returned no record");
  return fromRecord(rec);
}

export async function deleteProperty(airtableId: string): Promise<void> {
  await airtable(`${tableUrl}?records[]=${encodeURIComponent(airtableId)}`, { method: "DELETE" });
}
