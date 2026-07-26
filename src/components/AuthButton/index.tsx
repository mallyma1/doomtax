'use client';
import { walletAuth } from '@/auth/wallet';
import { WORLD_MINI_APP_URL } from '@/lib/world';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Prompts wallet authentication via MiniKit + Next Auth.
 * Read More: https://docs.world.org/mini-apps/commands/wallet-auth
 */
export const AuthButton = () => {
  const [isPending, setIsPending] = useState(false);
  const { isInstalled } = useMiniKit();
  const { status } = useSession();
  const hasAttemptedAuth = useRef(false);

  const onClick = useCallback(async () => {
    if (isPending) {
      return;
    }

    if (!isInstalled) {
      window.location.assign(WORLD_MINI_APP_URL);
      return;
    }

    setIsPending(true);
    try {
      await walletAuth();
    } catch (error) {
      console.error('Wallet authentication button error', error);
    } finally {
      setIsPending(false);
    }
  }, [isInstalled, isPending]);

  // Auto-authenticate on load when MiniKit is ready
  useEffect(() => {
    if (isInstalled === true && status === 'unauthenticated' && !hasAttemptedAuth.current) {
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

  if (status === 'authenticated') {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <LiveFeedback
        label={{
          failed: 'Failed to login',
          pending: 'Logging in',
          success: 'Logged in',
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
          Connect World App
        </Button>
      </LiveFeedback>
      {!isInstalled && (
        <p className="text-center text-sm text-muted">
          Not in World App?{' '}
          <a
            href={WORLD_MINI_APP_URL}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Open DoomTax in World App
          </a>
          .
        </p>
      )}
    </div>
  );
};
