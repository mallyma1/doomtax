/** 1 HBAR = 100,000,000 tinybar. HCS records amounts in tinybar, settlement takes HBAR. */
const TINYBAR_PER_HBAR = 100_000_000;

export function hbarToTinybar(hbar: number): number {
  return Math.round(hbar * TINYBAR_PER_HBAR);
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
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Demo mode keeps sessions at 30 seconds. A real session length makes the
 * submission video unwatchable, and the whole flow needs to be demonstrable
 * end to end in front of a judge.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
export const SESSION_DURATION_SECONDS = DEMO_MODE ? 30 : 25 * 60;

export const STAKE_OPTIONS_HBAR = [1, 5, 10] as const;
