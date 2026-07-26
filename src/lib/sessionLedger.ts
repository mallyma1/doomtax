import fs from 'fs';
import path from 'path';

/**
 * Off-chain record of settled forfeits and the appeals against them.
 *
 * This is what makes the escrow-then-sweep design real rather than rhetorical.
 * A forfeit lands in the pending account, not at the charity, so it can still
 * be given back. But "can be given back" only means something if the sweep can
 * tell which forfeits are still contested — and nothing on chain says that.
 * HCS carries a verdict boolean and nothing else, by hard constraint, so the
 * appeal state has to live here.
 *
 * Hard constraints:
 * - Server-only. Never import from a client component.
 * - **The appeal reason is never stored.** It is diary-grade text about a bad
 *   day, and we have no use for it: there is no reviewer and no accountability
 *   partner in v1, so an appeal resolves in the user's favour on the fact that
 *   it was filed. Storing the words would be collecting something we cannot
 *   act on, which is the definition of over-collection.
 * - Nothing here goes to HCS. The sessionId is already public on the topic;
 *   the appeal flag deliberately is not, because "who contested" is exactly
 *   the kind of thing a permanent public ledger should not carry.
 *
 * Written with the same atomic temp-file-then-rename + 0o600 pattern as the
 * custody map in src/identity/agentkit.ts. Same reasoning: a crash or a
 * concurrent write must never leave a truncated ledger, and this file links
 * sessions to money.
 */

const DATA_DIR = path.join(process.cwd(), 'data');
const LEDGER_FILE = path.join(DATA_DIR, 'session-ledger.json');

export type ForfeitRecord = {
  /** Pseudonymous session UUID. Same value already written to HCS. */
  sessionId: string;
  amountTinybar: number;
  /** When the forfeit transfer to the pending account succeeded. */
  settledAt: number;
  /** Hedera transaction ID of the forfeit transfer. */
  transactionId: string;
  /** Set when the user contests. Never carries the reason text. */
  appealedAt: number | null;
  /** Set once the forfeit has been swept from pending to charity. */
  sweptAt: number | null;
  sweepTransactionId: string | null;
};

type Ledger = Record<string, ForfeitRecord>;

function readLedger(): Ledger {
  try {
    return JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf-8')) as Ledger;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'ENOENT') return {};
    throw err;
  }
}

function writeLedger(ledger: Ledger): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${LEDGER_FILE}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  fs.writeFileSync(tmp, JSON.stringify(ledger, null, 2), { encoding: 'utf-8', mode: 0o600 });
  fs.renameSync(tmp, LEDGER_FILE);
}

/**
 * Records a forfeit that has landed in the pending account.
 *
 * Best-effort by design: the caller must not fail a settlement because the
 * ledger write failed. The money has already moved at that point, and throwing
 * would report a successful transfer as an error. An unrecorded forfeit is
 * simply one the sweep will never touch, which errs toward the user.
 */
export function recordForfeit(record: {
  sessionId: string;
  amountTinybar: number;
  transactionId: string;
  settledAt?: number;
}): void {
  const ledger = readLedger();
  // Never overwrite an existing record: a repeat call for the same session
  // would otherwise clear an appeal that has already been filed.
  if (ledger[record.sessionId]) return;

  ledger[record.sessionId] = {
    sessionId: record.sessionId,
    amountTinybar: record.amountTinybar,
    settledAt: record.settledAt ?? Date.now(),
    transactionId: record.transactionId,
    appealedAt: null,
    sweptAt: null,
    sweepTransactionId: null,
  };
  writeLedger(ledger);
}

export function getForfeit(sessionId: string): ForfeitRecord | null {
  return readLedger()[sessionId] ?? null;
}

export type RecordAppealResult =
  | { ok: true; record: ForfeitRecord }
  | { ok: false; reason: 'unknown_session' | 'already_swept' };

/**
 * Marks a forfeit as contested so the sweep will skip it.
 *
 * Idempotent: appealing twice keeps the first timestamp rather than moving the
 * record, so a double-tap cannot change the outcome.
 *
 * Note there is no eligibility check on the window here. The window is enforced
 * by the route, and this function is the storage layer. Once money has actually
 * left for the charity there is nothing left to hold, which is the one case
 * that genuinely cannot resolve toward the user — and it is why the sweep must
 * never run before the window closes.
 */
export function recordAppeal(sessionId: string, now = Date.now()): RecordAppealResult {
  const ledger = readLedger();
  const record = ledger[sessionId];
  if (!record) return { ok: false, reason: 'unknown_session' };
  if (record.sweptAt !== null) return { ok: false, reason: 'already_swept' };
  if (record.appealedAt !== null) return { ok: true, record };

  const updated: ForfeitRecord = { ...record, appealedAt: now };
  ledger[sessionId] = updated;
  writeLedger(ledger);
  return { ok: true, record: updated };
}

/**
 * Forfeits that are safe to sweep to the charity: settled, past the appeal
 * window, never contested, not already swept.
 *
 * appealWindowMs is passed in rather than read from the environment so the
 * sweep script and any test agree on one value explicitly.
 */
export function listSweepable(appealWindowMs: number, now = Date.now()): ForfeitRecord[] {
  return Object.values(readLedger()).filter(
    (r) => r.appealedAt === null && r.sweptAt === null && now >= r.settledAt + appealWindowMs,
  );
}

/** Forfeits still inside the appeal window or contested. Reporting only. */
export function listHeld(appealWindowMs: number, now = Date.now()): ForfeitRecord[] {
  return Object.values(readLedger()).filter(
    (r) => r.sweptAt === null && (r.appealedAt !== null || now < r.settledAt + appealWindowMs),
  );
}

/** Marks forfeits as swept. Call only after the transfer has succeeded. */
export function markSwept(sessionIds: string[], sweepTransactionId: string, now = Date.now()): void {
  const ledger = readLedger();
  for (const id of sessionIds) {
    const record = ledger[id];
    if (!record || record.sweptAt !== null) continue;
    ledger[id] = { ...record, sweptAt: now, sweepTransactionId };
  }
  writeLedger(ledger);
}
