'use client';

import { Sheet } from '@/components/Sheet';
import { UsdHint } from '@/components/UsdHint';
import { Button, Typography } from '@worldcoin/mini-apps-ui-kit-react';
import { useTranslations } from 'next-intl';

interface ConfirmSheetProps {
  stakeHbar: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Bottom sheet confirming amnesty.
 *
 * Disarming is irreversible for the session it ends, so it gets a confirmation
 * step even though it always resolves in the user's favour. The sheet chrome —
 * Escape, focus trap, scroll lock — comes from the shared Sheet primitive.
 */
export const ConfirmSheet = ({
  stakeHbar,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) => {
  const t = useTranslations('ConfirmSheet');
  const tc = useTranslations('Common');

  return (
    <Sheet
      onClose={onCancel}
      labelledBy="disarm-title"
      closeLabel={tc('cancel')}
    >
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
          stake: stakeHbar,
          amount: (chunks) => (
            <>
              <span className="hbar-amount text-foreground">{chunks}</span>{' '}
              <UsdHint hbar={stakeHbar} className="inline" />
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
    </Sheet>
  );
};
