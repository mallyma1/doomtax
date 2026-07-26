

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
- Commit before every handoff.
- Every commit that used an AI tool carries an "AI-Assisted:" trailer naming the
  tool and what it did. ETHGlobal requires this. See AI-USAGE.md.
