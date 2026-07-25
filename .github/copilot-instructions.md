Read CLAUDE.md in the repository root and follow it before making any change.
Its hard constraints are binding on all suggestions. This file repeats the ones
that have actually been broken in practice, plus the conventions specific to
working alongside the other agents in this repo.

# DoomTax, for Copilot

A personal commitment device for focus. You stake HBAR on a session, state an
intention, an AI coach on 0G decides whether you kept it, and an agent on Hedera
settles the payout. Forfeits go to charity. ETHGlobal Lisbon 2026.

## Hard constraints. Breaking any of these fails the submission.

1. **No Solidity. Ever.** No `.sol` files anywhere. All Hedera work goes through
   `@hiero-ledger/sdk` or `@hashgraph/hedera-agent-kit`. We are submitting to
   Hedera's "No Solidity Allowed" track, which disqualifies smart contracts. If
   something looks like it needs a contract, it needs an SDK call instead.
2. **Never put anything identifying on HCS.** It is a public, permanent,
   append-only ledger. The only allowed shape is the `SessionRecord` type in
   `src/hedera/consensus.ts`: `sessionId`, `commitmentHash`, `verdict` boolean,
   `amountTinybar`, `timestamp`. Never intention text, artifact content,
   coaching messages, circle membership, or anything linking a session to a
   person. Widening that type is how a privacy failure ships.
3. **Never write bet, wager, odds, or gamble.** Say stake, commitment, pledge,
   forfeit. There is no chance element here and no house edge.
4. **Testnet only.** No mainnet keys, ever. No real secrets in any committed
   file. `.env.example` is a template and its values stay empty.

## Two things that look like bugs and are not

Do not "fix" either. Both are load-bearing.

1. **The demo verdict is deliberately `'slipped'`.** A `'kept'` verdict settles
   back to the account the stake came from, which `settleSession()`
   short-circuits to a no-op, so there is no transaction and no HashScan link.
   The slip is the only path that currently proves the flow works on chain.
2. **There is no retry button on settlement failure.** `settleSession()`
   generates a fresh `TransactionId` per call, so a UI retry submits a genuinely
   separate transfer. The dangerous case is exactly the one that fails: the
   network accepted it, the response was lost, the user presses retry, and money
   moves twice. Show the error, say the transfer may still have gone through,
   and let a human check HashScan first.

## Architecture rules

**All Hedera code is server-only.** `src/hedera/*`, `src/agent/*` and
`src/lib/charity.ts` read the operator private key and import Node-only SDK
code. Never import them from a client component. They live behind
`src/app/api/session/settle/route.ts`, marked `export const runtime = 'nodejs'`
so it can never be silently promoted to an edge function. The UI reaches it with
`fetch()` and handles only JSON.

This is a **different model** from `src/components/Transaction`, where the *user*
signs via MiniKit. Here the operator signs, server side. Do not copy that
component by analogy.

**Settlement and the HCS write are reported separately.** The route returns
`{ verdict, settlement, hcs }` as independent outcomes. If the transfer succeeds
and the ledger write then fails, real money has already moved, and a blanket
error would tell the user nothing happened. That is the app lying about money.

**Ambiguity always resolves toward the user.** Contested session, failed
inference, timeout, missing evidence: refund. A wrong "kept" costs nothing, a
wrong "slipped" costs trust. This is why `src/ai/coach.ts` returns `'kept'` on
every failure path. Intentional, do not "harden" it into failing closed.

## Conventions

- Package manager is **pnpm**. Not npm, not yarn. The other lockfiles are
  gitignored specifically to stop them being committed by accident.
- Conventional commits, scoped: `feat(hedera):`, `fix(world):`, `docs(readme):`.
  One logical change per commit. The body explains why, not what.
- Every commit that used an AI tool carries an `AI-Assisted:` trailer naming the
  tool and what it did. ETHGlobal requires this.
- Before marking a PR ready: `npx tsc --noEmit`, `pnpm build` and `pnpm lint`
  must all be clean. **`pnpm build` is the one that matters** — it is the only
  check that catches Node-only imports leaking into the client bundle, and that
  failure appears neither in the editor nor in `tsc`.

## Working alongside the other agents

A human, Claude Code sessions and occasionally an OpenAI Codex session all
commit here in parallel. Duplicated and conflicting work has happened more than
once, so:

- **Check for an existing PR or branch** solving the same issue before starting.
  Two PRs on different branches for one issue has happened twice.
- **Mark your PR ready for review when it is finished.** A draft PR cannot
  merge, so its `Closes #N` never fires and the issue sits open forever. This
  has stalled work repeatedly and is the single most common failure here.
- **Put `Closes #N` in the PR description**, not just a prose mention, or the
  issue will not close and the automation that unblocks dependent issues will
  not fire.
- If an issue body contradicts this file, **the issue is more specific and
  wins** — but say so in the PR, because it probably means this file is stale.
