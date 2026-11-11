// Gujarati for the way in and the Today screen: app/join.tsx, app/(tabs)/_layout.tsx,
// app/(tabs)/index.tsx, plus the shared helpers lib/time.ts, lib/dialog.ts and the
// error messages in lib/api.ts. Keyed by the exact English text.
//
// The tab names, Cancel / OK / Try again and the five shortcut tiles live in common.ts.
// "Your full name" comes from site.ts.
const home: Record<string, string> = {
  // ── facts from lib/theme.ts (the hotel's name and the postal address stay in English) ──
  'Together with our families': 'અમારા પરિવારો સાથે મળીને',
  'A wedding in the hills': 'પહાડોમાં લગ્ન',
  '17 — 19 January 2027': '17 — 19 જાન્યુઆરી 2027',
  'About two hours by road from Chandigarh. Shared transfers between Chandigarh and the resort are being arranged.':
    'ચંડીગઢથી રસ્તે આશરે બે કલાક. ચંડીગઢ અને રિસોર્ટ વચ્ચે આવવા-જવા માટે બધાની સહિયારી ગાડીઓની વ્યવસ્થા થઈ રહી છે.',
  'The warm welcome': 'હૂંફાળો આવકાર',
  'The forever day': 'જીવનભરના સાથનો દિવસ',
  'The sweetest goodbye': 'સૌથી મીઠી વિદાય',
  'One more coffee. One more hug.': 'હજી એક કોફી. હજી એક વાર ભેટી લઈએ.',
  // the "&" between the two names: Kashika & Arjun
  '&': 'અને',

  // ── joining (app/join.tsx) ──
  'Your name': 'તમારું નામ',
  'Invite code': 'ઇન્વાઇટ કોડ',
  'On your invitation': 'તમારા આમંત્રણમાં છે',
  'This build has no server address set.': 'આ એપમાં સર્વરનું સરનામું સેટ નથી.',
  'Come on in': 'પધારો',
  'Photos, plans and chatter for our three days in the hills.': 'પહાડોમાં અમારા ત્રણ દિવસ માટે ફોટા, કાર્યક્રમ અને ગપસપ.',

  // ── Today: the top of the screen ──
  SOS: 'SOS',
  'SOS. Ask the wedding team for help': 'SOS. વેડિંગ ટીમ પાસે મદદ માગો',
  'You and the wedding details': 'તમારી અને લગ્નની વિગતો',
  'Hello, {name}.': 'નમસ્તે, {name}.',
  'Thank you for making this happen.': 'આ બધું શક્ય બનાવવા બદલ તમારો આભાર.',
  "So glad you're here.": 'તમે જોડાયા, બહુ આનંદ થયો.',
  "Can't reach the wedding": 'હમણાં જોડાઈ શકાતું નથી',

  // ── Today: the reply card ──
  'See or change your RSVP': 'તમારો હાજરીનો જવાબ જુઓ અથવા બદલો',
  'Reply to the invitation': 'આમંત્રણનો જવાબ આપો',
  "You're coming · {n}": 'તમે આવો છો · {n}',
  "You can't make it": 'તમે આવી નહીં શકો',
  'Will you join us?': 'તમે આવશો ને?',
  'Tap to see every reply and the headcount.': 'બધા જવાબ અને કુલ સંખ્યા જોવા અહીં દબાવો.',
  'Tap to change your reply.': 'જવાબ બદલવો હોય તો અહીં દબાવો.',
  'Please RSVP. It takes a minute.': 'આવશો કે નહીં તે જણાવજો. એક જ મિનિટ લાગશે.',

  // ── Today: your ride ──
  'Open your ride to the resort': 'રિસોર્ટ જવા માટેની તમારી ગાડીની વિગત ખોલો',
  'Your ride: {vehicle}': 'તમારી ગાડી: {vehicle}',
  'Your ride to the resort': 'રિસોર્ટ જવા માટે તમારી ગાડી',
  'You reached the resort at {time}.': 'તમે {time} એ રિસોર્ટ પહોંચી ગયા.',
  'You arrived at {time}. Tap when you reach the resort.': 'તમે {time} એ ચંડીગઢ પહોંચી ગયા. રિસોર્ટ પહોંચો ત્યારે અહીં દબાવો.',
  'Tap here when you arrive in Chandigarh.': 'ચંડીગઢ પહોંચો ત્યારે અહીં દબાવો.',
  "Your van will appear here once it's assigned. Tap here when you arrive in Chandigarh.":
    'તમારી વૅન નક્કી થશે એટલે અહીં દેખાશે. ચંડીગઢ પહોંચો ત્યારે અહીં દબાવો.',

  // ── Today: notifications and the arrival welcome ──
  "Don't miss a thing": 'કશું ચૂકશો નહીં',
  "Get a nudge when something's starting, and when the photos develop.":
    'કોઈ કાર્યક્રમ શરૂ થાય ત્યારે, અને ફોટા ડેવલપ થાય ત્યારે, ફોન પર સૂચના આવશે.',
  'Turn on notifications': 'નોટિફિકેશન ચાલુ કરો',
  'A welcome when you arrive': 'પહોંચો ત્યારે આવકાર',
  'Get a hello when you reach Chandigarh and again as you near the resort. Your location stays on your phone.':
    'ચંડીગઢ પહોંચો ત્યારે અને રિસોર્ટની નજીક આવો ત્યારે ફોન પર આવકારનો સંદેશ આવશે. તમારું લોકેશન તમારા ફોનમાં જ રહે છે.',
  'Tell me when I arrive': 'પહોંચું ત્યારે મને જણાવજો',

  // ── Today: the shortcut cards ──
  'Open the camera': 'કૅમેરા ખોલો',
  "{n} shots left on today's roll": 'આજના રોલમાં {n} ફોટા બાકી',
  'No peeking. Photos develop overnight.': 'અત્યારે જોવા નહીં મળે. ફોટા રાતોરાત ડેવલપ થાય છે.',
  'Open the outfits guide': 'શું પહેરવું તેની માહિતી ખોલો',
  'Set the colours and dress code for each celebration.': 'દરેક કાર્યક્રમ માટે રંગ અને પહેરવેશ નક્કી કરો.',
  'Colours and dress codes, celebration by celebration.': 'દરેક કાર્યક્રમ માટેના રંગ અને પહેરવેશ.',
  'Open your table and room': 'તમારું ટેબલ અને રૂમ ખોલો',
  'Tables & rooms': 'ટેબલ અને રૂમ',
  'Your table & room': 'તમારું ટેબલ અને રૂમ',
  'Set the Sangeet tables and room numbers.': 'સંગીતનાં ટેબલ અને રૂમ નંબર ગોઠવો.',
  'Your room number and your Sangeet table.': 'તમારો રૂમ નંબર અને સંગીતમાં તમારું ટેબલ.',
  'Open travel documents': 'મુસાફરીના દસ્તાવેજ ખોલો',
  "Guests' travel documents": 'મહેમાનોના મુસાફરીના દસ્તાવેજ',
  'Your ID and tickets': 'તમારું ID અને ટિકિટ',
  'The private vault of IDs and tickets.': 'ID અને ટિકિટ સાચવવાની ખાનગી જગ્યા.',
  'Share them privately with the wedding team for travel.': 'મુસાફરી માટે વેડિંગ ટીમ સાથે ખાનગી રીતે શેર કરો.',
  'Open the couple quiz': 'કાશિકા અને અર્જુન વિશેની ક્વિઝ ખોલો',
  'How well do you know us?': 'તમે અમને કેટલું ઓળખો છો?',
  'No questions yet. Add the first one.': 'હજી કોઈ સવાલ નથી. પહેલો સવાલ ઉમેરો.',
  '{n} of {total} answered': '{total}માંથી {n} સવાલના જવાબ આપ્યા',

  // ── Today: news from the couple, and good to know ──
  'From {couple}': '{couple} તરફથી',
  'Nothing yet. News from the couple will appear here as the days unfold.':
    'હજી કંઈ નથી. જેમ જેમ દિવસો આગળ વધશે તેમ કાશિકા અને અર્જુન તરફથી સમાચાર અહીં દેખાશે.',
  Pinned: 'ઉપર રાખેલું',
  'Good to know': 'જાણવા જેવું',
  'Travel, weather & FAQs': 'મુસાફરી, હવામાન અને સવાલ-જવાબ',
  'Open in Maps': 'Maps માં ખોલો',

  // ── Today: the countdown, and what is on now ──
  'day to go': 'દિવસ બાકી',
  'days to go': 'દિવસ બાકી',
  'It begins today': 'આજથી શરૂ થાય છે',
  'The hills are calling. And so is the dance floor.': 'પહાડો બોલાવે છે. અને ડાન્સ ફ્લોર પણ.',
  'Happening now': 'અત્યારે ચાલી રહ્યું છે',
  'Up next': 'હવે પછી',
  'See the full programme': 'આખો કાર્યક્રમ જુઓ',
  'Wear:': 'પહેરવેશ:',
  'Until next time': 'ફરી મળીશું',
  'Thank you for being there.': 'તમે આવ્યા, તમારો ખૂબ આભાર.',
  'The album stays open, so keep reliving it.': 'આલ્બમ ખુલ્લું જ રહેશે, એટલે એ યાદો ફરી ફરી માણતા રહેજો.',

  // ── when something happened (lib/time.ts). Clock times stay as "9:00 am". ──
  'just now': 'હમણાં જ',
  '{n} min ago': '{n} મિનિટ પહેલાં',
  'Yesterday, {time}': 'ગઈ કાલે, {time}',
  '{time} today': 'આજે {time}',
  '{time} tomorrow': 'આવતી કાલે {time}',
  '{time} on {day}': '{day}, {time}',

  // days of the week, in full and short ("Sun 17 Jan")
  Sunday: 'રવિવાર',
  Monday: 'સોમવાર',
  Tuesday: 'મંગળવાર',
  Wednesday: 'બુધવાર',
  Thursday: 'ગુરુવાર',
  Friday: 'શુક્રવાર',
  Saturday: 'શનિવાર',
  Sun: 'રવિ',
  Mon: 'સોમ',
  Tue: 'મંગળ',
  Wed: 'બુધ',
  Thu: 'ગુરુ',
  Fri: 'શુક્ર',
  Sat: 'શનિ',

  // months, in full and short
  January: 'જાન્યુઆરી',
  February: 'ફેબ્રુઆરી',
  March: 'માર્ચ',
  April: 'એપ્રિલ',
  May: 'મે',
  June: 'જૂન',
  July: 'જુલાઈ',
  August: 'ઑગસ્ટ',
  September: 'સપ્ટેમ્બર',
  October: 'ઑક્ટોબર',
  November: 'નવેમ્બર',
  December: 'ડિસેમ્બર',
  Jan: 'જાન્યુ',
  Feb: 'ફેબ્રુ',
  Mar: 'માર્ચ',
  Apr: 'એપ્રિલ',
  Jun: 'જૂન',
  Jul: 'જુલાઈ',
  Aug: 'ઑગસ્ટ',
  Sep: 'સપ્ટે',
  Oct: 'ઑક્ટો',
  Nov: 'નવે',
  Dec: 'ડિસે',

  // ── when something goes wrong (errorMessage in lib/api.ts) ──
  "That invite code doesn't match. Check the code on your invitation and try again.":
    'આ ઇન્વાઇટ કોડ મળતો નથી. તમારા આમંત્રણમાં લખેલો કોડ જોઈને ફરી પ્રયત્ન કરો.',
  'Please enter your name (2 to 40 letters).': 'કૃપા કરી તમારું નામ લખો (2 થી 40 અક્ષર).',
  'Please join again with your invite code.': 'કૃપા કરી તમારા ઇન્વાઇટ કોડથી ફરી જોડાઓ.',
  'Only Kashika & Arjun can do that.': 'એ ફક્ત કાશિકા અને અર્જુન જ કરી શકે છે.',
  "That's the whole roll for today. Fresh film tomorrow.": 'આજનો આખો રોલ પૂરો થઈ ગયો. આવતી કાલે નવો રોલ મળશે.',
  "You're sending messages very quickly. Give it a moment.": 'તમે બહુ ઝડપથી મેસેજ મોકલી રહ્યા છો. થોડી વાર થોભો.',
  'That message is too long. Try splitting it in two.': 'આ મેસેજ બહુ લાંબો છે. બે ભાગમાં મોકલી જુઓ.',
  "You can't remove that one.": 'એ તમારાથી કાઢી નહીં શકાય.',
  "That's the limit for now. Remove some, or try again tomorrow.":
    'હમણાં પૂરતી આટલી જ મર્યાદા છે. થોડું કાઢી નાખો, અથવા આવતી કાલે ફરી પ્રયત્ન કરો.',
  'Only photos (JPEG or PNG) and PDFs can be added.': 'ફક્ત ફોટા (JPEG અથવા PNG) અને PDF ઉમેરી શકાય છે.',
  "The upload didn't finish. Check your signal and try again.": 'અપલોડ પૂરું ન થયું. નેટવર્ક તપાસીને ફરી પ્રયત્ન કરો.',
  'This poll has closed.': 'આ પોલ બંધ થઈ ગયો છે.',
  "That didn't look right. Please check it and try again.": 'એમાં કંઈક બરાબર નથી લાગતું. કૃપા કરી તપાસીને ફરી પ્રયત્ન કરો.',
  'Please write something first.': 'પહેલાં કંઈક લખો.',
  'The wedding server had a hiccup. Please try again.': 'સર્વરમાં થોડી તકલીફ આવી. કૃપા કરી ફરી પ્રયત્ન કરો.',
  "Can't reach the wedding right now. Check your signal and try again.": 'હમણાં જોડાઈ શકાતું નથી. નેટવર્ક તપાસીને ફરી પ્રયત્ન કરો.',
  'Something went wrong. Please try again.': 'કંઈક ગરબડ થઈ. કૃપા કરી ફરી પ્રયત્ન કરો.',
};

export default home;
