import { NextResponse } from 'next/server';
import {
  createAppealSuccess,
  getAppealWindowEndsAt,
  type AppealRequest,
} from '@/lib/appeal';
import { getForfeit, recordAppeal } from '@/lib/sessionLedger';

// Touches the filesystem through the session ledger, so this must stay a
// Node runtime route and must never be imported by a client component.
export const runtime = 'nodejs';

const ALLOWED_REQUEST_KEYS = ['sessionId', 'verdict', 'settledAt', 'reason'] as const;
const ALLOWED_REQUEST_KEY_SET = new Set<string>(ALLOWED_REQUEST_KEYS);

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const body = rawBody as Record<string, unknown>;
  const extraKeys = Object.keys(body).filter((key) => !ALLOWED_REQUEST_KEY_SET.has(key));
  if (extraKeys.length > 0) {
    return NextResponse.json(
      { error: `Unexpected request fields: ${extraKeys.join(', ')}` },
      { status: 400 },
    );
  }

  const { sessionId, verdict, settledAt, reason } = body as Partial<AppealRequest>;

  if (
    typeof sessionId !== 'string' ||
    sessionId.trim() === '' ||
    (verdict !== 'kept' && verdict !== 'slipped') ||
    typeof settledAt !== 'number' ||
    typeof reason !== 'string'
  ) {
    return NextResponse.json(
      { error: 'sessionId, verdict, settledAt and reason are required' },
      { status: 400 },
    );
  }

  if (!Number.isFinite(settledAt) || settledAt <= 0 || settledAt > Date.now()) {
    return NextResponse.json(
      { error: 'settledAt must be a valid past timestamp' },
      { status: 400 },
    );
  }

  if (reason.trim() === '') {
    return NextResponse.json({ error: 'reason must not be empty' }, { status: 400 });
  }

  if (verdict === 'kept') {
    return NextResponse.json(
      {
        ok: false,
        status: 'ineligible',
        error: 'Only slipped sessions can be appealed.',
        appealWindowEndsAt: null,
      },
      { status: 409 },
    );
  }

  const trimmedSessionId = sessionId.trim();

  // The ledger is the authority on when this forfeit actually settled. The
  // client sends settledAt too, but trusting it would let a stale or edited
  // value decide whether the window is open. Fall back to the client value
  // only when the session is not in the ledger at all.
  const forfeit = getForfeit(trimmedSessionId);
  const effectiveSettledAt = forfeit?.settledAt ?? settledAt;
  const appealWindowEndsAt = getAppealWindowEndsAt(effectiveSettledAt);

  if (Date.now() > appealWindowEndsAt) {
    return NextResponse.json(
      {
        ok: false,
        status: 'expired',
        error: 'The appeal window has already closed for this session.',
        appealWindowEndsAt,
      },
      { status: 409 },
    );
  }

  // Mark the forfeit as contested so the charity sweep skips it. The reason
  // text is deliberately not passed on or stored — there is no reviewer in v1,
  // so an appeal resolves in the user's favour on the fact that it was filed.
  const result = recordAppeal(trimmedSessionId);

  if (!result.ok && result.reason === 'already_swept') {
    return NextResponse.json(
      {
        ok: false,
        status: 'expired',
        error: 'This forfeit has already been sent to the charity and cannot be recalled.',
        appealWindowEndsAt,
      },
      { status: 409 },
    );
  }

  // An unknown session still succeeds. The sweep only ever moves forfeits it
  // finds in the ledger, so a session that was never recorded is held by
  // default — accepting the appeal is both honest and the outcome that
  // resolves toward the user.
  return NextResponse.json(
    createAppealSuccess({
      sessionId: trimmedSessionId,
      verdict,
      settledAt: effectiveSettledAt,
      reason: reason.trim(),
    }),
  );
}
