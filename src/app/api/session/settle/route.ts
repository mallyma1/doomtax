import { NextResponse } from 'next/server';
import { settleSession, type SettlementVerdict } from '@/agent/settlement';
import { askCoach } from '@/ai/coach';
import { submitSessionRecord } from '@/hedera/consensus';
import { fundUserAccount, getOrCreateUserAccount } from '@/identity/agentkit';
import { hbarToTinybar } from '@/lib/session';
import { auth } from '@/auth';

// The Hedera SDK is Node-only and this route holds the operator key.
// Never let this become an edge function, and never import anything in
// here from a client component.
export const runtime = 'nodejs';

/**
 * Demo-mode fallback used when NEXT_PUBLIC_DEMO_MODE=true or the 0G coach
 * is unavailable. Deliberately 'slipped' so the flow moves money and
 * produces a HashScan link — a 'kept' verdict is a no-op transfer.
 */
const DEMO_VERDICT: SettlementVerdict = 'slipped';

type RequestBody = {
  sessionId: string;
  commitmentHash: string;
  stakeHbar: number;
  // Coach inputs — forwarded to 0G only; never stored, logged, or written to HCS.
  intention: string;
  artifact: string;
  foregroundTime: number;
  interruptionCount: number;
};

const ALLOWED_REQUEST_KEYS = [
  'sessionId',
  'commitmentHash',
  'stakeHbar',
  'intention',
  'artifact',
  'foregroundTime',
  'interruptionCount',
] as const;
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

  const {
    sessionId,
    commitmentHash,
    stakeHbar,
    intention,
    artifact,
    foregroundTime,
    interruptionCount,
  } = body as Partial<RequestBody>;

  if (
    typeof sessionId !== 'string' ||
    sessionId.trim() === '' ||
    typeof commitmentHash !== 'string' ||
    commitmentHash.trim() === '' ||
    typeof stakeHbar !== 'number'
  ) {
    return NextResponse.json(
      { error: 'sessionId, commitmentHash and stakeHbar are required' },
      { status: 400 },
    );
  }

  const hcsTopicId = process.env.HEDERA_HCS_TOPIC_ID ?? null;

  // Resolve the stake's source account. With per-user custody, each
  // authenticated user has their own Hedera account provisioned on first use.
  // If auth is unavailable (demo POST without a session), fall back to the
  // operator account — the flow still works and the demo path stays alive.
  const operatorAccountId = process.env.HEDERA_ACCOUNT_ID;
  if (!operatorAccountId) {
    return NextResponse.json(
      { error: 'HEDERA_ACCOUNT_ID is not set on the server' },
      { status: 500 },
    );
  }

  let sourceAccountId = operatorAccountId;
  let custodyError: string | null = null;

  const session = await auth();
  const userId = session?.user?.id;

  if (userId) {
    try {
      sourceAccountId = await getOrCreateUserAccount(userId);
    } catch (err) {
      // Custody provisioning failed. Fall back to the operator account so the
      // session still settles rather than leaving the user stranded. Record
      // the error so the response is honest about what happened.
      custodyError = err instanceof Error ? err.message : String(err);
      sourceAccountId = operatorAccountId;
    }
  }

  // Determine verdict. In demo mode (or when coach inputs are absent) fall
  // back to the demo verdict so the flow still produces a HashScan link.
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const hasCoachInputs =
    typeof intention === 'string' &&
    typeof artifact === 'string' &&
    typeof foregroundTime === 'number' &&
    typeof interruptionCount === 'number';

  let verdict: SettlementVerdict;
  if (!isDemo && hasCoachInputs) {
    // Coach inputs are passed to 0G only — never stored, never logged, never in HCS.
    verdict = await askCoach({
      intention: intention!,
      artifact: artifact!,
      foregroundTime: foregroundTime!,
      interruptionCount: interruptionCount!,
    });
  } else {
    verdict = DEMO_VERDICT;
  }

  // Only fund the per-user custody account when the verdict requires a real
  // transfer out of it. A 'kept' verdict short-circuits to a no-op in
  // settleSession() (destination === source), so funding before the verdict
  // is known would gift the operator's HBAR to the user unconditionally.
  if (userId && verdict === 'slipped' && sourceAccountId !== operatorAccountId) {
    try {
      await fundUserAccount(sourceAccountId, stakeHbar);
    } catch (err) {
      custodyError = err instanceof Error ? err.message : String(err);
      sourceAccountId = operatorAccountId;
    }
  }

  // Settlement first: it moves real money, and its result stands on its own
  // even if the ledger record afterwards fails.
  let settlement;
  try {
    settlement = await settleSession({
      sessionId,
      verdict,
      amountHbar: stakeHbar,
      sourceAccountId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        verdict,
        settlement: { ok: false, error: err instanceof Error ? err.message : String(err) },
        hcs: { ok: false, error: 'Not attempted: settlement failed' },
        hcsTopicId,
        hcsRecord: null,
        custody: {
          sourceAccountId,
          usingPerUserAccount: sourceAccountId !== operatorAccountId,
          ...(custodyError ? { error: custodyError } : {}),
        },
      },
      { status: 502 },
    );
  }

  const hcsRecord = {
    sessionId,
    commitmentHash,
    verdict: verdict === 'kept',
    amountTinybar: hbarToTinybar(stakeHbar),
    timestamp: Date.now(),
  };

  // A failure from here on does not undo the transfer above, so the response
  // reports the two outcomes separately rather than as one success flag.
  let hcs;
  try {
    const transactionId = await submitSessionRecord(hcsRecord);
    hcs = { ok: true as const, transactionId };
  } catch (err) {
    hcs = { ok: false as const, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json({
    verdict,
    settlement: { ok: true, ...settlement },
    hcs,
    hcsTopicId,
    hcsRecord,
    custody: {
      sourceAccountId,
      usingPerUserAccount: sourceAccountId !== operatorAccountId,
      ...(custodyError ? { error: custodyError } : {}),
    },
  });
}
