'use client';
import { walletAuth } from '@/auth/wallet';
import { WorldAppSheet } from '@/components/WorldAppSheet';
import { Button, LiveFeedback, Marble } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The account line under the primary action on the idle screen.
 *
 * One row, three states: signed in, in World App but not yet connected, or not
 * in World App at all. Only the middle state is a button, because it is the
 * only one asking for something. The setup path is a link to a sheet rather
 * than a card on the page — see WorldAppSheet for why.
 *
 * Read More: https://docs.world.org/mini-apps/commands/wallet-auth
 */
export const AuthButton = () => {
  const [isPending, setIsPending] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const { isInstalled } = useMiniKit();
  const { data: session, status } = useSession();
  const hasAttemptedAuth = useRef(false);
  const t = useTranslations('AuthButton');

  const onClick = useCallback(async () => {
    if (isPending) return;

    setIsPending(true);
    try {
      await walletAuth();
    } catch (error) {
      console.error('Wallet authentication button error', error);
    } finally {
      setIsPending(false);
    }
  }, [isPending]);

  // Auto-authenticate on load when MiniKit is ready
  useEffect(() => {
    if (
      isInstalled === true &&
      status === 'unauthenticated' &&
      !hasAttemptedAuth.current
    ) {
      hasAttemptedAuth.current = true;
      setIsPending(true);
      walletAuth()
        .catch((error) => {
          console.error('Auto wallet authentication error', error);
        })
        .finally(() => {
          setIsPending(false);
        });
    }
  }, [isInstalled, status]);

  // Signed in — a quiet confirmation of who is staking, not a card.
  if (status === 'authenticated') {
    const username = session?.user?.username;
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-muted">
        <Marble
          src={session?.user?.profilePictureUrl}
          className="size-6 shrink-0"
        />
        <span className="truncate">
          {username ? t('signedInAs', { username }) : t('signedIn')}
        </span>
      </div>
    );
  }

  // Inside World App — the one state that asks the user for something.
  if (isInstalled) {
    return (
      <LiveFeedback
        label={{
          failed: t('loginFailed'),
          pending: t('loginPending'),
          success: t('loginSuccess'),
        }}
        state={isPending ? 'pending' : undefined}
      >
        <Button
          onClick={onClick}
          disabled={isPending}
          size="lg"
          variant="tertiary"
          fullWidth
        >
          {t('connect')}
        </Button>
      </LiveFeedback>
    );
  }

  // Not in World App — one line, with the setup steps a tap away.
  return (
    <>
      <p className="text-center text-sm text-muted">
        {t('notInWorldApp')}{' '}
        <button
          type="button"
          onClick={() => setSetupOpen(true)}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {t('setUpInWorldApp')}
        </button>
      </p>
      {setupOpen && <WorldAppSheet onClose={() => setSetupOpen(false)} />}
    </>
  );
};
