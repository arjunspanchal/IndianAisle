// Shared directory of candidate wedding venues / properties.
// Persisted in Airtable so it's visible to every user of the app.

export type PropertyTier = 1 | 2 | 3;

export const PROPERTY_STATUS_OPTIONS = [
  "Not contacted",
  "Inquired",
  "Visited",
  "Shortlisted",
  "Booked",
  "Rejected",
] as const;
export type PropertyStatus = (typeof PROPERTY_STATUS_OPTIONS)[number];

export type Property = {
  id: string;
  airtableId?: string;

  // Identity
  name: string;
  location: string;          // city / region
  address?: string;
  website?: string;

  // Contact
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;

  // Capacity & classification
  rooms: number;
  maxGuests?: number;        // largest single function
  eventSpaces?: number;      // # of halls/lawns/spaces on site
  tier: PropertyTier;

  // Spaces & facilities
  banquet: boolean;          // indoor banquet hall
  lawn: boolean;             // outdoor lawn / open-air space
  poolside: boolean;
  mandap: boolean;           // can host a mandap setup
  bridalSuite: boolean;
  airConditioned: boolean;

  // Vendor flexibility
  inHouseCatering: boolean;
  outsideCateringAllowed: boolean;
  outsideDecorAllowed: boolean;
  liquorLicense: boolean;

  // Pricing (₹, pre-tax)
  avgRoomRate?: number;
  banquetRental?: number;
  perPlateCost?: number;
  buyoutCost?: number;       // whole-property buyout per night

  // Logistics
  parkingSpots?: number;
  airportKm?: number;

  // Decision tracking
  status?: PropertyStatus;
  rating?: number;           // 0–5
  visited?: boolean;

  // Free-form
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
  lawn: false,
  poolside: false,
  mandap: false,
  bridalSuite: false,
  airConditioned: false,
  inHouseCatering: false,
  outsideCateringAllowed: false,
  outsideDecorAllowed: false,
  liquorLicense: false,
  status: "Not contacted",
  rating: 0,
  visited: false,
  notes: "",
});

export const defaultProperties = (): Property[] => [
  {
    id: "seed-storii",
    name: "Storii by ITC Hotels — Naina Tikkar",
    location: "Naina Tikkar, Himachal Pradesh",
    address: "Sirmaur district, near Renuka Lake",
    website: "https://www.itchotels.com/in/en/storii-nainatikkar",
    rooms: 41,
    maxGuests: 200,
    eventSpaces: 3,
    tier: 1,
    banquet: true,
    lawn: true,
    poolside: true,
    mandap: true,
    bridalSuite: true,
    airConditioned: true,
    inHouseCatering: true,
    outsideCateringAllowed: false,
    outsideDecorAllowed: true,
    liquorLicense: true,
    avgRoomRate: 15000,
    perPlateCost: 2400,
    parkingSpots: 40,
    airportKm: 90,
    status: "Booked",
    rating: 5,
    visited: true,
    notes: "Currently planned venue for the wedding.",
  },
];

// Quick boolean-feature summary for list cards.
export const FEATURE_FLAGS: { key: keyof Property; label: string }[] = [
  { key: "banquet", label: "Banquet" },
  { key: "lawn", label: "Lawn" },
  { key: "poolside", label: "Poolside" },
  { key: "mandap", label: "Mandap" },
  { key: "bridalSuite", label: "Bridal suite" },
  { key: "airConditioned", label: "AC" },
  { key: "inHouseCatering", label: "In-house catering" },
  { key: "outsideCateringAllowed", label: "Outside catering OK" },
  { key: "outsideDecorAllowed", label: "Outside decor OK" },
  { key: "liquorLicense", label: "Liquor license" },
];
