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

export type CircleSessionRecord = {
  sessionId: string;
  verdict: 'kept' | 'slipped';
  amountTinybar: bigint;
  timestamp: number;
};

const TINYBAR_PER_HBAR = BigInt(100_000_000);
const SESSION_KEY_LENGTH = 8;

export function sessionKey(sessionId: string): string {
  return sessionId.slice(0, SESSION_KEY_LENGTH);
}

export function circleIncludesSession(circle: Circle, id: string): boolean {
  return circle.memberSessionKeys.includes(sessionKey(id));
}

export function deriveCircleImpact(
  circle: Circle,
  records: readonly CircleSessionRecord[],
  periodLabel: string,
): CircleImpact {
  let totalTinybars = BigInt(0);
  let sessionCount = 0;

  for (const record of records) {
    if (record.verdict !== 'slipped' || !circleIncludesSession(circle, record.sessionId)) {
      continue;
    }

    totalTinybars += record.amountTinybar;
    sessionCount += 1;
  }

  return {
    totalTinybars,
    sessionCount,
    periodLabel,
  };
}

export function formatTinybarAsHbar(totalTinybars: bigint): string {
  const whole = totalTinybars / TINYBAR_PER_HBAR;
  const fraction = (totalTinybars % TINYBAR_PER_HBAR)
    .toString()
    .padStart(8, '0')
    .replace(/0+$/, '');

  return fraction === '' ? whole.toString() : `${whole}.${fraction}`;
}

export const DEMO_CIRCLE: Circle = {
  id: 'deep-work-circle',
  name: 'Deep Work Circle',
  // Must match CHARITY_ACCOUNT_ID. Hardcoded because this renders in a client
  // component and the account ID is not a NEXT_PUBLIC var. Update both together.
  causeAccountId: '0.0.9762856',
  causeName: 'Placeholder charity (testnet)',
  memberSessionKeys: ['497d1101', '2f6db550', 'd9a12c44'],
};

export const DEMO_CIRCLE_ACTIVITY: readonly CircleSessionRecord[] = [
  {
    sessionId: '497d1101-0cf0-40b9-b5d4-3608bdb6dc49',
    verdict: 'slipped',
    amountTinybar: BigInt(100_000_000),
    timestamp: 1_785_022_446_771,
  },
  {
    sessionId: '2f6db550-595d-4f56-b6d4-65f0d2e88ed1',
    verdict: 'slipped',
    amountTinybar: BigInt(500_000_000),
    timestamp: 1_785_022_846_771,
  },
  {
    sessionId: 'd9a12c44-7444-47f0-90e8-28a8561d4f2d',
    verdict: 'kept',
    amountTinybar: BigInt(100_000_000),
    timestamp: 1_785_023_246_771,
  },
] as const;
