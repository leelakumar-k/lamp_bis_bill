// Profession names use the words people actually say on site in each language,
// which are often English loanwords (e.g. "प्लंबर"), not dictionary meanings.
export const PROFESSIONS = [
  'Mason',
  'Helper',
  'Carpenter',
  'Electrician',
  'Plumber',
  'Painter',
  'Welder',
  'Supervisor',
  'Driver',
  'Cook',
  'Worker',
] as const;

type ProfessionNames = Record<(typeof PROFESSIONS)[number], string>;

export const professionNames: Record<string, ProfessionNames> = {
  hi: {
    Mason: 'मिस्त्री', Helper: 'हेल्पर', Carpenter: 'बढ़ई', Electrician: 'इलेक्ट्रीशियन',
    Plumber: 'प्लंबर', Painter: 'पेंटर', Welder: 'वेल्डर', Supervisor: 'सुपरवाइज़र',
    Driver: 'ड्राइवर', Cook: 'रसोइया', Worker: 'मज़दूर',
  },
  mr: {
    Mason: 'गवंडी', Helper: 'हेल्पर', Carpenter: 'सुतार', Electrician: 'इलेक्ट्रिशियन',
    Plumber: 'प्लंबर', Painter: 'पेंटर', Welder: 'वेल्डर', Supervisor: 'सुपरवायझर',
    Driver: 'ड्रायव्हर', Cook: 'आचारी', Worker: 'कामगार',
  },
  gu: {
    Mason: 'કડિયા', Helper: 'હેલ્પર', Carpenter: 'સુથાર', Electrician: 'ઇલેક્ટ્રિશિયન',
    Plumber: 'પ્લમ્બર', Painter: 'પેઇન્ટર', Welder: 'વેલ્ડર', Supervisor: 'સુપરવાઇઝર',
    Driver: 'ડ્રાઇવર', Cook: 'રસોઇયો', Worker: 'મજૂર',
  },
  bn: {
    Mason: 'রাজমিস্ত্রি', Helper: 'হেল্পার', Carpenter: 'ছুতোর মিস্ত্রি', Electrician: 'ইলেকট্রিশিয়ান',
    Plumber: 'প্লাম্বার', Painter: 'পেইন্টার', Welder: 'ওয়েল্ডার', Supervisor: 'সুপারভাইজার',
    Driver: 'ড্রাইভার', Cook: 'রাঁধুনি', Worker: 'শ্রমিক',
  },
  ta: {
    Mason: 'கொத்தனார்', Helper: 'ஹெல்பர்', Carpenter: 'தச்சர்', Electrician: 'எலக்ட்ரீஷியன்',
    Plumber: 'பிளம்பர்', Painter: 'பெயிண்டர்', Welder: 'வெல்டர்', Supervisor: 'சூப்பர்வைசர்',
    Driver: 'டிரைவர்', Cook: 'சமையல்காரர்', Worker: 'தொழிலாளி',
  },
  te: {
    Mason: 'మేస్త్రీ', Helper: 'హెల్పర్', Carpenter: 'వడ్రంగి', Electrician: 'ఎలక్ట్రీషియన్',
    Plumber: 'ప్లంబర్', Painter: 'పెయింటర్', Welder: 'వెల్డర్', Supervisor: 'సూపర్‌వైజర్',
    Driver: 'డ్రైవర్', Cook: 'వంటమనిషి', Worker: 'కూలీ',
  },
  kn: {
    Mason: 'ಮೇಸ್ತ್ರಿ', Helper: 'ಹೆಲ್ಪರ್', Carpenter: 'ಬಡಗಿ', Electrician: 'ಎಲೆಕ್ಟ್ರೀಷಿಯನ್',
    Plumber: 'ಪ್ಲಂಬರ್', Painter: 'ಪೇಂಟರ್', Welder: 'ವೆಲ್ಡರ್', Supervisor: 'ಸೂಪರ್‌ವೈಸರ್',
    Driver: 'ಡ್ರೈವರ್', Cook: 'ಅಡುಗೆಯವರು', Worker: 'ಕೂಲಿ ಕಾರ್ಮಿಕ',
  },
  ml: {
    Mason: 'മേസ്തിരി', Helper: 'ഹെൽപ്പർ', Carpenter: 'ആശാരി', Electrician: 'ഇലക്ട്രീഷ്യൻ',
    Plumber: 'പ്ലംബർ', Painter: 'പെയിന്റർ', Welder: 'വെൽഡർ', Supervisor: 'സൂപ്പർവൈസർ',
    Driver: 'ഡ്രൈവർ', Cook: 'പാചകക്കാരൻ', Worker: 'തൊഴിലാളി',
  },
};

export function builtInProfession(lang: string, english: string): string | undefined {
  return (professionNames[lang] as Record<string, string> | undefined)?.[english];
}
