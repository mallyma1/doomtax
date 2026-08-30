'use client';

import type { SettleResponse } from '@/components/SessionFlow';
import type { AppealResponse, ReviewState } from '@/lib/appeal';
import { ExplainSheet, ExplainTopic } from '@/components/ExplainSheet';
import { UsdHint } from '@/components/UsdHint';
import { Button, Typography } from '@worldcoin/mini-apps-ui-kit-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
  /** Re-posts the same settlement. Omitted when there is no artifact to resend. */
  onRetry?: () => void;
  onDone: () => void;
}

/**
 * The appeal window is 24 hours by default and 60 seconds in a demo, so one
 * format cannot serve both. Minutes-and-seconds rendered the real window as
 * "1439:58" — technically the time remaining, and useless to read. Past an
 * hour the user wants coarse units; inside one they want the clock.
 */
const formatRemaining = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;

  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
  onRetry,
  onDone,
}: VerdictProps) => {
  const [reason, setReason] = useState('');
  const [explain, setExplain] = useState<ExplainTopic | null>(null);
  // document.body does not exist during the server render.
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('Verdict');

  useEffect(() => setMounted(true), []);

  /*
   * Settlement could not be confirmed. This is not a verdict, and must never be
   * dressed up as one.
   *
   * The screen used to print the raw server string as its only body copy and
   * offer a single "Done" — so a cold backend or a dropped connection read as
   * "Unexpected settlement response shape", threw away the artifact the user
   * had just written, and left reloading the page as the only way out. What a
   * worried user needs first is whether their stake moved; the exception text
   * is for whoever they report it to, so it sits under a disclosure instead.
   */
  if (errorMessage) {
    return (
      <div className="animate-fade-up flex min-h-full w-full flex-col justify-between gap-6">
        <div
          role="alert"
          className="flex flex-1 flex-col items-center justify-center py-6 text-center"
        >
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
            {t('errorTitle')}
          </Typography>
          <Typography
            variant="body"
            level={3}
            className="mt-3 max-w-[32ch] text-muted"
          >
            {couldHaveMoved ? t('errorBodyUnsure') : t('errorBodySafe')}
          </Typography>
          {couldHaveMoved && (
            <p className="mt-4 max-w-[34ch] text-xs leading-relaxed text-faint">
              {t.rich('couldHaveMoved', {
                link: (chunks) => (
                  <a
                    className="text-accent underline"
                    href="https://hashscan.io/testnet"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
          )}

          <details className="mt-6 w-full text-left">
            <summary className="mono-caption cursor-pointer list-none py-2 text-faint transition-colors hover:text-muted">
              {t('errorDetailSummary')}
            </summary>
            <p className="mono-caption mt-1 break-words text-xs normal-case tracking-normal text-muted">
              {errorMessage}
            </p>
          </details>
        </div>

        <div className="flex flex-col gap-2">
          {onRetry && (
            <Button variant="primary" size="lg" fullWidth onClick={onRetry}>
              {t('errorRetry')}
            </Button>
          )}
          <button
            type="button"
            onClick={onDone}
            className="h-12 rounded-full border border-border text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            {t('errorStartOver')}
          </button>
        </div>
      </div>
    );
  }

  const disarmed = amnestiedAt !== null;
  const slipped = !disarmed && result?.verdict === 'slipped';
  const tone: 'kept' | 'slipped' = slipped ? 'slipped' : 'kept';

  const title = disarmed
    ? t('titleDisarmed')
    : slipped
      ? t('titleSlipped')
      : t('titleKept');

  const body = disarmed
    ? t('bodyDisarmed', { stake: stakeHbar })
    : slipped
      ? t('bodySlipped', { stake: stakeHbar })
      : t('bodyKept', { stake: stakeHbar });

  const settlement = result?.settlement;
  const moved = settlement?.ok && settlement.moved;
  const hcs = result?.hcs;

  return (
    <div className="animate-fade-up flex min-h-full w-full flex-col justify-between gap-6">
      {/*
        Portalled to <body>, not just `fixed`.

        `position: fixed` resolves against the nearest ancestor with a
        transform, and .animate-fade-up carries `animation-fill-mode: both`, so
        an identity transform stays on the element after the entrance finishes.
        Two of those wrap this component, which pinned the wash to the content
        column: 342x506 inset from the top-left, with hard edges down both
        sides — a flat rectangle, exactly what anchoring it to the viewport was
        meant to avoid. Rendering into <body> escapes both.
      */}
      {mounted &&
        createPortal(
          <div
            className={`pointer-events-none fixed inset-x-0 top-0 h-[60vh] ${
              tone === 'kept' ? 'wash-kept' : 'wash-slipped'
            }`}
            aria-hidden="true"
          />,
          document.body,
        )}

      <div className="relative flex flex-1 flex-col items-center justify-center py-4 text-center">
        {/*
          "Wins are louder than losses." The mark, the headline and the amount
          all scale with the outcome: a kept session gets a large glowing disc
          and the returned stake called out underneath, a slip gets a small
          quiet one. Previously both rendered identically, so the only screen
          that differed was the slip — which got the forfeit explanation, the
          appeal panel and the countdown on top. The loss was the louder of
          the two, exactly backwards.
        */}
        <div
          className={`animate-pop-in mt-4 grid place-items-center rounded-full ${
            tone === 'kept' ? 'size-24' : 'size-14'
          }`}
          style={{
            background:
              tone === 'kept' ? 'var(--kept-glow)' : 'var(--slipped-glow)',
            boxShadow:
              tone === 'kept' ? '0 0 56px 12px var(--kept-glow)' : undefined,
          }}
          aria-hidden="true"
        >
          <span
            className={
              tone === 'kept'
                ? 'text-4xl text-kept'
                : 'text-xl text-slipped'
            }
          >
            {tone === 'kept' ? '✓' : '!'}
          </span>
        </div>

        <Typography
          variant="display"
          level={1}
          className={tone === 'kept' ? 'mt-7 text-foreground' : 'mt-5 text-foreground'}
        >
          {title}
        </Typography>
        <Typography
          variant="body"
          level={3}
          className="mt-3 max-w-[32ch] text-muted"
        >
          {body}
        </Typography>

        {tone === 'kept' && (
          <div className="mt-5 flex flex-col items-center">
            <span className="hbar-amount text-3xl font-semibold text-kept">
              +{stakeHbar} ℏ
            </span>
            <UsdHint hbar={stakeHbar} className="mt-1" />
          </div>
        )}

        {/*
          The ledger detail is proof, not the point.

          A transaction ID, a topic ID and a HashScan URL were the default view
          of the screen a user reaches straight after holding a commitment.
          Behind a disclosure it stays one tap away for anyone who wants to
          verify the settlement, and out of the way of everyone who does not.
        */}
        <details className="mt-5 w-full text-left">
          <summary className="mono-caption flex min-h-[44px] cursor-pointer list-none items-center justify-center gap-1.5 text-faint transition-colors hover:text-muted">
            {t('proofSummary')}
          </summary>
          {result && (
            <div className="card-raised mt-5 w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-left">
              <div className="flex items-center justify-between gap-2">
                <Typography variant="body" level={4} className="text-muted">
                  {t('settledOnHedera')}
                </Typography>
                <button
                  type="button"
                  aria-label={t('whatSettlesLabel')}
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
                      {t('viewOnHashScan')}
                    </a>
                  ) : (
                    <span className="mono-caption block text-xs text-faint">
                      {/*
                        settlement.reason is an internal string ("kept — nothing
                        to transfer") and belongs in a log, not on this screen.
                      */}
                      {t('noTransfer')}
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
                  {t('publicReceipt')}
                </span>
                <button
                  type="button"
                  aria-label={t('whatLedgerLabel')}
                  onClick={() => setExplain('hcs-receipt')}
                  className="flex size-[44px] shrink-0 items-center justify-center rounded-full text-faint hover:text-foreground"
                >
                  ⓘ
                </button>
              </div>
              <p className="mono-caption mt-1 break-all text-xs text-muted">
                {hcs.ok
                  ? `HCS ${hcs.transactionId}`
                  : t('publicReceiptNotRecorded', { error: hcs.error })}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-faint">
                {t('publicReceiptDetail')}
              </p>
            </div>
          )}
        </details>

        {slipped && reviewState === 'appeal_open' && (
          <div className="card-raised mt-3 w-full rounded-2xl border border-border bg-surface p-4 text-left">
            <span className="mono-caption text-xs uppercase tracking-widest text-faint">
              {t('appealWindow')}
            </span>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {t.rich('appealClosesIn', {
                remaining: formatRemaining(appealRemainingMs),
                strong: (chunks) => (
                  <span className="tabular text-foreground">{chunks}</span>
                ),
                at:
                  appealWindowEndsAt !== null
                    ? t('appealClosesAt', {
                        time: formatTime(appealWindowEndsAt),
                      })
                    : '',
              })}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={t('appealPlaceholder')}
              aria-label={t('appealReasonLabel')}
              className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none transition-colors placeholder:text-faint focus:border-accent focus:bg-surface"
            />
            {/*
              Neutral, not rust. Appealing is the user's own protection and
              always resolves in their favour; styling it in the forfeit colour
              made the one reassuring control on the screen read as the
              dangerous one.
            */}
            <button
              type="button"
              onClick={() => onSubmitAppeal(reason)}
              disabled={!reason.trim() || isSubmittingAppeal}
              className="mt-2 h-12 w-full rounded-full border border-border bg-surface-raised text-sm font-semibold text-foreground transition-all hover:border-muted active:scale-[0.98] disabled:opacity-40"
            >
              {isSubmittingAppeal ? t('appealSubmitting') : t('appealSubmit')}
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
              {t('appealRecorded')}
            </span>
            <p className="mt-1 text-sm text-muted">{appealResponse.message}</p>
          </div>
        )}

        {reviewState === 'appeal_expired' && (
          <p className="mt-3 text-xs leading-relaxed text-faint">
            {t('appealExpired')}
          </p>
        )}
      </div>

      <div className="relative pt-5">
        <Button variant="primary" size="lg" fullWidth onClick={onDone}>
          {t('done')}
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
