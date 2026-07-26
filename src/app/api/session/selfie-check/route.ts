import { NextResponse } from 'next/server';
import { recordSelfieCheck } from '@/identity/selfieCheck';

// recordSelfieCheck() reads RP_ID and writes to the filesystem, so this route
// is Node-only and must never become an edge function.
export const runtime = 'nodejs';

type RequestBody = {
  sessionId?: string;
  rp_id?: string;
  /** Absent or null when the user declined — there is no proof to verify. */
  idkitResponse?: unknown;
};

/**
 * Records the claim-time Selfie Check for a session.
 *
 * Always 200 on a well-formed request. The outcome is evidence, not a gate:
 * settlement has no dependency on it and the client has nothing to branch on
 * (`docs/SELFIE-CHECK-SPEC.md` §3). Only a malformed request is an error.
 *
 * The nullifier is never returned to the client. It stays server-side, in the
 * off-chain record, and never reaches HCS (spec §4).
 */
export async function POST(request: Request) {
  const expectedRpId = process.env.RP_ID;
  if (!expectedRpId) {
    return NextResponse.json({ error: 'RP_ID not configured' }, { status: 500 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sessionId, rp_id, idkitResponse } = body;

  if (typeof sessionId !== 'string' || sessionId.trim() === '') {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  // Same check as /api/verify-proof: the proof was requested under our relying
  // party, so a mismatch means this result belongs to a different one.
  if (rp_id !== expectedRpId) {
    return NextResponse.json({ error: 'Invalid rp_id' }, { status: 400 });
  }

  const outcome = await recordSelfieCheck(sessionId, idkitResponse ?? null);

  return NextResponse.json({ outcome });
}
