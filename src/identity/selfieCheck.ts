import fs from 'fs';
import path from 'path';
import { DATA_DIR, ensureDataDir } from '@/lib/dataDir';

/**
 * Claim-time Selfie Check — server side.
 *
 * Implements `docs/SELFIE-CHECK-SPEC.md` §5. Read that document before
 * changing anything here; the three rules below are load-bearing and each one
 * exists because breaking it costs a user money or their privacy.
 *
 * 1. **This can never block a refund.** Every non-success outcome settles as
 *    if the check had passed. Nothing in this module throws for a failed
 *    check, and nothing returns a value a caller could use as a gate. Do not
 *    add a strict mode, a config flag, or an env var that makes it blocking —
 *    that is a design change and it goes through `CLAUDE.md`, not a parameter.
 * 2. **The nullifier never reaches HCS.** It is stable per relying party, so a
 *    public permanent ledger carrying it would let anyone group every session
 *    belonging to one person and correlate that group with the wallet that
 *    funded it. That is exactly the linkage `CLAUDE.md` constraint 3 forbids.
 *    It is stored here, off-chain, and nowhere else.
 * 3. **No selfie image ever reaches this server.** Capture and matching happen
 *    inside World ID; what arrives is a zero-knowledge proof. Copy must never
 *    imply we see a face.
 *
 * Server-only. Never import this from a client component — it reads `RP_ID`
 * and touches the filesystem. `pnpm build` is the gate that catches it.
 */

const SELFIE_CHECK_FILE = path.join(DATA_DIR, 'selfie-checks.json');

const VERIFY_ENDPOINT = 'https://developer.world.org/api/v4/verify';

/** Credential identifier and issuer schema for Selfie Check, per IDKit's response types. */
const SELFIE_IDENTIFIER = 'selfie';
const SELFIE_ISSUER_SCHEMA_ID = 11;

export type SelfieCheckOutcome = 'verified' | 'declined' | 'unavailable';

export type SelfieCheckRecord = {
  verified: boolean;
  checkedAt: number;
  /**
   * Present only on a verified check. A declined or unavailable check has no
   * proof and therefore no nullifier — storing an empty string instead would
   * make "the user never proved anything" and "we failed to read the proof"
   * indistinguishable in the file, and this record is the only place either
   * fact survives.
   */
  nullifier?: string;
};

type SelfieCheckMap = Record<string, SelfieCheckRecord>;

function readSelfieCheckMap(): SelfieCheckMap {
  try {
    return JSON.parse(fs.readFileSync(SELFIE_CHECK_FILE, 'utf-8')) as SelfieCheckMap;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'ENOENT') return {};
    throw err;
  }
}

function writeSelfieCheckMap(map: SelfieCheckMap): void {
  ensureDataDir('selfie-check');
  // Same atomic temp-then-rename as writeCustodyMap() in ./agentkit.ts, for
  // the same reason: a crash or a concurrent write must never leave a
  // truncated file. Mode 0o600 because nullifiers are per-person identifiers.
  const tmp = `${SELFIE_CHECK_FILE}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  fs.writeFileSync(tmp, JSON.stringify(map, null, 2), { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmp, SELFIE_CHECK_FILE);
}

/**
 * Pulls the Selfie Check nullifier out of an IDKit result.
 *
 * The response carries one entry per requested credential, so it prefers the
 * selfie entry rather than assuming there is only one. Returns null when the
 * shape is anything other than expected — an unreadable proof is treated as no
 * proof, never as a verified one.
 */
function extractNullifier(idkitResponse: unknown): string | null {
  if (!idkitResponse || typeof idkitResponse !== 'object') return null;

  const responses = (idkitResponse as { responses?: unknown }).responses;
  if (!Array.isArray(responses)) return null;

  const items = responses.filter(
    (item): item is { identifier?: string; issuer_schema_id?: number; nullifier?: unknown } =>
      !!item && typeof item === 'object',
  );

  const selfie =
    items.find(
      (item) =>
        item.identifier === SELFIE_IDENTIFIER ||
        item.issuer_schema_id === SELFIE_ISSUER_SCHEMA_ID,
    ) ?? items[0];

  const nullifier = selfie?.nullifier;
  return typeof nullifier === 'string' && nullifier !== '' ? nullifier : null;
}

function persist(sessionId: string, record: SelfieCheckRecord): void {
  try {
    const map = readSelfieCheckMap();
    writeSelfieCheckMap({ ...map, [sessionId]: record });
  } catch (err) {
    // The record is evidence, not a gate. Losing it must not turn a completed
    // claim into an error, so this is best-effort and deliberately swallowed.
    console.warn(
      `[selfie-check] Could not record outcome for session ${sessionId}:`,
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Verifies an IDKit Selfie Check proof against the Developer Portal and
 * records the outcome against the session.
 *
 * Never throws for a failed check. A rejected proof is a normal 'declined'
 * outcome rather than an error, because settlement proceeds either way — the
 * caller has nothing to handle and no decision to make (spec §3).
 *
 * @param sessionId     - The session being claimed. Also the proof's signal,
 *                        which is what keeps the nullifier per-session rather
 *                        than a durable identity key (spec §4).
 * @param idkitResponse - The IDKit result. Pass null when the user declined or
 *                        the credential was unavailable on their device; there
 *                        is no proof to verify, and the decline is still worth
 *                        recording.
 */
export async function recordSelfieCheck(
  sessionId: string,
  idkitResponse: unknown,
): Promise<SelfieCheckOutcome> {
  const checkedAt = Date.now();

  // No proof to check. The user cancelled, denied the camera, or the device
  // could not produce the credential. All of these settle normally.
  if (!idkitResponse) {
    persist(sessionId, { verified: false, checkedAt });
    return 'declined';
  }

  const rpId = process.env.RP_ID;
  if (!rpId) {
    console.warn('[selfie-check] RP_ID is not configured — cannot verify');
    persist(sessionId, { verified: false, checkedAt });
    return 'unavailable';
  }

  let response: Response;
  try {
    response = await fetch(`${VERIFY_ENDPOINT}/${encodeURIComponent(rpId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(idkitResponse),
    });
  } catch (err) {
    console.warn(
      '[selfie-check] Developer Portal unreachable:',
      err instanceof Error ? err.message : String(err),
    );
    persist(sessionId, { verified: false, checkedAt });
    return 'unavailable';
  }

  if (!response.ok) {
    // A 4xx is the Portal rejecting the proof — an ordinary declined check.
    // A 5xx is the Portal itself failing, including a Beta outage, which says
    // nothing about the user. Both settle identically; they are distinguished
    // only so the recorded evidence is honest about which happened.
    const outcome: SelfieCheckOutcome = response.status >= 500 ? 'unavailable' : 'declined';
    persist(sessionId, { verified: false, checkedAt });
    return outcome;
  }

  const nullifier = extractNullifier(idkitResponse);
  if (!nullifier) {
    // The Portal accepted the proof but we could not read a nullifier from it.
    // Recording verified:true with nothing to identify the check would be a
    // claim we cannot support, so this is reported as unavailable.
    console.warn('[selfie-check] Proof verified but no nullifier found in the response');
    persist(sessionId, { verified: false, checkedAt });
    return 'unavailable';
  }

  persist(sessionId, { verified: true, checkedAt, nullifier });
  return 'verified';
}

/** Reads the stored outcome. Returns null if the session was never checked. */
export function getSelfieCheck(sessionId: string): SelfieCheckRecord | null {
  try {
    return readSelfieCheckMap()[sessionId] ?? null;
  } catch {
    return null;
  }
}
