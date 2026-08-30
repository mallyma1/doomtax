'use client';

import { CountdownRing } from '@/components/CountdownRing';
import { UsdHint } from '@/components/UsdHint';
import { Button, Typography } from '@worldcoin/mini-apps-ui-kit-react';
import { useTranslations } from 'next-intl';

interface LiveSessionProps {
  intention: string;
  secondsLeft: number;
  totalSeconds: number;
  stakeHbar: number;
  interruptions: number;
  demoMode?: boolean;
  onFinishEarly: () => void;
  onRequestDisarm: () => void;
}

type MilestoneKey =
  | 'milestoneSettle'
  | 'milestoneHalfway'
  | 'milestoneFinal';

function getMilestoneKey(progress: number): MilestoneKey | null {
  if (progress < 0.25) return 'milestoneSettle';
  if (progress < 0.5) return null;
  if (progress < 0.85) return 'milestoneHalfway';
  return 'milestoneFinal';
}

/**
 * The session while value is at stake.
 *
 * Intentionally the sparsest screen in the app. The user is supposed to be
 * working, not reading an interface, so the only things present are the clock,
 * the sentence they committed to, and the way out.
 */
export const LiveSession = ({
  intention,
  secondsLeft,
  totalSeconds,
  stakeHbar,
  interruptions,
  demoMode = false,
  onFinishEarly,
  onRequestDisarm,
}: LiveSessionProps) => {
  const t = useTranslations('LiveSession');
  const elapsed = Math.max(0, totalSeconds - secondsLeft);
  const progress = totalSeconds > 0 ? Math.min(1, elapsed / totalSeconds) : 0;
  const caption =
    totalSeconds < 60
      ? t('captionSeconds', { count: totalSeconds })
      : t('captionMinutes', { count: Math.round(totalSeconds / 60) });
  const milestoneKey = getMilestoneKey(progress);

  // Glow intensity increases as time depletes
  const glowStrength = Math.max(0, Math.min(1, progress));
  const isFinalStretch = progress >= 0.85;

  return (
    <div className="animate-fade-up flex h-full min-h-full w-full flex-col items-center justify-between gap-3 py-0">
      <div className="card-raised w-full shrink-0 rounded-2xl border border-border bg-surface px-4 py-2.5">
        {/* The commitment is what this screen is about, so it is its heading. */}
        <Typography as="h1" variant="body" level={3} className="text-foreground">
          {intention}
        </Typography>
        {demoMode && (
          <div className="mt-2 flex items-center gap-2">
            <span className="mono-caption rounded-full border border-border px-2.5 py-1 text-faint">
              {t('demoLabel')}
            </span>
          </div>
        )}
      </div>

      {/* min-h-0 lets this shrink below the ring's natural size on short screens. */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        style={{
          filter: `drop-shadow(0 0 ${8 + glowStrength * 16}px rgba(245,158,11,${0.15 + glowStrength * 0.25}))`,
        }}
      >
        <CountdownRing
          remaining={secondsLeft}
          progress={progress}
          caption={caption}
        />
      </div>

      {milestoneKey && (
        <p
          key={milestoneKey}
          className={`animate-fade-up mono-caption hidden text-center text-faint min-[380px]:block ${isFinalStretch ? 'text-accent' : ''}`}
        >
          {t(milestoneKey)}
        </p>
      )}

      <div className="flex w-full flex-col items-center gap-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5">
            <span className="animate-dot-live size-1.5 rounded-full bg-accent" aria-hidden="true" />
            <span className="hbar-amount text-sm font-semibold text-accent">
              {t('atStake', { stake: stakeHbar })}
            </span>
          </span>
          <span
            key={interruptions}
            className={`mono-caption text-xs text-faint ${interruptions > 0 ? 'animate-pop-in' : ''}`}
          >
            {interruptions === 0
              ? t('noInterruptions')
              : t('interruptions', { count: interruptions })}
          </span>
        </div>
        <UsdHint hbar={stakeHbar} />
      </div>

      <div className="mt-3 flex w-full shrink-0 flex-col items-center gap-2">
        <Button variant="primary" size="lg" fullWidth onClick={onFinishEarly}>
          {t('finishEarly')}
        </Button>

        {/*
          Deliberately the quietest control on the screen. Disarming is always
          available and never penalised, but it should not compete with
          finishing the work.
        */}
        <button
          type="button"
          onClick={onRequestDisarm}
          className="-my-3 py-3 text-sm text-faint underline underline-offset-4 transition-colors hover:text-muted min-h-[44px]"
        >
          {t('disarm')}
        </button>
      </div>
    </div>
  );
};
