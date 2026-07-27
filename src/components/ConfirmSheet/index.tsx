'use client';

import { UsdHint } from '@/components/UsdHint';
import { Button, Typography } from '@worldcoin/mini-apps-ui-kit-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

interface ConfirmSheetProps {
  stakeHbar: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Bottom sheet confirming amnesty.
 *
 * Hand-rolled rather than using the kit's Drawer: that component bundles vaul
 * built against React 18, and its portal never mounts under React 19. This is
 * the one control that guarantees a user can always get their stake back, so
 * it should not depend on a mismatched transitive dependency.
 */
export const ConfirmSheet = ({
  stakeHbar,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('ConfirmSheet');
  const tc = useTranslations('Common');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    // Move focus into the sheet so the confirm is reachable by keyboard and
    // announced by a screen reader.
    panelRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label={tc('cancel')}
        onClick={onCancel}
        className="absolute inset-0 bg-black/70"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="disarm-title"
        tabIndex={-1}
        className="animate-sheet-up relative rounded-t-3xl border-t border-border bg-surface px-6 pb-9 pt-5 outline-none"
      >
        <div
          className="mx-auto mb-5 h-1 w-10 rounded-full bg-border"
          aria-hidden="true"
        />
        <Typography
          variant="heading"
          level={3}
          id="disarm-title"
          className="text-foreground"
        >
          {t('title')}
        </Typography>
        <Typography variant="body" level={3} className="mt-2.5 text-muted">
          {t.rich('body', {
            amount: () => (
              <>
                {stakeHbar} ℏ <UsdHint hbar={stakeHbar} className="inline" />
              </>
            ),
          })}
        </Typography>

        <div className="mt-6 flex flex-col gap-2">
          <Button variant="primary" size="lg" fullWidth onClick={onConfirm}>
            {t('confirm')}
          </Button>
          <button
            type="button"
            onClick={onCancel}
            className="h-12 rounded-full text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
