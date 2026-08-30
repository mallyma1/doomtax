/** 1 HBAR = 100,000,000 tinybar. HCS records amounts in tinybar, settlement takes HBAR. */
const TINYBAR_PER_HBAR = 100_000_000;

export function hbarToTinybar(hbar: number): number {
  return Math.round(hbar * TINYBAR_PER_HBAR);
}

/** Compute a hex-encoded SHA-256 of any ArrayBuffer. */
export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * The commitment hash is what lets HCS carry proof that an intention was
 * fixed at session start without the intention text itself ever reaching a
 * public permanent ledger. Hard constraint: the plaintext must never be
 * sent anywhere. This runs in the browser, so the intention does not even
 * leave the device.
 *
 * The session ID is mixed in so two users writing the same intention do not
 * produce the same hash on a public topic.
 */
export async function commitmentHash(
  sessionId: string,
  intention: string,
): Promise<string> {
  const encoded = new TextEncoder().encode(`${sessionId}:${intention}`);
  return sha256Hex(encoded.buffer as ArrayBuffer);
}

/**
 * Demo mode keeps sessions at 30 seconds. A real session length makes the
 * submission video unwatchable, and the whole flow needs to be demonstrable
 * end to end in front of a judge.
 *
 * Unset means on. Demo mode is the safe default: it pins the verdict to
 * 'slipped', which is the only path that moves money and produces a HashScan
 * link. Defaulting the other way would run the coach, and every coach failure
 * returns 'kept', which settles to a no-op and leaves no on-chain evidence.
 *
 * The settle route must read this same constant rather than testing the env
 * var itself, or the UI and the API can disagree about which mode they are in.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
export const SESSION_DURATION_SECONDS = DEMO_MODE ? 30 : 25 * 60;

export const STAKE_OPTIONS_HBAR = [1, 5, 10] as const;

/**
 * The largest stake the app will accept, shared by the form and the API.
 *
 * Two jobs. For the user it backs the product rule that a large jump gets
 * confirmed rather than waved through: anything above the biggest preset asks
 * first, and nothing above this ceiling is offered at all. For the server it
 * bounds an endpoint that moves real value — /api/session/settle validated only
 * that the amount was a finite positive number, so a stake of 999,999,999 was
 * accepted and would have been transferred out of the operator account.
 *
 * The API must import this rather than restate it, or the form and the route
 * can disagree about what is allowed and the user meets a rejection the screen
 * said nothing about.
 */
export const MAX_STAKE_HBAR = 100;

/**
 * Above this, starting a session asks for confirmation first.
 *
 * The biggest preset. Presets are the deliberately easy path, so a value beyond
 * them is by definition a jump the user typed on purpose — worth one question,
 * not a wall.
 */
export const LARGE_STAKE_THRESHOLD_HBAR =
  STAKE_OPTIONS_HBAR[STAKE_OPTIONS_HBAR.length - 1];
