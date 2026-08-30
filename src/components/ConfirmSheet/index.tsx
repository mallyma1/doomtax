'use client';

import { Sheet } from '@/components/Sheet';
import { UsdHint } from '@/components/UsdHint';
import { Button, Typography } from '@worldcoin/mini-apps-ui-kit-react';
import { useTranslations } from 'next-intl';

/**
 * - `disarm` ends a running session and returns the stake.
 * - `large-stake` is asked before a session starts, not after.
 */
type ConfirmVariant = 'disarm' | 'large-stake';

interface ConfirmSheetProps {
  stakeHbar: number;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The two moments worth one question before proceeding.
 *
 * Both are about the same number, so they share a sheet rather than growing a
 * second copy of it. Disarming is irreversible for the session it ends, and a
 * large stake is the one input a mistyped digit makes expensive — CLAUDE.md
 * asks for "confirmation before any large jump", which was specified and never
 * built: the amount field accepted any positive number and started the session
 * on a single tap.
 *
 * Chrome — Escape, focus trap, scroll lock, portal — comes from Sheet.
 */
export const ConfirmSheet = ({
  stakeHbar,
  variant = 'disarm',
  onConfirm,
  onCancel,
}: ConfirmSheetProps) => {
  const t = useTranslations('ConfirmSheet');
  const tc = useTranslations('Common');
  const isLargeStake = variant === 'large-stake';

  return (
    <Sheet
      onClose={onCancel}
      labelledBy="confirm-title"
      closeLabel={tc('cancel')}
    >
      <Typography
        as="h2"
        variant="heading"
        level={3}
        id="confirm-title"
        className="text-foreground"
      >
        {isLargeStake ? t('largeTitle', { stake: stakeHbar }) : t('title')}
      </Typography>

      {isLargeStake ? (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="hbar-amount text-3xl font-semibold text-accent">
              {stakeHbar} ℏ
            </span>
            <UsdHint hbar={stakeHbar} />
          </div>
          <Typography variant="body" level={3} className="mt-2.5 text-muted">
            {t('largeBody')}
          </Typography>
        </>
      ) : (
        <Typography variant="body" level={3} className="mt-2.5 text-muted">
          {t.rich('body', {
            stake: stakeHbar,
            amount: (chunks) => (
              <>
                <span className="hbar-amount text-foreground">{chunks}</span>{' '}
                <UsdHint hbar={stakeHbar} className="inline" />
              </>
            ),
          })}
        </Typography>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <Button variant="primary" size="lg" fullWidth onClick={onConfirm}>
          {isLargeStake ? t('largeConfirm', { stake: stakeHbar }) : t('confirm')}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="h-12 rounded-full text-sm font-semibold text-muted transition-colors hover:text-foreground"
        >
          {isLargeStake ? t('largeCancel') : t('cancel')}
        </button>
      </div>
    </Sheet>
  );
};
