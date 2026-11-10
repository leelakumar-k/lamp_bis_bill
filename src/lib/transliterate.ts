/**
 * Phonetic transliteration and dictionary translation for restaurant dishes and categories
 * across Indian languages: Hindi (hi), Marathi (mr), Tamil (ta), Telugu (te),
 * Kannada (kn), Gujarati (gu), Bengali (bn), Malayalam (ml).
 */

export type SupportedLang = 'hi' | 'mr' | 'ta' | 'te' | 'kn' | 'gu' | 'bn' | 'ml';

// High-frequency culinary terms and categories mapped across all supported languages
const DICTIONARY: Record<string, Partial<Record<SupportedLang, string>>> = {
  // Categories
  tiffin: {
    hi: 'टिफिन / नाश्ता',
    mr: 'टिफिन / नाश्ता',
    ta: 'டிபன்',
    te: 'టిఫిన్',
    kn: 'ತಿಂಡಿ / ಟಿಫಿನ್',
    gu: 'ટિફિન / નાસ્તો',
    bn: 'টিফিন / জলখাবার',
    ml: 'ടിഫിൻ',
  },
  breakfast: {
    hi: 'नाश्ता',
    mr: 'नाश्ता',
    ta: 'காலை உணவு',
    te: 'అల్పాహారం',
    kn: 'ಉಪಹಾರ',
    gu: 'નાસ્તો',
    bn: 'প্রাতরাশ',
    ml: 'പ്രഭാതഭക്ഷണം',
  },
  starters: {
    hi: 'स्टार्टर',
    mr: 'स्टार्टर',
    ta: 'ஸ்டார்டர்ஸ்',
    te: 'స్టార్టర్స్',
    kn: 'ಸ್ಟಾರ್ಟರ್ಸ್',
    gu: 'સ્ટાર્ટર્સ',
    bn: 'স্টার্টার্স',
    ml: 'സ്റ്റാർട്ടേഴ്സ്',
  },
  starter: {
    hi: 'स्टार्टर',
    mr: 'स्टार्टर',
    ta: 'ஸ்டார்ட்டர்',
    te: 'స్టార్టర్',
    kn: 'ಸ್ಟಾರ್ಟರ್',
    gu: 'સ્ટાર્ટર',
    bn: 'স্টার্টার',
    ml: 'സ്റ്റാർട്ടർ',
  },
  'main course': {
    hi: 'मेन कोर्स',
    mr: 'मेन कोर्स',
    ta: 'மெயின் கோர்ஸ்',
    te: 'మెయిన్ కోర్స్',
    kn: 'ಮೇನ್ ಕೋರ್ಸ್',
    gu: 'મેઇન કોર્સ',
    bn: 'মেন কোর্স',
    ml: 'മെയിൻ കോഴ്സ്',
  },
  breads: {
    hi: 'रोटी-नान',
    mr: 'रोटी-नान',
    ta: 'ரொட்டி வகைகள்',
    te: 'రొట్టెలు',
    kn: 'ರೊಟ್ಟಿಗಳು',
    gu: 'રોટલી-નાન',
    bn: 'রুটি',
    ml: 'റൊട്ടികൾ',
  },
  bread: {
    hi: 'रोटी',
    mr: 'रोटी',
    ta: 'ரொட்டி',
    te: 'రొట్టె',
    kn: 'ರೊಟ್ಟಿ',
    gu: 'રોટલી',
    bn: 'রুটি',
    ml: 'റൊട്ടി',
  },
  'rice & biryani': {
    hi: 'चावल और बिरयानी',
    mr: 'भात आणि बिर्याणी',
    ta: 'சாதம் & பிரியாணி',
    te: 'రైస్ & బిర్యానీ',
    kn: 'ಅನ್ನ & ಬಿರಿಯಾನಿ',
    gu: 'ભાત અને બિરયાની',
    bn: 'ভাত ও বিরিয়ানি',
    ml: 'ചോറ് & ബിരിയാണി',
  },
  rice: {
    hi: 'चावल / राइस',
    mr: 'भात / राइस',
    ta: 'சாதம் / ரைஸ்',
    te: 'రైస్ / అన్నం',
    kn: 'ಅನ್ನ / ರೈಸ್',
    gu: 'ભાત / રાઇસ',
    bn: 'ভাত / রাইস',
    ml: 'ചോറ് / റൈസ്',
  },
  biryani: {
    hi: 'बिरयानी',
    mr: 'बिर्याणी',
    ta: 'பிரியாணி',
    te: 'బిర్యానీ',
    kn: 'ಬಿರಿಯಾನಿ',
    gu: 'બિરયાની',
    bn: 'বিরিয়ানি',
    ml: 'ബിരിയാണി',
  },
  'south indian': {
    hi: 'साउथ इंडियन',
    mr: 'साउथ इंडियन',
    ta: 'தென்னிந்திய உணவு',
    te: 'సౌత్ ఇండియన్',
    kn: 'ದಕ್ಷಿಣ ಭಾರತೀಯ',
    gu: 'સાઉથ ઇન્ડિયન',
    bn: 'দক্ষিণ ভারতীয়',
    ml: 'സൗത്ത് ഇന്ത്യൻ',
  },
  'north indian': {
    hi: 'नॉर्थ इंडियन',
    mr: 'नॉर्थ इंडियन',
    ta: 'வட இந்திய உணவு',
    te: 'నార్త్ ఇండియన్',
    kn: 'ಉತ್ತರ ಭಾರತೀಯ',
    gu: 'નોર્થ ઇન્ડિયન',
    bn: 'উত্তর ভারতীয়',
    ml: 'നോർത്ത് ഇന്ത്യൻ',
  },
  beverages: {
    hi: 'पेय',
    mr: 'पेये',
    ta: 'பானங்கள்',
    te: 'పానీయాలు',
    kn: 'ಪಾನೀಯಗಳು',
    gu: 'પીણાં',
    bn: 'পানীয়',
    ml: 'പാനീയങ്ങൾ',
  },
  desserts: {
    hi: 'मिठाई / डेसर्ट',
    mr: 'गोड पदार्थ',
    ta: 'இனிப்புகள்',
    te: 'మిఠాయిలు / డెజర్ట్స్',
    kn: 'ಸಿಹಿ ತಿಂಡಿಗಳು',
    gu: 'મીઠાઈઓ',
    bn: 'মিষ্টি',
    ml: 'മധുരപലഹാരങ്ങൾ',
  },
  snacks: {
    hi: 'नाश्ता / स्नैक्स',
    mr: 'स्नॅक्स',
    ta: 'சிற்றுண்டி',
    te: 'స్నాక్స్',
    kn: 'ತಿಂಡಿಗಳು',
    gu: 'નાસ્તો / સ્નેક્સ',
    bn: 'স্ন্যাক্স',
    ml: 'ലഘുഭക്ഷണം',
  },
  chinese: {
    hi: 'चाइनीज',
    mr: 'चायनीज',
    ta: 'சைனீஸ்',
    te: 'చైనీస్',
    kn: 'ಚೈನೀಸ್',
    gu: 'ચાઇનીઝ',
    bn: 'চাইনিজ',
    ml: 'ചൈനീസ്',
  },

  // Dishes & Items
  dosa: {
    hi: 'डोसा',
    mr: 'डोसा',
    ta: 'தோசை',
    te: 'దోశ',
    kn: 'ದೋಸೆ',
    gu: 'ઢોસા',
    bn: 'দোসা',
    ml: 'ദോശ',
  },
  'masala dosa': {
    hi: 'मसाला डोसा',
    mr: 'मसाला डोसा',
    ta: 'மசாலா தோசை',
    te: 'మసాలా దోశ',
    kn: 'ಮಸಾಲೆ ದೋಸೆ',
    gu: 'મસાલા ઢોસા',
    bn: 'মশলা দোসা',
    ml: 'മസാല ദോശ',
  },
  'plain dosa': {
    hi: 'प्लेन डोसा',
    mr: 'प्लेन डोसा',
    ta: 'சாதாரண தோசை',
    te: 'ప్లెయిన్ దోశ',
    kn: 'ಪ್ಲೈನ್ ದೋಸೆ',
    gu: 'પ્લેન ઢોસા',
    bn: 'প্লেন দোসা',
    ml: 'പ്ലെയിൻ ദോശ',
  },
  'rava dosa': {
    hi: 'रवा डोसा',
    mr: 'रवा डोसा',
    ta: 'ரவா தோசை',
    te: 'రవ్వ దోశ',
    kn: 'ರವೆ ದೋಸೆ',
    gu: 'રવા ઢોસા',
    bn: 'সুজি দোসা',
    ml: 'റവ ദോശ',
  },
  'onion dosa': {
    hi: 'प्याज डोसा',
    mr: 'कांदा डोसा',
    ta: 'வெங்காய தோசை',
    te: 'ఉల్లి దోశ',
    kn: 'ಈರುಳ್ಳಿ ದೋಸೆ',
    gu: 'ડુંગળી ઢોસા',
    bn: 'পেঁয়াজ দোসা',
    ml: 'ഉള്ളി ദോശ',
  },
  'set dosa': {
    hi: 'सेट डोसा',
    mr: 'सेट डोसा',
    ta: 'செட் தோசை',
    te: 'సెట్ దోశ',
    kn: 'ಸೆಟ್ ದೋಸೆ',
    gu: 'સેટ ઢોસા',
    bn: 'সেট দোসা',
    ml: 'സെറ്റ് ദോശ',
  },
  'idli sambar': {
    hi: 'इडली सांभर',
    mr: 'इडली सांबार',
    ta: 'இட்லி சாம்பார்',
    te: 'ఇడ్లీ సాంబార్',
    kn: 'ಇಡ್ಲಿ ಸಾಂಬಾರ್',
    gu: 'ઇડલી સાંભાર',
    bn: 'ইডলি সম্বর',
    ml: 'ഇഡ്ഡലി സാമ്പാർ',
  },
  idli: {
    hi: 'इडली',
    mr: 'इडली',
    ta: 'இட்லி',
    te: 'ఇడ్లీ',
    kn: 'ಇಡ್ಲಿ',
    gu: 'ઇડલી',
    bn: 'ইডলি',
    ml: 'ഇഡ്ഡലി',
  },
  'medu vada': {
    hi: 'मेदु वड़ा',
    mr: 'मेदू वडा',
    ta: 'மெது வடை',
    te: 'మేదు వడ',
    kn: 'ಮೆದು ವಡೆ',
    gu: 'મેદુ વડા',
    bn: 'মেদু বড়ে',
    ml: 'മേദു വട',
  },
  vada: {
    hi: 'वड़ा',
    mr: 'वडा',
    ta: 'வடை',
    te: 'వడ',
    kn: 'ವಡೆ',
    gu: 'વડા',
    bn: 'বড়ে',
    ml: 'വട',
  },
  upma: {
    hi: 'उपमा',
    mr: 'उपमा',
    ta: 'உப்மா',
    te: 'ఉప్మా',
    kn: 'ಉಪ್ಪಿಟ್ಟು',
    gu: 'ઉપમા',
    bn: 'উপমা',
    ml: 'ഉപ്പുമാവ്',
  },
  'poori bhaji': {
    hi: 'पूरी भाजी',
    mr: 'पुरी भाजी',
    ta: 'பூரி பாஜி',
    te: 'పూరీ భాజీ',
    kn: 'ಪೂರಿ ಬಾಜಿ',
    gu: 'પૂરી ભાજી',
    bn: 'পুরি ভাজি',
    ml: 'പൂരി ബാജി',
  },
  poori: {
    hi: 'पूरी',
    mr: 'पुरी',
    ta: 'பூரி',
    te: 'పూరీ',
    kn: 'ಪೂರಿ',
    gu: 'પૂરી',
    bn: 'পুরি',
    ml: 'പൂരി',
  },
  uttapam: {
    hi: 'उत्तपम',
    mr: 'उत्तपम',
    ta: 'ஊத்தப்பம்',
    te: 'ఊతప్పం',
    kn: 'ಉತ್ತಪ್ಪಂ',
    gu: 'ઉત્તપમ',
    bn: 'উত্তপম',
    ml: 'ഊത്തപ്പം',
  },
  'sambar vada': {
    hi: 'सांभर वड़ा',
    mr: 'सांबार वडा',
    ta: 'சாம்பார் வடை',
    te: 'సాంబార్ వడ',
    kn: 'ಸಾಂಬಾರ್ ವಡೆ',
    gu: 'સાંભાર વડા',
    bn: 'সম্বর বড়ে',
    ml: 'സാമ്പാർ വട',
  },
  'curd rice': {
    hi: 'दही चावल',
    mr: 'दही भात',
    ta: 'தயிர் சாதம்',
    te: 'పెరుగు అన్నం',
    kn: 'ಮೊಸರನ್ನ',
    gu: 'દહીં ભાત',
    bn: 'দই ভাত',
    ml: 'തൈര് ചോറ്',
  },
  'lemon rice': {
    hi: 'नींबू चावल',
    mr: 'लिंबू भात',
    ta: 'எலுமிச்சை சாதம்',
    te: 'నిమ్మకాయ రైస్',
    kn: 'ಚಿತ್ರಾನ್ನ',
    gu: 'લીંબુ ભાત',
    bn: 'লেবু ভাত',
    ml: 'നാരങ്ങ ചോറ്',
  },
  paneer: {
    hi: 'पनीर',
    mr: 'पनीर',
    ta: 'பனீர்',
    te: 'పనీర్',
    kn: 'ಪನೀರ್',
    gu: 'પનીર',
    bn: 'পনির',
    ml: 'പനീർ',
  },
  'paneer butter masala': {
    hi: 'पनीर बटर मसाला',
    mr: 'पनीर बटर मसाला',
    ta: 'பனீர் பட்டர் மசாலா',
    te: 'పనీర్ బటర్ మసాలా',
    kn: 'ಪನೀರ್ ಬಟರ್ ಮಸಾಲಾ',
    gu: 'પનીર બટર મસાલા',
    bn: 'পনির বাটার মশলা',
    ml: 'പനീർ ബട്ടർ മസാല',
  },
  'paneer tikka': {
    hi: 'पनीर टिक्का',
    mr: 'पनीर टिक्का',
    ta: 'பனீர் டிக்கா',
    te: 'పనీర్ టిక్కా',
    kn: 'ಪನೀರ್ ಟಿಕ್ಕಾ',
    gu: 'પનીર ટિક્કા',
    bn: 'পনির টিক্কা',
    ml: 'പനീർ ടിക്ക',
  },
  'butter chicken': {
    hi: 'बटर चिकन',
    mr: 'बटर चिकन',
    ta: 'பட்டர் சிக்கன்',
    te: 'బటర్ చికెన్',
    kn: 'ಬಟರ್ ಚಿಕನ್',
    gu: 'બટર ચિકન',
    bn: 'বাটার চিকেন',
    ml: 'ബട്ടർ ചിക്കൻ',
  },
  chicken: {
    hi: 'चिकन',
    mr: 'चिकन',
    ta: 'சிக்கன்',
    te: 'చికెన్',
    kn: 'ಚಿಕನ್',
    gu: 'ચિકન',
    bn: 'চিকেন',
    ml: 'ചിക്കൻ',
  },
  'chicken 65': {
    hi: 'चिकन 65',
    mr: 'चिकन 65',
    ta: 'சிக்கன் 65',
    te: 'చికెన్ 65',
    kn: 'ಚಿಕನ್ 65',
    gu: 'ચિકન 65',
    bn: 'চিকেন 65',
    ml: 'ചിക്കൻ 65',
  },
  'chicken biryani': {
    hi: 'चिकन बिरयानी',
    mr: 'चिकन बिर्याणी',
    ta: 'சிக்கன் பிரியாணி',
    te: 'చికెన్ బిర్యానీ',
    kn: 'ಚಿಕನ್ ಬಿರಿಯಾನಿ',
    gu: 'ચિકન બિરયાની',
    bn: 'চিকেন বিরিয়ানি',
    ml: 'ചിക്കൻ ബിരിയാണി',
  },
  'mutton biryani': {
    hi: 'मटन बिरयानी',
    mr: 'मटण बिर्याणी',
    ta: 'மட்டன் பிரியாணி',
    te: 'మటన్ బిర్యానీ',
    kn: 'ಮಟನ್ ಬಿರಿಯಾನಿ',
    gu: 'મટન બિરયાની',
    bn: 'মাটন বিরিয়ানি',
    ml: 'മട്ടൻ ബിരിയാണി',
  },
  'veg biryani': {
    hi: 'वेज बिरयानी',
    mr: 'व्हेज बिर्याणी',
    ta: 'வெஜ் பிரியாணி',
    te: 'వెజ్ బిర్యానీ',
    kn: 'ವೆಜ್ ಬಿರಿಯಾನಿ',
    gu: 'વેજ બિરયાની',
    bn: 'ভেজ বিরিয়ানি',
    ml: 'വെജ് ബിരിയാണി',
  },
  'dal makhani': {
    hi: 'दाल मखनी',
    mr: 'दाल मखनी',
    ta: 'தால் மக்னி',
    te: 'దాల్ మఖానీ',
    kn: 'ದಾಲ್ ಮಖನಿ',
    gu: 'દાલ મખની',
    bn: 'ডাল মাখানি',
    ml: 'ദാൽ മഖ്നി',
  },
  'dal fry': {
    hi: 'दाल फ्राई',
    mr: 'दाल फ्राय',
    ta: 'தால் ஃப்ரை',
    te: 'దాల్ ఫ్రై',
    kn: 'ದಾಲ್ ಫ್ರೈ',
    gu: 'દાલ ફ્રાય',
    bn: 'ডাল ফ্রাই',
    ml: 'ദാൽ ഫ്രൈ',
  },
  'dal tadka': {
    hi: 'दाल तड़का',
    mr: 'दाल तडका',
    ta: 'தால் தட்கா',
    te: 'దాల్ తడ్కా',
    kn: 'ದಾಲ್ ತಡ್ಕಾ',
    gu: 'દાલ તડકા',
    bn: 'ডাল তড়কা',
    ml: 'ദാൽ തഡ്ക',
  },
  'butter naan': {
    hi: 'बटर नान',
    mr: 'बटर नान',
    ta: 'பட்டர் நான்',
    te: 'బటర్ నాన్',
    kn: 'ಬಟರ್ ನಾನ್',
    gu: 'બટર નાન',
    bn: 'বাটার নান',
    ml: 'ബട്ടർ നാൻ',
  },
  naan: {
    hi: 'नान',
    mr: 'नान',
    ta: 'நான்',
    te: 'నాన్',
    kn: 'ನಾನ್',
    gu: 'નાન',
    bn: 'নান',
    ml: 'നാൻ',
  },
  'garlic naan': {
    hi: 'गार्लिक नान',
    mr: 'गार्लिक नान',
    ta: 'கார்லிக் நான்',
    te: 'గార్లిక్ నాన్',
    kn: 'ಗಾರ್ಲಿಕ್ ನಾನ್',
    gu: 'ગાર્લિક નાન',
    bn: 'গার্লিক নান',
    ml: 'ഗാർലിക് നാൻ',
  },
  'tandoori roti': {
    hi: 'तंदूरी रोटी',
    mr: 'तंदूरी रोटी',
    ta: 'தந்தூரி ரொட்டி',
    te: 'తందూరీ రొట్టె',
    kn: 'ತಂದೂರಿ ರೊಟ್ಟಿ',
    gu: 'તંદૂરી રોટલી',
    bn: 'তন্দুরি রুটি',
    ml: 'തന്തൂരി റൊട്ടി',
  },
  roti: {
    hi: 'रोटी',
    mr: 'रोटी',
    ta: 'ரொட்டி',
    te: 'రొట్టె',
    kn: 'ರೊಟ್ಟಿ',
    gu: 'રોટલી',
    bn: 'রুটি',
    ml: 'റൊട്ടി',
  },
  chapati: {
    hi: 'चपाती',
    mr: 'चपाती',
    ta: 'சப்பாத்தி',
    te: 'చపాతీ',
    kn: 'ಚಪಾತಿ',
    gu: 'ચપાતી',
    bn: 'চাপাতি',
    ml: 'ചപ്പാത്തി',
  },
  paratha: {
    hi: 'पराठा',
    mr: 'पराठा',
    ta: 'பரோட்டா',
    te: 'పరోటా',
    kn: 'ಪರೋಟ',
    gu: 'પરોઠા',
    bn: 'পরোটা',
    ml: 'പൊറോട്ട',
  },
  'aloo paratha': {
    hi: 'आलू पराठा',
    mr: 'आलू पराठा',
    ta: 'ஆலூ பரோட்டா',
    te: 'ఆలూ పరోటా',
    kn: 'ಆಲೂ ಪರೋಟ',
    gu: 'આલુ પરોઠા',
    bn: 'আলু পরোটা',
    ml: 'ആലൂ പൊറോട്ട',
  },
  'jeera rice': {
    hi: 'जीरा राइस',
    mr: 'जिरा राइस',
    ta: 'ஜீரா ரைஸ்',
    te: 'జీరా రైస్',
    kn: 'ಜೀರಾ ರೈಸ್',
    gu: 'જીરા રાઇસ',
    bn: 'জিরা রাইস',
    ml: 'ജീര റൈസ്',
  },
  'veg pulao': {
    hi: 'वेज पुलाव',
    mr: 'व्हेज पुलाव',
    ta: 'வெஜ் புலாவ்',
    te: 'వెజ్ పులావ్',
    kn: 'ವೆಜ್ ಪುಲಾವ್',
    gu: 'વેજ પુલાવ',
    bn: 'ভেজ পোলাও',
    ml: 'വെജ് പുലാവ്',
  },
  pulao: {
    hi: 'पुलाव',
    mr: 'पुलाव',
    ta: 'புலாவ்',
    te: 'పులావ్',
    kn: 'ಪುಲಾವ್',
    gu: 'પુલાવ',
    bn: 'পোলাও',
    ml: 'പുലാവ്',
  },
  'masala chai': {
    hi: 'मसाला चाय',
    mr: 'मसाला चहा',
    ta: 'மசாலா டீ',
    te: 'మసాలా టీ',
    kn: 'ಮಸಾಲಾ ಟೀ',
    gu: 'મસાલા ચા',
    bn: 'মশলা চা',
    ml: 'മസാല ചായ',
  },
  tea: {
    hi: 'चाय',
    mr: 'चहा',
    ta: 'டீ',
    te: 'టీ',
    kn: 'ಟೀ',
    gu: 'ચા',
    bn: 'চা',
    ml: 'ചായ',
  },
  chai: {
    hi: 'चाय',
    mr: 'चहा',
    ta: 'டீ',
    te: 'టీ',
    kn: 'ಟೀ',
    gu: 'ચા',
    bn: 'চা',
    ml: 'ചായ',
  },
  coffee: {
    hi: 'कॉफी',
    mr: 'कॉफी',
    ta: 'காபி',
    te: 'కాఫీ',
    kn: 'ಕಾಫಿ',
    gu: 'કોફી',
    bn: 'কফি',
    ml: 'കാപ്പി',
  },
  'filter coffee': {
    hi: 'फिल्टर कॉफी',
    mr: 'फिल्टर कॉफी',
    ta: 'ஃபில்டர் காபி',
    te: 'ఫిల్టర్ కాఫీ',
    kn: 'ಫಿಲ್ಟರ್ ಕಾಫಿ',
    gu: 'ફિલ્ટર કોફી',
    bn: 'ফিল্টার কফি',
    ml: 'ഫിൽട്ടർ കോഫി',
  },
  'sweet lassi': {
    hi: 'मीठी लस्सी',
    mr: 'गोड लस्सी',
    ta: 'ஸ்வீட் லஸ்ஸி',
    te: 'స్వీట్ లస్సీ',
    kn: 'ಸ್ವೀಟ್ ಲಸ್ಸಿ',
    gu: 'મીઠી લસ્સી',
    bn: 'মিষ্টি লস্যি',
    ml: 'സ്വീറ്റ് ലസ്സി',
  },
  lassi: {
    hi: 'लस्सी',
    mr: 'लस्सी',
    ta: 'லஸ்ஸி',
    te: 'లస్సీ',
    kn: 'ಲಸ್ಸಿ',
    gu: 'લસ્સી',
    bn: 'লস্যি',
    ml: 'ലസ്സി',
  },
  buttermilk: {
    hi: 'छाछ',
    mr: 'ताक',
    ta: 'மோர்',
    te: 'మజ్జిగ',
    kn: 'ಮಜ್ಜಿಗೆ',
    gu: 'છાશ',
    bn: 'ঘোল',
    ml: 'മോര്',
  },
  'gulab jamun': {
    hi: 'गुलाब जामुन',
    mr: 'गुलाबजाम',
    ta: 'குலாப் ஜாமூன்',
    te: 'గులాబ్ జామూన్',
    kn: 'ಗುಲಾಬ್ ಜಾಮೂನ್',
    gu: 'ગુલાબ જાંબુ',
    bn: 'গোলাপ জামুন',
    ml: 'ഗുലാബ് ജാമുൻ',
  },
  kulfi: {
    hi: 'कुल्फी',
    mr: 'कुल्फी',
    ta: 'குல்ஃபி',
    te: 'కుల్ఫీ',
    kn: 'ಕುಲ್ಫಿ',
    gu: 'કુલ્ફી',
    bn: 'কুলফি',
    ml: 'കുൽഫി',
  },
  'malai kulfi': {
    hi: 'मलाई कुल्फी',
    mr: 'मलई कुल्फी',
    ta: 'மலாய் குல்ஃபி',
    te: 'మలై కుల్ఫీ',
    kn: 'ಮಲೈ ಕುಲ್ಫಿ',
    gu: 'મલાઈ કુલ્ફી',
    bn: 'মালাই কুলফি',
    ml: 'മലായ് കുൽഫി',
  },
  icecream: {
    hi: 'आइसक्रीम',
    mr: 'आईस्क्रीम',
    ta: 'ஐஸ்கிரீம்',
    te: 'ఐస్ క్రీమ్',
    kn: 'ಐಸ್ ಕ್ರೀಮ್',
    gu: 'આઇસક્રીમ',
    bn: 'আইসক্রিম',
    ml: 'ഐസ്ക്രീം',
  },
  'ice cream': {
    hi: 'आइसक्रीम',
    mr: 'आईस्क्रीम',
    ta: 'ஐஸ்கிரீம்',
    te: 'ఐస్ క్రీమ్',
    kn: 'ಐಸ್ ಕ್ರೀಮ್',
    gu: 'આઇસક્રીમ',
    bn: 'আইসক্রিম',
    ml: 'ഐസ്ക്രീം',
  },
  samosa: {
    hi: 'समोसा',
    mr: 'समोसा',
    ta: 'சமோசா',
    te: 'సమోసా',
    kn: 'ಸಮೋಸಾ',
    gu: 'સમોસા',
    bn: 'সিঙাড়া / সমোসা',
    ml: 'സമോസ',
  },
  sandwich: {
    hi: 'सैंडविच',
    mr: 'सँडविच',
    ta: 'சாண்ட்விச்',
    te: 'శాండ్‌విచ్',
    kn: 'ಸ್ಯಾಂಡ್‌ವಿಚ್',
    gu: 'સેન્ડવિચ',
    bn: 'স্যান্ডউইচ',
    ml: 'സാൻഡ്‌വിച്ച്',
  },
  burger: {
    hi: 'बर्गर',
    mr: 'बर्गर',
    ta: 'பர்கர்',
    te: 'బర్గర్',
    kn: 'ಬರ್ಗರ್',
    gu: 'બર્ગર',
    bn: 'বার্গার',
    ml: 'ബർഗർ',
  },
  pizza: {
    hi: 'पिज़्ज़ा',
    mr: 'पिझ्झा',
    ta: 'பீட்சா',
    te: 'పిజ్జా',
    kn: 'ಪಿಜ್ಜಾ',
    gu: 'પીઝા',
    bn: 'পিজ্জা',
    ml: 'പിസ്സ',
  },
  noodles: {
    hi: 'नूडल्स',
    mr: 'नुडल्स',
    ta: 'நூடூல்ஸ்',
    te: 'నూడుల్స్',
    kn: 'ನೂಡಲ್ಸ್',
    gu: 'નૂડલ્સ',
    bn: 'নুডুলস',
    ml: 'നൂഡിൽസ്',
  },
  'fried rice': {
    hi: 'फ्राइड राइस',
    mr: 'फ्राइड राइस',
    ta: 'ஃப்ரைட் ரைஸ்',
    te: 'ఫ్రైడ్ రైస్',
    kn: 'ಫ್ರೈಡ್ ರೈಸ್',
    gu: 'ફ્રાઇડ રાઇસ',
    bn: 'ফ্রাইড রাইস',
    ml: 'ഫ്രൈഡ് റൈസ്',
  },
  soup: {
    hi: 'सूप',
    mr: 'सूप',
    ta: 'சூப்',
    te: 'సూప్',
    kn: 'ಸೂಪ್',
    gu: 'સૂપ',
    bn: 'সুপ',
    ml: 'സൂപ്പ്',
  },
  salad: {
    hi: 'सलाद',
    mr: 'सलाड',
    ta: 'சாலட்',
    te: 'సలాడ్',
    kn: 'ಸಲಾಡ್',
    gu: 'સલાડ',
    bn: 'স্যালাড',
    ml: 'സാലഡ്',
  },
  water: {
    hi: 'पानी',
    mr: 'पाणी',
    ta: 'தண்ணீர்',
    te: 'నీరు',
    kn: 'ನೀರು',
    gu: 'પાણી',
    bn: 'জল',
    ml: 'വെള്ളം',
  },
  'mineral water': {
    hi: 'मिनरल वाटर',
    mr: 'मिनरल वॉटर',
    ta: 'மினரல் வாட்டர்',
    te: 'మినరల్ వాటర్',
    kn: 'ಮಿನರಲ್ ವಾಟರ್',
    gu: 'મિનરલ વોટર',
    bn: 'মিনারেল ওয়াটার',
    ml: 'മിനറൽ വാട്ടർ',
  },
};

// Base phonetic phonemes mapping for Devanagari (hi, mr)
type Phoneme = {
  vowel?: { ind: string; matra: string };
  cons?: string;
};

// Devanagari mappings
const DEV_VOWELS: Record<string, { ind: string; matra: string }> = {
  a: { ind: 'अ', matra: '' },
  aa: { ind: 'आ', matra: 'ा' },
  i: { ind: 'इ', matra: 'ि' },
  ee: { ind: 'ई', matra: 'ी' },
  ii: { ind: 'ई', matra: 'ी' },
  u: { ind: 'उ', matra: 'ु' },
  oo: { ind: 'ऊ', matra: 'ू' },
  uu: { ind: 'ऊ', matra: 'ू' },
  e: { ind: 'ए', matra: 'े' },
  ai: { ind: 'ऐ', matra: 'ै' },
  o: { ind: 'ओ', matra: 'ो' },
  au: { ind: 'औ', matra: 'ौ' },
  ou: { ind: 'औ', matra: 'ौ' },
};

const DEV_CONSONANTS: Record<string, string> = {
  k: 'क',
  kh: 'ख',
  g: 'ग',
  gh: 'घ',
  ch: 'च',
  chh: 'छ',
  j: 'ज',
  jh: 'झ',
  t: 'ट',
  th: 'ठ',
  d: 'ड',
  dh: 'ढ',
  n: 'न',
  p: 'प',
  ph: 'फ',
  f: 'फ़',
  b: 'ब',
  bh: 'भ',
  m: 'म',
  y: 'य',
  r: 'र',
  l: 'ल',
  v: 'व',
  w: 'व',
  sh: 'श',
  shh: 'ष',
  s: 'स',
  h: 'ह',
  z: 'ज़',
};

// Script unicode offsets relative to Devanagari (0x0900)
// Most Brahmic scripts follow a nearly identical code-point allocation relative to their block start!
const SCRIPT_OFFSETS: Partial<Record<SupportedLang, number>> = {
  hi: 0x0900,
  mr: 0x0900,
  bn: 0x0980,
  gu: 0x0a80,
  ta: 0x0b80,
  te: 0x0c00,
  kn: 0x0c80,
  ml: 0x0d00,
};

/**
 * Phonetically transliterate standard English phonetic text to Devanagari.
 */
function toDevanagari(text: string): string {
  const s = text.toLowerCase().trim();
  let result = '';
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    // Non-alphabet
    if (!/[a-z]/.test(ch)) {
      result += ch;
      i++;
      continue;
    }

    // Check multi-char consonants first
    const two = s.slice(i, i + 2);
    const three = s.slice(i, i + 3);

    let cons: string | undefined;
    let consLen = 0;

    if (three in DEV_CONSONANTS) {
      cons = DEV_CONSONANTS[three];
      consLen = 3;
    } else if (two in DEV_CONSONANTS) {
      cons = DEV_CONSONANTS[two];
      consLen = 2;
    } else if (ch in DEV_CONSONANTS) {
      cons = DEV_CONSONANTS[ch];
      consLen = 1;
    }

    if (cons) {
      i += consLen;
      // Check for vowel after consonant
      const nextTwo = s.slice(i, i + 2);
      const nextOne = s[i];

      let v: { ind: string; matra: string } | undefined;
      let vLen = 0;

      if (nextTwo.length === 2 && nextTwo in DEV_VOWELS) {
        v = DEV_VOWELS[nextTwo];
        vLen = 2;
      } else if (nextOne in DEV_VOWELS) {
        v = DEV_VOWELS[nextOne];
        vLen = 1;
      }

      if (v) {
        let matra = v.matra;
        // If single 'a' at end of word, use 'aa' matra (e.g. Poha -> पोहा, Sheera -> शीरा)
        if (nextOne === 'a' && vLen === 1) {
          const atWordEnd = i + 1 >= s.length || !/[a-z]/.test(s[i + 1]);
          if (atWordEnd) {
            matra = 'ा';
          }
        }
        result += cons + matra;
        i += vLen;
      } else {
        // Consonant followed by consonant or end of word
        // In Hindi/Marathi culinary names, final consonant doesn't get halant, but internal cluster does
        const hasNextLetter = i < s.length && /[a-z]/.test(s[i]);
        if (hasNextLetter) {
          result += cons + '्'; // halant
        } else {
          result += cons;
        }
      }
      continue;
    }

    // Standalone vowel
    if (two.length === 2 && two in DEV_VOWELS) {
      result += DEV_VOWELS[two].ind;
      i += 2;
    } else if (ch in DEV_VOWELS) {
      result += DEV_VOWELS[ch].ind;
      i += 1;
    } else {
      result += ch;
      i++;
    }
  }

  return result;
}

/**
 * Convert Devanagari text to another Brahmic script by matching unicode points
 * with script-specific fallbacks (e.g. Tamil missing aspirated consonants).
 */
function devanagariToScript(devText: string, lang: SupportedLang): string {
  if (lang === 'hi' || lang === 'mr') return devText;
  const targetOffset = SCRIPT_OFFSETS[lang];
  if (!targetOffset) return devText;

  let out = '';
  for (let idx = 0; idx < devText.length; idx++) {
    const code = devText.charCodeAt(idx);
    // Devanagari block is 0x0900..0x097F
    if (code >= 0x0901 && code <= 0x0970) {
      const rel = code - 0x0900;
      let targetCode = targetOffset + rel;

      // Script specific adjustments (e.g., Tamil does not have positions for 0x16 (kh), 0x17 (g), 0x18 (gh) etc.)
      if (lang === 'ta') {
        // Map aspirated/voiced consonants to base unvoiced in Tamil
        if (rel >= 0x15 && rel <= 0x18) targetCode = 0x0b80 + 0x15; // க
        else if (rel >= 0x1a && rel <= 0x1d) targetCode = 0x0b80 + 0x1a; // ச
        else if (rel >= 0x1f && rel <= 0x22) targetCode = 0x0b80 + 0x1f; // ட
        else if (rel >= 0x24 && rel <= 0x27) targetCode = 0x0b80 + 0x24; // த
        else if (rel >= 0x2a && rel <= 0x2d) targetCode = 0x0b80 + 0x2a; // ப
        else if (rel === 0x36 || rel === 0x37) targetCode = 0x0b80 + 0x38; // ஸ
      }

      out += String.fromCharCode(targetCode);
    } else {
      out += devText[idx];
    }
  }
  return out;
}

/**
 * Main transliteration function.
 * Given an English string and a target language code, returns the transliterated/localized string.
 */
export function transliterateTo(englishText: string, targetLang: string): string {
  const trimmed = englishText.trim();
  if (!trimmed) return '';
  if (targetLang === 'en') return trimmed;

  const lang = targetLang as SupportedLang;

  // 1. Direct dictionary match for whole phrase (case insensitive)
  const key = trimmed.toLowerCase();
  if (DICTIONARY[key]?.[lang]) {
    return DICTIONARY[key]![lang]!;
  }

  // 2. Word-by-word dictionary translation if available
  const words = trimmed.split(/(\s+)/);
  let allMapped = true;
  const mappedWords = words.map((w) => {
    if (/^\s+$/.test(w)) return w;
    const wKey = w.toLowerCase();
    if (DICTIONARY[wKey]?.[lang]) {
      return DICTIONARY[wKey]![lang]!;
    }
    allMapped = false;
    return w;
  });

  if (allMapped) {
    return mappedWords.join('');
  }

  // 3. Phonetic transliteration
  const dev = toDevanagari(trimmed);
  return devanagariToScript(dev, lang);
}
