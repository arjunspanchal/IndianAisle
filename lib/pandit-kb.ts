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

/**
 * Faith / religious tradition the ceremony belongs to. Drives top-level
 * grouping on the guide and the right "officiant" language ("pandit",
 * "granthi", "qazi", "priest"). Existing Hindu entries omit this and default
 * to "hindu" via {@link ritualFaith}.
 */
export type Faith =
  | "hindu"
  | "sikh"
  | "muslim"
  | "christian"
  | "jain"
  | "interfaith";

export type RitualPhase = "pre_wedding" | "wedding_day" | "post_wedding";

export type ReviewStatus = "reviewed" | "pending_pandit_review";

export interface RitualEntry {
  /** kebab-case stable id, e.g. "haldi" */
  slug: string;
  /** Display name, e.g. "Haldi" */
  title: string;
  /** Other common names / spellings, for matching user questions. */
  aliases: string[];
  /** Faith this ceremony belongs to. Omitted ⇒ "hindu" (see {@link ritualFaith}). */
  faith?: Faith;
  phase: RitualPhase;
  /**
   * Rough ordering within the whole wedding sequence (lower = earlier).
   * Used only for display ordering; actual order varies by family.
   */
  order: number;
  /** Hindu sub-traditions this entry applies to. Omitted for non-Hindu faiths. */
  traditions?: RitualTradition[];
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

  // ───────────── Hindu — regional / community-specific ─────────────
  {
    slug: "gaye-holud",
    title: "Gaye Holud",
    aliases: ["gaye holud", "gae holud", "bengali haldi", "turmeric"],
    phase: "pre_wedding",
    order: 32,
    traditions: ["hindu_bengali"],
    summary:
      "The Bengali turmeric ceremony — haldi from the groom's home is carried to the bride and applied to her.",
    meaning:
      "Gaye Holud ('turmeric on the body') is the Bengali haldi. Turmeric paste used on the groom is traditionally carried to the bride's home and applied to her, symbolically linking the two households and blessing the couple with an auspicious glow.",
    sequence: [
      "Turmeric is first applied to the groom at his home.",
      "That turmeric, with gifts and sweets, is taken in procession to the bride.",
      "The bride is bathed in turmeric by married women of the family amid ululation (ulu dhwani).",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "subho-drishti",
    title: "Subho Drishti",
    aliases: ["subho drishti", "shubho drishti", "first look"],
    phase: "wedding_day",
    order: 82,
    traditions: ["hindu_bengali"],
    summary:
      "The auspicious first look between the Bengali bride and groom.",
    meaning:
      "In Subho Drishti the bride, carried on a low stool (pidi) and hiding her face with betel leaves, is brought before the groom. She lowers the leaves and the couple lock eyes for the first time as bride and groom — an auspicious, much-celebrated moment greeted with conch shells and ululation.",
    sequence: [
      "The bride is carried around the groom on a pidi, face covered with betel leaves.",
      "She removes the leaves and the couple share their first look.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "saat-paak",
    title: "Saat Paak & Mala Badal",
    aliases: ["saat paak", "saat pak", "mala badal", "garland exchange"],
    phase: "wedding_day",
    order: 84,
    traditions: ["hindu_bengali"],
    summary:
      "The bride circles the groom seven times, then the couple exchange garlands.",
    meaning:
      "In Saat Paak, the bride — seated on the pidi and carried by her brothers — is taken around the groom seven times, binding them together. This is followed by Mala Badal, the exchange of flower garlands three times, signifying mutual acceptance.",
    sequence: [
      "The bride is carried around the groom seven times on the pidi.",
      "The couple exchange garlands three times (Mala Badal).",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "sindoor-daan",
    title: "Sindoor Daan",
    aliases: ["sindoor daan", "sindur daan", "bengali sindoor"],
    phase: "wedding_day",
    order: 122,
    traditions: ["hindu_bengali"],
    summary:
      "The Bengali groom applies sindoor to the bride's hair parting, completing the marriage.",
    meaning:
      "Sindoor Daan is the climactic Bengali rite: the groom applies vermilion to the bride's parting, often as she is shielded by a new sari (ghomta). It marks her as a married woman and, for many families, completes the wedding.",
    sequence: [
      "The groom applies sindoor to the bride's hair parting.",
      "The bride is then covered with a new sari (lajja bastra).",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "kashi-yatra",
    title: "Kashi Yatra",
    aliases: ["kashi yatra", "kasi yatra", "mock pilgrimage"],
    phase: "wedding_day",
    order: 86,
    traditions: ["hindu_south"],
    summary:
      "A playful South Indian rite where the groom 'sets off' to renounce the world and is coaxed back to marry.",
    meaning:
      "In Kashi Yatra the groom mock-pretends to give up worldly life and leave for Kashi (Varanasi) as an ascetic. The bride's father intercepts him and persuades him that married householder life (grihastha) is the nobler path — a charming, light-hearted moment before the wedding proper.",
    sequence: [
      "The groom 'departs' with an umbrella, slippers, and a staff.",
      "The bride's father stops him and invites him to marry his daughter; the groom returns.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "oonjal",
    title: "Oonjal",
    aliases: ["oonjal", "unjal", "swing ceremony"],
    phase: "wedding_day",
    order: 88,
    traditions: ["hindu_south"],
    summary:
      "The couple is seated on a decorated swing as women sing and ward off the evil eye.",
    meaning:
      "In the Oonjal, the bride and groom sit on a gently swaying swing while married women sing songs, feed them milk and fruit, and circle lamps and coloured rice to protect them from the evil eye. The swing's motion is said to represent the steady ups and downs of life the couple will face together.",
    sequence: [
      "The couple sit on the swing; women sing traditional songs.",
      "Lamps and coloured rice balls are circled around them and cast away to ward off ill fortune.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "mangalya-dharanam",
    title: "Mangalya Dharanam",
    aliases: ["mangalya dharanam", "thaali", "thali", "mangalsutra", "mangalyam"],
    phase: "wedding_day",
    order: 124,
    traditions: ["hindu_south"],
    summary:
      "The South Indian tying of the thaali (sacred marriage thread/pendant) around the bride's neck.",
    meaning:
      "Mangalya Dharanam is the defining moment of a South Indian wedding: to the sound of auspicious music (getti melam), the groom ties the thaali / mangalyam around the bride's neck with three knots, while the gathering showers blessings. It is the equivalent of the mangalsutra and seals the marriage.",
    sequence: [
      "Auspicious 'getti melam' music is played to drown out any inauspicious sound.",
      "The groom ties the thaali with three knots; elders shower akshata (rice).",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "talambralu",
    title: "Talambralu",
    aliases: ["talambralu", "talabralu", "rice ceremony"],
    phase: "wedding_day",
    order: 126,
    traditions: ["hindu_south"],
    summary:
      "A joyful Telugu ritual where the couple shower each other with turmeric-coated rice.",
    meaning:
      "In Talambralu, the newly married Telugu couple pour handfuls of pearls of turmeric-and-saffron rice over each other's heads. It is a playful celebration of happiness, prosperity, and fertility — and often turns into a delightful friendly contest.",
    sequence: [
      "The couple are given heaps of turmeric rice (sometimes mixed with pearls and coins).",
      "They shower it over each other amid laughter and cheering.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "chooda-kalire",
    title: "Chooda & Kalire",
    aliases: ["chooda", "chura", "choodha", "kalire", "kaleere", "bridal bangles"],
    phase: "pre_wedding",
    order: 45,
    traditions: ["hindu_punjabi"],
    summary:
      "The bride's maternal uncle gifts her red-and-white bangles; friends tie golden kalire to them.",
    meaning:
      "In Punjabi weddings the bride's mama (maternal uncle) and his wife present the chooda — a set of red and ivory bangles — which the bride wears for the wedding and after. Friends and sisters then tie kalire (dome-shaped golden ornaments) to the bangles; a tradition holds that whoever a falling kalira touches will marry next.",
    sequence: [
      "The maternal uncle puts the chooda bangles on the bride, who traditionally doesn't look at them yet.",
      "Unmarried friends tie kalire to the chooda and the bride shakes them over their heads.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "joota-chupai",
    title: "Joota Chupai",
    aliases: ["joota chupai", "juta chupai", "jutti chupai", "hiding shoes", "joote churai"],
    phase: "wedding_day",
    order: 115,
    traditions: ["hindu_north", "hindu_punjabi"],
    summary:
      "The bride's sisters steal the groom's shoes and ransom them back — a beloved bit of wedding fun.",
    meaning:
      "When the groom removes his shoes to enter the mandap, the bride's sisters and cousins (saaliyan) hide them. After the rites they negotiate a playful ransom (neg) to return them — a light-hearted contest that bonds the two families and is one of the most-loved moments of a North Indian wedding.",
    sequence: [
      "The groom takes off his shoes for the mandap; the bride's side hides them.",
      "After the ceremony, the sisters bargain a cash ransom to return the shoes.",
    ],
    reviewStatus: "pending_pandit_review",
  },

  {
    slug: "jeelakarra-bellam",
    title: "Jeelakarra Bellam",
    aliases: ["jeelakarra bellam", "jilakarra bellam", "cumin jaggery"],
    phase: "wedding_day",
    order: 89,
    traditions: ["hindu_south"],
    summary:
      "A defining Telugu moment — the couple place a paste of cumin and jaggery on each other's heads.",
    meaning:
      "At the auspicious instant (muhurat), the Telugu bride and groom each place a paste of jeelakarra (cumin) and bellam (jaggery) on the other's head. The bitter-and-sweet mix symbolises a bond that holds firm through life's bitter and sweet times alike — inseparable, like the two ingredients.",
    sequence: [
      "A curtain (often) separates the couple until the muhurat.",
      "At the chosen moment they place the cumin-jaggery paste on each other's heads as priests chant.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "antarpat",
    title: "Antarpat & Mangalashtak",
    aliases: ["antarpat", "antarpaat", "mangalashtak", "maharashtrian wedding"],
    phase: "wedding_day",
    order: 95,
    traditions: ["hindu_marwari"],
    summary:
      "A Maharashtrian rite — a curtain between the couple drops as the Mangalashtak verses end and they garland each other.",
    meaning:
      "In a Maharashtrian wedding the antarpat (a decorative curtain) is held between the bride and groom while priests and guests recite the Mangalashtak — auspicious wedding verses. On the final 'shubh mangal saavadhan', the curtain is lowered and the couple garland each other, married at that instant.",
    sequence: [
      "The couple stand facing each other, separated by the antarpat.",
      "Mangalashtak verses are chanted; on the final line the curtain drops and garlands are exchanged amid rice showers.",
    ],
    regionalNotes: [
      "This entry describes Maharashtrian practice; community customs vary.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "ponkvu",
    title: "Ponkhvu",
    aliases: ["ponkvu", "ponkhvu", "ponkhana", "gujarati welcome"],
    phase: "wedding_day",
    order: 72,
    traditions: ["hindu_gujarati"],
    summary:
      "The Gujarati welcome where the bride's mother greets and playfully 'grabs the nose' of the groom.",
    meaning:
      "When the groom arrives, the bride's mother performs an aarti and welcomes him. In a much-loved playful moment she pulls his nose — a humbling reminder that he has come to ask for her daughter's hand. The groom then tries to enter while the bride's sisters tease and bar the way.",
    sequence: [
      "The bride's mother does the groom's aarti and ceremonially tugs his nose.",
      "Playful negotiations with the bride's sisters precede his entry to the mandap.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "madhuparka",
    title: "Madhuparka",
    aliases: ["madhuparka", "madhupark", "honey offering"],
    phase: "wedding_day",
    order: 74,
    traditions: ["hindu_gujarati", "hindu_north", "hindu_south"],
    summary:
      "The groom is honoured as an esteemed guest with a drink of honey, yoghurt and ghee.",
    meaning:
      "In the Madhuparka, the bride's father receives the groom as a revered guest and offers him a ceremonial mixture — typically honey, yoghurt, and ghee — along with new garments. It expresses the high regard in which the groom and his family are held as the marriage begins.",
    sequence: [
      "The groom is seated and welcomed by the bride's father.",
      "He is offered the madhuparka mixture and gifts of clothing.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "aeki-beki",
    title: "Aeki Beki",
    aliases: ["aeki beki", "ekibeki", "ring game", "kankan games"],
    phase: "post_wedding",
    order: 145,
    traditions: ["hindu_gujarati", "hindu_north"],
    summary:
      "A playful post-wedding game where the newlyweds search a tray of milk for a ring.",
    meaning:
      "Aeki Beki is a light-hearted game played after the wedding: a ring (and coins) are dropped into a tray of milk coloured with vermilion and flowers, and the couple compete to find the ring. Tradition teases that whoever wins more rounds will 'rule the household' — a fun ice-breaker between the newlyweds and families.",
    sequence: [
      "A ring is hidden in a tray of opaque coloured milk.",
      "The couple race to retrieve it over several rounds amid much cheering.",
    ],
    reviewStatus: "pending_pandit_review",
  },

  // ───────────────────────── Sikh (Anand Karaj) ─────────────────────────
  {
    slug: "chunni-chadana",
    title: "Chunni Chadana",
    aliases: ["chunni chadana", "chunni chadayi", "chunni ceremony"],
    faith: "sikh",
    phase: "pre_wedding",
    order: 210,
    summary:
      "The groom's family welcomes the bride into their family with gifts and a chunni (veil).",
    meaning:
      "The groom's mother and female relatives visit the bride, drape a red chunni over her head, and present her with jewellery, sweets, and outfits — formally accepting her as a daughter of their family.",
    sequence: [
      "The groom's family arrives at the bride's home with gifts and sweets.",
      "The groom's mother drapes a chunni over the bride and applies a tilak or feeds her something sweet.",
      "Jewellery and outfits are presented; blessings are exchanged.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "maiyan-sikh",
    title: "Maiyan / Vatna",
    aliases: ["maiyan", "vatna", "sikh haldi", "turmeric"],
    faith: "sikh",
    phase: "pre_wedding",
    order: 215,
    summary:
      "A turmeric paste (vatna) is applied to the bride and groom at their own homes before the wedding.",
    meaning:
      "Like the haldi in Hindu weddings, the vatna is applied for an auspicious glow and to bless the couple. From this point the bride and groom traditionally stay home until the wedding day.",
    sequence: [
      "A paste of turmeric, flour, and mustard oil is applied by relatives.",
      "Often accompanied by the singing of traditional boliyan and ghorian.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "milni-sikh",
    title: "Milni (Sikh)",
    aliases: ["sikh milni", "milni"],
    faith: "sikh",
    phase: "wedding_day",
    order: 220,
    summary:
      "The two families formally meet at the Gurdwara before the Anand Karaj, beginning with Ardas.",
    meaning:
      "The Milni ('meeting') unites the two families. It opens with an Ardas (prayer), then counterpart elders from each side meet, embrace, and exchange garlands and gifts — the families joining before the marriage itself.",
    sequence: [
      "Families gather at the Gurdwara in the morning, often over tea and breakfast.",
      "An Ardas is offered, then matching relatives are introduced and garland one another.",
      "Everyone then enters the main hall for the Anand Karaj.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "anand-karaj",
    title: "Anand Karaj (Laavan)",
    aliases: ["anand karaj", "laavan", "lavan", "phere", "sikh wedding", "four rounds"],
    faith: "sikh",
    phase: "wedding_day",
    order: 230,
    summary:
      "The Sikh marriage ceremony — the couple takes four rounds around the Guru Granth Sahib as the Laavan hymns are sung.",
    meaning:
      "Anand Karaj means 'blissful union'. The marriage centres on the Guru Granth Sahib, the Sikh holy scripture and eternal Guru. The four Laavan (composed by Guru Ram Das) are read and sung in turn; with each, the couple circles the Guru Granth Sahib, the bride following the groom holding a palla (scarf). The four rounds describe the soul's journey toward union with the Divine, with marriage as a path of mutual love and spiritual growth.",
    sequence: [
      "The couple and families sit before the Guru Granth Sahib; an Ardas and the groom's palla are given to the bride.",
      "Each of the four Laavan is first read, then sung by the ragis while the couple slowly circles the Guru Granth Sahib.",
      "After the fourth Laav the couple is married; the ceremony closes with Anand Sahib, Ardas, a Hukamnama (random reading), and Kara Parshad.",
    ],
    regionalNotes: [
      "There is no sacred fire and no walking around a flame — the circling is around the Guru Granth Sahib only.",
      "Performed in the morning, as the Anand Karaj is traditionally completed before noon.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "doli-sikh",
    title: "Doli (Sikh farewell)",
    aliases: ["doli", "sikh vidaai", "farewell"],
    faith: "sikh",
    phase: "post_wedding",
    order: 240,
    summary:
      "The bride's emotional departure to the groom's home after the Anand Karaj.",
    meaning:
      "As in other traditions, the Doli marks the bride leaving her parental home. She traditionally throws phulian (puffed rice) over her shoulder, a gesture of gratitude and prosperity for the home she leaves behind.",
    sequence: [
      "The bride bids farewell to her family.",
      "She tosses phulian back toward her parents' home and departs with the groom.",
    ],
    reviewStatus: "pending_pandit_review",
  },

  // ───────────────────────── Muslim (Nikah) ─────────────────────────
  {
    slug: "mangni",
    title: "Mangni",
    aliases: ["mangni", "engagement", "mehfil"],
    faith: "muslim",
    phase: "pre_wedding",
    order: 310,
    summary:
      "The formal engagement where the couple exchanges rings and the families agree to the union.",
    meaning:
      "The Mangni is the public commitment between the two families. Rings are often exchanged and gifts presented, marking the couple as betrothed ahead of the Nikah.",
    sequence: [
      "Both families gather; rings are exchanged and the bride receives gifts and sweets.",
      "A date for the Nikah is often settled at this gathering.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "mehndi-muslim",
    title: "Mehndi (Muslim)",
    aliases: ["mehndi", "mehadi", "henna night"],
    faith: "muslim",
    phase: "pre_wedding",
    order: 315,
    summary:
      "A festive henna celebration, traditionally held separately by the bride's and groom's families.",
    meaning:
      "Henna is applied to the bride amid music, sweets, and celebration as a symbol of joy, beauty, and blessings for the marriage.",
    sequence: [
      "The bride's hands and feet are decorated with intricate henna.",
      "Female relatives sing and dance; the groom's side often sends mehndi and gifts.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "nikah",
    title: "Nikah",
    aliases: ["nikah", "nikkah", "marriage contract", "ijab qubool"],
    faith: "muslim",
    phase: "wedding_day",
    order: 320,
    summary:
      "The Islamic marriage contract — the couple consents before witnesses and the Nikahnama is signed.",
    meaning:
      "The Nikah is a sacred contract of mutual consent. Officiated by a qazi or imam, it centres on the proposal and acceptance (Ijab-o-Qubool), the agreed Mahr (a gift/sum the groom gives the bride as her right), and the signing of the Nikahnama before witnesses. Consent freely given by both parties is essential.",
    sequence: [
      "The qazi/imam explains the terms and the Mahr is agreed.",
      "The proposal and acceptance (Ijab-o-Qubool) are made — traditionally affirmed three times.",
      "The Nikahnama is signed by the couple and witnesses; prayers and blessings (often including a Khutbah) follow.",
    ],
    regionalNotes: [
      "Practices and the degree of separation between men's and women's gatherings vary by community and family.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "rukhsati",
    title: "Rukhsati",
    aliases: ["rukhsati", "rukhsat", "vidaai", "farewell"],
    faith: "muslim",
    phase: "post_wedding",
    order: 330,
    summary:
      "The bride's farewell as she departs with the groom after the Nikah.",
    meaning:
      "The Rukhsati is the emotional moment the bride leaves her family's home to begin life with her husband. Elders offer prayers for the couple's happiness and protection.",
    sequence: [
      "After the Nikah, the bride bids farewell to her family.",
      "A Quran is often held over her head as she departs, as a blessing.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "walima",
    title: "Walima",
    aliases: ["walima", "valima", "reception"],
    faith: "muslim",
    phase: "post_wedding",
    order: 335,
    summary:
      "The reception feast hosted by the groom's family to celebrate the marriage publicly.",
    meaning:
      "The Walima is the feast given by the groom's family after the marriage is consummated, to announce and celebrate the union with the wider community. It is a Sunnah (recommended practice) and an occasion of generosity and joy.",
    sequence: [
      "The groom's family hosts a meal for relatives, friends, and the community.",
      "The newly married couple is introduced and blessed by guests.",
    ],
    reviewStatus: "pending_pandit_review",
  },

  // ───────────────────────── Christian (Indian) ─────────────────────────
  {
    slug: "christian-engagement",
    title: "Engagement / Roce",
    aliases: ["engagement", "roce", "ros", "betrothal"],
    faith: "christian",
    phase: "pre_wedding",
    order: 410,
    summary:
      "The betrothal, and (in Goan/Mangalorean Catholic families) the Roce anointing the night before.",
    meaning:
      "The engagement formalises the couple's intent to marry, often with a blessing and ring exchange. In Goan and Mangalorean Catholic tradition, the Roce ceremony anoints the bride and groom with coconut milk the day before the wedding — a symbol of purification and the last ritual of their single life.",
    sequence: [
      "At the engagement, rings are exchanged and the families and priest bless the couple.",
      "At the Roce, family members apply coconut milk to the bride and groom amid singing.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "christian-wedding-ceremony",
    title: "The Wedding Ceremony",
    aliases: ["wedding mass", "church wedding", "vows", "ring exchange", "nuptials"],
    faith: "christian",
    phase: "wedding_day",
    order: 420,
    summary:
      "The church service where the couple exchange vows and rings before God and the congregation.",
    meaning:
      "The heart of a Christian wedding is the exchange of vows — solemn promises of love and faithfulness 'till death do us part' — and the giving of rings as an unending symbol of that covenant. For Catholics this takes place within a Nuptial Mass; the priest or pastor officiates and the congregation witnesses.",
    sequence: [
      "The bride is walked down the aisle, often by her father.",
      "Scripture readings, a homily, and the declaration of consent.",
      "The couple exchange vows and rings; the priest/pastor pronounces them married and offers the nuptial blessing.",
      "Signing of the marriage register.",
    ],
    regionalNotes: [
      "Catholic ceremonies are typically a full Nuptial Mass; Protestant services centre on the vows and blessing without the Mass.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "christian-reception",
    title: "Reception & Toast",
    aliases: ["reception", "toast", "wedding breakfast", "cake cutting"],
    faith: "christian",
    phase: "post_wedding",
    order: 430,
    summary:
      "The celebration after the ceremony — cake, toasts, the first dance, and feasting.",
    meaning:
      "The reception welcomes the couple as newlyweds into the community's celebration. Customs include the cutting of the wedding cake, speeches and toasts to the couple, and the couple's first dance.",
    sequence: [
      "Guests are welcomed; the couple is introduced.",
      "Toasts and speeches, cake cutting, first dance, and dinner.",
    ],
    reviewStatus: "pending_pandit_review",
  },

  // ───────────────────────── Jain ─────────────────────────
  {
    slug: "jain-sagai",
    title: "Sagai (Jain)",
    aliases: ["sagai", "jain engagement", "lagna lekhan"],
    faith: "jain",
    phase: "pre_wedding",
    order: 510,
    summary:
      "The Jain engagement and fixing of the auspicious wedding date (Lagna Lekhan).",
    meaning:
      "The Sagai formalises the betrothal; the Lagna Lekhan records the chosen muhurat for the wedding. Jain ceremonies open with the Navkar Mantra, invoking reverence to the enlightened beings before any auspicious undertaking.",
    sequence: [
      "Families exchange gifts and sweets; the groom may receive a tilak.",
      "The wedding date and details are formally recorded.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "jain-vivah-pheras",
    title: "Vivah & Pheras (Jain)",
    aliases: ["jain wedding", "jain pheras", "granthi bandhan", "phera"],
    faith: "jain",
    phase: "wedding_day",
    order: 520,
    summary:
      "The Jain marriage rites — the couple's garments are knotted and they take vows around the sacred fire.",
    meaning:
      "The Jain vivah shares much of its structure with other Indian weddings but is framed by Jain values of non-violence (ahimsa) and restraint, and opens with the Navkar Mantra. The Granthi Bandhan ties the couple's garments together, and the pheras (circuits, accompanied by vows) around the sacred fire bind them as partners committed to a righteous shared life.",
    sequence: [
      "The ceremony begins with the Navkar Mantra and worship.",
      "Kanyavaran / Hastamelap — the giving and joining of hands.",
      "Granthi Bandhan ties the couple's garments; they take the pheras with vows around the sacred fire.",
      "Blessings from elders and the wider family conclude the rites.",
    ],
    regionalNotes: [
      "Details vary between Digambar and Shvetambar traditions and by region; many customs overlap with local Hindu practice.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "jain-vidai",
    title: "Vidai (Jain)",
    aliases: ["jain vidai", "vidaai", "farewell"],
    faith: "jain",
    phase: "post_wedding",
    order: 530,
    summary:
      "The bride's farewell to her family after the Jain wedding rites.",
    meaning:
      "As in other traditions, the Vidai marks the bride's departure for her new home, accompanied by the family's prayers and good wishes for the couple's life together.",
    sequence: [
      "The bride bids an emotional farewell to her family.",
      "She departs with the groom amid blessings.",
    ],
    reviewStatus: "pending_pandit_review",
  },

  // ───────────────────────── Interfaith (guidance) ─────────────────────────
  {
    slug: "interfaith-overview",
    title: "Planning an Interfaith Wedding",
    aliases: ["interfaith", "interfaith wedding", "mixed faith", "two ceremonies"],
    faith: "interfaith",
    phase: "pre_wedding",
    order: 610,
    summary:
      "How couples from two traditions can honour both faiths respectfully in their wedding.",
    meaning:
      "Interfaith weddings celebrate two heritages at once. The guiding principle is respect — giving each tradition genuine space rather than diluting either. Couples commonly choose between two distinct ceremonies (often on separate days) or a single blended ceremony with elements from both, and they involve officiants and elders from each side early so everyone feels honoured.",
    sequence: [
      "Talk with both families and officiants early about what each tradition considers essential.",
      "Decide on the format: two separate ceremonies, or one thoughtfully blended ceremony.",
      "Sequence and label each ritual clearly so guests from both sides can follow along.",
    ],
    practicalNotes: [
      "A printed program explaining each ritual helps guests unfamiliar with the other tradition feel included.",
      "Some religious bodies have rules about officiating interfaith marriages — confirm with each officiant early.",
    ],
    reviewStatus: "pending_pandit_review",
  },
  {
    slug: "interfaith-officiants",
    title: "Working with Two Officiants",
    aliases: ["two officiants", "co-officiating", "interfaith officiant"],
    faith: "interfaith",
    phase: "wedding_day",
    order: 620,
    summary:
      "Coordinating officiants from each faith so both ceremonies flow with dignity.",
    meaning:
      "When each tradition has its own officiant — say a pandit and a priest, or a granthi and a qazi — a little coordination lets each lead their portion fully while the whole day feels like one celebration rather than two stitched together.",
    sequence: [
      "Brief both officiants on the full running order and timings in advance.",
      "Give each officiant uninterrupted space to lead their rites in full.",
      "Use a shared compere or program to bridge between the two portions for guests.",
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

export const FAITH_LABELS: Record<Faith, string> = {
  hindu: "Hindu",
  sikh: "Sikh",
  muslim: "Muslim",
  christian: "Christian",
  jain: "Jain",
  interfaith: "Interfaith",
};

/** Short description shown under each faith heading. */
export const FAITH_BLURBS: Record<Faith, string> = {
  hindu: "Mehendi, haldi, the sacred fire and the seven pheras.",
  sikh: "The Anand Karaj and the four Laavan around the Guru Granth Sahib.",
  muslim: "The Nikah contract, Mehndi, Walima and more.",
  christian: "Church vows, ring exchange and the nuptial blessing.",
  jain: "Jain vivah rites framed by ahimsa and the Navkar Mantra.",
  interfaith: "Honouring two traditions in one celebration.",
};

/** Who reviews / officiates this faith's rites — used for honest, faith-neutral copy. */
export const FAITH_OFFICIANT: Record<Faith, string> = {
  hindu: "pandit",
  sikh: "granthi",
  muslim: "qazi or imam",
  christian: "priest or pastor",
  jain: "Jain scholar",
  interfaith: "officiant",
};

/** Display order of faiths on the guide. */
export const FAITH_ORDER: Faith[] = [
  "hindu",
  "sikh",
  "muslim",
  "christian",
  "jain",
  "interfaith",
];

/** The faith of an entry, defaulting Hindu when unspecified. */
export function ritualFaith(r: RitualEntry): Faith {
  return r.faith ?? "hindu";
}

export const PHASE_LABELS: Record<RitualPhase, string> = {
  pre_wedding: "Pre-wedding",
  wedding_day: "Wedding day",
  post_wedding: "Post-wedding",
};

/** Entries sorted by their canonical ceremony order. */
export function ritualsInOrder(): RitualEntry[] {
  return [...RITUAL_KB].sort((a, b) => a.order - b.order);
}

/** Look up a single ritual by its slug. */
export function getRitual(slug: string): RitualEntry | undefined {
  return RITUAL_KB.find((r) => r.slug === slug);
}

/** All ritual slugs — for static generation and sitemaps. */
export function allRitualSlugs(): string[] {
  return RITUAL_KB.map((r) => r.slug);
}

/** Rituals for a given faith, in canonical order. */
export function ritualsForFaith(faith: Faith): RitualEntry[] {
  return ritualsInOrder().filter((r) => ritualFaith(r) === faith);
}

/** Faiths that actually have at least one entry, in display order. */
export function faithsWithEntries(): Faith[] {
  return FAITH_ORDER.filter((f) => ritualsForFaith(f).length > 0);
}

/** A serializable item for the client-side checklist tool. */
export interface ChecklistItem {
  slug: string;
  title: string;
  summary: string;
  phase: RitualPhase;
  phaseLabel: string;
}

/** A flat, serializable search index for the client search box. */
export interface SearchItem {
  slug: string;
  title: string;
  summary: string;
  faithLabel: string;
  aliases: string[];
}

export function searchIndex(): SearchItem[] {
  return ritualsInOrder().map((r) => ({
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    faithLabel: FAITH_LABELS[ritualFaith(r)],
    aliases: r.aliases,
  }));
}

/** Faith → its rituals, as a plain serializable structure for client components. */
export function checklistData(): {
  faith: Faith;
  label: string;
  items: ChecklistItem[];
}[] {
  return faithsWithEntries().map((faith) => ({
    faith,
    label: FAITH_LABELS[faith],
    items: ritualsForFaith(faith).map((r) => ({
      slug: r.slug,
      title: r.title,
      summary: r.summary,
      phase: r.phase,
      phaseLabel: PHASE_LABELS[r.phase],
    })),
  }));
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
    lines.push(`- faith: ${FAITH_LABELS[ritualFaith(r)]}`);
    lines.push(`- phase: ${PHASE_LABELS[r.phase]}`);
    if (r.traditions?.length) {
      lines.push(
        `- traditions: ${r.traditions.map((t) => TRADITION_LABELS[t]).join(", ")}`,
      );
    }
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
