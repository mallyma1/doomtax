# Build order

Who builds what, in what order, and what unblocks what. Three workers: **Mally**
(human), **Claude** (Codespace agent, has Hedera egress and `.env.local`), and
**Copilot** (coding agent, sandboxed, no testnet access).

The rule that decides ownership: **anything needing live testnet egress, funded
keys or real secrets goes to Claude or Mally. Anything that is pure code against
a written spec goes to Copilot.**

> **Status as of the first verified end to end run.** Stages 1 through 3 are
> done. The spine is demoable: a session moves real testnet HBAR and writes a
> hash to a public topic, with the HashScan link on screen. Evidence is in the
> README's submission checklist. What remains is stage 4 and the human-only
> submission tasks.

---

## Stage 1: unblock the demo — DONE

| # | Task | Owner | Result |
|---|---|---|---|
| #6 | Mint the HCS topic | Claude | Topic `0.0.9748699` |
| #7 | Create pending + charity accounts | Claude | Pending `0.0.9755741`, charity `0.0.9743301` |
| #5 | Build `SessionFlow` UI | Copilot | Merged, rendered below `AuthButton` |

Both accounts must stay **distinct**. They were briefly set to the same ID,
which silently collapses the escrow-then-sweep design: a forfeit that lands
straight at the charity is irreversible, so appeals and amnesty become promises
that cannot be kept.

---

## Stage 2: make it correct — DONE

| # | Task | Owner | Result |
|---|---|---|---|
| #8 | Add missing vars to `.env.example` | Copilot | Landed on `main` |
| #49 | Harden settle payload, expose HCS evidence | Copilot | Merged |
| #9 | `tsc --noEmit` and `pnpm build` clean | Claude | Both clean, `pnpm lint` clean too |

`pnpm build` is the gate that matters. It is the only check that catches
Node-only Hedera imports leaking into the client bundle, which is the most
likely way the spine breaks. See finding #1 in `SPINE-PLAN-AUDIT.md`.

---

## Stage 3: prove it (needs stage 2)

| # | Task | Owner | Result |
|---|---|---|---|
| #10 | Full end-to-end session, confirmed on chain | Mally + Claude | Verified on testnet |

Captured and recorded in the README's submission evidence checklist: the
HashScan transaction URL, the HCS topic and exact message JSON, and the real
`POST /api/session/settle` request body showing only `sessionId`,
`commitmentHash` and `stakeHbar`, never the intention text.

**The project is now submittable for the Hedera track.** Everything below is
upside on top of a working submission.

---

## Stage 4: upside, now unblocked

| # | Task | Owner | State |
|---|---|---|---|
| #14 | HTS streak token | Copilot | ✅ Merged. `src/hedera/token.ts` plus `scripts/create-token.ts`. Third native Hedera service for the No Solidity track. |
| #11 | 0G Compute coach | Claude | 🚧 In progress. `src/ai/coach.ts` is implemented and wired into `settle/route.ts`. `src/ai/memory.ts` is still a deliberate no-op stub (M3 / paid tier). No live 0G inference call proven yet. |
| #12 | Per-user Hedera custody | Claude | 🔒 Needs spec. `src/identity/agentkit.ts` is 0 bytes. Removes the operator-account-as-source temporary state. |
| #13 | Claim-time Selfie Check | Mally + Claude | 🔒 Needs spec. `src/identity/selfieCheck.ts` is 0 bytes. Also needs real human testers with phones. |

#14 landed as code only: `HEDERA_STREAK_TOKEN_ID` is not set in `.env.local`, so
no STREAK token type exists on testnet yet, and `mintStreakToken()` has no
caller. Running `scripts/create-token.ts` and wiring the `kept` path is
follow-up work that needs testnet egress.

The two still marked 🔒 are empty files with no written spec. They are
deliberately not handed to an agent yet, because an agent would invent a design,
and both touch constraints where an invented design is expensive to unpick.
Claude writes the specs, then they get owners.

**#11 is the highest-value remaining item.** It is what turns the hardcoded
`'slipped'` into a real verdict, and it is the whole 0G track. The code path
exists; what is missing is proof that a real 0G provider answers.

---

## Human-only track, runs in parallel with stage 4

None of these can be done by an agent. They gate the submission itself, not the
code, and several are already done.

| Area | Issues | State |
|---|---|---|
| World Developer Portal credentials | #30 | ✅ Closed. App ID, action ID, API key, RP signing key all populated in `.env.local`. |
| Auth.js secrets and login round-trip | #31 | 🚧 Open. `AUTH_SECRET` populated, but `AUTH_URL` is still empty — needs an ngrok tunnel and a real login through `AuthButton`. |
| Faucet funding, Codespace port public | #29, #32 | ✅ Both closed. |
| Deadline confirmation | #33 | ✅ Closed. |
| Physical phone test of the deep link / QR flow | #37 | 🚧 Open. |
| Mentor questions for each sponsor track | #39 (Hedera), #40 (World), #41 (0G) | Checklists written, need asking. |
| Demo video, submission copy, charity placeholder copy | #35, #36, #38 | Pending. |

0G account credentials are not a tracked issue; `ZG_PRIVATE_KEY` and
`ZG_RPC_URL` are populated in `.env.local`. `ANTHROPIC_API_KEY` and
`OPENAI_API_KEY` are still empty and nothing on the spine reads them.

---

## Ownership at a glance

**Mally 🧑** does what an agent structurally cannot: funding the operator account
from the faucet, World Developer Portal config, making the Codespace port public,
finding real Selfie Check testers, recording the demo video, and submitting.

**Claude 🤝** does anything touching live testnet, `.env.local`, or judgement
about the constraints in `CLAUDE.md`: minting the topic, creating accounts,
reviewing Copilot's PRs, writing the stage 4 specs.

**Copilot 🤖** builds against written specs with no secrets and no network:
`SessionFlow`, `.env.example`, the streak token.

Every Copilot issue carries a full spec in a pinned comment, including the
constraints it must not violate. Copilot does not read `CLAUDE.md` the way
Claude does, so those constraints are restated inline in each issue rather than
referenced.

**Keeping this honest.** `.claude/agents/project-manager.md` defines a
reconciliation agent for exactly this problem: four workers commit in parallel,
so the board drifts from the repo constantly. Run it after any burst of merges.
Its one rule is to verify against the repo and the ledger, never against what an
issue claims.

Note that the dependency graph in this document is mirrored in
`.github/workflows/unblock.yml`, which auto-flips `status:blocked` to
`status:ready` when an issue's dependencies all close. **Update both together**
or the automation will disagree with the plan.

That workflow's graph is currently `{9: [5,6,7], 10: [5,6,7,9], 14: [5]}`. Every
issue in it is now closed, so the workflow is **inert**: it can never fire again.
Stage 4 (#11, #12, #13) has no entries, so nothing will auto-flip those off
`status:blocked`. That is deliberate for now — they are blocked on a written
spec, not on another issue — but it means stage 4 unblocking is manual.

---

## The two things that must never be "fixed"

Both look like bugs. Both are load-bearing. They are restated here because they
are the most likely thing for a well-meaning contributor to break.

1. **The verdict is hardcoded to `'slipped'`.** A `'kept'` verdict settles back
   to the source account, short-circuits to a no-op, and produces no transaction
   and no HashScan link. The slip is the only path that proves the flow works.
2. **There is no retry button on settlement failure.** `settleSession()`
   generates a fresh `TransactionId` per call, so a retry is a genuinely
   separate transfer. The dangerous case is the one that fails: network
   accepted, response lost, user retries, money moves twice.
