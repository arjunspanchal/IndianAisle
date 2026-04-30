// Shared directory of candidate wedding venues / properties.
// Persisted in Airtable so it's visible to every user of the app.

export type PropertyTier = 1 | 2 | 3;

export type Property = {
  id: string;
  airtableId?: string;
  name: string;
  location: string;
  rooms: number;
  tier: PropertyTier;
  banquet: boolean;
  notes?: string;
};

export const TIER_LABEL: Record<PropertyTier, string> = {
  1: "Tier 1 — Luxury",
  2: "Tier 2 — Premium",
  3: "Tier 3 — Boutique / value",
};

export const blankProperty = (): Property => ({
  id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  location: "",
  rooms: 0,
  tier: 2,
  banquet: false,
  notes: "",
});

export const defaultProperties = (): Property[] => [
  {
    id: "seed-storii",
    name: "Storii by ITC Hotels — Naina Tikkar",
    location: "Naina Tikkar, Himachal Pradesh",
    rooms: 41,
    tier: 1,
    banquet: true,
    notes: "Currently planned venue for the wedding.",
  },
];
