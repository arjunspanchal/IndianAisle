// Country calling codes for the RSVP phone field. India first, then the places
// guests most often travel from, then A to Z. The flag is drawn from the two-letter code.

export type Country = { name: string; iso: string; dial: string };

export const COUNTRIES: Country[] = [
  { name: 'India', iso: 'IN', dial: '+91' },
  { name: 'United Arab Emirates', iso: 'AE', dial: '+971' },
  { name: 'United States', iso: 'US', dial: '+1' },
  { name: 'United Kingdom', iso: 'GB', dial: '+44' },
  { name: 'Canada', iso: 'CA', dial: '+1' },
  { name: 'Australia', iso: 'AU', dial: '+61' },
  { name: 'Singapore', iso: 'SG', dial: '+65' },
  { name: 'Afghanistan', iso: 'AF', dial: '+93' },
  { name: 'Argentina', iso: 'AR', dial: '+54' },
  { name: 'Austria', iso: 'AT', dial: '+43' },
  { name: 'Bahrain', iso: 'BH', dial: '+973' },
  { name: 'Bangladesh', iso: 'BD', dial: '+880' },
  { name: 'Belgium', iso: 'BE', dial: '+32' },
  { name: 'Bhutan', iso: 'BT', dial: '+975' },
  { name: 'Brazil', iso: 'BR', dial: '+55' },
  { name: 'Cambodia', iso: 'KH', dial: '+855' },
  { name: 'Chile', iso: 'CL', dial: '+56' },
  { name: 'China', iso: 'CN', dial: '+86' },
  { name: 'Colombia', iso: 'CO', dial: '+57' },
  { name: 'Czechia', iso: 'CZ', dial: '+420' },
  { name: 'Denmark', iso: 'DK', dial: '+45' },
  { name: 'Egypt', iso: 'EG', dial: '+20' },
  { name: 'Ethiopia', iso: 'ET', dial: '+251' },
  { name: 'Fiji', iso: 'FJ', dial: '+679' },
  { name: 'Finland', iso: 'FI', dial: '+358' },
  { name: 'France', iso: 'FR', dial: '+33' },
  { name: 'Germany', iso: 'DE', dial: '+49' },
  { name: 'Ghana', iso: 'GH', dial: '+233' },
  { name: 'Greece', iso: 'GR', dial: '+30' },
  { name: 'Hong Kong', iso: 'HK', dial: '+852' },
  { name: 'Hungary', iso: 'HU', dial: '+36' },
  { name: 'Iceland', iso: 'IS', dial: '+354' },
  { name: 'Indonesia', iso: 'ID', dial: '+62' },
  { name: 'Iran', iso: 'IR', dial: '+98' },
  { name: 'Iraq', iso: 'IQ', dial: '+964' },
  { name: 'Ireland', iso: 'IE', dial: '+353' },
  { name: 'Israel', iso: 'IL', dial: '+972' },
  { name: 'Italy', iso: 'IT', dial: '+39' },
  { name: 'Japan', iso: 'JP', dial: '+81' },
  { name: 'Jordan', iso: 'JO', dial: '+962' },
  { name: 'Kenya', iso: 'KE', dial: '+254' },
  { name: 'Kuwait', iso: 'KW', dial: '+965' },
  { name: 'Lebanon', iso: 'LB', dial: '+961' },
  { name: 'Luxembourg', iso: 'LU', dial: '+352' },
  { name: 'Malaysia', iso: 'MY', dial: '+60' },
  { name: 'Maldives', iso: 'MV', dial: '+960' },
  { name: 'Mauritius', iso: 'MU', dial: '+230' },
  { name: 'Mexico', iso: 'MX', dial: '+52' },
  { name: 'Morocco', iso: 'MA', dial: '+212' },
  { name: 'Myanmar', iso: 'MM', dial: '+95' },
  { name: 'Nepal', iso: 'NP', dial: '+977' },
  { name: 'Netherlands', iso: 'NL', dial: '+31' },
  { name: 'New Zealand', iso: 'NZ', dial: '+64' },
  { name: 'Nigeria', iso: 'NG', dial: '+234' },
  { name: 'Norway', iso: 'NO', dial: '+47' },
  { name: 'Oman', iso: 'OM', dial: '+968' },
  { name: 'Pakistan', iso: 'PK', dial: '+92' },
  { name: 'Philippines', iso: 'PH', dial: '+63' },
  { name: 'Poland', iso: 'PL', dial: '+48' },
  { name: 'Portugal', iso: 'PT', dial: '+351' },
  { name: 'Qatar', iso: 'QA', dial: '+974' },
  { name: 'Romania', iso: 'RO', dial: '+40' },
  { name: 'Russia', iso: 'RU', dial: '+7' },
  { name: 'Saudi Arabia', iso: 'SA', dial: '+966' },
  { name: 'Seychelles', iso: 'SC', dial: '+248' },
  { name: 'South Africa', iso: 'ZA', dial: '+27' },
  { name: 'South Korea', iso: 'KR', dial: '+82' },
  { name: 'Spain', iso: 'ES', dial: '+34' },
  { name: 'Sri Lanka', iso: 'LK', dial: '+94' },
  { name: 'Sweden', iso: 'SE', dial: '+46' },
  { name: 'Switzerland', iso: 'CH', dial: '+41' },
  { name: 'Taiwan', iso: 'TW', dial: '+886' },
  { name: 'Tanzania', iso: 'TZ', dial: '+255' },
  { name: 'Thailand', iso: 'TH', dial: '+66' },
  { name: 'Turkey', iso: 'TR', dial: '+90' },
  { name: 'Uganda', iso: 'UG', dial: '+256' },
  { name: 'Ukraine', iso: 'UA', dial: '+380' },
  { name: 'Vietnam', iso: 'VN', dial: '+84' },
  { name: 'Zambia', iso: 'ZM', dial: '+260' },
  { name: 'Zimbabwe', iso: 'ZW', dial: '+263' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

/** 'IN' -> the Indian flag emoji. */
export function flag(iso: string): string {
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/**
 * Split a stored number such as '+971 50 123 4567' into its country and the rest.
 * A number with no code, or a code not in the list, is treated as Indian (or kept whole).
 */
export function splitPhone(phone: string): { country: Country; number: string } {
  const p = phone.trim();
  if (!p.startsWith('+')) return { country: DEFAULT_COUNTRY, number: p };
  const digits = '+' + p.slice(1).replace(/[^0-9]/g, '');
  // Longest code first, so +971 is not read as +9 or +97. Shared codes (+1) go to the first listed.
  const match = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => digits.startsWith(c.dial));
  if (!match) return { country: DEFAULT_COUNTRY, number: p };
  const first = COUNTRIES.find((c) => c.dial === match.dial) ?? match;
  let i = 1, seen = 0;
  while (i < p.length && seen < match.dial.length - 1) {
    if (/[0-9]/.test(p[i])) seen++;
    i++;
  }
  return { country: first, number: p.slice(i).trim() };
}

/** What gets saved: '+91 98200 12345', or nothing if no number was typed. */
export function joinPhone(country: Country, number: string): string {
  const n = number.trim();
  if (!n) return '';
  if (n.startsWith('+')) return n.slice(0, 24); // typed in full, with its own code
  return `${country.dial} ${n.replace(/^0+(?=[0-9])/, '')}`.slice(0, 24);
}
