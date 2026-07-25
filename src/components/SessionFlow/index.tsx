'use client';

import {
  STAKE_OPTIONS_HBAR,
  SESSION_DURATION_SECONDS,
  commitmentHash,
} from '@/lib/session';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { useEffect, useId, useMemo, useState } from 'react';

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
};

const HTTP_STATUS_BAD_GATEWAY = 502;
const LIVE_FEEDBACK_LABELS = {
  pending: 'Submitting settlement',
  failed: 'Settlement failed',
  success: 'Settlement submitted',
};

const formatSeconds = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const remaining = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
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
  const [stakeHbar, setStakeHbar] = useState<number>(STAKE_OPTIONS_HBAR[0]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_DURATION_SECONDS);
  const [result, setResult] = useState<SettleResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);

  useEffect(() => {
    if (phase !== 'created') {
      return;
    }
    setPhase('running');
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running') {
      return;
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          return 0;
        }

        return previous - 1;
      });
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

  const startSession = () => {
    if (!intention.trim()) {
      return;
    }

    setResult(null);
    setErrorMessage(null);
    setResponseStatus(null);
    setSessionId(crypto.randomUUID());
    setSecondsLeft(SESSION_DURATION_SECONDS);
    setPhase('created');
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
        }),
      });

      const payload = await response.json();
      if (!isSettleResponse(payload)) {
        throw new Error('Unexpected settlement response shape.');
      }
      const json = payload;
      setResult(json);
      setResponseStatus(response.status);

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

  const canStart = useMemo(() => intention.trim().length > 0, [intention]);

  if (phase === 'idle') {
    return (
      <section className="w-full max-w-xl rounded-xl border border-gray-200 p-4 space-y-4">
        <h2 className="text-lg font-semibold">Start a focus session</h2>
        <label className="block space-y-2">
          <span className="text-sm text-gray-700">Intention</span>
          <textarea
            className="w-full rounded-lg border border-gray-300 p-3 text-sm"
            rows={4}
            value={intention}
            onChange={(event) => setIntention(event.target.value)}
            placeholder="State the commitment you want to keep for this session"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-gray-700">Stake (HBAR)</span>
          <select
            className="w-full rounded-lg border border-gray-300 p-3 text-sm"
            value={stakeHbar}
            onChange={(event) => setStakeHbar(Number(event.target.value))}
          >
            {STAKE_OPTIONS_HBAR.map((option) => (
              <option key={option} value={option}>
                {option} HBAR
              </option>
            ))}
          </select>
        </label>

        <Button onClick={startSession} disabled={!canStart} size="lg" variant="primary">
          Create session
        </Button>
      </section>
    );
  }

  if (phase === 'running') {
    return (
      <section className="w-full max-w-xl rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Session running</h2>
        <p className="text-sm text-gray-700">Session ID: {sessionId}</p>
        <p className="text-sm text-gray-700">Stake: {stakeHbar} HBAR</p>
        <p className="text-3xl font-semibold tabular-nums">{formatSeconds(secondsLeft)}</p>
        <p className="text-sm text-gray-600">
          Keep going. Claim opens when the timer reaches zero.
        </p>
      </section>
    );
  }

  if (phase === 'claim') {
    return (
      <section className="w-full max-w-xl rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Claim and settle</h2>
        <p className="text-sm text-gray-700">Session ID: {sessionId}</p>
        <p className="text-sm text-gray-700">Stake: {stakeHbar} HBAR</p>
        <LiveFeedback
          label={LIVE_FEEDBACK_LABELS}
          state={undefined}
        >
          <Button onClick={submitClaim} size="lg" variant="primary">
            Submit session
          </Button>
        </LiveFeedback>
      </section>
    );
  }

  if (phase === 'submitting') {
    return (
      <section className="w-full max-w-xl rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Submitting</h2>
        <LiveFeedback
          label={LIVE_FEEDBACK_LABELS}
          state="pending"
        >
          <Button disabled size="lg" variant="primary">
            Submitting
          </Button>
        </LiveFeedback>
      </section>
    );
  }

  if (phase === 'error') {
    const couldHaveMoved =
      responseStatus === HTTP_STATUS_BAD_GATEWAY &&
      result?.settlement.ok === false;

    return (
      <section className="w-full max-w-xl rounded-xl border border-red-200 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Settlement could not be confirmed</h2>
        {errorMessage && <p className="text-sm text-red-700">{errorMessage}</p>}
        {couldHaveMoved && (
          <p className="text-sm text-gray-700">
            The transfer may still have gone through. Check{' '}
            <a
              className="text-blue-600 underline"
              href="https://hashscan.io/testnet"
              target="_blank"
              rel="noreferrer"
              aria-label="Open HashScan testnet in a new tab"
            >
              HashScan testnet
            </a>{' '}
            before taking any next step.
          </p>
        )}
      </section>
    );
  }

  const settlement = result?.settlement;
  const hcs = result?.hcs;
  const moved = settlement?.ok && settlement.moved;

  return (
    <section className="w-full max-w-xl rounded-xl border border-gray-200 p-4 space-y-3">
      <h2 className="text-lg font-semibold">Session complete</h2>
      <p className="text-sm text-gray-700">Verdict: {result?.verdict}</p>
      <p className="text-sm text-gray-700">Stake: {stakeHbar} HBAR</p>
      <p className="text-sm text-gray-700">Session ID: {sessionId}</p>

      {moved ? (
        <p className="text-sm text-gray-700">
          HashScan:{' '}
          <a
            className="text-blue-600 underline"
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
        <p className="text-sm text-gray-700">Settlement did not move funds: {settlement.reason}</p>
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

      <p className="text-sm text-gray-600">
        Verdict is currently hardcoded, and the 0G coach replaces it next.
      </p>
    </section>
  );
};
