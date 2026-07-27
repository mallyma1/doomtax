'use client';
import { walletAuth } from '@/auth/wallet';
import { WORLD_MINI_APP_URL } from '@/lib/world';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

const ONBOARDING_STEPS = [
  {
    text: "Get World App — it's a free app, like any other.",
    link: { href: 'https://world.org/download', label: 'world.org/download' },
  },
  {
    text: 'Open World App and tap the QR scanner on the main tab, then point it at this code.',
  },
  {
    text: 'DoomTax opens inside World App. Tap Connect — it signs one message to say it\'s you. Nothing is charged, nothing moves. DoomTax sets up your session account automatically — nothing else to connect.',
  },
  {
    text: 'Runs on Hedera testnet — stakes carry no real-world money today.',
  },
] as const;

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

  // Inside World App — show the connect button
  if (isInstalled) {
    return (
      <div className="w-full max-w-[36ch]">
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
      </div>
    );
  }

  // Not in World App — show QR-first onboarding card
  return (
    <div className="card-raised w-full max-w-xl animate-fade-up rounded-2xl border border-border bg-surface p-5">
      <p className="mono-caption text-accent">GET STARTED</p>
      <div className="mt-4 flex justify-center">
        <div className="rounded-2xl bg-white p-3">
          <Image
            src="/qr-doomtax.png"
            alt="Scan to open DoomTax in World App"
            width={180}
            height={180}
            priority
          />
        </div>
      </div>
      <ol className="mt-5 space-y-3">
        {ONBOARDING_STEPS.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-muted">
            <span className="mono-caption mt-0.5 shrink-0 text-faint">
              {i + 1}.
            </span>
            <span className="max-w-[36ch] leading-relaxed">
              {step.text}
              {'link' in step && step.link && (
                <>
                  {' '}
                  <a
                    href={step.link.href}
                    className="text-foreground underline underline-offset-4"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {step.link.label}
                  </a>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-5 border-t border-border pt-4 text-center text-sm text-muted">
        On your phone already?{' '}
        <a
          href={WORLD_MINI_APP_URL}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Open DoomTax in World App
        </a>
      </div>
    </div>
  );
};
