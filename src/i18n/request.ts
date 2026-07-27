import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { DEFAULT_LOCALE, LOCALES, type LocaleCode } from './config';
import enGB from './messages/en-GB.json';

type MessageValue = string | MessageValue[] | { [key: string]: MessageValue };
type MessageTree = { [key: string]: MessageValue };

/**
 * Overlay a locale's messages on top of the English set.
 *
 * A key that is missing or still empty in a translation falls back to English
 * rather than throwing or rendering the raw key path. Translations land at a
 * different pace to the strings they translate, and a half-finished locale
 * should degrade to readable English, never to `StakeForm.startButton`.
 */
function isTree(value: MessageValue): value is { [key: string]: MessageValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withFallback(base: MessageTree, override: MessageTree): MessageTree {
  const merged: MessageTree = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const fallback = merged[key];
    if (isTree(value) && fallback !== undefined && isTree(fallback)) {
      merged[key] = withFallback(fallback, value);
    } else if (typeof value === 'string' && value.trim() === '') {
      // Keep the English string rather than rendering an empty element.
      continue;
    } else if (Array.isArray(value) && value.length === 0) {
      // An untranslated list should show the English list, not nothing.
      continue;
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

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

  const messages =
    locale === DEFAULT_LOCALE
      ? enGB
      : withFallback(
          enGB as MessageTree,
          (await import(`./messages/${locale}.json`)).default as MessageTree,
        );

  return { locale, messages: messages as Record<string, unknown> };
});
