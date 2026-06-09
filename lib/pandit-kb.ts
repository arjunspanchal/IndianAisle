import "server-only";

/**
 * Digital Pandit knowledge base.
 *
 * This is a VETTED corpus: the chat route ("Pandit ji") is grounded strictly on
 * these entries and is instructed never to invent rituals, mantras, or meanings
 * that are not present here.
 *
 * Review workflow:
 * - Every entry carries a `reviewStatus`. New/edited content lands as
 *   "pending_pandit_review" and must be confirmed by a real pandit / scholar
 *   (recorded in `reviewedBy`) before being flipped to "reviewed".
 * - Because this file is checked into git, the PR diff IS the review trail for
 *   v0. A future iteration can move this into a Supabase `ritual_kb` table with
 *   an admin review queue (mirroring the vendor approval flow).
 *
 * Content guidelines:
 * - Describe meaning, significance, and sequence in mainstream, widely-attested
 *   terms. Note major regional / sampradaya variation where it is well known.
 * - Do NOT transcribe full Sanskrit mantras here unless they have been checked
 *   by a pandit; an unreviewed/incorrect mantra is worse than none.
 */

export type RitualTradition =
  | "hindu_north"
  | "hindu_gujarati"
  | "hindu_punjabi"
  | "hindu_marwari"
  | "hindu_south"
  | "hindu_bengali";

export type RitualPhase = "pre_wedding" | "wedding_day" | "post_wedding";

export type ReviewStatus = "reviewed" | "pending_pandit_review";

export interface RitualEntry {
  /** kebab-case stable id, e.g. "haldi" */
  slug: string;
  /** Display name, e.g. "Haldi" */
  title: string;
  /** Other common names / spellings, for matching user questions. */
  aliases: string[];
  phase: RitualPhase;
  /**
   * Rough ordering within the whole wedding sequence (lower = earlier).
   * Used only for display ordering; actual order varies by family.
   */
  order: number;
  /** Traditions this entry is broadly applicable to. */
  traditions: RitualTradition[];
  /** One-line plain summary. */
  summary: string;
  /** The cultural / spiritual significance — the "why". */
  meaning: string;
  /** What actually happens, in sequence. */
  sequence: string[];
  /** Well-known regional or community variations. */
  regionalNotes?: string[];
  /** Practical prep notes families ask about. */
  practicalNotes?: string[];
  reviewStatus: ReviewStatus;
  /** Name of the pandit / scholar who reviewed, once reviewed. */
  reviewedBy?: string;
}

export const RITUAL_KB: RitualEntry[] = [
  {
    slug: "roka-tilak",
    title: "Roka / Tilak",
    aliases: ["roka", "tilak", "engagement", "shagun", "thaka"],
    phase: "pre_wedding",
    order: 10,
    traditions: ["hindu_north", "hindu_punjabi", "hindu_marwari"],
    summary:
      "The first formal commitment between the two families, marking that the match is settled.",
    meaning:
      "Roka literally means 'to stop' — both families agree to stop looking further, signalling the union is fixed. The tilak (a mark applied to the groom's forehead) is a blessing and a public acknowledgement of acceptance.",
    sequence: [
      "The bride's family visits the groom (or both families meet) with sweets, gifts, and shagun (token money).",
      "A tilak of roli/kumkum is applied to the groom's forehead, often by the bride's father or brother.",
      "Gifts, dry fruits, and sweets are exchanged; elders bless the couple.",
    ],
    regionalNotes: [
      "In Punjabi families this is often called 'Roka' or 'Thaka'; in many North Indian families the groom-side ceremony is 'Tilak'.",
      "Marwari families may hold a more elaborate 'Sagai' with extensive gifting.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "ganesh-puja",
    title: "Ganesh Puja",
    aliases: ["ganesh puja", "ganpati puja", "vighnaharta", "ganesh pooja"],
    phase: "pre_wedding",
    order: 20,
    traditions: [
      "hindu_north",
      "hindu_gujarati",
      "hindu_punjabi",
      "hindu_marwari",
      "hindu_south",
      "hindu_bengali",
    ],
    summary:
      "An opening prayer to Lord Ganesha to remove obstacles before the wedding rites begin.",
    meaning:
      "Ganesha is the remover of obstacles (Vighnaharta) and is invoked first in almost every Hindu ceremony so that the proceedings unfold without hindrance and with auspicious beginnings.",
    sequence: [
      "Performed at the start of the wedding festivities, often a few days before or on the morning of the main rites.",
      "The family, led by a pandit, offers prayers, flowers, modak/sweets, and lights a lamp.",
      "Blessings are sought for a smooth and auspicious wedding.",
    ],
    practicalNotes: [
      "Often combined with a 'mandap mahurat' or 'griha shanti' puja at home.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "haldi",
    title: "Haldi",
    aliases: ["haldi", "pithi", "ubtan", "mandha", "tel baan", "turmeric ceremony"],
    phase: "pre_wedding",
    order: 30,
    traditions: [
      "hindu_north",
      "hindu_gujarati",
      "hindu_punjabi",
      "hindu_marwari",
      "hindu_south",
    ],
    summary:
      "A turmeric paste is applied to the bride and groom for a radiant glow and protection before the wedding.",
    meaning:
      "Turmeric (haldi) is considered purifying and auspicious, believed to bless the couple, ward off the evil eye, and give the skin a bridal glow. It is also a moment of joy and play among close family.",
    sequence: [
      "A paste of turmeric, sandalwood, and oils is prepared.",
      "Family members take turns applying it to the face, arms, and feet of the bride and groom (usually at their own homes).",
      "Singing, teasing, and celebration accompany the application.",
    ],
    regionalNotes: [
      "Called 'Pithi' in Gujarati families and 'Vatna'/'Maiyan' in Punjabi families.",
      "In some communities the leftover haldi from the groom is sent to the bride and vice versa.",
    ],
    practicalNotes: [
      "Guests usually wear old or yellow clothes since turmeric stains.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "mehendi",
    title: "Mehendi",
    aliases: ["mehendi", "mehndi", "henna", "heena"],
    phase: "pre_wedding",
    order: 40,
    traditions: [
      "hindu_north",
      "hindu_gujarati",
      "hindu_punjabi",
      "hindu_marwari",
    ],
    summary:
      "Intricate henna is applied to the bride's hands and feet, surrounded by music and celebration.",
    meaning:
      "Mehendi is a symbol of love, beauty, and auspiciousness. A tradition holds that the darker the henna develops, the deeper the bond and the more the groom (or mother-in-law) will love the bride. It is also believed to be cooling and calming before the wedding.",
    sequence: [
      "A henna artist applies elaborate designs to the bride's hands and feet; the groom's initials are often hidden in the pattern.",
      "Female relatives and friends also get henna applied.",
      "Accompanied by songs, dance, and food — often a full event.",
    ],
    regionalNotes: [
      "In many families the groom also has a small amount of mehendi applied.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "sangeet",
    title: "Sangeet",
    aliases: ["sangeet", "sangeet ceremony", "ladies sangeet", "music night"],
    phase: "pre_wedding",
    order: 50,
    traditions: [
      "hindu_north",
      "hindu_gujarati",
      "hindu_punjabi",
      "hindu_marwari",
    ],
    summary:
      "A musical celebration where both families sing, dance, and perform for the couple.",
    meaning:
      "Sangeet means 'music'. Traditionally a women's gathering of folk songs celebrating the union, it has grown into a joint celebration where both families perform choreographed dances and the two sides come together in joy before the wedding.",
    sequence: [
      "Families and friends perform dances and skits, often telling the couple's story.",
      "Live music, dhol, or a DJ; dinner and celebration.",
    ],
    regionalNotes: [
      "Historically a women-only event with folk wedding songs; the modern co-ed performance night is a more recent evolution.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "baraat",
    title: "Baraat",
    aliases: ["baraat", "barat", "groom procession", "ghodi"],
    phase: "wedding_day",
    order: 60,
    traditions: [
      "hindu_north",
      "hindu_gujarati",
      "hindu_punjabi",
      "hindu_marwari",
    ],
    summary:
      "The groom's wedding procession arrives at the venue with music and dancing.",
    meaning:
      "The baraat is the groom's joyous journey to the wedding venue with his family and friends. It celebrates the groom being escorted to claim his bride, and traditionally the groom arrives on a decorated horse (ghodi).",
    sequence: [
      "The groom travels to the venue, often on a horse, in a car, or other decorated vehicle.",
      "Family and friends dance ahead of him to the dhol or a band.",
      "The procession arrives at the venue gate where the bride's family receives them.",
    ],
    regionalNotes: [
      "A young relative ('sehrabandi'/'sarbala') sometimes accompanies the groom as a protector.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "milni",
    title: "Milni",
    aliases: ["milni", "swagat", "welcome", "baraat welcome"],
    phase: "wedding_day",
    order: 70,
    traditions: ["hindu_north", "hindu_punjabi"],
    summary:
      "The formal welcome where corresponding elders of both families meet and exchange garlands.",
    meaning:
      "Milni means 'meeting'. It formally introduces and unites the two families — counterpart relatives (e.g. the two fathers, the two maternal uncles) greet each other, exchange garlands, and often gifts, symbolising the joining of the families, not just the couple.",
    sequence: [
      "The bride's family receives the baraat at the entrance with garlands and tilak.",
      "Matching relatives from both sides are introduced and garland one another.",
      "Aarti and welcome rituals are performed for the groom.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "jaimala",
    title: "Jaimala / Varmala",
    aliases: ["jaimala", "jai mala", "varmala", "var mala", "garland exchange"],
    phase: "wedding_day",
    order: 80,
    traditions: [
      "hindu_north",
      "hindu_gujarati",
      "hindu_punjabi",
      "hindu_marwari",
      "hindu_south",
    ],
    summary:
      "The bride and groom exchange flower garlands, signalling mutual acceptance.",
    meaning:
      "The exchange of garlands (varmala) is the couple's mutual acceptance of one another as partners. By garlanding each other in front of the gathering, they publicly signal consent to the union.",
    sequence: [
      "The bride and groom face each other, often on the stage.",
      "They place flower garlands around each other's necks, frequently amid playful attempts by relatives to lift the couple to make it harder.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "kanyadaan",
    title: "Kanyadaan",
    aliases: ["kanyadaan", "kanyadan", "giving away the bride"],
    phase: "wedding_day",
    order: 90,
    traditions: [
      "hindu_north",
      "hindu_gujarati",
      "hindu_marwari",
      "hindu_south",
    ],
    summary:
      "The bride's parents formally entrust their daughter to the groom.",
    meaning:
      "Kanyadaan ('gift of the daughter') is regarded as one of the most sacred acts a parent can perform. The bride's father places her hand in the groom's, entrusting her to him and his family, and the groom accepts the responsibility of her care and partnership.",
    sequence: [
      "Performed at the mandap before the sacred fire, led by the pandit.",
      "The bride's father (and mother) place the bride's hand into the groom's hand.",
      "Water and offerings are often used to seal the act.",
    ],
    practicalNotes: [
      "Some modern couples adapt or reinterpret this ritual; sensitivity to the family's wishes matters.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "havan-vivah-homa",
    title: "Havan / Vivah Homa",
    aliases: ["havan", "homa", "agni", "sacred fire", "vivah homa", "yagna"],
    phase: "wedding_day",
    order: 100,
    traditions: [
      "hindu_north",
      "hindu_gujarati",
      "hindu_punjabi",
      "hindu_marwari",
      "hindu_south",
    ],
    summary:
      "The sacred fire is lit as the divine witness to the marriage.",
    meaning:
      "Agni, the fire god, is invoked as the eternal witness to the vows. Offerings (ahuti) are made into the fire while mantras are chanted; the fire's presence makes the marriage binding and sacred in Vedic tradition.",
    sequence: [
      "The pandit kindles the sacred fire in the mandap.",
      "The couple makes offerings of ghee, grains, and other items into the fire as mantras are recited.",
      "This fire is the witness around which the pheras are taken.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "mangal-phere",
    title: "Mangal Phere / Saptapadi",
    aliases: [
      "mangal phere",
      "phere",
      "pheras",
      "saptapadi",
      "seven steps",
      "seven vows",
      "saat phere",
    ],
    phase: "wedding_day",
    order: 110,
    traditions: [
      "hindu_north",
      "hindu_gujarati",
      "hindu_punjabi",
      "hindu_marwari",
      "hindu_south",
    ],
    summary:
      "The couple circles the sacred fire, taking vows that bind them as partners.",
    meaning:
      "The pheras are circuits around the sacred fire, each accompanied by a vow. The closely related Saptapadi ('seven steps') has the couple take seven steps together, each representing a shared promise — for nourishment, strength, prosperity, happiness, family, harmony of seasons, and lifelong friendship. Completing the steps is, in many traditions, the moment the marriage becomes complete and binding.",
    sequence: [
      "The couple's garments are tied together (gathbandhan) symbolising their union.",
      "They circle the sacred fire — commonly four or seven times depending on tradition — with a vow recited at each.",
      "In the Saptapadi, seven steps are taken together, one promise per step.",
    ],
    regionalNotes: [
      "North Indian traditions often take four pheras (with the Saptapadi alongside); many Gujarati and other communities take four pheras; the exact count and order of who leads varies by community.",
      "The leading partner often changes partway — commonly the bride leads first, then the groom, with significance attached to each.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "sindoor-mangalsutra",
    title: "Sindoor & Mangalsutra",
    aliases: [
      "sindoor",
      "sindur",
      "mangalsutra",
      "mangal sutra",
      "vermilion",
      "thaali",
      "thali",
    ],
    phase: "wedding_day",
    order: 120,
    traditions: [
      "hindu_north",
      "hindu_gujarati",
      "hindu_punjabi",
      "hindu_marwari",
      "hindu_south",
    ],
    summary:
      "The groom applies sindoor and ties the mangalsutra, marking the bride as married.",
    meaning:
      "The groom applies sindoor (vermilion) in the parting of the bride's hair and ties the mangalsutra (sacred necklace) around her neck. Both are enduring symbols of a married woman's status and the couple's bond and well-being.",
    sequence: [
      "The groom places sindoor in the bride's hair parting.",
      "He ties the mangalsutra around her neck, often as mantras are recited.",
    ],
    regionalNotes: [
      "In South Indian traditions the equivalent is tying the 'thaali' / 'mangalyam', a defining moment of the ceremony.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "ashirvad",
    title: "Ashirvad",
    aliases: ["ashirvad", "aashirwad", "blessings"],
    phase: "wedding_day",
    order: 130,
    traditions: [
      "hindu_north",
      "hindu_gujarati",
      "hindu_punjabi",
      "hindu_marwari",
      "hindu_south",
    ],
    summary:
      "Elders bless the newly married couple for a long and prosperous life together.",
    meaning:
      "After the rites are complete, the couple seeks the blessings of elders and the pandit. Touching the feet of elders (pranam) and receiving akshat (rice/grains) and good wishes formally closes the sacred portion of the wedding.",
    sequence: [
      "The couple touches the feet of parents, elders, and the pandit.",
      "Elders shower grains/flowers and offer blessings and gifts.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "vidaai",
    title: "Vidaai",
    aliases: ["vidaai", "vidai", "bidaai", "doli", "farewell"],
    phase: "post_wedding",
    order: 140,
    traditions: [
      "hindu_north",
      "hindu_gujarati",
      "hindu_punjabi",
      "hindu_marwari",
    ],
    summary:
      "The emotional farewell as the bride leaves her parental home for the groom's.",
    meaning:
      "Vidaai marks the bride's departure from her childhood home to begin life with her husband's family. It is a bittersweet moment — joy for the new union mixed with the emotion of parting. The bride traditionally throws back handfuls of rice/coins over her head, a gesture of repaying and wishing prosperity on her parents' home.",
    sequence: [
      "The bride bids farewell to her family, often amid tears.",
      "She throws rice or coins back over her shoulder toward her parental home.",
      "She departs with the groom, traditionally in a decorated car (or historically a doli/palanquin).",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "griha-pravesh",
    title: "Griha Pravesh",
    aliases: ["griha pravesh", "grah pravesh", "first entry", "welcome home"],
    phase: "post_wedding",
    order: 150,
    traditions: [
      "hindu_north",
      "hindu_gujarati",
      "hindu_punjabi",
      "hindu_marwari",
    ],
    summary:
      "The bride's first entry into her new marital home.",
    meaning:
      "The bride is welcomed into the groom's home as the new Lakshmi (goddess of prosperity) of the household. She traditionally enters by knocking over a small vessel of rice with her right foot, symbolising the prosperity and abundance she brings.",
    sequence: [
      "An aarti is performed at the threshold to welcome the bride.",
      "She gently topples a kalash/vessel of rice with her right foot before stepping in.",
      "Welcome games and rituals follow to integrate her into the new home.",
    ],
    reviewStatus: "pending_pandit_review",
  },
];

export const TRADITION_LABELS: Record<RitualTradition, string> = {
  hindu_north: "North Indian Hindu",
  hindu_gujarati: "Gujarati Hindu",
  hindu_punjabi: "Punjabi Hindu",
  hindu_marwari: "Marwari Hindu",
  hindu_south: "South Indian Hindu",
  hindu_bengali: "Bengali Hindu",
};

export const PHASE_LABELS: Record<RitualPhase, string> = {
  pre_wedding: "Pre-wedding",
  wedding_day: "Wedding day",
  post_wedding: "Post-wedding",
};

/** Entries sorted by their canonical ceremony order. */
export function ritualsInOrder(): RitualEntry[] {
  return [...RITUAL_KB].sort((a, b) => a.order - b.order);
}

/**
 * Render the full KB as a compact text block for grounding the model.
 * Kept terse so it fits comfortably in the system prompt (the corpus is small).
 */
export function renderKbForPrompt(): string {
  const lines: string[] = [];
  lines.push("# Vetted ritual knowledge base");
  lines.push(
    "You may ONLY describe rituals that appear below. Each entry lists the traditions it applies to, its meaning, and its sequence.",
  );
  lines.push("");
  for (const r of ritualsInOrder()) {
    lines.push(`## ${r.title} (slug: ${r.slug})`);
    lines.push(`- phase: ${PHASE_LABELS[r.phase]}`);
    lines.push(
      `- traditions: ${r.traditions.map((t) => TRADITION_LABELS[t]).join(", ")}`,
    );
    lines.push(`- review status: ${r.reviewStatus}`);
    lines.push(`- summary: ${r.summary}`);
    lines.push(`- meaning: ${r.meaning}`);
    lines.push(`- sequence: ${r.sequence.join(" | ")}`);
    if (r.regionalNotes?.length) {
      lines.push(`- regional notes: ${r.regionalNotes.join(" | ")}`);
    }
    if (r.practicalNotes?.length) {
      lines.push(`- practical notes: ${r.practicalNotes.join(" | ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
