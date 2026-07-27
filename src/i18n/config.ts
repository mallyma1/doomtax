export const LOCALES = [
  { code: 'en-GB', endonym: 'English (UK)', dir: 'ltr' as const },
  { code: 'pt', endonym: 'Português', dir: 'ltr' as const },
  { code: 'es', endonym: 'Español', dir: 'ltr' as const },
  { code: 'fr', endonym: 'Français', dir: 'ltr' as const },
  { code: 'de', endonym: 'Deutsch', dir: 'ltr' as const },
  { code: 'ru', endonym: 'Русский', dir: 'ltr' as const },
  { code: 'ar', endonym: 'العربية', dir: 'rtl' as const },
  { code: 'zh', endonym: '中文', dir: 'ltr' as const },
  { code: 'hi', endonym: 'हिन्दी', dir: 'ltr' as const },
  { code: 'ur', endonym: 'اردو', dir: 'rtl' as const },
  { code: 'bn', endonym: 'বাংলা', dir: 'ltr' as const },
  { code: 'sw', endonym: 'Kiswahili', dir: 'ltr' as const },
  { code: 'ha', endonym: 'Hausa', dir: 'ltr' as const },
  { code: 'tw', endonym: 'Twi', dir: 'ltr' as const },
] as const;

export type LocaleCode = (typeof LOCALES)[number]['code'];
export const DEFAULT_LOCALE: LocaleCode = 'en-GB';
export const RTL_LOCALES: LocaleCode[] = ['ar', 'ur'];
