'use client';

import { LOCALES, type LocaleCode } from '@/i18n/config';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export const LanguageSwitcher = () => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const currentLocale = useLocale() as LocaleCode;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const selectLocale = (code: LocaleCode) => {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`;
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        aria-label="Change language"
        onClick={() => setOpen(true)}
        className="-my-3 flex min-h-[44px] items-center py-3 text-sm text-muted transition-colors hover:text-foreground"
      >
        <span aria-hidden="true">文A</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            aria-label="Close language picker"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Select language"
            tabIndex={-1}
            className="animate-sheet-up relative max-h-[75dvh] overflow-y-auto rounded-t-3xl border-t border-border bg-surface px-6 pb-[max(2.25rem,env(safe-area-inset-bottom))] pt-5 outline-none"
          >
            <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border" aria-hidden="true" />
            <p className="mono-caption text-accent">Language</p>
            <ul className="mt-4 space-y-1">
              {LOCALES.map((locale) => (
                <li key={locale.code}>
                  <button
                    type="button"
                    onClick={() => selectLocale(locale.code)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm transition-colors hover:bg-surface-raised"
                    dir={locale.dir}
                  >
                    <span className={locale.code === currentLocale ? 'text-foreground font-medium' : 'text-muted'}>
                      {locale.endonym}
                    </span>
                    {locale.code === currentLocale && (
                      <span className="text-accent" aria-label="current">✓</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};
