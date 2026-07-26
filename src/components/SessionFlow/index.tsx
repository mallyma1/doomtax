'use client';

import { CirclePanel } from '@/components/CirclePanel';
import {
  deriveReviewState,
  getAppealTimeRemainingMs,
  getAppealWindowEndsAt,
  isAppealResponse,
  type AppealResponse,
} from '@/lib/appeal';
import {
  STAKE_OPTIONS_HBAR,
  SESSION_DURATION_SECONDS,
  commitmentHash,
} from '@/lib/session';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

type SessionPhase =
  | 'idle'
  | 'created'
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

type HcsResult =
  | {
      ok: true;
      transactionId: string;
    }
  | {
      ok: false;
      error: string;
    };

type StreakResult = {
  ok: boolean;
  mintTransactionId?: string;
  transferTransactionId?: string;
  error?: string;
};

type SettleResponse = {
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
  custody?: {
    sourceAccountId: string;
  } | null;
  streak?: StreakResult | null;
};

const HTTP_STATUS_BAD_GATEWAY = 502;
const LIVE_FEEDBACK_LABELS = {
  pending: 'Submitting settlement',
  failed: 'Settlement failed',
  success: 'Settlement submitted',
};
const APPEAL_FEEDBACK_LABELS = {
  pending: 'Submitting appeal',
  failed: 'Appeal not accepted',
  success: 'Appeal recorded',
};

const MAX_STAKE_HBAR = Math.max(...STAKE_OPTIONS_HBAR);
const INTENTION_MAX_LENGTH = 500;
const ARTIFACT_MAX_LENGTH = 500;

// Resumable across a refresh: the session was created and either running,
// waiting on a claim, or mid-submit. 'submitting' resumes as 'claim' rather
// than being persisted literally — a reload can't tell whether the request
// landed, and re-showing the claim form is the safe, user-favouring guess.
const STORAGE_KEY = 'doomtax:session';

type PersistedSession = {
  phase: 'running' | 'claim';
  sessionId: string;
  intention: string;
  stakeHbar: number;
  artifact: string;
  startedAt: number;
};

const loadPersistedSession = (): PersistedSession | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (
      (parsed.phase !== 'running' && parsed.phase !== 'claim') ||
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.intention !== 'string' ||
      typeof parsed.stakeHbar !== 'number' ||
      typeof parsed.artifact !== 'string' ||
      typeof parsed.startedAt !== 'number'
    ) {
      return null;
    }

    return parsed as PersistedSession;
  } catch {
    return null;
  }
};

const formatSeconds = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const remaining = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
};

const formatRemainingMs = (remainingMs: number) => {
  return formatSeconds(Math.ceil(remainingMs / 1000));
};

const formatTimestamp = (timestamp: number) => {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp);
};

const isSettleResponse = (value: unknown): value is SettleResponse => {
  if (!value || typeof value !== 'object') {
    return false;
  }

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

const HcsPayload = ({
  label,
  record,
}: {
  label: string;
  record: NonNullable<SettleResponse['hcsRecord']>;
}) => {
  const id = useId();
  const labelId = `hcs-payload-${id}`;

  return (
    <section aria-labelledby={labelId}>
      <p id={labelId} className="text-sm text-gray-700">
        {label}
      </p>
      <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all rounded border border-gray-200 bg-gray-50 p-2">
        {JSON.stringify(record, null, 2)}
      </pre>
    </section>
  );
};

export const SessionFlow = () => {
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [intention, setIntention] = useState('');
  const [artifact, setArtifact] = useState('');
  const [stakeHbar, setStakeHbar] = useState<number>(STAKE_OPTIONS_HBAR[0]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_DURATION_SECONDS);
  const [result, setResult] = useState<SettleResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [amnestiedAt, setAmnestiedAt] = useState<number | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealResponse, setAppealResponse] = useState<AppealResponse | null>(null);
  const [appealError, setAppealError] = useState<string | null>(null);
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Page Visibility integrity tracking — foreground time and interruptions.
  const foregroundTimeRef = useRef(0);
  const interruptionCountRef = useRef(0);
  const lastFocusRef = useRef<number | null>(null);

  // Wall-clock anchor for the countdown so a throttled/backgrounded tab
  // doesn't make the visible timer run slower than real time.
  const startedAtRef = useRef<number | null>(null);

  const computeSecondsLeft = () => {
    if (startedAtRef.current === null) {
      return SESSION_DURATION_SECONDS;
    }
    const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
    return Math.max(0, SESSION_DURATION_SECONDS - elapsed);
  };

  // Resume a running/claim session after a refresh. Runs once on mount, after
  // the initial 'idle' render, so there is no server/client markup mismatch —
  // sessionStorage isn't available during SSR anyway.
  useEffect(() => {
    const persisted = loadPersistedSession();
    if (!persisted) {
      return;
    }

    startedAtRef.current = persisted.startedAt;
    setSessionId(persisted.sessionId);
    setIntention(persisted.intention);
    setStakeHbar(persisted.stakeHbar);
    setArtifact(persisted.artifact);

    const remaining = computeSecondsLeft();
    setSecondsLeft(remaining);
    setPhase(remaining > 0 ? 'running' : 'claim');
  }, []);

  // Keep sessionStorage in sync with the resumable phases only.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const resumable = phase === 'running' || phase === 'claim' || phase === 'submitting';
    if (!resumable || !sessionId || startedAtRef.current === null) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    const persisted: PersistedSession = {
      phase: phase === 'running' ? 'running' : 'claim',
      sessionId,
      intention,
      stakeHbar,
      artifact,
      startedAt: startedAtRef.current,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [phase, sessionId, intention, stakeHbar, artifact]);

  useEffect(() => {
    if (phase !== 'running') return;

    lastFocusRef.current = Date.now();

    const handleVisibility = () => {
      if (document.hidden) {
        if (lastFocusRef.current !== null) {
          foregroundTimeRef.current += (Date.now() - lastFocusRef.current) / 1000;
          lastFocusRef.current = null;
        }
        interruptionCountRef.current += 1;
      } else {
        lastFocusRef.current = Date.now();
        // Resync immediately on return so a throttled background tab can't
        // leave the displayed countdown behind wall-clock time.
        setSecondsLeft(computeSecondsLeft());
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      // Flush any remaining foreground time when phase changes.
      if (lastFocusRef.current !== null) {
        foregroundTimeRef.current += (Date.now() - lastFocusRef.current) / 1000;
        lastFocusRef.current = null;
      }
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'created') {
      return;
    }
    startedAtRef.current = Date.now();
    setPhase('running');
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running') {
      return;
    }

    setSecondsLeft(computeSecondsLeft());
    const interval = window.setInterval(() => {
      setSecondsLeft(computeSecondsLeft());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === 'running' && secondsLeft === 0) {
      setPhase('claim');
    }
  }, [phase, secondsLeft]);

  useEffect(() => {
    const slippedSettlement =
      phase === 'complete' &&
      result?.verdict === 'slipped' &&
      completedAt !== null &&
      amnestiedAt === null &&
      appealResponse?.ok !== true;

    if (!slippedSettlement) {
      return;
    }

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [amnestiedAt, appealResponse, completedAt, phase, result]);

  const startSession = () => {
    if (!intention.trim()) {
      return;
    }

    setResult(null);
    setErrorMessage(null);
    setResponseStatus(null);
    setArtifact('');
    setCompletedAt(null);
    setAmnestiedAt(null);
    setAppealReason('');
    setAppealResponse(null);
    setAppealError(null);
    setIsSubmittingAppeal(false);
    setNowMs(Date.now());
    foregroundTimeRef.current = 0;
    interruptionCountRef.current = 0;
    lastFocusRef.current = null;
    setSessionId(crypto.randomUUID());
    setSecondsLeft(SESSION_DURATION_SECONDS);
    setPhase('created');
  };

  const resetToIdle = () => {
    startedAtRef.current = null;
    setPhase('idle');
    setSessionId(null);
    setIntention('');
    setArtifact('');
    setResult(null);
    setErrorMessage(null);
    setResponseStatus(null);
    setCompletedAt(null);
    setAmnestiedAt(null);
    setAppealReason('');
    setAppealResponse(null);
    setAppealError(null);
    setIsSubmittingAppeal(false);
    setSecondsLeft(SESSION_DURATION_SECONDS);
  };

  const useAmnesty = () => {
    if (!sessionId) {
      setErrorMessage('Session ID is missing. Start a new session.');
      setPhase('error');
      return;
    }

    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Use amnesty? This disarms the session before settlement — nothing moves, and it cannot be undone.',
      )
    ) {
      return;
    }

    setResult(null);
    setCompletedAt(null);
    setErrorMessage(null);
    setResponseStatus(null);
    setAppealReason('');
    setAppealResponse(null);
    setAppealError(null);
    setAmnestiedAt(Date.now());
    setPhase('complete');
  };

  const handleStakeSelect = (option: number) => {
    if (
      option === MAX_STAKE_HBAR &&
      option > stakeHbar &&
      typeof window !== 'undefined' &&
      !window.confirm(`Stake ${option} HBAR (testnet) for this session? That's the largest option.`)
    ) {
      return;
    }
    setStakeHbar(option);
  };

  const submitClaim = async () => {
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

      const json = payload;
      const submittedAt = Date.now();
      setResult(json);
      setCompletedAt(submittedAt);
      setResponseStatus(response.status);
      setAppealReason('');
      setAppealResponse(null);
      setAppealError(null);
      setNowMs(submittedAt);

      if (!response.ok || !json.settlement.ok) {
        const settlementError =
          !json.settlement.ok
            ? json.settlement.error
            : `Settlement failed with status ${response.status}.`;
        setErrorMessage(settlementError);
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

  const submitAppeal = async () => {
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
          reason: appealReason,
        }),
      });

      const payload = await response.json();
      if (!isAppealResponse(payload)) {
        throw new Error('Unexpected appeal response shape.');
      }

      setAppealResponse(payload);
      if (!response.ok || !payload.ok) {
        setAppealError(payload.ok ? 'Appeal request failed.' : payload.error);
        return;
      }
    } catch (error) {
      setAppealError(
        error instanceof Error ? error.message : 'Failed to submit appeal. Check your connection.',
      );
    } finally {
      setIsSubmittingAppeal(false);
    }
  };

  const canStart = useMemo(() => intention.trim().length > 0, [intention]);
  const canSubmitClaim = useMemo(() => artifact.trim().length > 0, [artifact]);
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
  const appealWindowEndsAt = completedAt !== null ? getAppealWindowEndsAt(completedAt) : null;
  const circlePendingForfeitHbar =
    result?.verdict === 'slipped' && result.settlement.ok && result.settlement.moved ? stakeHbar : null;

  const intentionReminder = intention.trim() ? (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-600">Your intention</p>
      <p className="text-sm font-medium text-gray-900">{intention}</p>
    </div>
  ) : null;

  const amnestyControl = (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
      <p className="text-sm font-medium text-amber-950">Bad day?</p>
      <p className="text-sm text-amber-900">
        Amnesty disarms this session before settlement. Nothing moves to the pending account or
        the shared cause.
      </p>
      <Button onClick={useAmnesty} size="lg" variant="tertiary" className="w-full">
        Use amnesty
      </Button>
    </div>
  );

  let content: ReactNode;

  if (phase === 'idle') {
    content = (
      <section className="rounded-xl border border-gray-200 p-4 space-y-4">
        <h2 className="text-lg font-semibold">Start a focus session</h2>
        <label className="block space-y-2">
          <span className="text-sm text-gray-700">Intention</span>
          <textarea
            className="w-full rounded-lg border border-gray-300 p-3 text-sm"
            rows={4}
            maxLength={INTENTION_MAX_LENGTH}
            value={intention}
            onChange={(event) => setIntention(event.target.value)}
            placeholder="State the commitment you want to keep for this session"
          />
        </label>

        <div className="block space-y-2">
          <span className="text-sm text-gray-700">Stake (HBAR)</span>
          <div className="flex gap-2" role="group" aria-label="Stake amount in HBAR">
            {STAKE_OPTIONS_HBAR.map((option) => {
              const selected = option === stakeHbar;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleStakeSelect(option)}
                  className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-colors ${
                    selected
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 text-gray-900 hover:border-gray-400'
                  }`}
                >
                  {option} HBAR
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">Testnet HBAR — no real-world value.</p>
        </div>

        <p className="text-xs text-gray-600">
          If the coach finds you slipped, the stake moves to a pending account first, then to your
          circle&apos;s shared cause once the appeal window closes — never to us, never to another
          person. You can appeal or use amnesty before that happens.
        </p>

        <Button onClick={startSession} disabled={!canStart} size="lg" variant="primary" className="w-full">
          Create session
        </Button>
      </section>
    );
  } else if (phase === 'running') {
    content = (
      <section className="rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Session running</h2>
        {intentionReminder}
        <p className="text-sm text-gray-700">Stake: {stakeHbar} HBAR</p>
        <p
          className="text-3xl font-semibold tabular-nums"
          role="timer"
          aria-live="polite"
          aria-label={`${formatSeconds(secondsLeft)} remaining`}
        >
          {formatSeconds(secondsLeft)}
        </p>
        <p className="text-sm text-gray-600">Keep going. Claim opens when the timer reaches zero.</p>
        {amnestyControl}
        <p className="text-xs text-gray-400">Session ID: {sessionId}</p>
      </section>
    );
  } else if (phase === 'claim') {
    content = (
      <section className="rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Claim and settle</h2>
          {intentionReminder}
          <p className="text-sm text-gray-700">Stake: {stakeHbar} HBAR</p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm text-gray-700">What did you actually do?</span>
          <textarea
            className="w-full rounded-lg border border-gray-300 p-3 text-sm"
            rows={3}
            maxLength={ARTIFACT_MAX_LENGTH}
            value={artifact}
            onChange={(event) => setArtifact(event.target.value)}
            placeholder="Briefly describe what you completed during this session"
          />
          {!canSubmitClaim ? (
            <span className="text-xs text-gray-500">
              Add a line about what you did — empty submissions aren&apos;t sent for review. Nothing
              to show? Use amnesty instead.
            </span>
          ) : null}
        </label>

        <LiveFeedback label={LIVE_FEEDBACK_LABELS} state={undefined} className="w-full">
          <Button
            onClick={submitClaim}
            disabled={!canSubmitClaim}
            size="lg"
            variant="primary"
            className="w-full"
          >
            Submit session
          </Button>
        </LiveFeedback>

        {amnestyControl}
        <p className="text-xs text-gray-400">Session ID: {sessionId}</p>
      </section>
    );
  } else if (phase === 'submitting') {
    content = (
      <section className="rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Submitting</h2>
        <LiveFeedback label={LIVE_FEEDBACK_LABELS} state="pending" className="w-full">
          <Button disabled size="lg" variant="primary" className="w-full">
            Submitting
          </Button>
        </LiveFeedback>
      </section>
    );
  } else if (phase === 'error') {
    const couldHaveMoved =
      responseStatus === HTTP_STATUS_BAD_GATEWAY &&
      result?.settlement.ok === false;
    const sourceAccountId = result?.custody?.sourceAccountId ?? null;

    content = (
      <section className="rounded-xl border border-red-200 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Settlement could not be confirmed</h2>
        {errorMessage && (
          <p className="text-sm text-red-700" role="alert">
            {errorMessage}
          </p>
        )}
        {couldHaveMoved ? (
          <p className="text-sm text-gray-700">
            The transfer may still have gone through. Check{' '}
            <a
              className="text-blue-600 underline break-all"
              href={
                sourceAccountId
                  ? `https://hashscan.io/testnet/account/${sourceAccountId}`
                  : 'https://hashscan.io/testnet'
              }
              target="_blank"
              rel="noreferrer"
              aria-label="Open your session account on HashScan testnet in a new tab"
            >
              HashScan testnet
            </a>{' '}
            before taking any next step.
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={submitClaim} size="lg" variant="primary" className="w-full">
            Try again
          </Button>
          <Button onClick={resetToIdle} size="lg" variant="tertiary" className="w-full">
            Start a new session
          </Button>
        </div>
      </section>
    );
  } else if (amnestiedAt !== null) {
    content = (
      <section className="rounded-xl border border-green-200 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Session disarmed</h2>
        <p className="text-sm text-gray-700">
          Amnesty was used before settlement. Nothing moved, nothing was written to the pending
          account, and there is no post-hoc refund path to untangle.
        </p>
        <p className="text-sm text-gray-700">Stake: {stakeHbar} HBAR</p>
        <p className="text-sm text-gray-700">
          Disarmed at {formatTimestamp(amnestiedAt)}. Start a new session when you are ready.
        </p>
        <Button onClick={resetToIdle} size="lg" variant="primary" className="w-full">
          Start a new session
        </Button>
        <p className="text-xs text-gray-400">Session ID: {sessionId}</p>
      </section>
    );
  } else {
    const settlement = result?.settlement;
    const hcs = result?.hcs;
    const moved = settlement?.ok && settlement.moved;
    const kept = result?.verdict === 'kept';
    const streak = result?.streak;

    content = (
      <section
        className={`rounded-xl border p-4 space-y-4 ${
          kept ? 'border-green-300 bg-green-50' : 'border-gray-200'
        }`}
      >
        <div className="space-y-1">
          <h2 className={kept ? 'text-2xl font-semibold text-green-950' : 'text-lg font-semibold'}>
            {kept ? 'Kept.' : 'This one slipped.'}
          </h2>
          <p className={`text-sm ${kept ? 'text-green-900' : 'text-gray-700'}`}>
            {kept
              ? `The commitment held. ${stakeHbar} HBAR stays yours.`
              : `Stake: ${stakeHbar} HBAR is headed toward the shared cause, pending the appeal window.`}
          </p>
        </div>

        {kept && streak?.ok ? (
          <div className="rounded-lg border border-green-200 bg-white p-3">
            <p className="text-sm font-medium text-green-950">Streak token minted</p>
            <p className="text-xs text-green-900">One more for the record. Testnet only.</p>
          </div>
        ) : null}

        {!kept ? (
          <p className="text-xs text-gray-500">
            The forfeit moved to the pending account first, not straight to the shared cause — that
            is what makes appeals reversible.
          </p>
        ) : null}

        <Button onClick={resetToIdle} size="lg" variant={kept ? 'primary' : 'secondary'} className="w-full">
          Start a new session
        </Button>

        <details className="rounded-lg border border-gray-200 p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            Session details
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-sm text-gray-700">Session ID: {sessionId}</p>

            {moved ? (
              <p className="text-sm text-gray-700 break-all">
                HashScan:{' '}
                <a
                  className="text-blue-600 underline break-all"
                  href={settlement.hashScanUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open settlement transaction in HashScan in a new tab"
                >
                  {settlement.hashScanUrl}
                </a>
              </p>
            ) : null}

            {settlement?.ok && !settlement.moved ? (
              <p className="text-sm text-gray-700">
                Settlement did not move funds: {settlement.reason}
              </p>
            ) : null}

            {hcs?.ok ? (
              <>
                <p className="text-sm text-gray-700">HCS transaction ID: {hcs.transactionId}</p>
                {result?.hcsTopicId ? (
                  <p className="text-sm text-gray-700">HCS topic ID: {result.hcsTopicId}</p>
                ) : null}
                {result?.hcsRecord ? (
                  <HcsPayload label="HCS message payload:" record={result.hcsRecord} />
                ) : null}
              </>
            ) : (
              <>
                <p className="text-sm text-gray-700">
                  HCS record failed: {hcs?.error ?? 'Unknown error'}
                  {moved ? ' Settlement still moved funds.' : ''}
                </p>
                {result?.hcsTopicId ? (
                  <p className="text-sm text-gray-700">HCS topic ID: {result.hcsTopicId}</p>
                ) : null}
                {result?.hcsRecord ? (
                  <HcsPayload label="Attempted HCS message payload:" record={result.hcsRecord} />
                ) : null}
              </>
            )}
          </div>
        </details>

        {result?.verdict === 'slipped' && completedAt !== null ? (
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Appeal window</h3>
              <p className="text-sm text-gray-700">
                Self-appeal resolves toward you. Contest it and, if accepted, the pending transfer
                is held back from the shared cause.
              </p>
            </div>

            {reviewState === 'appeal_open' ? (
              <>
                <p className="text-sm text-gray-700" aria-live="polite">
                  Time left: {formatRemainingMs(appealRemainingMs)}. Window closes at{' '}
                  {appealWindowEndsAt !== null ? formatTimestamp(appealWindowEndsAt) : 'unknown'}.
                </p>
                <label className="block space-y-2">
                  <span className="text-sm text-gray-700">Why should this resolve in your favour?</span>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm"
                    rows={3}
                    value={appealReason}
                    onChange={(event) => setAppealReason(event.target.value)}
                    placeholder="Example: the coach missed a valid artifact, or the session was interrupted for a legitimate reason"
                  />
                </label>
                <LiveFeedback
                  label={APPEAL_FEEDBACK_LABELS}
                  state={
                    isSubmittingAppeal
                      ? 'pending'
                      : appealResponse?.ok
                        ? 'success'
                        : appealError
                          ? 'failed'
                          : undefined
                  }
                  className="w-full"
                >
                  <Button
                    onClick={submitAppeal}
                    disabled={!appealReason.trim() || isSubmittingAppeal}
                    size="lg"
                    variant="primary"
                    className="w-full"
                  >
                    Submit appeal
                  </Button>
                </LiveFeedback>
              </>
            ) : null}

            {reviewState === 'appeal_submitting' ? (
              <p className="text-sm text-gray-700">Submitting your appeal now.</p>
            ) : null}

            {appealError ? (
              <p className="text-sm text-red-700" role="alert">
                {appealError}
              </p>
            ) : null}

            {appealResponse?.ok ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-1">
                <p className="text-sm font-medium text-green-950">Appeal recorded</p>
                <p className="text-sm text-green-900">{appealResponse.message}</p>
                <p className="text-xs text-green-900">Appeal ID: {appealResponse.appealId}</p>
              </div>
            ) : null}

            {reviewState === 'appeal_expired' ? (
              <p className="text-sm text-gray-700">
                The appeal window has closed. The pending transfer will join the shared cause on the
                next sweep.
              </p>
            ) : null}
          </section>
        ) : null}
      </section>
    );
  }

  return (
    <div className="w-full max-w-xl space-y-4">
      {content}
      {phase !== 'idle' ? (
        <CirclePanel pendingForfeitHbar={amnestiedAt !== null ? null : circlePendingForfeitHbar} />
      ) : null}
    </div>
  );
};
