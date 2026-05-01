import type { GuestSide, RsvpStatus } from "./supabase/types";

export type Guest = {
  id?: string; // Supabase row id; absent for new rows not yet saved
  name: string;
  guestType: string; // freeform: "Core Fam", "Family", "Friend", "Work", …
  side: GuestSide;
  address: string;
  phone: string;
  email: string;
  invited: boolean;
  rsvpStatus: RsvpStatus;
  hotelRequired: boolean;
  arrivalDate: string | null; // yyyy-mm-dd
  plusOnes: number;
  notes: string;
};

export const RSVP_OPTIONS: { value: RsvpStatus; label: string; tone: "stone" | "emerald" | "rose" | "amber" }[] = [
  { value: "pending", label: "Pending", tone: "stone" },
  { value: "accepted", label: "Accepted", tone: "emerald" },
  { value: "declined", label: "Declined", tone: "rose" },
  { value: "maybe", label: "Maybe", tone: "amber" },
];

export const SIDE_OPTIONS: { value: GuestSide; label: string }[] = [
  { value: "", label: "—" },
  { value: "bride", label: "Bride's side" },
  { value: "groom", label: "Groom's side" },
  { value: "both", label: "Both sides" },
];

export const RSVP_LABEL: Record<RsvpStatus, string> =
  Object.fromEntries(RSVP_OPTIONS.map((o) => [o.value, o.label])) as Record<RsvpStatus, string>;

export function blankGuest(): Guest {
  return {
    name: "",
    guestType: "",
    side: "",
    address: "",
    phone: "",
    email: "",
    invited: true,
    rsvpStatus: "pending",
    hotelRequired: false,
    arrivalDate: null,
    plusOnes: 0,
    notes: "",
  };
}

export type GuestSummary = {
  total: number;
  invited: number;
  accepted: number;
  declined: number;
  pending: number;
  maybe: number;
  hotelRooms: number;
  headcount: number; // accepted + plus_ones for accepted
};

export function summarize(guests: Guest[]): GuestSummary {
  const s: GuestSummary = {
    total: guests.length,
    invited: 0,
    accepted: 0,
    declined: 0,
    pending: 0,
    maybe: 0,
    hotelRooms: 0,
    headcount: 0,
  };
  for (const g of guests) {
    if (g.invited) s.invited += 1;
    if (g.hotelRequired) s.hotelRooms += 1;
    switch (g.rsvpStatus) {
      case "accepted":
        s.accepted += 1;
        s.headcount += 1 + Math.max(0, g.plusOnes);
        break;
      case "declined":
        s.declined += 1;
        break;
      case "maybe":
        s.maybe += 1;
        break;
      default:
        s.pending += 1;
    }
  }
  return s;
}
