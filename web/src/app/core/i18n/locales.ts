/** The four supported locales (spec R6). The schema accommodates more without change (spec
 * §14.2 #5) — adding one means a new entry here, a new bundle, and a seed changelog. */
export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
