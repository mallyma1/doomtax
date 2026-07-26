/**
 * Forfeit recipients.
 *
 * PLACEHOLDER. CHARITY is a Hedera testnet account with nothing real behind it.
 * There is no charity partnership. Do not write copy implying otherwise.
 *
 * Mainnet target is The Giving Block's partner API. Blocked on whether their
 * supported asset list includes HBAR, and on a commercial agreement.
 */
export const CHARITY = {
  name: "Placeholder charity (testnet)",
  accountId: process.env.CHARITY_ACCOUNT_ID ?? "0.0.0",
  logo: "/charity-placeholder.svg",
  isPlaceholder: true,
} as const;

/**
 * Forfeits land here first, not at the charity directly.
 *
 * Optimistic settlement and an appeal window are contradictory unless the money
 * pauses somewhere we control. Once a forfeit reaches a charity it cannot be
 * reversed, so appeals and amnesty would be promises we could not keep.
 */
export const PENDING = {
  accountId: process.env.PENDING_ACCOUNT_ID ?? "0.0.0",
} as const;

/**
 * How long a forfeit sits in PENDING before it can sweep to charity.
 *
 * 24 hours. A slipped verdict is the only outcome that costs the user money,
 * and the window is the whole reason that cost is reversible: once a sweep
 * runs, it cannot be undone. A user who was judged wrongly needs to notice,
 * come back and appeal, and a window shorter than a sleep cycle means the
 * appeal path exists on paper but not in practice.
 *
 * Override with APPEAL_WINDOW_MS to shorten it for a live demo, where waiting
 * a day to show the sweep is not an option.
 */
export const APPEAL_WINDOW_MS = Number(
  process.env.APPEAL_WINDOW_MS ?? 24 * 60 * 60 * 1000,
);

/**
 * Forfeits always leave the circle of participants. There is no policy switch:
 * team pots and splits were considered and cut. See docs/DESIGN-FORFEITS.md.
 */
export const FORFEIT_DESTINATION = "charity" as const;
