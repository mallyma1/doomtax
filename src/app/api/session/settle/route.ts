import { NextResponse } from 'next/server';
import { settleSession, type SettlementVerdict } from '@/agent/settlement';
import { submitSessionRecord } from '@/hedera/consensus';
import { hbarToTinybar } from '@/lib/session';

// The Hedera SDK is Node-only and this route holds the operator key.
// Never let this become an edge function, and never import anything in
// here from a client component.
export const runtime = 'nodejs';

/**
 * The spine's verdict is hardcoded until the 0G Compute coach lands.
 *
 * It is deliberately "slipped": a "kept" verdict settles back to the same
 * account the stake came from, which settleSession short-circuits as a
 * no-op, so there would be no transaction and no HashScan link to show.
 * A slip is the path that actually moves money and proves the flow.
 */
const HARDCODED_VERDICT: SettlementVerdict = 'slipped';

type RequestBody = {
  sessionId: string;
  commitmentHash: string;
  stakeHbar: number;
};

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sessionId, commitmentHash, stakeHbar } = body;
  if (!sessionId || !commitmentHash || typeof stakeHbar !== 'number') {
    return NextResponse.json(
      { error: 'sessionId, commitmentHash and stakeHbar are required' },
      { status: 400 },
    );
  }

  // Until per-user custody exists, the operator account is the only account
  // whose key this server can sign with, so it is also the stake's source.
  const sourceAccountId = process.env.HEDERA_ACCOUNT_ID;
  if (!sourceAccountId) {
    return NextResponse.json(
      { error: 'HEDERA_ACCOUNT_ID is not set on the server' },
      { status: 500 },
    );
  }

  // Settlement first: it moves real money, and its result stands on its own
  // even if the ledger record afterwards fails.
  let settlement;
  try {
    settlement = await settleSession({
      sessionId,
      verdict: HARDCODED_VERDICT,
      amountHbar: stakeHbar,
      sourceAccountId,
    });
  } catch (err) {
    return NextResponse.json(
      {
        verdict: HARDCODED_VERDICT,
        settlement: { ok: false, error: err instanceof Error ? err.message : String(err) },
        hcs: { ok: false, error: 'Not attempted: settlement failed' },
      },
      { status: 502 },
    );
  }

  // A failure from here on does not undo the transfer above, so the response
  // reports the two outcomes separately rather than as one success flag.
  let hcs;
  try {
    const transactionId = await submitSessionRecord({
      sessionId,
      commitmentHash,
      verdict: HARDCODED_VERDICT === 'kept',
      amountTinybar: hbarToTinybar(stakeHbar),
      timestamp: Date.now(),
    });
    hcs = { ok: true as const, transactionId };
  } catch (err) {
    hcs = { ok: false as const, error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json({ verdict: HARDCODED_VERDICT, settlement: { ok: true, ...settlement }, hcs });
}
