import { APPEAL_WINDOW_MS } from '@/lib/charity';

export type SessionVerdict = 'kept' | 'slipped';

export type AppealRequest = {
  sessionId: string;
  verdict: SessionVerdict;
  settledAt: number;
  reason: string;
};

export type AppealSuccess = {
  ok: true;
  appealId: string;
  sessionId: string;
  status: 'accepted';
  resolution: 'refund_in_favour';
  requestedAt: number;
  appealWindowEndsAt: number;
  nextAction: 'hold_pending_funds';
  message: string;
};

export type AppealFailure = {
  ok: false;
  status: 'ineligible' | 'expired';
  error: string;
  appealWindowEndsAt: number | null;
};

export type AppealResponse = AppealSuccess | AppealFailure;

export type ReviewState =
  | 'idle'
  | 'kept'
  | 'amnestied'
  | 'appeal_open'
  | 'appeal_submitting'
  | 'appeal_accepted'
  | 'appeal_expired';

export function getAppealWindowEndsAt(settledAt: number): number {
  return settledAt + APPEAL_WINDOW_MS;
}

export function getAppealTimeRemainingMs(settledAt: number, now = Date.now()): number {
  return Math.max(0, getAppealWindowEndsAt(settledAt) - now);
}

export function isAppealEligible(
  verdict: SessionVerdict,
  settledAt: number,
  now = Date.now(),
): boolean {
  return verdict === 'slipped' && getAppealTimeRemainingMs(settledAt, now) > 0;
}

export function deriveReviewState({
  verdict,
  settledAt,
  amnestiedAt,
  appealSubmitting,
  appealAccepted,
  now = Date.now(),
}: {
  verdict: SessionVerdict | null;
  settledAt: number | null;
  amnestiedAt: number | null;
  appealSubmitting: boolean;
  appealAccepted: boolean;
  now?: number;
}): ReviewState {
  if (amnestiedAt !== null) {
    return 'amnestied';
  }

  if (verdict === null || settledAt === null) {
    return 'idle';
  }

  if (verdict === 'kept') {
    return 'kept';
  }

  if (appealAccepted) {
    return 'appeal_accepted';
  }

  if (appealSubmitting) {
    return 'appeal_submitting';
  }

  return isAppealEligible(verdict, settledAt, now) ? 'appeal_open' : 'appeal_expired';
}

export function createAppealSuccess(
  request: AppealRequest,
  requestedAt = Date.now(),
): AppealSuccess {
  return {
    ok: true,
    appealId: crypto.randomUUID(),
    sessionId: request.sessionId,
    status: 'accepted',
    resolution: 'refund_in_favour',
    requestedAt,
    appealWindowEndsAt: getAppealWindowEndsAt(request.settledAt),
    nextAction: 'hold_pending_funds',
    message:
      'Appeal recorded. This flow resolves toward you and keeps the pending transfer out of the charity sweep until a testnet-connected worker handles the refund or disarm.',
  };
}

export function isAppealResponse(value: unknown): value is AppealResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AppealResponse>;
  if (candidate.ok === true) {
    return (
      typeof (candidate as Partial<AppealSuccess>).appealId === 'string' &&
      (candidate as Partial<AppealSuccess>).status === 'accepted'
    );
  }

  if (candidate.ok === false) {
    const status = (candidate as Partial<AppealFailure>).status;
    return (
      (status === 'ineligible' || status === 'expired') &&
      typeof (candidate as Partial<AppealFailure>).error === 'string'
    );
  }

  return false;
}
