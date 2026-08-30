'use client';

import { LOCALES, type LocaleCode } from '@/i18n/config';
import { Sheet } from '@/components/Sheet';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

export const LanguageSwitcher = () => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const currentLocale = useLocale() as LocaleCode;
  const t = useTranslations('LanguageSwitcher');

  const selectLocale = (code: LocaleCode) => {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`;
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        aria-label={t('changeLanguage')}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="-my-3 flex min-h-[44px] items-center py-3 text-sm text-muted transition-colors hover:text-foreground"
      >
        <span aria-hidden="true">文A</span>
      </button>

      {open && (
        <Sheet
          onClose={() => setOpen(false)}
          label={t('selectLanguage')}
          closeLabel={t('closePicker')}
        >
          <p className="mono-caption text-accent">{t('label')}</p>
          <ul className="mt-4 space-y-1">
            {LOCALES.map((locale) => {
              const isCurrent = locale.code === currentLocale;
              return (
                <li key={locale.code}>
                  <button
                    type="button"
                    onClick={() => selectLocale(locale.code)}
                    aria-current={isCurrent ? 'true' : undefined}
                    className="flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-3 text-sm transition-colors hover:bg-surface-raised"
                    dir={locale.dir}
                  >
                    <span
                      className={
                        isCurrent ? 'font-medium text-foreground' : 'text-muted'
                      }
                    >
                      {locale.endonym}
                    </span>
                    {isCurrent && (
                      <span className="text-accent" aria-label={t('current')}>
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Sheet>
      )}
    </>
  );
};
