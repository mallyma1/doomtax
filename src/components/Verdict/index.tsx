'use client';

import type { SettleResponse } from '@/components/SessionFlow';
import type { AppealResponse, ReviewState } from '@/lib/appeal';
import { ExplainSheet, ExplainTopic } from '@/components/ExplainSheet';
import { UsdHint } from '@/components/UsdHint';
import { Button, Typography } from '@worldcoin/mini-apps-ui-kit-react';
import { useState } from 'react';

interface VerdictProps {
  result: SettleResponse | null;
  stakeHbar: number;
  amnestiedAt: number | null;
  errorMessage: string | null;
  couldHaveMoved: boolean;
  reviewState: ReviewState;
  appealRemainingMs: number;
  appealWindowEndsAt: number | null;
  appealResponse: AppealResponse | null;
  appealError: string | null;
  isSubmittingAppeal: boolean;
  onSubmitAppeal: (reason: string) => void;
  onDone: () => void;
}

/**
 * The appeal window defaults to 24 hours (lib/charity.ts) but APPEAL_WINDOW_MS
 * can shorten it for a live demo. mm:ss reads fine at 60 seconds and as
 * "1439:58" at 24 hours, which is not a countdown a judge can parse. Scale the
 * unit to whichever range applies, same approach as scripts/sweep-charity.ts.
 */
const formatRemaining = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  if (totalSeconds < 90) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 90) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);

/**
 * The outcome of a session.
 *
 * Copy is load-bearing. Amnesty and a kept verdict both return the stake, and
 * each says so in its own words rather than sharing one hedged sentence, so a
 * disarmed session never reads like a favour the app decided to grant.
 */
export const Verdict = ({
  result,
  stakeHbar,
  amnestiedAt,
  errorMessage,
  couldHaveMoved,
  reviewState,
  appealRemainingMs,
  appealWindowEndsAt,
  appealResponse,
  appealError,
  isSubmittingAppeal,
  onSubmitAppeal,
  onDone,
}: VerdictProps) => {
  const [reason, setReason] = useState('');
  const [explain, setExplain] = useState<ExplainTopic | null>(null);

  // Settlement could not be confirmed. This is not a verdict, and must never
  // be dressed up as one.
  if (errorMessage) {
    return (
      <div className="animate-fade-up flex h-full w-full flex-col justify-between">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div
            className="animate-pop-in grid size-16 place-items-center rounded-full"
            style={{ background: 'var(--slipped-glow)' }}
            aria-hidden="true"
          >
            <span className="text-2xl text-slipped">!</span>
          </div>
          <Typography
            variant="heading"
            level={2}
            className="mt-6 text-foreground"
          >
            Settlement not confirmed
          </Typography>
          <Typography
            variant="body"
            level={3}
            className="mt-3 max-w-[32ch] text-muted"
          >
            {errorMessage}
          </Typography>
          {couldHaveMoved && (
            <p className="mt-4 max-w-[34ch] text-xs leading-relaxed text-faint">
              The transfer may still have gone through. Check{' '}
              <a
                className="text-accent underline"
                href="https://hashscan.io/testnet"
                target="_blank"
                rel="noreferrer"
              >
                HashScan testnet
              </a>{' '}
              before taking any next step.
            </p>
          )}
        </div>
        <Button variant="primary" size="lg" fullWidth onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  const disarmed = amnestiedAt !== null;
  const slipped = !disarmed && result?.verdict === 'slipped';
  const tone: 'kept' | 'slipped' = slipped ? 'slipped' : 'kept';

  const title = disarmed
    ? 'Session disarmed'
    : slipped
      ? 'You slipped'
      : 'You kept it';

  const body = disarmed
    ? `You ended this before it settled. Nothing moved, and your ${stakeHbar} ℏ stays yours.`
    : slipped
      ? `Your ${stakeHbar} ℏ moved to the pending account, not straight to the shared cause. That is what makes this reversible.`
      : `Your ${stakeHbar} ℏ stays with you.`;

  const settlement = result?.settlement;
  const moved = settlement?.ok && settlement.moved;
  const hcs = result?.hcs;

  return (
    <div className="animate-fade-up flex h-full w-full flex-col justify-between">
      {/*
        Fixed rather than absolute: the wash should read as light falling from
        the top of the screen, not as a panel inside the scroll container.
      */}
      <div
        className={`pointer-events-none fixed inset-x-0 top-0 h-[60vh] ${
          tone === 'kept' ? 'wash-kept' : 'wash-slipped'
        }`}
        aria-hidden="true"
      />

      <div className="relative flex flex-1 flex-col items-center text-center">
        <div
          className="animate-pop-in mt-4 grid size-16 place-items-center rounded-full"
          style={{
            background:
              tone === 'kept' ? 'var(--kept-glow)' : 'var(--slipped-glow)',
          }}
          aria-hidden="true"
        >
          <span
            className={`text-2xl ${
              tone === 'kept' ? 'text-kept' : 'text-slipped'
            }`}
          >
            {tone === 'kept' ? '✓' : '!'}
          </span>
        </div>

        <Typography variant="display" level={1} className="mt-6 text-foreground">
          {title}
        </Typography>
        <Typography
          variant="body"
          level={3}
          className="mt-3 max-w-[32ch] text-muted"
        >
          {body}
        </Typography>

        {result && (
          <div className="card-raised mt-5 w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-left">
            <div className="flex items-center justify-between gap-2">
              <Typography variant="body" level={4} className="text-muted">
                Settled on Hedera testnet
              </Typography>
              <button
                type="button"
                aria-label="What settles on Hedera"
                onClick={() => setExplain('hedera-settlement')}
                className="flex size-[44px] shrink-0 items-center justify-center rounded-full text-faint hover:text-foreground"
              >
                ⓘ
              </button>
            </div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {moved ? (
                  <a
                    href={settlement.hashScanUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mono-caption block truncate text-xs text-accent underline"
                  >
                    View on HashScan
                  </a>
                ) : (
                  <span className="mono-caption block text-xs text-faint">
                    {settlement?.ok && !settlement.moved
                      ? settlement.reason
                      : 'no transfer'}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end">
                <span
                  className={`hbar-amount shrink-0 text-lg font-semibold ${
                    slipped ? 'text-slipped' : 'text-kept'
                  }`}
                >
                  {slipped ? '−' : '+'}
                  {stakeHbar} ℏ
                </span>
                <UsdHint hbar={stakeHbar} />
              </div>
            </div>
          </div>
        )}

        {hcs && (
          <div className="card-raised mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-left">
            <div className="flex items-center justify-between">
              <span className="mono-caption text-xs text-faint">
                Public receipt
              </span>
              <button
                type="button"
                aria-label="What goes on the public ledger"
                onClick={() => setExplain('hcs-receipt')}
                className="flex size-[44px] shrink-0 items-center justify-center rounded-full text-faint hover:text-foreground"
              >
                ⓘ
              </button>
            </div>
            <p className="mono-caption mt-1 break-all text-xs text-muted">
              {hcs.ok
                ? `HCS ${hcs.transactionId}`
                : `not recorded: ${hcs.error}`}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-faint">
              Carries a commitment hash and the verdict only. Never your
              intention or your artifact.
            </p>
          </div>
        )}

        {slipped && reviewState === 'appeal_open' && (
          <div className="card-raised mt-3 w-full rounded-2xl border border-border bg-surface p-4 text-left">
            <span className="mono-caption text-xs uppercase tracking-widest text-faint">
              Appeal window
            </span>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Closes in{' '}
              <span className="tabular text-foreground">
                {formatRemaining(appealRemainingMs)}
              </span>
              {appealWindowEndsAt !== null
                ? `, at ${formatTime(appealWindowEndsAt)}`
                : ''}
              . Nothing reaches the shared cause until it does, and an appeal
              resolves toward you.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why should this resolve in your favour?"
              aria-label="Reason for your appeal"
              className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none transition-colors placeholder:text-faint focus:border-accent focus:bg-surface"
            />
            <button
              type="button"
              onClick={() => onSubmitAppeal(reason)}
              disabled={!reason.trim() || isSubmittingAppeal}
              style={{
                borderColor: 'var(--slipped)',
                color: 'var(--slipped)',
              }}
              className="mt-2 h-12 w-full rounded-full border text-sm font-semibold transition-all hover:opacity-80 active:scale-[0.98] disabled:opacity-40"
            >
              {isSubmittingAppeal ? 'Submitting appeal' : 'Appeal this verdict'}
            </button>
            {appealError && (
              <p className="mt-2 text-xs text-slipped">{appealError}</p>
            )}
          </div>
        )}

        {appealResponse?.ok && (
          <div
            className="mt-3 w-full rounded-2xl border px-4 py-3 text-left"
            style={{ borderColor: 'var(--kept)' }}
          >
            <span className="mono-caption text-xs uppercase tracking-widest text-kept">
              Appeal recorded
            </span>
            <p className="mt-1 text-sm text-muted">{appealResponse.message}</p>
          </div>
        )}

        {reviewState === 'appeal_expired' && (
          <p className="mt-3 text-xs leading-relaxed text-faint">
            The appeal window has closed.
          </p>
        )}
      </div>

      <div className="relative pt-5">
        <Button variant="primary" size="lg" fullWidth onClick={onDone}>
          Done
        </Button>
      </div>

      {explain !== null && (
        <ExplainSheet
          topic={explain}
          onClose={() => setExplain(null)}
          hashScanUrl={
            explain === 'hedera-settlement' && moved
              ? settlement?.hashScanUrl
              : undefined
          }
        />
      )}
    </div>
  );
};
