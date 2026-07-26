'use client';

import { ArtifactForm } from '@/components/ArtifactForm';
import { AuthButton } from '@/components/AuthButton';
import { CirclePanel } from '@/components/CirclePanel';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { LiveSession } from '@/components/LiveSession';
import { StakeForm } from '@/components/StakeForm';
import { Verdict } from '@/components/Verdict';
import {
  deriveReviewState,
  getAppealTimeRemainingMs,
  getAppealWindowEndsAt,
  isAppealResponse,
  type AppealResponse,
} from '@/lib/appeal';
import {
  SESSION_DURATION_SECONDS,
  STAKE_OPTIONS_HBAR,
  commitmentHash,
} from '@/lib/session';
import { Button } from '@worldcoin/mini-apps-ui-kit-react';
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
 */
export const SessionFlow = () => {
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [intention, setIntention] = useState('');
  const [stakeHbar, setStakeHbar] = useState<number>(STAKE_OPTIONS_HBAR[0]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_DURATION_SECONDS);
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

  useEffect(() => {
    if (phase !== 'running') return;
    const interval = window.setInterval(() => {
      setSecondsLeft((previous) => (previous <= 1 ? 0 : previous - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === 'running' && secondsLeft === 0) setPhase('claim');
  }, [phase, secondsLeft]);

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
    setStakeHbar(STAKE_OPTIONS_HBAR[0]);
    setPhase('draft');
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
    setPhase('running');
  };

  const useAmnesty = () => {
    if (!sessionId) {
      setErrorMessage('Session ID is missing. Start a new session.');
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

  const submitClaim = async (artifact: string) => {
    if (!sessionId) {
      setErrorMessage('Session ID is missing. Start a new session.');
      setPhase('error');
      return;
    }

    setPhase('submitting');
    setErrorMessage(null);
    setResponseStatus(null);

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
          artifact,
          foregroundTime: foregroundTimeRef.current,
          interruptionCount: interruptionCountRef.current,
        }),
      });

      const payload = await response.json();
      if (!isSettleResponse(payload)) {
        throw new Error('Unexpected settlement response shape.');
      }

      const submittedAt = Date.now();
      setResult(payload);
      setCompletedAt(submittedAt);
      setResponseStatus(response.status);
      setAppealResponse(null);
      setAppealError(null);
      setNowMs(submittedAt);

      if (!response.ok || !payload.settlement.ok) {
        setErrorMessage(
          !payload.settlement.ok
            ? payload.settlement.error
            : `Settlement failed with status ${response.status}.`,
        );
        setPhase('error');
        return;
      }

      setPhase('complete');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to submit settlement. Check your connection.',
      );
      setPhase('error');
    }
  };

  const submitAppeal = async (reason: string) => {
    if (!sessionId || !result || completedAt === null) {
      setAppealError('Appeal state is missing. Start a new session.');
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
        throw new Error('Unexpected appeal response shape.');
      }

      setAppealResponse(payload);
      if (!response.ok || !payload.ok) {
        setAppealError(payload.ok ? 'Appeal request failed.' : payload.error);
      }
    } catch (error) {
      setAppealError(
        error instanceof Error
          ? error.message
          : 'Failed to submit appeal. Check your connection.',
      );
    } finally {
      setIsSubmittingAppeal(false);
    }
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

  if (phase === 'idle') {
    return (
      <div className="flex h-full w-full flex-col justify-between gap-6">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div
            className="mb-10 size-16 rounded-full"
            style={{
              background:
                'radial-gradient(circle at 50% 38%, #fde68a 0%, #f59e0b 45%, #b45309 100%)',
              boxShadow: '0 0 64px 16px rgba(245,158,11,0.22)',
            }}
            aria-hidden="true"
          />
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-foreground">
            Put something
            <br />
            behind it
          </h1>
          <p className="mt-3.5 max-w-[26ch] text-[14px] leading-[1.55] text-muted">
            Say what you will do, stake on it, and let a private coach decide
            whether you kept your word.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <Button variant="primary" size="lg" fullWidth onClick={beginDraft}>
            New session
          </Button>
          <AuthButton />
        </div>
        <CirclePanel pendingForfeitHbar={null} />
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
    <div className="flex h-full w-full flex-col gap-4">
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
        onDone={beginDraft}
      />
      <CirclePanel
        pendingForfeitHbar={
          amnestiedAt !== null ? null : circlePendingForfeitHbar
        }
      />
    </div>
  );
};
