'use client';

import { Button, Typography } from '@worldcoin/mini-apps-ui-kit-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { UsdHint } from '@/components/UsdHint';

const MAX_INTENTION = 140;

const EXAMPLE_KEYS = ['exampleChip1', 'exampleChip2', 'exampleChip3'] as const;
const STEP_KEYS = ['stepIntention', 'stepStake', 'stepGo'] as const;

interface StakeFormProps {
  intention: string;
  onIntentionChange: (value: string) => void;
  stakeHbar: number;
  onStakeChange: (value: number) => void;
  /** From lib/session, so demo mode and the API agree on the options. */
  stakeOptions: readonly number[];
  durationSeconds: number;
  demoMode?: boolean;
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

function describeDuration(
  seconds: number,
  tc: (key: 'secondsCount' | 'minutesCount', values: { count: number }) => string,
): string {
  if (seconds < 60) return tc('secondsCount', { count: seconds });
  return tc('minutesCount', { count: Math.round(seconds / 60) });
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
  demoMode = false,
  onBack,
  onStart,
}: StakeFormProps) => {
  const [touched, setTouched] = useState(false);
  const t = useTranslations('StakeForm');
  const tc = useTranslations('Common');
  const [customStake, setCustomStake] = useState(
    stakeOptions.includes(stakeHbar) ? '' : String(stakeHbar),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    <div className="animate-fade-up flex w-full flex-col gap-6">
      {/* Micro-stepper */}
      <div className="flex items-center justify-center gap-3">
        {STEP_KEYS.map((step, i, arr) => (
          <div key={step} className="flex items-center gap-3">
            <span className={`mono-caption text-[10px] ${i === 0 ? 'text-accent' : 'text-faint'}`}>
              {t(step)}
            </span>
            {i < arr.length - 1 && (
              <span className="text-faint text-xs">→</span>
            )}
          </div>
        ))}
      </div>

      {demoMode && (
        <div className="flex items-center justify-center gap-2">
          <span className="mono-caption rounded-full border border-border px-2.5 py-1 text-faint">
            {t('demoLabel')}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={onBack}
          className="-mx-1 -my-3 flex min-h-[44px] min-w-[44px] items-center px-1 py-3 text-sm font-medium text-muted underline underline-offset-4"
        >
          {tc('back')}
        </button>
        {/* Typography renders <p> unless told otherwise; each phase owns the h1. */}
        <Typography
          as="h1"
          variant="heading"
          level={2}
          className="text-foreground"
        >
          {t('commitment')}
        </Typography>
        <Typography variant="body" level={3} className="mt-1.5 text-muted">
          {t('description')}
        </Typography>
      </div>

      {/* Example intention chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {EXAMPLE_KEYS.map((exampleKey) => (
          <button
            key={exampleKey}
            type="button"
            onClick={() => {
              onIntentionChange(t(exampleKey));
              textareaRef.current?.focus();
            }}
            className="flex min-h-[44px] shrink-0 items-center rounded-full border border-border bg-surface px-4 text-xs text-muted transition-colors hover:border-muted hover:text-foreground"
          >
            {t(exampleKey)}
          </button>
        ))}
      </div>

      <div>
        <textarea
          ref={textareaRef}
          value={intention}
          onChange={(e) =>
            onIntentionChange(e.target.value.slice(0, MAX_INTENTION))
          }
          onBlur={() => setTouched(true)}
          rows={3}
          autoFocus
          placeholder={t('placeholderIntention')}
          aria-label={t('intentionLabel')}
          aria-invalid={touched && tooShort}
          className="w-full resize-none rounded-2xl border border-border bg-surface p-4 text-base leading-relaxed text-foreground outline-none transition-colors placeholder:text-faint focus:border-accent focus:bg-surface-raised"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-slipped">
            {touched && tooShort ? t('tooShort') : ''}
          </span>
          <span className="text-xs text-faint">
            {intention.length}/{MAX_INTENTION}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-faint max-w-[36ch]">
          {t('qualityHint')}
        </p>
      </div>

      <fieldset className="w-full">
        <legend className="mono-caption mb-2.5 text-xs uppercase tracking-widest text-faint">
          {t('stakeLegend')}
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
                  'flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border text-sm font-semibold transition-all duration-150 active:scale-[0.96]',
                  selected
                    ? 'scale-[1.03]'
                    : 'border-border bg-surface text-muted hover:scale-[1.03] hover:border-muted hover:text-foreground',
                ].join(' ')}
              >
                <span className="hbar-amount">{option} ℏ</span>
                <UsdHint hbar={option} className="block text-[10px]" />
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <label className="mono-caption mb-2 block text-xs uppercase tracking-widest text-faint">
            {t('customAmountLabel')}
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={customStake}
            onChange={(e) => updateCustomStake(e.target.value)}
            placeholder={t('customAmountPlaceholder')}
            aria-label={t('customAmountAriaLabel')}
            aria-invalid={invalidCustomStake}
            className="h-12 w-full rounded-2xl border border-border bg-surface px-4 text-base text-foreground outline-none transition-colors placeholder:text-faint focus:border-accent focus:bg-surface-raised"
          />
          <div className="mt-1.5 text-xs text-slipped">
            {invalidCustomStake ? t('customAmountError') : ''}
          </div>
          {parsedCustomStake !== null && (
            <UsdHint hbar={parsedCustomStake} className="mt-1 block" />
          )}
        </div>
      </fieldset>

      <div className="rounded-2xl border border-border bg-surface p-4 card-raised">
        <Typography variant="body" level={4} className="text-muted">
          {t('sessionInfo', {
            stake: stakeHbar,
            duration: describeDuration(durationSeconds, tc),
          })}
        </Typography>
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={tooShort || invalidCustomStake}
        onClick={onStart}
      >
        {t('startButton')}
      </Button>
    </div>
  );
};
