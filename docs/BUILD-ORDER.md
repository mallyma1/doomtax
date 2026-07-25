# Build order

Who builds what, in what order, and what unblocks what. Three workers: **Mally**
(human), **Claude** (Codespace agent, has Hedera egress and `.env.local`), and
**Copilot** (coding agent, sandboxed, no testnet access).

The rule that decides ownership: **anything needing live testnet egress, funded
keys or real secrets goes to Claude or Mally. Anything that is pure code against
a written spec goes to Copilot.**

---

## Stage 1: unblock the demo (no dependencies, start now)

These three run in parallel. Nothing else can finish until stage 1 does.

| # | Task | Owner | Notes |
|---|---|---|---|
| #6 | Mint the HCS topic | Claude | Script written, needs one run |
| #7 | Create pending + charity accounts | Claude | Fixes the `0.0.0` placeholder failure |
| #5 | Build `SessionFlow` UI | Copilot | The long pole, spec is in the issue |

**#5 is the critical path.** It is the only item here that takes real build time,
and it gates everything in stage 3. It should start first and run while Claude
does the config work.

Stage 1 exit condition: `HEDERA_HCS_TOPIC_ID` and `PENDING_ACCOUNT_ID` are set
in `.env.local`, and a `SessionFlow` PR is open.

---

## Stage 2: make it correct (needs stage 1)

| # | Task | Owner | Depends on |
|---|---|---|---|
| #8 | Add the two missing vars to `.env.example` | Copilot | none, but pairs with #6, #7 |
| — | Review the `SessionFlow` PR | Claude | #5 |
| #9 | `tsc --noEmit` and `pnpm build` clean | Claude | #5 merged |

`pnpm build` is the gate that matters. It is the only check that catches
Node-only Hedera imports leaking into the client bundle, which is the most
likely way the spine breaks. See finding #1 in `SPINE-PLAN-AUDIT.md`.

---

## Stage 3: prove it (needs stage 2)

| # | Task | Owner | Depends on |
|---|---|---|---|
| #10 | Full end-to-end session, confirmed on chain | Mally + Claude | #5, #6, #7, #9 |

Capture: the HashScan transaction URL, the HCS message, and a devtools shot
showing the request body carries only the commitment hash and never the
intention text.

**At the end of stage 3 the project is submittable for the Hedera track.**
Everything after this is upside.

---

## Stage 4: upside, only if stage 3 is done

Do not start any of these while stage 3 is open. A working 30 second session
that moves testnet HBAR beats four half-built features.

| # | Task | Owner | State |
|---|---|---|---|
| #14 | HTS streak token | Copilot | Ready, spec written. Adds a third native Hedera service to the No Solidity track. |
| #11 | 0G Compute coach | Claude | 🔒 Needs spec. Replaces the hardcoded verdict. Highest product value. |
| #12 | Per-user Hedera custody | Claude | 🔒 Needs spec. Removes the operator-account-as-source temporary state. |
| #13 | Claim-time Selfie Check | Mally + Claude | 🔒 Needs spec, and needs real human testers with phones. |

The three marked 🔒 are empty files with no written spec. They are deliberately
not handed to an agent yet, because an agent would invent a design, and all
three touch constraints where an invented design is expensive to unpick.
Claude writes the specs, then they get owners.

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
