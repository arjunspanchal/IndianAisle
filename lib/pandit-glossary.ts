import "server-only";

/**
 * Glossary of Indian wedding terms. Plain, mainstream definitions — kept short
 * and faith-aware. `ritualSlug` links a term to its full entry in the KB when
 * one exists. Like the KB, this is helpful-but-under-review content.
 */
export interface GlossaryTerm {
  term: string;
  definition: string;
  /** Slug of a related ritual in the KB, if any. */
  ritualSlug?: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: "Ahimsa", definition: "Non-violence — a core Jain (and broader Indian) value that shapes Jain wedding customs." },
  { term: "Anand Karaj", definition: "The Sikh marriage ceremony, meaning 'blissful union', performed before the Guru Granth Sahib.", ritualSlug: "anand-karaj" },
  { term: "Baraat", definition: "The groom's festive wedding procession to the venue, traditionally on a horse.", ritualSlug: "baraat" },
  { term: "Chunni", definition: "A long scarf or veil; in the Chunni Chadana the groom's family drapes one over the bride to welcome her.", ritualSlug: "chunni-chadana" },
  { term: "Doli", definition: "The bride's departure after a Sikh wedding; historically the palanquin she left in.", ritualSlug: "doli-sikh" },
  { term: "Gathbandhan", definition: "The knotting together of the couple's garments before they circle the sacred fire.", ritualSlug: "mangal-phere" },
  { term: "Granthi", definition: "A Sikh who reads from and cares for the Guru Granth Sahib; often officiates the Anand Karaj." },
  { term: "Griha Pravesh", definition: "The bride's ceremonial first entry into her new marital home.", ritualSlug: "griha-pravesh" },
  { term: "Haldi", definition: "Pre-wedding ritual applying turmeric paste to the couple for an auspicious glow.", ritualSlug: "haldi" },
  { term: "Havan", definition: "The sacred fire ritual; offerings are made into Agni, the divine witness to the marriage.", ritualSlug: "havan-vivah-homa" },
  { term: "Ijab-o-Qubool", definition: "The proposal and acceptance at the heart of a Nikah — mutual consent freely given.", ritualSlug: "nikah" },
  { term: "Jaimala", definition: "The exchange of flower garlands by which the couple publicly accept one another.", ritualSlug: "jaimala" },
  { term: "Kanyadaan", definition: "The sacred 'giving away' of the daughter by her parents to the groom.", ritualSlug: "kanyadaan" },
  { term: "Kara Parshad", definition: "Blessed sweet offering shared with the congregation at the close of a Sikh ceremony." },
  { term: "Laavan", definition: "The four hymns sung during the Anand Karaj, one for each circuit around the Guru Granth Sahib.", ritualSlug: "anand-karaj" },
  { term: "Mahr", definition: "A gift or sum the groom gives the bride as her right, agreed as part of the Nikah.", ritualSlug: "nikah" },
  { term: "Mandap", definition: "The canopied structure under which Hindu (and Jain) wedding rites are performed." },
  { term: "Mangalsutra", definition: "The sacred necklace the groom ties around the bride, a symbol of the marriage.", ritualSlug: "sindoor-mangalsutra" },
  { term: "Mehendi", definition: "The application of intricate henna to the bride, amid music and celebration.", ritualSlug: "mehendi" },
  { term: "Milni", definition: "The formal meeting and greeting of the two families before the wedding.", ritualSlug: "milni" },
  { term: "Muhurat", definition: "An auspicious date and time chosen for the wedding or a specific ritual." },
  { term: "Navkar Mantra", definition: "The central Jain prayer of reverence, recited at the start of auspicious occasions." },
  { term: "Nikah", definition: "The Islamic marriage contract, centred on consent, the Mahr, and the Nikahnama.", ritualSlug: "nikah" },
  { term: "Nikahnama", definition: "The written marriage contract signed by the couple and witnesses at a Nikah.", ritualSlug: "nikah" },
  { term: "Pheras", definition: "The circuits the couple takes around the sacred fire, each with a vow.", ritualSlug: "mangal-phere" },
  { term: "Qazi", definition: "An Islamic judge or scholar who commonly officiates a Nikah (also an imam)." },
  { term: "Roce", definition: "A Goan/Mangalorean Catholic ceremony anointing the couple with coconut milk before the wedding.", ritualSlug: "christian-engagement" },
  { term: "Rukhsati", definition: "The bride's emotional farewell as she leaves with the groom after the Nikah.", ritualSlug: "rukhsati" },
  { term: "Sangeet", definition: "A musical celebration where both families sing and dance for the couple.", ritualSlug: "sangeet" },
  { term: "Saptapadi", definition: "The 'seven steps' the couple takes together, each a shared promise.", ritualSlug: "mangal-phere" },
  { term: "Sindoor", definition: "Vermilion the groom applies to the bride's hair parting, a mark of marriage.", ritualSlug: "sindoor-mangalsutra" },
  { term: "Tilak", definition: "An auspicious mark applied to the forehead, often part of engagement and welcome rites.", ritualSlug: "roka-tilak" },
  { term: "Vidaai", definition: "The bride's tearful farewell as she leaves her parental home.", ritualSlug: "vidaai" },
  { term: "Walima", definition: "The reception feast hosted by the groom's family after a Muslim wedding.", ritualSlug: "walima" },
];

/** Glossary sorted alphabetically by term. */
export function glossaryAlphabetical(): GlossaryTerm[] {
  return [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
}
