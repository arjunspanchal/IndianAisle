// Curated common line-items per budget section. Used by the QuickAdd dropdown
// in the calculator so users can pick a real-world item instead of typing
// "New item" and starting from scratch.

import type { LineItem } from "./budget";

type LineSectionKey =
  | "decor"
  | "entertainment"
  | "photography"
  | "attire"
  | "travel"
  | "rituals"
  | "gifting"
  | "misc";

export const QUICK_ADD_ITEMS: Record<LineSectionKey, string[]> = {
  decor: [
    "Mandap setup",
    "Stage backdrop",
    "Aisle decor",
    "Table florals",
    "Hanging florals & ceiling drape",
    "Lighting design",
    "Sangeet stage decor",
    "Welcome decor",
    "Couple's chairs / thrones",
    "Cake table decor",
    "Pyros & confetti",
    "Photo-booth backdrop",
  ],
  entertainment: [
    "DJ",
    "Live band",
    "Acoustic singer / unplugged set",
    "Dhol & baraat musicians",
    "Sangeet choreographer",
    "Anchor / MC",
    "AV technicals — sound, lights, screens",
    "Lasers & moving heads",
    "Fireworks display",
  ],
  photography: [
    "Photography (all events)",
    "Videography (all events)",
    "Cinematic film",
    "Drone aerials",
    "Pre-wedding shoot",
    "Same-day edit",
    "Photobooth",
    "Album printing",
  ],
  attire: [
    "Bride — additional outfit",
    "Groom — additional outfit",
    "Bridesmaids — coordinated outfits",
    "Groomsmen — coordinated outfits",
    "Bride — accessories & shoes",
    "Groom — accessories & shoes",
    "Bridal HMU (additional event)",
    "Family HMU",
  ],
  travel: [
    "Guest flights",
    "Airport transfers",
    "Vendor / crew travel",
    "Baraat car",
    "Couple recce trip",
    "Local cab pool",
    "Welcome-bag fuel for drivers",
  ],
  rituals: [
    "Pandit fees",
    "Priest / officiant fees",
    "Puja samagri",
    "Maulvi fees",
    "Mehendi artists",
    "Ceremony props",
    "Havan / fire setup",
  ],
  gifting: [
    "Wedding invitations",
    "Save-the-dates",
    "Welcome hampers",
    "Bridesmaid gifts",
    "Groomsmen gifts",
    "Family gifts",
    "Wedding favours",
    "Shagun / envelopes",
  ],
  misc: [
    "Wedding planner / coordinator",
    "Crew runners & tips",
    "Emergency supplies",
    "Wedding insurance",
    "Marriage license / registration",
    "Cake topper",
    "Guestbook",
    "Walkie-talkies / radios",
  ],
};

export function quickAddLineItem(label: string, key: string): LineItem {
  return {
    id: `${key}-quick-${Date.now()}`,
    label,
    amount: 0,
    source: "Estimate",
  };
}
