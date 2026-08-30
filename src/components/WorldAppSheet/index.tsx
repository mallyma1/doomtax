'use client';

import { Sheet } from '@/components/Sheet';
import { WORLD_MINI_APP_URL } from '@/lib/world';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

const ONBOARDING_STEP_KEYS = ['step1', 'step2', 'step3', 'step4'] as const;

/**
 * How to get into World App, on demand.
 *
 * This used to be an always-rendered card on the page body. Outside World App
 * it pushed the product itself roughly a thousand pixels down the scroll — a
 * first-time visitor met a QR code before they met DoomTax — and because the
 * root page rendered it above the session flow, it also sat on top of the live
 * countdown, which is meant to be the sparsest screen in the app.
 *
 * Setup is a one-time task, so it belongs behind a one-time tap.
 */
export const WorldAppSheet = ({ onClose }: { onClose: () => void }) => {
  const t = useTranslations('AuthButton');
  const tc = useTranslations('Common');

  return (
    <Sheet onClose={onClose} labelledBy="worldapp-title" closeLabel={tc('close')}>
      <p className="mono-caption text-accent">{t('getStarted')}</p>
      <h2
        id="worldapp-title"
        className="mt-1.5 text-xl font-semibold text-foreground"
      >
        {t('sheetTitle')}
      </h2>

      <div className="mt-5 flex justify-center">
        <div className="rounded-2xl bg-white p-3">
          <Image
            src="/qr-doomtax.png"
            alt={tc('qrAlt')}
            width={168}
            height={168}
            priority
          />
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {ONBOARDING_STEP_KEYS.map((key, i) => (
          <li key={key} className="flex gap-3 text-sm text-muted">
            <span className="mono-caption mt-0.5 shrink-0 text-faint">
              {i + 1}.
            </span>
            <span className="max-w-[36ch] leading-relaxed">
              {t(key)}
              {key === 'step1' && (
                <>
                  {' '}
                  <a
                    href="https://world.org/download"
                    className="text-foreground underline underline-offset-4"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('step1LinkLabel')}
                  </a>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-5 border-t border-border pt-4 text-center text-sm text-muted">
        {tc('onYourPhone')}{' '}
        <a
          href={WORLD_MINI_APP_URL}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {tc('openInWorldApp')}
        </a>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-6 h-12 w-full rounded-full border border-border text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        {tc('close')}
      </button>
    </Sheet>
  );
};
