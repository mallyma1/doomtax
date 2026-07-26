import { NextResponse } from 'next/server';
import {
  createAppealSuccess,
  getAppealWindowEndsAt,
  type AppealRequest,
} from '@/lib/appeal';

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

  const appealWindowEndsAt = getAppealWindowEndsAt(settledAt);
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

  return NextResponse.json(
    createAppealSuccess({
      sessionId: sessionId.trim(),
      verdict,
      settledAt,
      reason: reason.trim(),
    }),
  );
}
