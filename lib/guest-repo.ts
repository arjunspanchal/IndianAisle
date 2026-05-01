import "server-only";
import { createSupabaseServerClient } from "./supabase/server";
import type { Guest } from "./guests";

type Row = {
  id: string;
  wedding_id: string;
  name: string;
  guest_type: string;
  side: "" | "bride" | "groom" | "both";
  address: string;
  phone: string;
  email: string;
  invited: boolean;
  rsvp_status: "pending" | "accepted" | "declined" | "maybe";
  hotel_required: boolean;
  arrival_date: string | null;
  plus_ones: number;
  notes: string;
  position: number;
};

function rowToGuest(r: Row): Guest {
  return {
    id: r.id,
    name: r.name,
    guestType: r.guest_type,
    side: r.side,
    address: r.address,
    phone: r.phone,
    email: r.email,
    invited: r.invited,
    rsvpStatus: r.rsvp_status,
    hotelRequired: r.hotel_required,
    arrivalDate: r.arrival_date,
    plusOnes: r.plus_ones,
    notes: r.notes,
  };
}

function guestToInsert(g: Guest, weddingId: string, position: number) {
  return {
    wedding_id: weddingId,
    name: g.name,
    guest_type: g.guestType,
    side: g.side,
    address: g.address,
    phone: g.phone,
    email: g.email,
    invited: g.invited,
    rsvp_status: g.rsvpStatus,
    hotel_required: g.hotelRequired,
    arrival_date: g.arrivalDate,
    plus_ones: Math.max(0, Math.floor(g.plusOnes || 0)),
    notes: g.notes,
    position,
  };
}

function guestToUpdate(g: Guest) {
  return {
    name: g.name,
    guest_type: g.guestType,
    side: g.side,
    address: g.address,
    phone: g.phone,
    email: g.email,
    invited: g.invited,
    rsvp_status: g.rsvpStatus,
    hotel_required: g.hotelRequired,
    arrival_date: g.arrivalDate,
    plus_ones: Math.max(0, Math.floor(g.plusOnes || 0)),
    notes: g.notes,
  };
}

export async function listGuests(weddingId: string): Promise<Guest[]> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("wedding_guests")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToGuest(r as Row));
}

export async function createGuest(weddingId: string, g: Guest): Promise<Guest> {
  const sb = createSupabaseServerClient();
  // append at end: take max(position)+1 (cheap; small lists)
  const { data: maxRow, error: maxErr } = await sb
    .from("wedding_guests")
    .select("position")
    .eq("wedding_id", weddingId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw new Error(maxErr.message);
  const nextPos = (maxRow?.position ?? -1) + 1;

  const { data, error } = await sb
    .from("wedding_guests")
    .insert(guestToInsert(g, weddingId, nextPos))
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToGuest(data as Row);
}

export async function updateGuest(guestId: string, g: Guest): Promise<Guest> {
  const sb = createSupabaseServerClient();
  const { data, error } = await sb
    .from("wedding_guests")
    .update(guestToUpdate(g))
    .eq("id", guestId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToGuest(data as Row);
}

export async function deleteGuest(guestId: string): Promise<void> {
  const sb = createSupabaseServerClient();
  const { error } = await sb.from("wedding_guests").delete().eq("id", guestId);
  if (error) throw new Error(error.message);
}

export async function bulkCreateGuests(weddingId: string, guests: Guest[]): Promise<number> {
  if (guests.length === 0) return 0;
  const sb = createSupabaseServerClient();
  const { data: maxRow, error: maxErr } = await sb
    .from("wedding_guests")
    .select("position")
    .eq("wedding_id", weddingId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw new Error(maxErr.message);
  const startPos = (maxRow?.position ?? -1) + 1;

  const rows = guests.map((g, i) => guestToInsert(g, weddingId, startPos + i));
  const { error } = await sb.from("wedding_guests").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}
