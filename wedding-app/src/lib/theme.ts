// "The January Garden" — the locked look of Kashika & Arjun's wedding.
// Tokens mirror assets/wedding-system.css in the wedding folder.

export const colors = {
  paper: '#FCFAF5',
  card: '#FFFEFA',
  ink: '#424D35',
  muted: '#6D705F',
  olive: '#889B60',
  rose: '#AA4E6D',
  gold: '#B89451',
  blush: '#F5E9E8',
  moss: '#E7EBDC',
  sage: '#EDF0E5',
  line: '#E6E1D3',
  camera: '#2F3727',
  // The one colour outside the January Garden palette: reserved for SOS so it can't be mistaken for decoration.
  sos: '#B3261E',
  white: '#FFFFFF',
};

export const fonts = {
  display: 'CormorantGaramond_400Regular',
  displayMedium: 'CormorantGaramond_500Medium',
  displayItalic: 'CormorantGaramond_500Medium_Italic',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_600SemiBold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

// Facts from wedding.json. Never invent anything here.
export const wedding = {
  couple: 'Kashika & Arjun',
  first: 'Kashika',
  second: 'Arjun',
  tagline: 'A wedding in the hills',
  eyebrow: 'Together with our families',
  dates: '17 — 19 January 2027',
  venue: 'Storii by ITC Hotels, Akanni Naina Tikkar',
  address: 'Village Thalpa, P.O. Nainatikkar, Teh. Pachad, District Sirmaur, Himachal Pradesh 173229',
  gettingThere: 'About two hours by road from Chandigarh. Shared transfers between Chandigarh and the resort are being arranged.',
  mapsUrl: 'https://maps.app.goo.gl/8PGmgLn5egWBbzAJ6?g_st=ic',
  siteUrl: 'https://kashika-arjun.com',
  firstDay: '2027-01-17',
  startsAt: '2027-01-17T11:00:00+05:30',
  dayNames: ['The warm welcome', 'The forever day', 'The sweetest goodbye'],
  // Each day's line from the wedding website.
  dayLines: [
    'A lot of turmeric. A lot of dancing. And a very late \u201cgoodnight.\u201d',
    'Bring a shawl for the evening, and your whole heart.',
    'One more coffee. One more hug.',
  ],
  // Shown until the hosts add what to wear for each event (wording from the website).
  dressInterim: 'We\u2019ll share what to wear for each event by 15 December. For now, pack warm layers and a shawl: evenings in the hills get close to freezing.',
};
