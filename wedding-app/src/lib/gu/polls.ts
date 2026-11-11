// Gujarati for the Polls screen (app/polls.tsx), keyed by the exact English text.
const polls: Record<string, string> = {
  // header, loading
  'Polls': 'પોલ',
  "Can't load the polls": 'પોલ હમણાં દેખાતા નથી',
  'Try again': 'ફરી પ્રયત્ન કરો',

  // top of the screen
  'Have your say': 'તમારો મત જણાવો',
  'Quick questions from Kashika & Arjun. Tap an answer to vote.': 'કાશિકા અને અર્જુનના નાના-નાના સવાલ. જવાબ દબાવીને વોટ આપો.',
  'No polls yet. When Kashika & Arjun ask a question, it will appear here.':
    'હજી કોઈ પોલ નથી. કાશિકા અને અર્જુન સવાલ પૂછશે એટલે અહીં દેખાશે.',
  'No polls yet. Ask your first question above.': 'હજી કોઈ પોલ નથી. ઉપરથી તમારો પહેલો સવાલ પૂછો.',

  // one poll
  'Open poll': 'પોલ ચાલુ છે',
  'Closed': 'બંધ',
  'Tap your answer.': 'તમારો જવાબ દબાવો.',
  'Tap another answer to change your vote.': 'વોટ બદલવો હોય તો બીજો જવાબ દબાવો.',
  'This poll is closed. Here is how everyone voted.': 'આ પોલ બંધ થઈ ગયો છે. બધાએ આ રીતે વોટ આપ્યા.',
  'Vote for {option}': '{option} માટે વોટ આપો',
  '1 vote': '1 વોટ',
  '{n} votes': '{n} વોટ',
  'No votes yet': 'હજી કોઈ વોટ નથી',
  'Total: {votes}': 'કુલ: {votes}',
  '{option}, {percent} percent, {votes}': '{option}, {percent} ટકા, {votes}',
  '{option}, {percent} percent, {votes}, your choice': '{option}, {percent} ટકા, {votes}, તમારી પસંદગી',

  // hosts: each poll
  'Close poll': 'પોલ બંધ કરો',
  'Reopen poll': 'પોલ ફરી ખોલો',
  'Delete': 'કાઢી નાખો',
  'Delete this poll?': 'આ પોલ કાઢી નાખવો છે?',
  "The question and everyone's votes will be removed for all guests. This cannot be undone.":
    'સવાલ અને બધાના વોટ બધા મહેમાનો માટે નીકળી જશે. પછી આ પાછું નહીં ફેરવી શકાય.',

  // hosts: asking a question
  'Ask everyone a question': 'બધાને એક સવાલ પૂછો',
  'Your question': 'તમારો સવાલ',
  'e.g. Chai or coffee in the morning?': 'દા.ત. સવારે ચા કે કોફી?',
  'The answers': 'જવાબો',
  'Two to six answers. Guests tap one.': 'બેથી છ જવાબ લખો. મહેમાનો એક પસંદ કરશે.',
  'e.g. Chai': 'દા.ત. ચા',
  'e.g. Coffee': 'દા.ત. કોફી',
  'e.g. Both!': 'દા.ત. બંને!',
  'e.g. Another answer': 'દા.ત. બીજો જવાબ',
  'Answer {n}': 'જવાબ {n}',
  'Remove answer {n}': 'જવાબ {n} કાઢી નાખો',
  'Add another answer': 'બીજો જવાબ ઉમેરો',
  'Send to everyone': 'બધાને મોકલો',
  'Cancel': 'રદ કરો',
  'Send this question to everyone?': 'આ સવાલ બધાને મોકલવો છે?',
  "Every guest's phone will get a notification with your question.": 'દરેક મહેમાનના ફોન પર તમારા સવાલનું નોટિફિકેશન જશે.',
  'Send': 'મોકલો',
};

export default polls;
