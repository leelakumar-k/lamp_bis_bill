import { bn } from './strings/bn';
import { en } from './strings/en';
import { gu } from './strings/gu';
import { hi } from './strings/hi';
import { kn } from './strings/kn';
import { ml } from './strings/ml';
import { mr } from './strings/mr';
import { ta } from './strings/ta';
import { te } from './strings/te';
import type { Translation } from './types';

export type Language = {
  code: string;
  /** Name written in the language itself, so people can find their language. */
  nativeName: string;
  englishName: string;
  /** BCP 47 locale used for dates. */
  locale: string;
  strings: Translation;
};

export const LANGUAGES: Language[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', locale: 'en-IN', strings: en },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', locale: 'hi-IN', strings: hi },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', locale: 'mr-IN', strings: mr },
  { code: 'gu', nativeName: 'ગુજરાતી', englishName: 'Gujarati', locale: 'gu-IN', strings: gu },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', locale: 'bn-IN', strings: bn },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', locale: 'ta-IN', strings: ta },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', locale: 'te-IN', strings: te },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', locale: 'kn-IN', strings: kn },
  { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam', locale: 'ml-IN', strings: ml },
];

export function getLanguage(code: string) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
