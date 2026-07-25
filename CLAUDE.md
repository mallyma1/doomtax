# DoomTax

Commitment-device focus sessions. Stake on a session, a private AI coach on 0G
decides if you kept it, an autonomous agent on Hedera settles the payout, World
proves a human stands behind every agent that can move money.

ETHGlobal Lisbon 2026.

## Hard constraints, do not violate

1. No Solidity anywhere in this repo. All Hedera functionality goes through
   @hashgraph/sdk or the Hedera Agent Kit. We are submitting to Hedera's
   "No Solidity Allowed" track, which disqualifies smart contracts. If you think
   you need a contract, you need an SDK call instead. Ask before adding any .sol.
2. ETHSKILLS routing does not apply here. If ethskills is loaded, ignore its
   Scaffold-ETH 2 / Hardhat / Foundry recommendations. This is a Hedera-native,
   World Mini App, 0G Compute project, not an EVM dApp. Its Security, Testing,
   Concepts and QA skills are still useful. The rest is not.
3. Never write to HCS anything identifying a person or their content. HCS is a
   public permanent ledger. Allowed: pseudonymous session ID, commitment hash,
   verdict boolean, payout amount, timestamp. Never: intention text, artifact
   content, coaching messages, partner comments, account-to-human links.
4. Never say bet, wager, odds, or gamble. Say stake, commitment, pledge, forfeit.
5. Never use the em dash. Use commas, colons, periods, or "to" for ranges.
6. Testnet only. No mainnet keys in this repo, ever.

## Design rules

- The verdict is judged only against the intention the user stated at session
  start, never against a general notion of productivity.
- Ambiguity always resolves toward the user. Contested session, failed inference,
  timeout, missing evidence: refund. A wrong "kept" costs nothing. A wrong
  "slipped" costs trust.
- Forfeits go to charity (ChainGiving) or a shared pot. Never to the platform,
  never to another individual.
- The partner can confirm or dispute. Never seize, never redirect.
- Forfeits settle to an operator-held pending account first, and sweep to charity
  only after the dispute window closes. This is what makes disputes and amnesty
  actually refundable rather than rhetorical.
- Amnesty disarms a session before settlement. It is not a post-hoc refund.
- Custody is honest: the app provisions and holds a Hedera account per user on
  testnet and records consent to HCS. Do not write copy claiming the user signed
  the forfeit themselves. They cannot: World App signs World Chain, not Hedera.

## What the model may see

The 0G Compute call receives only: the intention stated at session start, the
artifact submitted at the end, and integrity metadata (foreground time,
interruption count) from the Page Visibility API. Never screen contents,
browsing history, keystrokes, location, or third-party app data.

## Stack

Next.js 15 + MiniKit, @hashgraph/sdk + @hashgraph/hedera-agent-kit,
@0gfoundation/0g-compute-ts-sdk, pnpm.

## Commit rules

- Conventional commits, scoped: feat(hedera):, fix(world):, docs(readme):
- Small and frequent. One logical change per commit. Never squash this weekend.
- Body explains why, not what.
- Commit before every agent handoff.
- Every commit that used an AI tool carries an "AI-Assisted:" trailer naming the
  tool and what it did. ETHGlobal requires this. See AI-USAGE.md.
