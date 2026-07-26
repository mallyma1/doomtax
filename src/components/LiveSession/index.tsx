'use client';

import { CountdownRing } from '@/components/CountdownRing';
import { Button, Typography } from '@worldcoin/mini-apps-ui-kit-react';

interface LiveSessionProps {
  intention: string;
  secondsLeft: number;
  totalSeconds: number;
  stakeHbar: number;
  interruptions: number;
  onFinishEarly: () => void;
  onRequestDisarm: () => void;
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
  onFinishEarly,
  onRequestDisarm,
}: LiveSessionProps) => {
  const elapsed = Math.max(0, totalSeconds - secondsLeft);
  const progress = totalSeconds > 0 ? Math.min(1, elapsed / totalSeconds) : 0;
  const caption =
    totalSeconds < 60
      ? `of ${totalSeconds} seconds`
      : `of ${Math.round(totalSeconds / 60)} minutes`;

  return (
    <div className="flex h-full w-full flex-col items-center justify-between gap-6 py-2">
      <div className="w-full rounded-2xl border border-border bg-surface px-4 py-3">
        <Typography variant="body" level={3} className="text-foreground">
          {intention}
        </Typography>
      </div>

      <CountdownRing
        remaining={secondsLeft}
        progress={progress}
        caption={caption}
      />

      <div className="flex w-full items-center justify-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
          <span className="tabular text-sm font-semibold text-accent">
            {stakeHbar} ℏ at stake
          </span>
        </span>
        <span className="mono-caption text-xs text-faint">
          {interruptions === 0
            ? 'no interruptions'
            : `${interruptions} ${
                interruptions === 1 ? 'interruption' : 'interruptions'
              }`}
        </span>
      </div>

      <div className="flex w-full flex-col items-center gap-3">
        <Button variant="primary" size="lg" fullWidth onClick={onFinishEarly}>
          Finish early
        </Button>

        {/*
          Deliberately the quietest control on the screen. Disarming is always
          available and never penalised, but it should not compete with
          finishing the work.
        */}
        <button
          type="button"
          onClick={onRequestDisarm}
          className="py-1 text-sm text-faint underline underline-offset-4"
        >
          Disarm this session
        </button>
      </div>
    </div>
  );
};
