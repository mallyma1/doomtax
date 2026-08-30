'use client';

import { SESSION_DURATION_SECONDS } from '@/lib/session';

const STORAGE_KEY = 'doomtax.activeSession';

/**
 * How long after a session's clock runs out we will still restore it.
 *
 * Long enough that someone who reloads, loses signal, or gets pulled away
 * before writing their artifact comes back to the session rather than to an
 * empty start screen. Short enough that yesterday's abandoned session never
 * reappears as though it were live.
 */
const CLAIM_GRACE_MS = 60 * 60 * 1000;

export interface PersistedSession {
  sessionId: string;
  intention: string;
  stakeHbar: number;
  startedAt: number;
  /** Seconds the tab was foregrounded, so the coach's integrity input survives. */
  foregroundTime: number;
  interruptionCount: number;
}

function isPersistedSession(value: unknown): value is PersistedSession {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<PersistedSession>;
  return (
    typeof c.sessionId === 'string' &&
    c.sessionId !== '' &&
    typeof c.intention === 'string' &&
    typeof c.stakeHbar === 'number' &&
    Number.isFinite(c.stakeHbar) &&
    typeof c.startedAt === 'number' &&
    Number.isFinite(c.startedAt) &&
    typeof c.foregroundTime === 'number' &&
    typeof c.interruptionCount === 'number'
  );
}

export function saveActiveSession(session: PersistedSession): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage disabled or full. Persistence is a convenience, never a
    // precondition — a session that cannot be saved still runs normally.
  }
}

export function clearActiveSession(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // See above.
  }
}

/**
 * The session to resume, and whether its clock has already run out.
 *
 * Everything is judged against the stored `startedAt` rather than anything
 * counted while the page was open, so a reload lands the user exactly where
 * the wall clock says they should be — mid-session with the right time left,
 * or on the claim screen if it ran out while they were away. Returns null when
 * there is nothing to resume, when the record is malformed, or when it is old
 * enough that resuming it would be a surprise rather than a rescue.
 */
export function loadActiveSession(
  now = Date.now(),
): { session: PersistedSession; elapsed: boolean } | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearActiveSession();
    return null;
  }

  if (!isPersistedSession(parsed)) {
    clearActiveSession();
    return null;
  }

  const age = now - parsed.startedAt;
  // A clock that started in the future means the device clock moved; treat the
  // record as untrustworthy rather than showing a countdown that will not move.
  if (age < 0 || age > SESSION_DURATION_SECONDS * 1000 + CLAIM_GRACE_MS) {
    clearActiveSession();
    return null;
  }

  return { session: parsed, elapsed: age >= SESSION_DURATION_SECONDS * 1000 };
}
