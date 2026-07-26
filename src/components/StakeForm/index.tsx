'use client';

import { Button, Typography } from '@worldcoin/mini-apps-ui-kit-react';
import { useEffect, useState } from 'react';

const MAX_INTENTION = 140;

interface StakeFormProps {
  intention: string;
  onIntentionChange: (value: string) => void;
  stakeHbar: number;
  onStakeChange: (value: number) => void;
  /** From lib/session, so demo mode and the API agree on the options. */
  stakeOptions: readonly number[];
  durationSeconds: number;
  onBack: () => void;
  onStart: () => void;
}

function parseStake(value: string): number | null {
  const normalized = value.trim();
  if (normalized === '') return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
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
  onBack,
  onStart,
}: StakeFormProps) => {
  const [touched, setTouched] = useState(false);
  const [customStake, setCustomStake] = useState(
    stakeOptions.includes(stakeHbar) ? '' : String(stakeHbar),
  );
  const tooShort = intention.trim().length < 8;
  const parsedCustomStake = parseStake(customStake);
  const hasCustomStake = customStake.trim() !== '';
  const invalidCustomStake = hasCustomStake && parsedCustomStake === null;

  useEffect(() => {
    if (stakeOptions.includes(stakeHbar)) {
      setCustomStake('');
      return;
    }

    setCustomStake(String(stakeHbar));
  }, [stakeHbar, stakeOptions]);

  const selectPresetStake = (option: number) => {
    setCustomStake('');
    onStakeChange(option);
  };

  const updateCustomStake = (value: string) => {
    setCustomStake(value);
    const parsed = parseStake(value);
    if (parsed !== null) {
      onStakeChange(parsed);
    }
  };

  return (
    <div className="animate-fade-up flex w-full flex-col gap-7">
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={onBack}
          className="w-fit text-sm font-medium text-muted underline underline-offset-4"
        >
          Back
        </button>
        <Typography variant="heading" level={2} className="text-foreground">
          Make a commitment.
        </Typography>
        <Typography variant="body" level={3} className="mt-1.5 text-muted">
          Write it like a promise to yourself. Your AI coach reads these exact
          words when you submit proof — make it specific enough that you
          couldn&apos;t argue your way out of it when it counted.
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
          className="w-full resize-none rounded-2xl border border-border bg-surface p-4 text-base leading-relaxed text-foreground outline-none transition-colors placeholder:text-faint focus:border-accent focus:bg-surface-raised"
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
            const selected = option === stakeHbar && customStake.trim() === '';
            return (
              <button
                key={option}
                type="button"
                onClick={() => selectPresetStake(option)}
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
                  'h-12 rounded-2xl border text-sm font-semibold transition-all duration-150 active:scale-[0.96]',
                  selected
                    ? 'scale-[1.03]'
                    : 'border-border bg-surface text-muted hover:scale-[1.03] hover:border-muted hover:text-foreground',
                ].join(' ')}
              >
                {option} ℏ
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <label className="mono-caption mb-2 block text-xs uppercase tracking-widest text-faint">
            Other amount
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={customStake}
            onChange={(e) => updateCustomStake(e.target.value)}
            placeholder="Enter any HBAR amount"
            aria-label="Custom stake amount in HBAR"
            aria-invalid={invalidCustomStake}
            className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-foreground outline-none transition-colors placeholder:text-faint focus:border-accent focus:bg-surface-raised"
          />
          <div className="mt-1.5 text-xs text-slipped">
            {invalidCustomStake ? 'Enter a positive HBAR amount.' : ''}
          </div>
        </div>
      </fieldset>

      <div className="rounded-2xl border border-border bg-surface p-4 card-raised">
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
        disabled={tooShort || invalidCustomStake}
        onClick={onStart}
      >
        Start session
      </Button>
    </div>
  );
};
