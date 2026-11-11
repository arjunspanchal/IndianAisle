// Gujarati for the Photo challenges screen (app/challenges.tsx).
// Keys are the exact English text passed to t(); keep every {placeholder}.
const challenges: Record<string, string> = {
  // header and progress
  "Photo challenges": "ફોટો ચેલેન્જ",
  "Photo challenge": "ફોટો ચેલેન્જ",
  "A little game": "એક નાનકડી રમત",
  "You have done {done} of {total} challenges": "તમે {total} માંથી {done} ચેલેન્જ પૂરી કરી છે",
  "You have done {done} of {total}.": "તમે {total} માંથી {done} પૂરી કરી છે.",
  "You have done all {total}. Lovely!": "તમે બધી {total} ચેલેન્જ પૂરી કરી. વાહ!",
  "Answer each challenge with one of your own photos from the shared album.": "દરેક ચેલેન્જ માટે, બધાના આલબમમાંથી તમારો પોતાનો એક ફોટો મૂકો.",
  "No challenges yet. Add the first one below.": "હજી કોઈ ચેલેન્જ નથી. નીચે પહેલી ચેલેન્જ ઉમેરો.",
  "No photo challenges yet. They will appear here when Kashika & Arjun add them.": "હજી કોઈ ફોટો ચેલેન્જ નથી. કાશિકા અને અર્જુન ઉમેરશે એટલે અહીં દેખાશે.",
  "Can't load the photo challenges": "ફોટો ચેલેન્જ ખૂલતી નથી",
  "Try again": "ફરી પ્રયત્ન કરો",

  // the board
  "Most challenges done": "સૌથી વધુ ચેલેન્જ કોણે કરી",
  "1st place": "પહેલો નંબર",
  "2nd place": "બીજો નંબર",
  "3rd place": "ત્રીજો નંબર",
  "(you)": "(તમે)",

  // one challenge in the list
  "Open the challenge: {title}": "ચેલેન્જ ખોલો: {title}",
  "No one has answered yet.": "હજી કોઈએ ફોટો મૂક્યો નથી.",
  "1 guest has answered": "1 મહેમાને ફોટો મૂક્યો છે",
  "{n} guests have answered": "{n} મહેમાનોએ ફોટો મૂક્યો છે",
  "You have done this one.": "આ ચેલેન્જ તમે પૂરી કરી છે.",
  "Your photo is developing. It will show tomorrow morning.": "તમારો ફોટો ડેવલપ થઈ રહ્યો છે. કાલે સવારે દેખાશે.",
  "Add your photo": "તમારો ફોટો ઉમેરો",

  // hosts: rename, delete, add
  "Rename": "લખાણ બદલો",
  "Rename the challenge: {title}": "ચેલેન્જનું લખાણ બદલો: {title}",
  "Rename this challenge": "આ ચેલેન્જનું લખાણ બદલો",
  "The new wording for this challenge": "આ ચેલેન્જનું નવું લખાણ",
  "Write a challenge": "ચેલેન્જ લખો",
  "Please write the challenge first.": "પહેલાં ચેલેન્જ લખો.",
  "Save": "સેવ કરો",
  "Cancel": "રદ કરો",
  "Delete": "કાઢી નાખો",
  "Delete the challenge: {title}": "ચેલેન્જ કાઢી નાખો: {title}",
  "Delete this challenge?": "આ ચેલેન્જ કાઢી નાખવી છે?",
  "“{title}” and the answers to it will go. The photos themselves stay in the album.": "“{title}” અને તેમાં મુકાયેલા જવાબ નીકળી જશે. ફોટા તો આલબમમાં જ રહેશે.",
  "Add a challenge": "ચેલેન્જ ઉમેરો",
  "Only you see this box. Guests see a challenge as soon as you add it.": "આ બૉક્સ ફક્ત તમને દેખાય છે. તમે ચેલેન્જ ઉમેરો કે તરત મહેમાનોને દેખાશે.",
  "A new photo challenge": "નવી ફોટો ચેલેન્જ",
  "Add": "ઉમેરો",
  "Or start from one of these": "અથવા આમાંથી કોઈ એકથી શરૂ કરો",
  "Tapping one only fills the box above. Nothing is sent until you press Add.": "કોઈ એક પર ટૅપ કરશો તો તે ફક્ત ઉપરના બૉક્સમાં લખાશે. તમે “ઉમેરો” દબાવો ત્યાં સુધી કશું મોકલાતું નથી.",
  "Fill the box with: {text}": "બૉક્સમાં આ લખો: {text}",
  "A photo with someone you met today": "આજે જેમની સાથે ઓળખાણ થઈ તેમની સાથે એક ફોટો",
  "The best outfit of the evening": "સાંજનાં સૌથી સરસ કપડાં",
  "The view from your room": "તમારા રૂમમાંથી દેખાતો નજારો",
  "Caught on the dance floor": "ડાન્સ ફ્લોર પર ઝડપાયેલી પળ",

  // one challenge, opened
  "Close": "બંધ કરો",
  "Back to the challenge": "ચેલેન્જ પર પાછા જાઓ",
  "Answer with one of your own photos. One photo for each challenge.": "તમારો પોતાનો એક ફોટો મૂકો. દરેક ચેલેન્જ માટે એક ફોટો.",
  "This is your photo for this challenge.": "આ ચેલેન્જ માટે આ તમારો ફોટો છે.",
  "Want to use a different photo?": "બીજો ફોટો મૂકવો છે?",
  "Choose from my album photos": "મારા આલબમના ફોટામાંથી પસંદ કરો",
  "Add from my phone": "મારા ફોનમાંથી ઉમેરો",
  "A photo you add from your phone also goes into the shared album, where every guest can see it.": "ફોનમાંથી ઉમેરેલો ફોટો બધાના આલબમમાં પણ જશે, જ્યાં બધા મહેમાનો તેને જોઈ શકશે.",
  "Remove my photo from this challenge": "આ ચેલેન્જમાંથી મારો ફોટો કાઢો",
  "This only takes it out of the challenge. The photo stays in the album.": "ફોટો ફક્ત ચેલેન્જમાંથી નીકળશે. આલબમમાં તો રહેશે જ.",
  "Everyone's photos": "બધાના ફોટા",
  "Tap a photo to see it bigger.": "ફોટો મોટો જોવા તેના પર ટૅપ કરો.",
  "No photos to show here yet.": "હજી અહીં બતાવવા માટે કોઈ ફોટો નથી.",
  "Your photo. Tap to see it bigger.": "તમારો ફોટો. મોટો જોવા ટૅપ કરો.",
  "Photo by {name}. Tap to see it bigger.": "{name} એ પાડેલો ફોટો. મોટો જોવા ટૅપ કરો.",
  "Your photo": "તમારો ફોટો",
  "Photo by {name}": "{name} એ પાડેલો ફોટો",
  "You": "તમે",

  // choosing a photo
  "Choose one of your photos": "તમારો એક ફોટો પસંદ કરો",
  "Tap the photo you want to use for “{title}”.": "“{title}” માટે જે ફોટો મૂકવો હોય તેના પર ટૅપ કરો.",
  "Photos taken with the app camera appear here the morning after you take them.": "એપના કેમેરાથી પાડેલા ફોટા બીજા દિવસે સવારે અહીં દેખાશે.",
  "You have no photos in the album yet. You can add one from your phone.": "આલબમમાં હજી તમારો કોઈ ફોટો નથી. તમે ફોનમાંથી એક ઉમેરી શકો છો.",
  "Use this photo from {when}": "{when} નો આ ફોટો મૂકો",

  // messages
  "That photo couldn't be added to the challenge": "એ ફોટો ચેલેન્જમાં ઉમેરી શકાયો નહીં",
  "That photo didn't upload": "એ ફોટો અપલોડ ન થયો",
  "Your photo is in the album": "તમારો ફોટો આલબમમાં આવી ગયો છે",
  "To finish, choose it from your album photos.": "હવે તેને તમારા આલબમના ફોટામાંથી પસંદ કરો, એટલે ચેલેન્જ પૂરી.",
  "One photo for each challenge": "દરેક ચેલેન્જ માટે એક ફોટો",
  "Only the first photo you chose was used.": "તમે પસંદ કરેલા ફોટામાંથી ફક્ત પહેલો ફોટો લેવાયો છે.",
};

export default challenges;
