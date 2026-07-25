

A personal commitment device for focus. Stake on a session, state an intention, a
private AI coach on 0G decides if you kept it, an autonomous agent on Hedera
settles the payout, and forfeits go to charity.

ETHGlobal Lisbon 2026.

## Hard constraints, do not violate

1. **No Solidity anywhere in this repo.** All Hedera functionality goes through
   @hashgraph/sdk or the Hedera Agent Kit. We are submitting to Hedera's
   "No Solidity Allowed" track, which disqualifies smart contracts. If you think
   you need a contract, you need an SDK call instead. Ask before adding any .sol.
2. **ETHSKILLS routing does not apply here.** Ignore its Scaffold-ETH 2, Hardhat
   and Foundry recommendations. This is Hedera-native, World Mini App, 0G Compute.
   Its Security, Testing, Concepts and QA skills are still useful.
3. **Never write to HCS anything identifying a person or their content.** HCS is
   a public permanent ledger. Allowed: pseudonymous session ID, commitment hash,
   verdict boolean, payout amount, timestamp. Never: intention text, artifact
   content, coaching messages, circle membership, or anything linking a session
   to a human identity.
4. **Never say bet, wager, odds, or gamble.** Say stake, commitment, pledge,
   forfeit. There is no chance element and no house edge.
5. **Never use the em dash.** Use commas, colons, periods, or "to" for ranges.
6. **Testnet only.** No mainnet keys in this repo, ever.

## Product shape

**DoomTax is a personal app.** Solo is the default and the primary mode.

- No teams, no pots, no leaderboards, no competition, no ranking of users against
  each other, and never a visible individual kept-rate. Competing on kept-rate
  would put the most pressure on whoever is struggling most, which is inverted
  for a focus and mental health product.
- **Social is allowed where it is not competitive.** Users may join a circle and
  choose a shared cause. All circle forfeits go to that one charity and the app
  shows the collective total only, never individual contributions. This makes a
  slip prosocial rather than punitive.
- **Circle membership never goes on HCS.** It would link identities on a public
  ledger. Membership stays off-chain; the circle total is derived client-side
  from known member session IDs.
- **There is no accountability partner in v1.** If the coach gets a verdict
  wrong, the user appeals to themselves: a short window in which they can
  contest, resolving in their favour.

## Design rules

- The verdict is judged **only against the intention the user stated at session
  start**, never against a general notion of productivity.
- **Ambiguity always resolves toward the user.** Contested session, failed
  inference, timeout, missing evidence: refund. A wrong "kept" costs nothing.
  A wrong "slipped" costs trust.
- Forfeits go to a configurable charity recipient. Never to the platform, never
  to another individual. The recipient is a placeholder testnet account and there
  is no charity partnership. Do not write copy implying one exists.
- Forfeits settle to an operator-held **pending** account first, and sweep to
  charity only after the appeal window closes. This is what makes appeals and
  amnesty actually refundable rather than rhetorical.
- **Amnesty disarms a session before settlement.** It is not a post-hoc refund.
- The user sets the stake. Small by default, confirmation before any large jump.
- Wins are louder than losses. The streak token mints and animates. The forfeit
  is quiet.
- **Custody is honest.** The app provisions and holds a Hedera testnet account
  per user and records consent to HCS. World App signs World Chain, not Hedera,
  so the user cannot sign this themselves. Never write copy claiming they did.

## What the model may see

The 0G Compute call receives only: the intention stated at session start, the
artifact submitted at the end, and integrity metadata (foreground time,
interruption count) from the Page Visibility API. Never screen contents,
browsing history, keystrokes, location, or third-party app data.

## Business model

Premium coach. Free tier returns a verdict, paid tier is the long-memory coach
on 0G Storage. Never a cut of forfeits, never a volume fee from the charity,
never yield on stakes.

## Stack

Next.js 15 + MiniKit, @hashgraph/sdk + @hashgraph/hedera-agent-kit,
@0gfoundation/0g-compute-ts-sdk, pnpm. Verify SDK package names against current
docs; 0G is migrating from @0glabs to @0gfoundation.

## Commit rules

- Conventional commits, scoped: feat(hedera):, fix(world):, docs(readme):
- Small and frequent. One logical change per commit. Never squash this weekend.
- Body explains why, not what.
- Commit before every agent handoff.
- Every commit that used an AI tool carries an "AI-Assisted:" trailer naming the
  tool and what it did. ETHGlobal requires this. See AI-USAGE.md.
CLAUDEEOF

cat > src/lib/charity.ts <<'CHAREOF'
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

/** Short in demo mode. Production would be closer to an hour. */
export const APPEAL_WINDOW_MS = Number(process.env.APPEAL_WINDOW_MS ?? 60_000);

/**
 * Forfeits always leave the circle of participants. There is no policy switch:
 * team pots and splits were considered and cut. See docs/DESIGN-FORFEITS.md.
 */
export const FORFEIT_DESTINATION = "charity" as const;
CHAREOF

cat > src/lib/circle.ts <<'CIRCLEEOF'
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
CIRCLEEOF

