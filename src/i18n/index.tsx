import { createContext, type ReactNode, use, useMemo } from 'react';

import { categoryKey, getOverrides, itemKey, professionKey, workerKey } from '@/db/translations';
import { fullName } from '@/db/workers';
import { useDbQuery, useSettings } from '@/providers/database';

import { getLanguage, type Language } from './languages';
import { builtInProfession } from './professions';
import { en, type StringKey } from './strings/en';

type Vars = Record<string, string | number>;
type NameSource = { first_name: string; last_name: string | null };

export type I18n = {
  lang: string;
  language: Language;
  locale: string;
  t: (key: StringKey, vars?: Vars) => string;
  /** Built-in text for a key in the current language, ignoring user edits. */
  builtIn: (key: StringKey) => string | undefined;
  profession: (english: string) => string;
  workerName: (id: string, worker: NameSource) => string;
  /** Dish and category names as written in the current language; English is the base. */
  itemName: (id: string | null, english: string) => string;
  categoryName: (id: string | null, english: string) => string;
  overrides: Record<string, string>;
};

const interpolate = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match)) : text;

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { language: code } = useSettings();
  const { data: overrides = {} } = useDbQuery(['translations', code], (db) => getOverrides(db, code));

  const value = useMemo<I18n>(() => {
    const language = getLanguage(code);
    const isEnglish = language.code === 'en';
    const vars = (v?: Vars) => ({ language: language.nativeName, ...v });
    return {
      lang: language.code,
      language,
      locale: language.locale,
      overrides,
      builtIn: (key) => language.strings[key],
      t: (key, v) => interpolate(overrides[key] ?? language.strings[key] ?? en[key], vars(v)),
      profession: (english) =>
        isEnglish ? english : (overrides[professionKey(english)] ?? builtInProfession(code, english) ?? english),
      workerName: (id, worker) => (isEnglish ? fullName(worker) : (overrides[workerKey(id)] ?? fullName(worker))),
      itemName: (id, english) => (isEnglish || !id ? english : (overrides[itemKey(id)] ?? english)),
      categoryName: (id, english) => (isEnglish || !id ? english : (overrides[categoryKey(id)] ?? english)),
    };
  }, [code, overrides]);

  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n() {
  const value = use(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}

export type { StringKey };
