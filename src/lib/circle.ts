/**
 * Circles: the social layer, deliberately not a competitive one.
 *
 * A circle is a group of users who pick a shared cause. All their forfeits go to
 * that one charity and the app shows the collective total only.
 *
 * INVARIANTS:
 *  - Individual contributions are never displayed. Aggregate only.
 *  - No ranking, no leaderboard, no kept-rate comparison between members.
 *  - Nobody can tell who slipped.
 *  - Circle membership NEVER goes on HCS. It would link identities on a public
 *    permanent ledger. Membership is off-chain; the total is derived
 *    client-side from known member session IDs.
 */
export type Circle = {
  id: string;
  name: string;
  /** Hedera account for the cause this circle chose. */
  causeAccountId: string;
  causeName: string;
  /** Pseudonymous session-ID prefixes for members. Off-chain only. */
  memberSessionKeys: string[];
};

/** Aggregate only. Never returns per-member figures. */
export type CircleImpact = {
  totalTinybars: bigint;
  sessionCount: number;
  periodLabel: string;
};
