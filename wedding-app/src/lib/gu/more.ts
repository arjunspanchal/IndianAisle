// The "You" screen (app/me.tsx), table and room (app/places.tsx), travel
// documents (app/docs.tsx), SOS (app/sos.tsx), the quiz (app/quiz.tsx), the call
// buttons (components/Contacts.tsx) and the two arrival welcomes (lib/arrival.ts).
//
// Parts only the hosts see (reports, list editors, the vault's host view, writing
// quiz questions, the phone-number editor) are left in English and are not here.
const more: Record<string, string> = {
  // ── You (app/me.tsx) ──
  'Leave on this phone?': 'આ ફોનમાંથી નીકળી જવું છે?',
  "You'll need the invite code to come back, and you'd rejoin as a new person.":
    'પાછા આવવા માટે ઇન્વાઇટ કોડ જોઈશે, અને તમે નવા મહેમાન તરીકે ફરીથી જોડાશો.',
  'Leave': 'નીકળી જાઓ',
  'Delete your account?': 'તમારું એકાઉન્ટ કાઢી નાખવું છે?',
  'Your name, messages, photos, voice notes, travel documents, reactions and quiz answers are removed for everyone. This cannot be undone.':
    'તમારું નામ, મેસેજ, ફોટા, વૉઇસ નોટ, મુસાફરીના દસ્તાવેજ, રિએક્શન અને ક્વિઝના જવાબ બધા માટે નીકળી જશે. આ પાછું લાવી શકાશે નહીં.',
  'Delete everything': 'બધું કાઢી નાખો',
  'On the team': 'તમે ટીમમાં છો',
  "You're on the list": 'તમારું નામ યાદીમાં છે',
  'Where': 'ક્યાં',
  // wedding.gettingThere in lib/theme.ts
  'About two hours by road from Chandigarh. Shared transfers between Chandigarh and the resort are being arranged.':
    'ચંડીગઢથી રસ્તે આશરે બે કલાક. ચંડીગઢ અને રિસોર્ટ વચ્ચે બધા માટે ગાડીની વ્યવસ્થા થઈ રહી છે.',
  'Open in Maps': 'નકશામાં ખોલો',
  'Travel, weather & FAQs': 'મુસાફરી, હવામાન અને સવાલ-જવાબ',
  'For your journey': 'તમારી મુસાફરી માટે',
  'Add your ID and tickets so the wedding team can sort out travel and check-in. Kept private.':
    'તમારું ID અને ટિકિટ ઉમેરો, જેથી વેડિંગ ટીમ મુસાફરી અને ચેક-ઇનની વ્યવસ્થા કરી શકે. બધું ખાનગી રહે છે.',
  'Add or view yours': 'તમારા દસ્તાવેજ ઉમેરો કે જુઓ',
  'How the camera works': 'કૅમેરા કેવી રીતે ચાલે છે',
  "You get 27 photos a day, like a disposable camera. There's no preview and no retake. Everyone's photos develop together at 9:00 am the next morning and appear in the album.":
    'તમને રોજના 27 ફોટા મળે છે, ડિસ્પોઝેબલ કૅમેરાની જેમ. પ્રિવ્યૂ નથી, અને ફરીથી પાડવાનું પણ નથી. બધાના ફોટા બીજા દિવસે સવારે 9:00 am વાગ્યે એકસાથે ડેવલપ થાય છે અને આલ્બમમાં દેખાય છે.',
  'No signal? Keep shooting. Photos wait safely on your phone and send themselves later.':
    'નેટવર્ક નથી? ફોટા પાડતા રહો. ફોટા તમારા ફોનમાં સલામત રહેશે અને પછી આપમેળે મોકલાઈ જશે.',
  'Keeping it kind': 'માહોલ સારો રાખીએ',
  'Hold any message, or open any photo, to report it to the couple or to block the person who posted it.':
    'કોઈ પણ મેસેજ દબાવી રાખો, અથવા કોઈ પણ ફોટો ખોલો: ત્યાંથી તેની જાણ કાશિકા અને અર્જુનને કરી શકશો, અથવા તે મૂકનારને બ્લૉક કરી શકશો.',
  'Leave on this phone': 'આ ફોનમાંથી નીકળી જાઓ',
  'Delete my account and everything I posted': 'મારું એકાઉન્ટ અને મેં મૂકેલું બધું કાઢી નાખો',

  // ── Table and room (app/places.tsx) ──
  'Table': 'ટેબલ',
  'Room': 'રૂમ',
  'Your Sangeet table': 'સંગીતમાં તમારું ટેબલ',
  'Your room': 'તમારો રૂમ',
  "Tables haven't been shared yet. They'll appear here when they are.": 'ટેબલ હજી નક્કી નથી થયાં. નક્કી થશે એટલે અહીં દેખાશે.',
  "Rooms haven't been shared yet. They'll appear here when they are.": 'રૂમ હજી નક્કી નથી થયા. નક્કી થશે એટલે અહીં દેખાશે.',
  "Can't load this right now": 'આ હમણાં ખૂલતું નથી',
  'All Sangeet tables': 'સંગીતનાં બધાં ટેબલ',
  'Search for a name': 'નામ શોધો',
  'Search the seating chart by name': 'બેઠકની યાદીમાં નામથી શોધો',
  'No one by that name on the chart.': 'આ નામનું કોઈ યાદીમાં નથી.',
  'With {names}': '{names} સાથે',
  "We couldn't match your name to a room. Please ask the wedding team.": 'તમારા નામ સાથે કોઈ રૂમ મળ્યો નહીં. વેડિંગ ટીમને પૂછી જુઓ.',
  "We couldn't match your name. Search for it in the chart below.": 'તમારું નામ મળ્યું નહીં. નીચેની યાદીમાં શોધી જુઓ.',

  // ── Travel documents (app/docs.tsx) ──
  'Your ID': 'તમારું ID',
  'Your tickets': 'તમારી ટિકિટ',
  'Add an ID': 'ID ઉમેરો',
  'Add a ticket': 'ટિકિટ ઉમેરો',
  'e.g. Aadhaar, passport': 'દા.ત. આધાર, પાસપોર્ટ',
  'e.g. Mumbai to Chandigarh, 16 Jan': 'દા.ત. મુંબઈથી ચંડીગઢ, 16 જાન્યુઆરી',
  'ID': 'ID',
  'Ticket': 'ટિકિટ',
  'ticket': 'ટિકિટ',
  'Photo': 'ફોટો',
  'document': 'દસ્તાવેજ',
  'this document': 'આ દસ્તાવેજ',
  'Add your ID and tickets so the wedding team can sort out travel and check-in for you.':
    'તમારું ID અને ટિકિટ ઉમેરો, જેથી વેડિંગ ટીમ તમારી મુસાફરી અને ચેક-ઇનની વ્યવસ્થા કરી શકે.',
  'Kept private': 'ખાનગી રહે છે',
  "Only you and the couple's team can open these. Other guests can't see them, and you can delete them whenever you like.":
    'આ ફક્ત તમે અને વેડિંગ ટીમ ખોલી શકે છે. બીજા મહેમાનોને તે દેખાતા નથી, અને તમે ઇચ્છો ત્યારે તેને કાઢી નાખી શકો છો.',
  'Sharing Aadhaar? UIDAI lets you download a masked Aadhaar that hides the first eight digits. Use that if you can.':
    'આધાર આપો છો? UIDAI પરથી “માસ્ક્ડ આધાર” ડાઉનલોડ કરી શકાય છે, જેમાં પહેલા આઠ આંકડા છુપાયેલા હોય છે. બની શકે તો એ જ વાપરજો.',
  'Nothing added yet.': 'હજી કંઈ ઉમેર્યું નથી.',
  'What is it? (optional)': 'આ શું છે? (લખવું જરૂરી નથી)',
  'What is this document': 'આ કયો દસ્તાવેજ છે',
  'Take a photo of it': 'તેનો ફોટો પાડો',
  'Choose a photo': 'ફોટો પસંદ કરો',
  'Choose a PDF': 'PDF પસંદ કરો',
  'Open {name}': '{name} ખોલો',
  '{type} · added {when}': '{type} · ઉમેર્યું: {when}',
  'Delete {name}': '{name} કાઢી નાખો',
  'Delete {name}?': '{name} કાઢી નાખવું છે?',
  'It is erased from the vault straight away and cannot be brought back.': 'તે તરત જ કાયમ માટે ભૂંસાઈ જશે અને પાછું લાવી શકાશે નહીં.',
  'Uploading securely…': 'સુરક્ષિત રીતે અપલોડ થઈ રહ્યું છે…',
  'Opening…': 'ખૂલી રહ્યું છે…',
  'That file is too big': 'આ ફાઇલ બહુ મોટી છે',
  'Please choose one under 10 MB.': '10 MB થી નાની ફાઇલ પસંદ કરો.',
  "That didn't upload": 'અપલોડ ન થયું',
  'Please try again.': 'ફરી પ્રયત્ન કરી જુઓ.',
  'Camera access is off': 'કૅમેરાની પરવાનગી બંધ છે',
  'Allow the camera in Settings to photograph a document.': 'દસ્તાવેજનો ફોટો પાડવા માટે ફોનના સેટિંગ્સમાં જઈને કૅમેરાની પરવાનગી આપો.',
  "Can't open your documents": 'તમારા દસ્તાવેજ હમણાં ખૂલતા નથી',

  // ── SOS (app/sos.tsx): plain words, nothing clever ──
  'SOS': 'SOS',
  'Need help?': 'મદદ જોઈએ છે?',
  "This sends an alert to the wedding team's phones straight away, with your name. Use it if you're unwell, lost, stuck or worried about someone.":
    'અહીંથી SOS મોકલતાં જ વેડિંગ ટીમના ફોન પર તરત જાણ થશે, તમારા નામ સાથે. તબિયત સારી ન હોય, રસ્તો ભૂલી ગયા હો, ક્યાંક અટવાઈ ગયા હો કે કોઈની ચિંતા થતી હોય તો આ વાપરજો.',
  "What's happening and where are you? (optional)": 'શું થયું છે અને તમે ક્યાં છો? (લખવું જરૂરી નથી)',
  "What's happening and where are you": 'શું થયું છે અને તમે ક્યાં છો',
  'e.g. Feeling faint, near the pool': 'દા.ત. ચક્કર આવે છે, પૂલ પાસે છું',
  'Send SOS to the wedding team': 'વેડિંગ ટીમને SOS મોકલો',
  'Help is on the way': 'મદદ આવી રહી છે',
  "The wedding team has been alerted and can see it's you. Stay where you are if you can.":
    'વેડિંગ ટીમને જાણ થઈ ગઈ છે, અને તેમને ખબર છે કે મદદ તમને જોઈએ છે. બની શકે તો જ્યાં છો ત્યાં જ રહેજો.',
  'Call the wedding planner': 'વેડિંગ પ્લાનરને ફોન કરો',

  // ── call buttons (components/Contacts.tsx, also on the SOS screen) ──
  'Call reception': 'રિસેપ્શનને ફોન કરો',
  'Call the planner': 'વેડિંગ પ્લાનરને ફોન કરો',
  'Call {name}': '{name} ને ફોન કરો',

  // ── Quiz (app/quiz.tsx) ──
  "Can't load the quiz": 'ક્વિઝ હમણાં ખૂલતી નથી',
  'These two kids are getting married': 'આ બે છોકરાં પરણી રહ્યાં છે',
  'How well do you know us?': 'તમે અમને કેટલું ઓળખો છો?',
  "You've answered {n} of {total} and got {score} right. One go at each.":
    'તમે {total} માંથી {n} સવાલના જવાબ આપ્યા, અને {score} સાચા પડ્યા. દરેક સવાલ માટે એક જ તક.',
  "You've answered {n} of {total}. One go at each.": 'તમે {total} માંથી {n} સવાલના જવાબ આપ્યા. દરેક સવાલ માટે એક જ તક.',
  'The couple are still writing the questions. Check back soon.': 'કાશિકા અને અર્જુન હજી સવાલો લખી રહ્યાં છે. થોડા સમય પછી ફરી જોજો.',
  'Question {n}': 'સવાલ {n}',
  '{answer}, correct answer': '{answer}, સાચો જવાબ',
  '{answer}, your answer, not right': '{answer}, તમારો જવાબ, સાચો નથી',
  'Leaderboard': 'લીડરબોર્ડ',
  '(you)': '(તમે)',

  // ── arrival welcomes (lib/arrival.ts): notifications, so kept short ──
  'Welcome to Chandigarh!': 'ચંડીગઢમાં તમારું સ્વાગત છે!',
  'The hills are about two hours away by road. See you very soon.': 'પહાડો અહીંથી રસ્તે આશરે બે કલાક દૂર છે. બહુ જલ્દી મળીએ.',
  'You made it to the hills': 'તમે પહાડોમાં પહોંચી ગયા',
  'Almost at Storii. A welcome drink will be waiting for you.': 'Storii બસ આવી જ ગયું. સ્વાગત પીણું તમારી રાહ જોશે.',
  'Your ride: {vehicle}': 'તમારી ગાડી: {vehicle}',
  'Driver: {driver}': 'ડ્રાઇવર: {driver}',
  "{ride}. Tap to tell us you've arrived.": '{ride}. પહોંચી ગયા છો એ જણાવવા અહીં દબાવો.',
};

export default more;
