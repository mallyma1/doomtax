'use client';

import { ArtifactForm } from '@/components/ArtifactForm';
import { AuthButton } from '@/components/AuthButton';
import { CirclePanel } from '@/components/CirclePanel';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { LiveSession } from '@/components/LiveSession';
import { SelfieCheck } from '@/components/SelfieCheck';
import { StakeForm } from '@/components/StakeForm';
import { Verdict } from '@/components/Verdict';
import Link from 'next/link';
import {
  deriveReviewState,
  getAppealTimeRemainingMs,
  getAppealWindowEndsAt,
  isAppealResponse,
  type AppealResponse,
} from '@/lib/appeal';
import {
  DEMO_MODE,
  SESSION_DURATION_SECONDS,
  STAKE_OPTIONS_HBAR,
  commitmentHash,
} from '@/lib/session';
import { markSessionCompleted, useSessionsCompleted } from '@/lib/history';
import { Button } from '@worldcoin/mini-apps-ui-kit-react';
import { useActivity } from '@/providers/ActivityContext';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

export type SessionPhase =
  | 'idle'
  | 'draft'
  | 'running'
  | 'claim'
  | 'submitting'
  | 'complete'
  | 'error';

type SettlementSuccess =
  | {
      ok: true;
      moved: true;
      transactionId: string;
      hashScanUrl: string;
      destinationAccountId: string;
    }
  | {
      ok: true;
      moved: false;
      reason: string;
    };

type SettlementFailure = {
  ok: false;
  error: string;
};

type HcsResult = { ok: true; transactionId: string } | { ok: false; error: string };

export type SettleResponse = {
  verdict: 'kept' | 'slipped';
  settlement: SettlementSuccess | SettlementFailure;
  hcs: HcsResult;
  hcsTopicId?: string | null;
  hcsRecord?: {
    sessionId: string;
    commitmentHash: string;
    verdict: boolean;
    amountTinybar: number;
    timestamp: number;
  } | null;
};

const HTTP_STATUS_BAD_GATEWAY = 502;

const isSettleResponse = (value: unknown): value is SettleResponse => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SettleResponse>;
  return (
    (candidate.verdict === 'kept' || candidate.verdict === 'slipped') &&
    !!candidate.settlement &&
    typeof candidate.settlement === 'object' &&
    typeof (candidate.settlement as { ok?: unknown }).ok === 'boolean' &&
    !!candidate.hcs &&
    typeof candidate.hcs === 'object' &&
    typeof (candidate.hcs as { ok?: unknown }).ok === 'boolean'
  );
};

/**
 * Routes the active session to the screen its phase calls for.
 *
 * The settlement, appeal and integrity logic here is unchanged: it still posts
 * to /api/session/settle and /api/session/appeal, still derives the commitment
 * hash in the browser so the intention never leaves the device, and still reads
 * SESSION_DURATION_SECONDS and STAKE_OPTIONS_HBAR so demo mode stays honest.
 * Only the presentation is new.
 *
 * @param selfieAction - Developer Portal action for the claim-time Selfie
 *   Check, read server-side from `WORLD_SELFIE_ACTION_ID` and passed down.
 *   Null when unconfigured, which hides the step rather than breaking the
 *   claim — the check is optional evidence and never a prerequisite.
 */
export const SessionFlow = ({
  selfieAction = null,
}: {
  selfieAction?: string | null;
}) => {
  const t = useTranslations('SessionFlow');
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [intention, setIntention] = useState('');
  const [stakeHbar, setStakeHbar] = useState<number>(STAKE_OPTIONS_HBAR[0]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_DURATION_SECONDS);
  // Kept so a failed settlement can be retried without retyping the artifact.
  const [artifact, setArtifact] = useState('');
  const [result, setResult] = useState<SettleResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [amnestiedAt, setAmnestiedAt] = useState<number | null>(null);
  const [appealResponse, setAppealResponse] = useState<AppealResponse | null>(
    null,
  );
  const [appealError, setAppealError] = useState<string | null>(null);
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [disarmOpen, setDisarmOpen] = useState(false);
  const { setHedera, setZeroG } = useActivity();
  const sessionsCompleted = useSessionsCompleted();

  // Page Visibility integrity tracking: foreground time and interruptions.
  const foregroundTimeRef = useRef(0);
  const interruptionCountRef = useRef(0);
  const lastFocusRef = useRef<number | null>(null);
  const [interruptions, setInterruptions] = useState(0);

  useEffect(() => {
    if (phase !== 'running') return;

    lastFocusRef.current = Date.now();

    const handleVisibility = () => {
      if (document.hidden) {
        if (lastFocusRef.current !== null) {
          foregroundTimeRef.current +=
            (Date.now() - lastFocusRef.current) / 1000;
          lastFocusRef.current = null;
        }
        interruptionCountRef.current += 1;
        setInterruptions(interruptionCountRef.current);
      } else {
        lastFocusRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (lastFocusRef.current !== null) {
        foregroundTimeRef.current +=
          (Date.now() - lastFocusRef.current) / 1000;
        lastFocusRef.current = null;
      }
    };
  }, [phase]);

  /**
   * The clock is read from the start timestamp, never counted down.
   *
   * A `setInterval` that decrements a counter loses time whenever the browser
   * throttles or suspends timers, which it does aggressively for a backgrounded
   * tab — and a mini app inside World App is backgrounded constantly. That made
   * the visible clock run slower than the wall clock, so a user who checked a
   * message owed the session more real time than it claimed. Deriving the
   * remaining time from `startedAt` cannot drift; the interval only decides how
   * often we re-read it. Ticking faster than 1 s means the display corrects
   * itself within a frame of the tab coming back rather than a second later.
   */
  useEffect(() => {
    if (phase !== 'running' || startedAt === null) return;

    const tick = () => {
      const elapsedSeconds = (Date.now() - startedAt) / 1000;
      setSecondsLeft(
        Math.max(0, Math.ceil(SESSION_DURATION_SECONDS - elapsedSeconds)),
      );
    };

    tick();
    const interval = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [phase, startedAt]);

  useEffect(() => {
    if (phase === 'running' && secondsLeft === 0) setPhase('claim');
  }, [phase, secondsLeft]);

  // A finished session is what unlocks the circle panel on the idle screen.
  useEffect(() => {
    if (phase === 'complete') markSessionCompleted();
  }, [phase]);

  useEffect(() => {
    const slippedSettlement =
      phase === 'complete' &&
      result?.verdict === 'slipped' &&
      completedAt !== null &&
      amnestiedAt === null &&
      appealResponse?.ok !== true;

    if (!slippedSettlement) return;

    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [amnestiedAt, appealResponse, completedAt, phase, result]);

  const beginDraft = () => {
    setResult(null);
    setErrorMessage(null);
    setResponseStatus(null);
    setCompletedAt(null);
    setAmnestiedAt(null);
    setAppealResponse(null);
    setAppealError(null);
    setIsSubmittingAppeal(false);
    setIntention('');
    setArtifact('');
    setStartedAt(null);
    setStakeHbar(STAKE_OPTIONS_HBAR[0]);
    setPhase('draft');
  };

  const returnToIdle = () => {
    setIntention('');
    setArtifact('');
    setStartedAt(null);
    setStakeHbar(STAKE_OPTIONS_HBAR[0]);
    setHedera('idle');
    setZeroG('idle');
    setPhase('idle');
  };

  const startSession = () => {
    if (!intention.trim()) return;
    setNowMs(Date.now());
    foregroundTimeRef.current = 0;
    interruptionCountRef.current = 0;
    lastFocusRef.current = null;
    setInterruptions(0);
    setSessionId(crypto.randomUUID());
    setSecondsLeft(SESSION_DURATION_SECONDS);
    setStartedAt(Date.now());
    setPhase('running');
  };

  const useAmnesty = () => {
    if (!sessionId) {
      setErrorMessage(t('sessionIdMissing'));
      setPhase('error');
      return;
    }
    setDisarmOpen(false);
    setResult(null);
    setCompletedAt(null);
    setErrorMessage(null);
    setResponseStatus(null);
    setAppealResponse(null);
    setAppealError(null);
    setAmnestiedAt(Date.now());
    setPhase('complete');
  };

  const submitClaim = async (submittedArtifact: string) => {
    if (!sessionId) {
      setErrorMessage(t('sessionIdMissing'));
      setPhase('error');
      return;
    }

    setArtifact(submittedArtifact);
    setPhase('submitting');
    setErrorMessage(null);
    setResponseStatus(null);
    setZeroG('active');
    setHedera('active');

    try {
      const hash = await commitmentHash(sessionId, intention);
      const response = await fetch('/api/session/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          commitmentHash: hash,
          stakeHbar,
          intention,
          artifact: submittedArtifact,
          foregroundTime: foregroundTimeRef.current,
          interruptionCount: interruptionCountRef.current,
        }),
      });

      const payload = await response.json();
      if (!isSettleResponse(payload)) {
        throw new Error(t('unexpectedSettlement'));
      }

      const submittedAt = Date.now();
      setResult(payload);
      setCompletedAt(submittedAt);
      setResponseStatus(response.status);
      setAppealResponse(null);
      setAppealError(null);
      setNowMs(submittedAt);
      setZeroG('idle');
      setHedera(payload.settlement?.ok && payload.settlement?.moved ? 'settled' : 'idle');

      if (!response.ok || !payload.settlement.ok) {
        setErrorMessage(
          !payload.settlement.ok
            ? payload.settlement.error
            : t('settlementFailedStatus', { status: response.status }),
        );
        setPhase('error');
        return;
      }

      setPhase('complete');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t('settlementSubmitFailed'),
      );
      setPhase('error');
    }
  };

  const submitAppeal = async (reason: string) => {
    if (!sessionId || !result || completedAt === null) {
      setAppealError(t('appealStateMissing'));
      return;
    }

    setIsSubmittingAppeal(true);
    setAppealError(null);

    try {
      const response = await fetch('/api/session/appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          verdict: result.verdict,
          settledAt: completedAt,
          reason,
        }),
      });

      const payload = await response.json();
      if (!isAppealResponse(payload)) {
        throw new Error(t('unexpectedAppeal'));
      }

      setAppealResponse(payload);
      if (!response.ok || !payload.ok) {
        setAppealError(payload.ok ? t('appealRequestFailed') : payload.error);
      }
    } catch (error) {
      setAppealError(
        error instanceof Error
          ? error.message
          : t('appealSubmitFailed'),
      );
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  /**
   * Re-post the same settlement.
   *
   * The error screen used to offer only "Done", so a network blip or a cold
   * backend cost the user the artifact they had just written and sent them back
   * to the start. The artifact is held in state precisely so this is one tap.
   */
  const retrySettlement = () => {
    void submitClaim(artifact);
  };

  const appealAccepted = appealResponse?.ok === true;
  const reviewState = deriveReviewState({
    verdict: result?.verdict ?? null,
    settledAt: completedAt,
    amnestiedAt,
    appealSubmitting: isSubmittingAppeal,
    appealAccepted,
    now: nowMs,
  });
  const appealRemainingMs =
    result?.verdict === 'slipped' && completedAt !== null
      ? getAppealTimeRemainingMs(completedAt, nowMs)
      : 0;
  const appealWindowEndsAt =
    completedAt !== null ? getAppealWindowEndsAt(completedAt) : null;
  const circlePendingForfeitHbar =
    result?.verdict === 'slipped' &&
    result.settlement.ok &&
    result.settlement.moved
      ? stakeHbar
      : null;

  /**
   * Each phase replaces the whole screen, which is silent to a screen reader:
   * nothing about swapping the main content announces itself, so a user who
   * cannot see the layout change gets no signal that the clock started, that
   * time is up, or that a verdict has landed. The live region below is the
   * only thing that persists across phases, so it is the only place that can
   * carry the transition.
   */
  const renderPhase = () => {
    if (phase === 'idle') {
      return (
        <div className="animate-fade-up flex min-h-full w-full flex-col justify-between gap-8">
          <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
            <div
              className="animate-glow-pulse mb-10 size-16 rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 50% 38%, #fde68a 0%, #f59e0b 45%, #b45309 100%)',
              }}
              aria-hidden="true"
            />
            <h1 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-foreground">
              {t('heroTitle')}
            </h1>
            <p className="mt-3.5 max-w-[26ch] text-[14px] leading-[1.55] text-muted">
              {t('heroBody')}
            </p>
            <Link
              href="/about"
              className="-my-2 mt-2 py-2 text-sm font-medium text-foreground underline underline-offset-4"
            >
              {t('howItWorks')}
            </Link>
          </div>
          <div className="flex w-full flex-col gap-3">
            <Button variant="primary" size="lg" fullWidth onClick={beginDraft}>
              {t('newSession')}
            </Button>
            <AuthButton />
          </div>
          {/*
            Held back until a session has actually been finished. On a first run
            this panel was the largest thing on the screen and described a circle
            the user is not in, other people's forfeits, and a placeholder
            account — answering a question nobody had asked yet. After one session
            the shared cause is context for something they have now done.
          */}
          {sessionsCompleted > 0 && <CirclePanel pendingForfeitHbar={null} />}
        </div>
      );
    }

    if (phase === 'draft') {
      return (
        <StakeForm
          intention={intention}
          onIntentionChange={setIntention}
          stakeHbar={stakeHbar}
          onStakeChange={setStakeHbar}
          stakeOptions={STAKE_OPTIONS_HBAR}
          durationSeconds={SESSION_DURATION_SECONDS}
          demoMode={DEMO_MODE}
          onBack={returnToIdle}
          onStart={startSession}
        />
      );
    }

    if (phase === 'running') {
      return (
        <>
          <LiveSession
            intention={intention}
            secondsLeft={secondsLeft}
            totalSeconds={SESSION_DURATION_SECONDS}
            stakeHbar={stakeHbar}
            interruptions={interruptions}
            demoMode={DEMO_MODE}
            onFinishEarly={() => setPhase('claim')}
            onRequestDisarm={() => setDisarmOpen(true)}
          />
          {disarmOpen && (
            <ConfirmSheet
              stakeHbar={stakeHbar}
              onConfirm={useAmnesty}
              onCancel={() => setDisarmOpen(false)}
            />
          )}
        </>
      );
    }

    if (phase === 'claim' || phase === 'submitting') {
      return (
        <ArtifactForm
          intention={intention}
          foregroundSeconds={Math.round(foregroundTimeRef.current)}
          interruptions={interruptions}
          submitting={phase === 'submitting'}
          onSubmit={submitClaim}
        />
      );
    }

    return (
      <div className="animate-fade-up flex h-full w-full flex-col gap-4">
        <Verdict
          result={result}
          stakeHbar={stakeHbar}
          amnestiedAt={amnestiedAt}
          errorMessage={errorMessage}
          couldHaveMoved={
            responseStatus === HTTP_STATUS_BAD_GATEWAY &&
            result?.settlement.ok === false
          }
          reviewState={reviewState}
          appealRemainingMs={appealRemainingMs}
          appealWindowEndsAt={appealWindowEndsAt}
          appealResponse={appealResponse}
          appealError={appealError}
          isSubmittingAppeal={isSubmittingAppeal}
          onSubmitAppeal={submitAppeal}
          onRetry={artifact.trim() === '' ? undefined : retrySettlement}
          onDone={beginDraft}
        />
        {/*
          Claim-time Selfie Check, kept verdicts only. A slipped verdict never
          shows it: making someone prove they are a live human in order to lose
          money is punitive, and there is no incentive to fake your way into a
          forfeit (docs/SELFIE-CHECK-SPEC.md §2).

          As built this renders after settlement rather than between the verdict
          and settlement, because the verdict is produced inside
          /api/session/settle — see spec §10.

          The DEMO_MODE test is belt-and-braces (demo mode already pins the
          verdict to 'slipped') so no future change to the demo verdict can put a
          phone between a judge and a finished flow.
        */}
        {!DEMO_MODE && result?.verdict === 'kept' && sessionId && selfieAction ? (
          <SelfieCheck sessionId={sessionId} action={selfieAction} />
        ) : null}
        <CirclePanel
          pendingForfeitHbar={
            amnestiedAt !== null ? null : circlePendingForfeitHbar
          }
        />
      </div>
    );
  };

  const announcement =
    phase === 'running'
      ? t('announceRunning')
      : phase === 'claim'
        ? t('announceClaim')
        : phase === 'submitting'
          ? t('announceSubmitting')
          : phase === 'complete'
            ? t('announceComplete')
            : phase === 'error'
              ? t('announceError')
              : '';

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {renderPhase()}
    </>
  );
};
