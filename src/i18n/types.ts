import type { StringKey } from './strings/en';

export type Translation = Partial<Record<StringKey, string>>;
export type { StringKey };
