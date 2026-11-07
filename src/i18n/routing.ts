export const LOCALES = ['en', 'pt', 'es'] as const;

export type LOCALE = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: LOCALE = 'pt';

export function isLocale(value: string): value is LOCALE {
  return LOCALES.some((locale) => locale === value);
}