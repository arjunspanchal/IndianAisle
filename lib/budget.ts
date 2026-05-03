// Wedding budget data model + math.
// Defaults reproduce the Kash + Arjun / Storii Naina Tikkar v5 PDF totals.

export type LineItem = {
  id: string;
  airtableId?: string;
  label: string;
  note?: string;
  amount: number;
  source?: "Confirmed" | "Estimate";
  /** Optional reference to a vendor (personal or curated). Both move together. */
  vendorId?: string | null;
  vendorSource?: "personal" | "curated" | null;
};

export type RoomCategory = {
  id: string;
  airtableId?: string;
  label: string;
  count: number;
  ratePerNight: number; // pre-tax INR
};

export type MealConfig = {
  id: string;
  airtableId?: string;
  label: string;
  pax: number;
  ratePerHead: number; // pre-tax INR
  taxPct: number; // e.g. 18 or 5
  sittings: number; // e.g. 2 = breakfast on day 1 + day 2
};

export type WeddingTradition = "hindu_indian" | "muslim_indian" | "catholic";

export const TRADITION_LABEL: Record<WeddingTradition, string> = {
  hindu_indian: "India — Hindu",
  muslim_indian: "India — Muslim",
  catholic: "Catholic",
};

// Common venue spaces (the property's boolean facility flags map onto these).
export const EVENT_SPACES = [
  { key: "banquet", label: "Banquet hall" },
  { key: "lawn", label: "Lawn" },
  { key: "poolside", label: "Poolside" },
  { key: "mandap", label: "Mandap" },
  { key: "bridal_suite", label: "Bridal suite" },
  { key: "other", label: "Other" },
] as const;
export type EventSpaceKey = (typeof EVENT_SPACES)[number]["key"];

export type WeddingEvent = {
  id: string;
  airtableId?: string; // Supabase row id once persisted
  name: string;
  space: string; // free-form, but typically one of EVENT_SPACES.key
  date?: string; // ISO yyyy-mm-dd
};

export const TRADITION_DEFAULT_EVENTS: Record<WeddingTradition, { name: string; space: string }[]> = {
  hindu_indian: [
    { name: "Mehendi", space: "lawn" },
    { name: "Haldi", space: "poolside" },
    { name: "Sangeet", space: "banquet" },
    { name: "Shaadi", space: "mandap" },
  ],
  muslim_indian: [
    { name: "Mehendi", space: "lawn" },
    { name: "Sangeet", space: "banquet" },
    { name: "Nikah", space: "banquet" },
    { name: "Walima", space: "banquet" },
  ],
  catholic: [
    { name: "Rehearsal dinner", space: "banquet" },
    { name: "Ceremony", space: "lawn" },
    { name: "Reception", space: "banquet" },
  ],
};

export const buildDefaultEvents = (t: WeddingTradition): WeddingEvent[] =>
  TRADITION_DEFAULT_EVENTS[t].map((e, i) => ({
    id: `evt-${t}-${i}-${Date.now()}`,
    name: e.name,
    space: e.space,
  }));

// Pre-populated attire rows per tradition. Covers bride, groom, and the nuclear
// family (parents + siblings). Amounts default to 0 — the user fills these in.
export const TRADITION_DEFAULT_ATTIRE: Record<WeddingTradition, string[]> = {
  hindu_indian: [
    "Bride — Wedding lehenga",
    "Bride — Sangeet outfit",
    "Bride — Mehendi outfit",
    "Bride — Haldi outfit",
    "Bride — Hair, makeup & jewellery",
    "Groom — Wedding sherwani",
    "Groom — Sangeet outfit",
    "Groom — Reception outfit",
    "Mother of bride",
    "Father of bride",
    "Mother of groom",
    "Father of groom",
    "Sibling(s) — bride's side",
    "Sibling(s) — groom's side",
  ],
  muslim_indian: [
    "Bride — Nikah outfit",
    "Bride — Walima outfit",
    "Bride — Mehendi outfit",
    "Bride — Sangeet outfit",
    "Bride — Hair, makeup & jewellery",
    "Groom — Nikah outfit",
    "Groom — Walima outfit",
    "Groom — Sangeet outfit",
    "Mother of bride",
    "Father of bride",
    "Mother of groom",
    "Father of groom",
    "Sibling(s) — bride's side",
    "Sibling(s) — groom's side",
  ],
  catholic: [
    "Bride — Wedding gown",
    "Bride — Reception dress",
    "Bride — Rehearsal-dinner outfit",
    "Bride — Hair, makeup & jewellery",
    "Groom — Wedding suit / tuxedo",
    "Groom — Reception outfit",
    "Groom — Rehearsal-dinner outfit",
    "Mother of bride",
    "Father of bride",
    "Mother of groom",
    "Father of groom",
    "Sibling(s) — bride's side",
    "Sibling(s) — groom's side",
  ],
};

export const buildDefaultAttire = (t: WeddingTradition): LineItem[] =>
  TRADITION_DEFAULT_ATTIRE[t].map((label, i) => ({
    id: `attire-default-${t}-${i}-${Date.now()}`,
    label,
    amount: 0,
    source: "Estimate",
  }));

export type Budget = {
  meta: {
    brideName: string;
    groomName: string;
    venue: string;
    startDate: string; // ISO yyyy-mm-dd
    endDate: string;   // ISO yyyy-mm-dd
    guests: number;
    events: number;
    tradition?: WeddingTradition | null;
  };
  rooms: {
    nights: number;
    gstPct: number; // applied to room rate
    categories: RoomCategory[];
  };
  meals: MealConfig[];
  events: WeddingEvent[];
  decor: LineItem[];
  entertainment: LineItem[];
  photography: LineItem[];
  attire: LineItem[];
  travel: LineItem[];
  rituals: LineItem[];
  gifting: LineItem[];
  misc: LineItem[];
  contingencyPct: number; // applied to subtotal of everything except itself
};

export const defaultBudget = (): Budget => ({
  meta: {
    brideName: "Kash",
    groomName: "Arjun",
    venue: "Storii by ITC Hotels — Naina Tikkar",
    startDate: "2026-12-06",
    endDate: "2026-12-08",
    guests: 91,
    events: 4,
    tradition: "hindu_indian",
  },
  events: buildDefaultEvents("hindu_indian"),
  rooms: {
    nights: 2,
    gstPct: 18,
    categories: [
      // Avg back-solved from PDF total (1,457,400) — displayed as Rs.15,000 in the PDF.
      { id: "all", label: "Avg across 17 Deluxe + 8 Superior + 10 Premium + 6 Suite", count: 41, ratePerNight: 15062 },
    ],
  },
  meals: [
    { id: "bfast", label: "Platinum Breakfast (Day 1 + 2)", pax: 91, ratePerHead: 1120, taxPct: 18, sittings: 2 },
    { id: "lunch", label: "Platinum Lunch (Day 1 + 2)", pax: 91, ratePerHead: 2400, taxPct: 5, sittings: 2 },
    { id: "dinner", label: "Dinner (Dec 6 + Dec 8)", pax: 91, ratePerHead: 3600, taxPct: 5, sittings: 2 },
  ],
  decor: [
    { id: "designer", label: "Decor designer — all 5 functions", amount: 700000, source: "Confirmed" },
    { id: "sfx", label: "SFX — cold pyros + confetti", amount: 60000, source: "Confirmed" },
    { id: "collateral", label: "Printing + cake + fans + rangoli", amount: 40000, source: "Confirmed" },
  ],
  entertainment: [
    { id: "av", label: "AV technicals — rigs, lighting, screens, mics", amount: 150000, source: "Confirmed" },
    { id: "choreo", label: "Sangeet choreographer", amount: 40000, source: "Confirmed" },
    { id: "band", label: "Live band / acoustic — Reception", amount: 60000, source: "Confirmed" },
    { id: "dhol", label: "Dhol + baraat musicians", amount: 20000, source: "Confirmed" },
  ],
  photography: [
    { id: "photovid", label: "Photography & videography — all 5 events", amount: 300000, source: "Confirmed" },
  ],
  attire: [
    { id: "bride-sangeet", label: "Bride — Sangeet lehenga", amount: 200000, source: "Confirmed" },
    { id: "bride-wedding", label: "Bride — Wedding lehenga", amount: 200000, source: "Confirmed" },
    { id: "bride-haldi", label: "Bride — Haldi outfit", amount: 25000, source: "Confirmed" },
    { id: "groom-sherwani", label: "Groom — Wedding sherwani", amount: 60000, source: "Confirmed" },
    { id: "groom-recep", label: "Groom — Reception outfit", amount: 40000, source: "Confirmed" },
    { id: "groom-sangeet", label: "Groom — Sangeet outfit", amount: 20000, source: "Confirmed" },
    { id: "hmu", label: "Bridal hair & makeup — all 5 events", amount: 139500, source: "Estimate" },
    { id: "jewel", label: "Jewellery + vanity / salon mirror setup", amount: 120000, source: "Estimate" },
  ],
  travel: [
    { id: "flights", label: "Guest flights — Mumbai/Delhi → Chandigarh", amount: 150000, source: "Estimate" },
    { id: "transfers", label: "Airport ↔ Naina Tikkar transfers", amount: 60000, source: "Estimate" },
    { id: "baraat", label: "Baraat car (Sundowner Wedding)", amount: 22000, source: "Confirmed" },
    { id: "vendor", label: "Vendor / crew travel", amount: 30000, source: "Estimate" },
    { id: "couple", label: "Bride & groom travel + recce visit", amount: 20000, source: "Estimate" },
  ],
  rituals: [
    { id: "pandit", label: "Pandit fees — Pooja + Wedding", amount: 25000, source: "Confirmed" },
    { id: "samagri", label: "Puja samagri", amount: 5000, source: "Confirmed" },
    { id: "mehendi", label: "Mehendi artists", amount: 10000, source: "Confirmed" },
  ],
  gifting: [
    { id: "invites", label: "Wedding invitations", amount: 10000, source: "Confirmed" },
    { id: "hampers", label: "Welcome hampers (Rs.200 × 91)", amount: 18200, source: "Confirmed" },
    { id: "shagun", label: "Shagun / family gifts", amount: 10000, source: "Confirmed" },
  ],
  misc: [
    { id: "planner", label: "Wedding planner / coordinator", amount: 100000, source: "Confirmed" },
    { id: "crew", label: "Crew runners + tips + supplies", amount: 100000, source: "Estimate" },
  ],
  contingencyPct: 5,
});

// --- math helpers ----------------------------------------------------------

export const roomsTotal = (b: Budget) =>
  b.rooms.categories.reduce((sum, c) => {
    const taxed = c.ratePerNight * (1 + b.rooms.gstPct / 100);
    return sum + taxed * c.count * b.rooms.nights;
  }, 0);

export const mealLineTotal = (m: MealConfig) =>
  m.ratePerHead * (1 + m.taxPct / 100) * m.pax * m.sittings;

export const mealsTotal = (b: Budget) => b.meals.reduce((s, m) => s + mealLineTotal(m), 0);

export const lineItemsTotal = (items: LineItem[]) => items.reduce((s, i) => s + i.amount, 0);

export type SectionKey =
  | "rooms"
  | "meals"
  | "decor"
  | "entertainment"
  | "photography"
  | "attire"
  | "travel"
  | "rituals"
  | "gifting"
  | "misc"
  | "contingency";

export const sectionTotal = (b: Budget, key: SectionKey): number => {
  switch (key) {
    case "rooms": return roomsTotal(b);
    case "meals": return mealsTotal(b);
    case "decor": return lineItemsTotal(b.decor);
    case "entertainment": return lineItemsTotal(b.entertainment);
    case "photography": return lineItemsTotal(b.photography);
    case "attire": return lineItemsTotal(b.attire);
    case "travel": return lineItemsTotal(b.travel);
    case "rituals": return lineItemsTotal(b.rituals);
    case "gifting": return lineItemsTotal(b.gifting);
    case "misc": return lineItemsTotal(b.misc);
    case "contingency": return contingencyTotal(b);
  }
};

export const subtotalBeforeContingency = (b: Budget) =>
  roomsTotal(b) +
  mealsTotal(b) +
  lineItemsTotal(b.decor) +
  lineItemsTotal(b.entertainment) +
  lineItemsTotal(b.photography) +
  lineItemsTotal(b.attire) +
  lineItemsTotal(b.travel) +
  lineItemsTotal(b.rituals) +
  lineItemsTotal(b.gifting) +
  lineItemsTotal(b.misc);

export const contingencyTotal = (b: Budget) =>
  Math.round(subtotalBeforeContingency(b) * (b.contingencyPct / 100));

export const grandTotal = (b: Budget) =>
  Math.round(subtotalBeforeContingency(b) + contingencyTotal(b));

export const formatINR = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

export const coupleDisplayName = (meta: Budget["meta"]): string => {
  const b = meta.brideName.trim();
  const g = meta.groomName.trim();
  if (b && g) return `${b} + ${g}`;
  return b || g || "";
};

export const formatDateRange = (startISO: string, endISO: string): string => {
  if (!startISO || !endISO) return "";
  const start = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
  const sM = monthFmt.format(start);
  const eM = monthFmt.format(end);
  const sD = start.getDate();
  const eD = end.getDate();
  const sY = start.getFullYear();
  const eY = end.getFullYear();
  if (sY === eY && sM === eM) return `${sM} ${sD}–${eD}, ${eY}`;
  if (sY === eY) return `${sM} ${sD} – ${eM} ${eD}, ${eY}`;
  return `${sM} ${sD}, ${sY} – ${eM} ${eD}, ${eY}`;
};

export const formatINRCompact = (n: number) => {
  const r = Math.round(n);
  if (r >= 10000000) return `₹${(r / 10000000).toFixed(2)} Cr`;
  if (r >= 100000) return `₹${(r / 100000).toFixed(2)} L`;
  return formatINR(r);
};
