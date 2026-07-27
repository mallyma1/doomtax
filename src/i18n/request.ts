import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, LOCALES, type LocaleCode } from './config';

function negotiateLocale(acceptLanguage: string | null): LocaleCode {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const codes = LOCALES.map((l) => l.code);
  for (const part of acceptLanguage.split(',')) {
    const tag = part.trim().split(';')[0].trim();
    // Exact match
    if (codes.includes(tag as LocaleCode)) return tag as LocaleCode;
    // Language-only match (e.g. 'en' matches 'en-GB')
    const lang = tag.split('-')[0];
    const found = codes.find((c) => c.startsWith(lang));
    if (found) return found as LocaleCode;
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value as
    | LocaleCode
    | undefined;
  const codes = LOCALES.map((l) => l.code) as string[];
  const locale: LocaleCode =
    cookieLocale && codes.includes(cookieLocale)
      ? cookieLocale
      : negotiateLocale(headerStore.get('accept-language'));

  const messages = (await import(`./messages/${locale}.json`)).default;

  return { locale, messages };
});
