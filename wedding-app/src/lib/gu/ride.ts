// "Your ride" screen (app/ride.tsx): the van to the resort, the "I've arrived"
// buttons, and the hosts' arrivals list and van editor.
const ride: Record<string, string> = {
  // ── for every guest ──
  'Your ride': 'તમારી ગાડી',
  "Can't load your ride right now": 'તમારી ગાડીની વિગત હમણાં ખૂલતી નથી',
  'Try again': 'ફરી પ્રયત્ન કરો',
  'Chandigarh to the resort': 'ચંડીગઢથી રિસોર્ટ',
  'Kashika & Arjun have arranged Urbania 14-seater vans from the airport to the resort for everyone. The drive is about two hours.':
    'કાશિકા અને અર્જુને બધા માટે એરપોર્ટથી રિસોર્ટ સુધી 14 સીટની અર્બેનિયા વૅન ગોઠવી છે. રસ્તો લગભગ બે કલાકનો છે.',
  'Your ride to the resort': 'રિસોર્ટ જવા માટે તમારી ગાડી',
  'Your van will appear here once it is assigned. There is nothing you need to do for now.':
    'તમારી વૅન નક્કી થશે એટલે અહીં દેખાશે. હમણાં તમારે કંઈ કરવાનું નથી.',
  'Your van': 'તમારી વૅન',
  'Pickup': 'ક્યાંથી અને ક્યારે બેસવાનું',
  'Driver': 'ડ્રાઇવર',
  'Call the driver': 'ડ્રાઇવરને ફોન કરો',
  "Couldn't start the call": 'ફોન ન લાગ્યો',
  'Please dial {phone} from your phone.': 'તમારા ફોનમાંથી {phone} નંબર લગાડી જુઓ.',
  'Travelling with': 'તમારી સાથે',
  'Note': 'નોંધ',
  'Going home': 'ઘરે પાછા જતી વખતે',

  // ── the arrival buttons ──
  'Tell us when you arrive': 'પહોંચો એટલે અમને જણાવજો',
  'One tap when you get to Chandigarh, and one more when you reach the resort. Then we know you are safely in.':
    'ચંડીગઢ પહોંચો ત્યારે એક વાર દબાવો, અને રિસોર્ટ પહોંચો ત્યારે ફરી એક વાર. એટલે અમને ખબર પડે કે તમે સહીસલામત આવી ગયા.',
  "I've arrived in Chandigarh": 'ચંડીગઢ પહોંચી ગયા',
  'You told us you arrived at {time}': 'તમે જણાવ્યું કે તમે {time} એ ચંડીગઢ પહોંચી ગયા',
  'Undo': 'પાછું લો',
  'Undo: I have not arrived in Chandigarh yet': 'પાછું લો: હજી ચંડીગઢ પહોંચ્યા નથી',
  'Now look for your vehicle: {vehicle}.': 'હવે તમારી ગાડી શોધો: {vehicle}.',
  'Now look for your vehicle to the resort.': 'હવે રિસોર્ટ જવાની તમારી ગાડી શોધો.',
  "I've reached the resort": 'રિસોર્ટ પહોંચી ગયા',
  'You told us you reached the resort at {time}': 'તમે જણાવ્યું કે તમે {time} એ રિસોર્ટ પહોંચી ગયા',
  'Undo: I have not reached the resort yet': 'પાછું લો: હજી રિસોર્ટ પહોંચ્યા નથી',
  'Welcome! We are so happy you are here.': 'પધારો! તમે આવી ગયા, અમને બહુ આનંદ થયો.',

  // ── hosts: who has arrived ──
  "Can't load the arrivals list right now.": 'કોણ કોણ પહોંચ્યું તેની યાદી હમણાં ખૂલતી નથી.',
  'Only hosts see this': 'આ ફક્ત યજમાનોને દેખાય છે',
  'Arrivals': 'કોણ પહોંચ્યું',
  'Arrived in Chandigarh': 'ચંડીગઢ પહોંચ્યા',
  'At the resort': 'રિસોર્ટ પર',
  'Not yet': 'હજી બાકી',
  'Everyone': 'બધા',
  'On the way': 'રસ્તામાં',
  'Arrived': 'પહોંચી ગયા',
  'No one in this list yet.': 'આ યાદીમાં હજી કોઈ નથી.',
  'At the resort · {time}': 'રિસોર્ટ પર · {time}',
  'In Chandigarh · {time}': 'ચંડીગઢમાં · {time}',
  'No van yet': 'હજી વૅન નક્કી નથી',

  // ── hosts: enter the vans ──
  'Set the vans': 'વૅન ગોઠવો',
  'To the resort': 'રિસોર્ટ જવા',
  'Vans to the resort': 'રિસોર્ટ જતી વૅન',
  'Vans going home': 'ઘરે પાછી જતી વૅન',
  'Fill in each van once and list who is in it. A guest is matched by the name they joined the app with, so type each name exactly as it shows in the arrivals list above. Saving replaces the whole list for this direction.':
    'દરેક વૅનની વિગત એક વાર ભરો અને તેમાં કોણ કોણ છે તે લખો. મહેમાન જે નામથી એપમાં જોડાયા હોય એ નામથી જ ઓળખાય છે, એટલે દરેક નામ ઉપરની યાદીમાં દેખાય છે બરાબર એ જ રીતે લખજો. સેવ કરશો એટલે આ દિશાની આખી યાદી નવી થઈ જશે.',
  'No vans here yet.': 'અહીં હજી કોઈ વૅન નથી.',
  'Van {n}': 'વૅન {n}',
  'Remove van {n}': 'વૅન {n} કાઢી નાખો',
  'Remove': 'કાઢી નાખો',
  'Van name': 'વૅનનું નામ',
  'e.g. Urbania 1': 'દા.ત. અર્બેનિયા 1',
  'Pickup (where and when)': 'ક્યાંથી અને ક્યારે બેસવાનું',
  'e.g. Airport arrivals gate, 1:30 pm': 'દા.ત. એરપોર્ટનો અરાઇવલ ગેટ, બપોરે 1:30',
  'e.g. Ramesh Kumar': 'દા.ત. રમેશ કુમાર',
  'Driver phone': 'ડ્રાઇવરનો ફોન નંબર',
  'e.g. +91 98765 43210': 'દા.ત. +91 98765 43210',
  'e.g. Look for the board with our names': 'દા.ત. અમારા નામનું બોર્ડ શોધજો',
  'Who is in it': 'આ વૅનમાં કોણ કોણ છે',
  'e.g. Asha Mehta, Rohan Shah': 'દા.ત. Asha Mehta, Rohan Shah',
  'Full names, with a comma or a new line between them.': 'પૂરાં નામ લખો, વચ્ચે અલ્પવિરામ મૂકો અથવા નવી લીટીમાં લખો.',
  "No names yet. A van with no one in it isn't saved.": 'હજી કોઈ નામ નથી. જે વૅનમાં કોઈ ન હોય તે સેવ થતી નથી.',
  'People in this van: {n}': 'આ વૅનમાં લોકો: {n}',
  'Not in the app yet, or spelt differently: {names}': 'હજી એપમાં જોડાયા નથી, અથવા નામની જોડણી જુદી છે: {names}',
  'Add a van': 'વૅન ઉમેરો',
  'Vans: {vans} · People: {people}': 'વૅન: {vans} · લોકો: {people}',
  'Not saved yet': 'હજી સેવ નથી થયું',
  'Save': 'સેવ કરો',
  'Saved': 'સેવ થઈ ગયું',
  '1 person saved. They can see their van in the app now.': '1 જણ સેવ થયા. હવે તેમને એપમાં પોતાની વૅન દેખાશે.',
  '{n} people saved. They can see their van in the app now.': '{n} જણ સેવ થયા. હવે તેમને એપમાં પોતાની વૅન દેખાશે.',
  'Remove this van?': 'આ વૅન કાઢી નાખવી છે?',
  'It goes when you tap Save. The people in it will have no van until you put them in another one.':
    'સેવ દબાવશો ત્યારે તે નીકળી જશે. તેમાંના લોકોને બીજી વૅનમાં ન મૂકો ત્યાં સુધી તેમની પાસે કોઈ વૅન નહીં રહે.',
  'Give every van a name': 'દરેક વૅનને નામ આપો',
  'One van has people in it but no van name. Guests look for the van by its name.':
    'એક વૅનમાં લોકો છે પણ વૅનનું નામ નથી. મહેમાનો વૅનને તેના નામથી શોધે છે.',
  'Two vans are called {vehicle}': 'બે વૅનનું નામ {vehicle} છે',
  'Please give each van its own name, e.g. Urbania 1 and Urbania 2.': 'દરેક વૅનને જુદું નામ આપજો, દા.ત. અર્બેનિયા 1 અને અર્બેનિયા 2.',
  '{name} is in the list twice': '{name} યાદીમાં બે વાર છે',
  'Please keep each person in one van only.': 'દરેક જણને એક જ વૅનમાં રાખજો.',
  'Nothing to save yet': 'સેવ કરવા જેવું હજી કંઈ નથી',
  'Add a van and type the names of the people in it.': 'એક વૅન ઉમેરો અને તેમાં બેસનારાનાં નામ લખો.',
  'Clear the whole list?': 'આખી યાદી ખાલી કરવી છે?',
  'There are no names here, so saving will take every guest out of the vans to the resort.':
    'અહીં કોઈ નામ નથી, એટલે સેવ કરશો તો રિસોર્ટ જતી વૅનમાંથી બધા મહેમાન નીકળી જશે.',
  'There are no names here, so saving will take every guest out of the vans going home.':
    'અહીં કોઈ નામ નથી, એટલે સેવ કરશો તો ઘરે પાછી જતી વૅનમાંથી બધા મહેમાન નીકળી જશે.',
  'Clear the list': 'યાદી ખાલી કરો',
};

export default ride;
