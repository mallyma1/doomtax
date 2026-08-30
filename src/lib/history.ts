'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'doomtax.sessionsCompleted';

/**
 * How many sessions this device has finished.
 *
 * Deliberately a single integer in localStorage. It exists to decide what a
 * screen should show, not to keep a record: nothing here is a kept-rate, and
 * no verdict, intention, stake or timestamp is stored. A count cannot be
 * turned into the individual scoreboard the product rules forbid, and losing
 * it to a cleared browser costs the user nothing.
 */
export function readSessionsCompleted(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    // Private mode, or storage disabled. Treat as a first run.
    return 0;
  }
}

export function markSessionCompleted(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(readSessionsCompleted() + 1));
  } catch {
    // Nothing here is worth failing a settlement over.
  }
}

/**
 * Reads the count after mount rather than during render.
 *
 * The server has no localStorage, so reading it during the first client render
 * would produce different markup than the server sent and React would discard
 * the tree. Starting at 0 and correcting in an effect means the first paint
 * always matches, and a returning user sees the extra panel appear a frame
 * later instead of the whole page rehydrating.
 */
export function useSessionsCompleted(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(readSessionsCompleted());
  }, []);
  return count;
}
