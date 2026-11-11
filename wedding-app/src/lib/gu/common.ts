// Words used all over the app. Other files in this folder should use these same
// words for the same things, and should not define these keys again.
const common: Record<string, string> = {
  // the couple
  'Kashika & Arjun': 'કાશિકા અને અર્જુન',
  Kashika: 'કાશિકા',
  Arjun: 'અર્જુન',

  // buttons
  Save: 'સાચવો',
  Cancel: 'રહેવા દો',
  'Try again': 'ફરી પ્રયત્ન કરો',
  Remove: 'કાઢી નાખો',
  Delete: 'કાઢી નાખો',
  Edit: 'બદલો',
  Close: 'બંધ કરો',
  Add: 'ઉમેરો',
  Send: 'મોકલો',
  Done: 'થઈ ગયું',
  OK: 'બરાબર',
  Stop: 'રોકો',
  Undo: 'પાછું લો',
  Yes: 'હા',
  No: 'ના',
  Back: 'પાછા',
  Search: 'શોધો',
  'Coming soon': 'ટૂંક સમયમાં',

  // the five tabs and the main places
  Today: 'આજે',
  Programme: 'કાર્યક્રમ',
  Camera: 'કૅમેરા',
  Album: 'આલ્બમ',
  Chat: 'વાતચીત',
  Menus: 'મેનુ',
  Polls: 'પોલ',
  'Photo challenges': 'ફોટો ચૅલેન્જ',
  'Wishes for the couple': 'વર-વધૂ માટે શુભેચ્છા',
  'Resort map': 'રિસોર્ટનો નકશો',
  'What to wear': 'શું પહેરવું',
  RSVP: 'હાજરીનો જવાબ',

  // words that come up everywhere
  guest: 'મહેમાન',
  guests: 'મહેમાનો',
  photo: 'ફોટો',
  photos: 'ફોટા',
  resort: 'રિસોર્ટ',
  Language: 'ભાષા',
  'Event reminders': 'કાર્યક્રમ પહેલાં યાદ',
  'A notification 30 minutes before each event starts. Needs notifications turned on.':
    'દરેક કાર્યક્રમ શરૂ થાય એના 30 મિનિટ પહેલાં ફોન પર સૂચના આવશે. એના માટે નોટિફિકેશન ચાલુ હોવા જોઈએ.',

  // event reminders (lib/reminders.ts)
  '{event} in {n} minutes': '{n} મિનિટમાં {event}',
  'Wear: {what}': 'પહેરવેશ: {what}',
  'Open air': 'ખુલ્લામાં',
  Indoors: 'અંદર',
};

export default common;
