import "server-only";
import {
  PROPERTY_STATUS_OPTIONS,
  type Property,
  type PropertyStatus,
  type PropertyTier,
} from "./properties";
import { createSupabaseServerClient } from "./supabase/server";
import type { Database } from "./supabase/types";

type PropertyRow = Database["public"]["Tables"]["wedding_properties"]["Row"];
type PropertyInsert = Database["public"]["Tables"]["wedding_properties"]["Insert"];
type PropertyUpdate = Database["public"]["Tables"]["wedding_properties"]["Update"];

function toTier(raw: number): PropertyTier {
  return raw === 1 || raw === 2 || raw === 3 ? (raw as PropertyTier) : 2;
}

function toStatus(raw: string | null): PropertyStatus | undefined {
  if (!raw) return undefined;
  return (PROPERTY_STATUS_OPTIONS as readonly string[]).includes(raw)
    ? (raw as PropertyStatus)
    : undefined;
}

function fromRow(r: PropertyRow): Property {
  return {
    id: r.id,
    // Kept for backwards-compatibility with the old Airtable callsites; both fields
    // hold the Supabase row UUID now.
    airtableId: r.id,
    name: r.name,
    location: r.location,
    address: r.address,
    website: r.website,
    contactName: r.contact_name,
    contactPhone: r.contact_phone,
    contactEmail: r.contact_email,
    rooms: r.rooms,
    maxGuests: r.max_guests ?? undefined,
    eventSpaces: r.event_spaces ?? undefined,
    tier: toTier(r.tier),
    banquet: r.banquet,
    lawn: r.lawn,
    poolside: r.poolside,
    mandap: r.mandap,
    bridalSuite: r.bridal_suite,
    airConditioned: r.air_conditioned,
    inHouseCatering: r.in_house_catering,
    outsideCateringAllowed: r.outside_catering_allowed,
    outsideDecorAllowed: r.outside_decor_allowed,
    liquorLicense: r.liquor_license,
    avgRoomRate: r.avg_room_rate ?? undefined,
    banquetRental: r.banquet_rental ?? undefined,
    perPlateCost: r.per_plate_cost ?? undefined,
    buyoutCost: r.buyout_cost ?? undefined,
    parkingSpots: r.parking_spots ?? undefined,
    airportKm: r.airport_km ?? undefined,
    status: toStatus(r.status),
    rating: r.rating,
    visited: r.visited,
    notes: r.notes,
  };
}

function toRowFields(p: Property): Omit<PropertyInsert, "owner_id"> {
  return {
    name: p.name,
    location: p.location,
    address: p.address ?? "",
    website: p.website ?? "",
    contact_name: p.contactName ?? "",
    contact_phone: p.contactPhone ?? "",
    contact_email: p.contactEmail ?? "",
    rooms: p.rooms,
    max_guests: p.maxGuests ?? null,
    event_spaces: p.eventSpaces ?? null,
    tier: p.tier,
    banquet: p.banquet,
    lawn: p.lawn,
    poolside: p.poolside,
    mandap: p.mandap,
    bridal_suite: p.bridalSuite,
    air_conditioned: p.airConditioned,
    in_house_catering: p.inHouseCatering,
    outside_catering_allowed: p.outsideCateringAllowed,
    outside_decor_allowed: p.outsideDecorAllowed,
    liquor_license: p.liquorLicense,
    avg_room_rate: p.avgRoomRate ?? null,
    banquet_rental: p.banquetRental ?? null,
    per_plate_cost: p.perPlateCost ?? null,
    buyout_cost: p.buyoutCost ?? null,
    parking_spots: p.parkingSpots ?? null,
    airport_km: p.airportKm ?? null,
    status: p.status ?? null,
    rating: p.rating ?? 0,
    visited: p.visited ?? false,
    notes: p.notes ?? "",
  };
}

export async function listProperties(): Promise<Property[]> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("wedding_properties")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromRow);
}

export async function createProperty(p: Property): Promise<Property> {
  const sb = createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const insert: PropertyInsert = { owner_id: user.id, ...toRowFields(p) };
  const { data, error } = await sb
    .from("wedding_properties")
    .insert(insert)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function updateProperty(p: Property): Promise<Property> {
  if (!p.airtableId) throw new Error("updateProperty requires a server id");
  const sb = createSupabaseServerClient();
  const update: PropertyUpdate = toRowFields(p);
  const { data, error } = await sb
    .from("wedding_properties")
    .update(update)
    .eq("id", p.airtableId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data);
}

export async function deleteProperty(id: string): Promise<void> {
  const sb = createSupabaseServerClient();
  const { error } = await sb.from("wedding_properties").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
