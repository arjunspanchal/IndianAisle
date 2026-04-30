// Server-only Airtable client for the shared Properties directory.
// Reuses the BASE_ID + PAT from lib/airtable.ts. Stores in a table named
// "Properties" (referenced by name).
//
// Expected Airtable schema for table "Properties":
//   Name                        — single-line text (primary)
//   Location                    — single-line text   (city / region)
//   Address                     — single-line text
//   Website                     — URL
//   Contact name                — single-line text
//   Contact phone               — phone
//   Contact email               — email
//   Rooms                       — number (integer)
//   Max guests                  — number (integer)
//   Event spaces                — number (integer)
//   Tier                        — number (1–3)  OR single-select "1"/"2"/"3"
//   Banquet                     — checkbox
//   Lawn                        — checkbox
//   Poolside                    — checkbox
//   Mandap                      — checkbox
//   Bridal suite                — checkbox
//   Air conditioned             — checkbox
//   In-house catering           — checkbox
//   Outside catering allowed    — checkbox
//   Outside decor allowed       — checkbox
//   Liquor license              — checkbox
//   Avg room rate               — currency / number (₹)
//   Banquet rental              — currency / number (₹)
//   Per plate cost              — currency / number (₹)
//   Buyout cost                 — currency / number (₹)
//   Parking spots               — number (integer)
//   Airport km                  — number (decimal)
//   Status                      — single-select  (Not contacted, Inquired, Visited, Shortlisted, Booked, Rejected)
//   Rating                      — rating (0–5) or number
//   Visited                     — checkbox
//   Notes                       — long text

import "server-only";
import {
  PROPERTY_STATUS_OPTIONS,
  type Property,
  type PropertyStatus,
  type PropertyTier,
} from "./properties";

const BASE_ID = "appX3GYmlf0OQGXc7";
const TABLE = "Properties";

type AirtableRecord<F = Record<string, unknown>> = { id: string; fields: F };
type AirtableList<F = Record<string, unknown>> = { records: AirtableRecord<F>[]; offset?: string };

type PropertyFields = {
  Name?: string;
  Location?: string;
  Address?: string;
  Website?: string;
  "Contact name"?: string;
  "Contact phone"?: string;
  "Contact email"?: string;
  Rooms?: number;
  "Max guests"?: number;
  "Event spaces"?: number;
  Tier?: number | string;
  Banquet?: boolean;
  Lawn?: boolean;
  Poolside?: boolean;
  Mandap?: boolean;
  "Bridal suite"?: boolean;
  "Air conditioned"?: boolean;
  "In-house catering"?: boolean;
  "Outside catering allowed"?: boolean;
  "Outside decor allowed"?: boolean;
  "Liquor license"?: boolean;
  "Avg room rate"?: number;
  "Banquet rental"?: number;
  "Per plate cost"?: number;
  "Buyout cost"?: number;
  "Parking spots"?: number;
  "Airport km"?: number;
  Status?: string;
  Rating?: number;
  Visited?: boolean;
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

function normaliseStatus(raw: string | undefined): PropertyStatus | undefined {
  if (!raw) return undefined;
  return (PROPERTY_STATUS_OPTIONS as readonly string[]).includes(raw)
    ? (raw as PropertyStatus)
    : undefined;
}

function fromRecord(r: AirtableRecord<PropertyFields>): Property {
  const f = r.fields;
  return {
    id: r.id,
    airtableId: r.id,
    name: f.Name ?? "",
    location: f.Location ?? "",
    address: f.Address ?? "",
    website: f.Website ?? "",
    contactName: f["Contact name"] ?? "",
    contactPhone: f["Contact phone"] ?? "",
    contactEmail: f["Contact email"] ?? "",
    rooms: f.Rooms ?? 0,
    maxGuests: f["Max guests"],
    eventSpaces: f["Event spaces"],
    tier: normaliseTier(f.Tier),
    banquet: Boolean(f.Banquet),
    lawn: Boolean(f.Lawn),
    poolside: Boolean(f.Poolside),
    mandap: Boolean(f.Mandap),
    bridalSuite: Boolean(f["Bridal suite"]),
    airConditioned: Boolean(f["Air conditioned"]),
    inHouseCatering: Boolean(f["In-house catering"]),
    outsideCateringAllowed: Boolean(f["Outside catering allowed"]),
    outsideDecorAllowed: Boolean(f["Outside decor allowed"]),
    liquorLicense: Boolean(f["Liquor license"]),
    avgRoomRate: f["Avg room rate"],
    banquetRental: f["Banquet rental"],
    perPlateCost: f["Per plate cost"],
    buyoutCost: f["Buyout cost"],
    parkingSpots: f["Parking spots"],
    airportKm: f["Airport km"],
    status: normaliseStatus(f.Status),
    rating: f.Rating ?? 0,
    visited: Boolean(f.Visited),
    notes: f.Notes ?? "",
  };
}

// Drop empty optionals so we don't write blanks back to Airtable.
function pruned<T extends object>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

function toFields(p: Property): PropertyFields {
  return pruned<PropertyFields>({
    Name: p.name,
    Location: p.location,
    Address: p.address,
    Website: p.website,
    "Contact name": p.contactName,
    "Contact phone": p.contactPhone,
    "Contact email": p.contactEmail,
    Rooms: p.rooms,
    "Max guests": p.maxGuests,
    "Event spaces": p.eventSpaces,
    Tier: p.tier,
    Banquet: p.banquet,
    Lawn: p.lawn,
    Poolside: p.poolside,
    Mandap: p.mandap,
    "Bridal suite": p.bridalSuite,
    "Air conditioned": p.airConditioned,
    "In-house catering": p.inHouseCatering,
    "Outside catering allowed": p.outsideCateringAllowed,
    "Outside decor allowed": p.outsideDecorAllowed,
    "Liquor license": p.liquorLicense,
    "Avg room rate": p.avgRoomRate,
    "Banquet rental": p.banquetRental,
    "Per plate cost": p.perPlateCost,
    "Buyout cost": p.buyoutCost,
    "Parking spots": p.parkingSpots,
    "Airport km": p.airportKm,
    Status: p.status,
    Rating: p.rating,
    Visited: p.visited,
    Notes: p.notes,
  });
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
