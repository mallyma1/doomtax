'use client';

import { Button, Typography } from '@worldcoin/mini-apps-ui-kit-react';
import { useState } from 'react';

const MAX_INTENTION = 140;

interface StakeFormProps {
  intention: string;
  onIntentionChange: (value: string) => void;
  stakeHbar: number;
  onStakeChange: (value: number) => void;
  /** From lib/session, so demo mode and the API agree on the options. */
  stakeOptions: readonly number[];
  durationSeconds: number;
  onStart: () => void;
}

function describeDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

/**
 * Where a commitment is made.
 *
 * The intention is written first and given the most room: it is the sole thing
 * the verdict is judged against, so the screen should make it feel
 * consequential rather than incidental to picking an amount.
 */
export const StakeForm = ({
  intention,
  onIntentionChange,
  stakeHbar,
  onStakeChange,
  stakeOptions,
  durationSeconds,
  onStart,
}: StakeFormProps) => {
  const [touched, setTouched] = useState(false);
  const tooShort = intention.trim().length < 8;

  return (
    <div className="flex w-full flex-col gap-7">
      <div>
        <Typography variant="heading" level={2} className="text-foreground">
          What will you do?
        </Typography>
        <Typography variant="body" level={3} className="mt-1.5 text-muted">
          Your coach judges you against this sentence and nothing else. Be
          specific enough that you could not talk yourself out of it later.
        </Typography>
      </div>

      <div>
        <textarea
          value={intention}
          onChange={(e) =>
            onIntentionChange(e.target.value.slice(0, MAX_INTENTION))
          }
          onBlur={() => setTouched(true)}
          rows={3}
          autoFocus
          placeholder="Finish the settlement agent and get one payout working end to end"
          aria-label="Your intention for this session"
          aria-invalid={touched && tooShort}
          className="w-full resize-none rounded-2xl border border-border bg-surface p-4 text-base leading-relaxed text-foreground outline-none placeholder:text-faint focus:border-accent"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-slipped">
            {touched && tooShort ? 'Say a little more about the work.' : ''}
          </span>
          <span className="text-xs text-faint">
            {intention.length}/{MAX_INTENTION}
          </span>
        </div>
      </div>

      <fieldset className="w-full">
        <legend className="mono-caption mb-2.5 text-xs uppercase tracking-widest text-faint">
          Stake
        </legend>
        <div className="grid auto-cols-fr grid-flow-col gap-2">
          {stakeOptions.map((option) => {
            const selected = option === stakeHbar;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onStakeChange(option)}
                aria-pressed={selected}
                style={
                  selected
                    ? {
                        borderColor: 'var(--accent)',
                        background: 'rgba(245,158,11,0.12)',
                        color: 'var(--accent)',
                      }
                    : undefined
                }
                className={[
                  'h-12 rounded-2xl border text-sm font-semibold transition-colors',
                  selected ? '' : 'border-border bg-surface text-muted',
                ].join(' ')}
              >
                {option} ℏ
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <Typography variant="body" level={4} className="text-muted">
          Your {stakeHbar} ℏ is held on Hedera testnet for{' '}
          {describeDuration(durationSeconds)}. Keep the commitment and it
          returns in full. Slip and it goes to the shared cause, never to us.
          You can disarm the session at any point before it settles.
        </Typography>
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={tooShort}
        onClick={onStart}
      >
        Start session
      </Button>
    </div>
  );
};
