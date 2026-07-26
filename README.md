# DoomTax

> **A tax on doomscrolling that funds something good.**
> Stake on a focus session. State your intention. A private AI coach decides if
> you kept it. Keep it, get refunded. Slip, and an autonomous agent sends your
> forfeit to charity. Designed to be kind about the bad days.

Built at **ETHGlobal Lisbon 2026**.

🚀 Live Mini App: pending deployment · 🎬 3-min demo: pending · 🏗 **[Architecture](docs/wiki-export/Architecture.md)**

**Proof:** source code and docs are available in this repository, including `docs/SELFIE-CHECK-TESTING.md`, the architecture wiki, and the current `src/` implementation.

> Every claim below is marked 🟢 built, 🟡 in progress, or ⚪ planned. Nothing is
> claimed working until it's green with a link next to it.

---

## The problem

Global mobile screen time averages roughly 4h37m a day. That number alone isn't
the problem, a dashboard reporting it back at you isn't a solution. The problem
is the gap between what you meant to do and what you did, and most tools that
target it fail structurally: they depend on willpower at the exact moment
willpower is lowest, so they get disabled, snoozed, or ignored.

**Commitment devices are the part of this category with actual evidence behind
them.** StickK, founded by Yale economists Dean Karlan and Ian Ayres, reports
that adding a referee roughly doubles goal attainment, and a financial stake
raises it up to threefold.

**So the mechanic works. What's unsolved is who gets paid when you fail.**

## Why this hasn't been built right yet

| | Money flows | On failure, goes to | Verification | What it needs from you |
|---|---|---|---|---|
| **Beeminder** | You stake | **Beeminder.** Stated business model. No beneficiary option. | Auto-tracked data | Your goal data, on their servers |
| **StickK** | You stake | Charity, a friend, or an "anti-charity" | Human referee | Reports, on their servers |
| **Focus Tree** (Starknet) | **Platform pays you** | n/a | In-app blocking | Session data, wallet |
| **Focusmate** | Neither | n/a | Live video, a stranger | A video call |
| **Blockers** (Opal, Freedom) | Neither | n/a | OS-level blocking | Deep OS access |
| **DoomTax** | You stake | **Charity. Structurally never us.** | Private AI + self-appeal | Your intention, your artifact, nothing else |

A product whose revenue arrives when you fail has an incentive it cannot design
away, however good the intentions. StickK started where Beeminder still is and
moved off it.

**Focus Tree is the closest thing to DoomTax and it's the inverse design.**
Focus Tree pays you to focus, which means rewards must be funded from somewhere
(token emissions) and creates something worth farming, which is why it needs
distraction blocking to hold up. DoomTax emits nothing. Cheating means fighting
yourself to win back your own money, a self-defeating loop, not an attack. That's
also why our identity checks sit on the **money**, not the door: there's nothing
here worth a sybil attacking.

## The pitch, one line each

- **Stake** what you're willing to lose on this session, small by default.
- **State** what you're actually trying to do. The verdict is judged only
  against that, never against a generic idea of "productivity."
- **Focus.** We don't watch you. We're a webview with no OS access, so we
  literally can't.
- **Claim.** A private AI coach decides kept or slipped. You get a short window
  to appeal if it got you wrong.
- **Kept:** refunded, streak grows, loudly celebrated.
- **Slipped:** quietly, your forfeit goes to charity. Bad days get an amnesty
  token, no questions.

---

## Why each chain is load-bearing

Not three logos on one flow. Each sponsor owns a job the product can't work
without.

| | Job | Why it can't be swapped out |
|---|---|---|
| **World** | Guards the money, not the door | Liveness fires at the **claim** moment, the one point with a real financial incentive to cheat. |
| **0G** | The brain | Attention data is diary-grade: *what I meant to do and how I fell short* is more intimate than browsing history. TEE-sealed inference is why anyone should trust this. |
| **Hedera** | The treasurer | Deterministic finality in seconds, predictable sub-cent fees, native scheduling with no contract overhead. The forfeit is pre-armed and dated; finishing your session disarms it. |

## 🏆 Tracks

### 🤖 Hedera, AI & Agentic Payments ($6,000) 🟢
An autonomous **Settlement Agent** reads the session outcome and executes the
HBAR/HTS transfer on Hedera Testnet.
`src/agent/settlement.ts` · tx: `0.0.9695721-1785022437-972362991` ·
[HashScan link](https://hashscan.io/testnet/transaction/0-0.9695721-1785022437.972362991) ·
HCS topic: `0.0.9748699`

### 🛠️ Hedera, No Solidity Allowed ($3,000) 🟢
Zero Solidity — `find . -name "*.sol"` returns nothing. Two native services are
live and proven on testnet:

- **HCS** — verdict and payout log, topic `0.0.9748699`
- **HTS** — streak token `0.0.9762627`
  ([HashScan](https://hashscan.io/testnet/token/0.0.9762627)), minted and
  delivered on a kept verdict

Plus the escrow-then-sweep flow those services settle into. A forfeit lands in
a pending account (`0.0.9762855`), never at the charity, so it can still be
given back. Two scripts close the loop, both dry-run by default:

- `scripts/sweep-charity.ts` moves a forfeit to the charity (`0.0.9762856`)
  only after the appeal window closes and only if it was never contested
  ([HashScan](https://hashscan.io/testnet/transaction/0-0.9695721-1785042363.521580087))
- `scripts/refund-appeals.ts` returns an appealed forfeit to whoever staked it
  ([HashScan](https://hashscan.io/testnet/transaction/0-0.9695721-1785044392.278652183))

Proven with three forfeits: the uncontested one swept to charity, the two
appealed ones were returned to source. **An appeal that only skipped the sweep
would have left the stake in escrow forever, which is a slower way of keeping
it** — so "resolves toward you" means the money comes back.

Two privacy details. The sweep memo carries a count, never a session ID, so the
public transaction cannot be used to work out who slipped. And the refund
destination is derived from the settlement's transaction ID via the mirror node
rather than stored, so the ledger never holds a durable link between a session
and an account.

A third, **Scheduled Transactions** (HIP-423) for the pre-armed forfeit, is
written in `src/hedera/schedule.ts` but **not yet wired into the session flow** —
`armForfeit()` and `disarmForfeit()` have no caller. Counting it would be an
overclaim, so it is listed here as what it is.

### 🧠 0G, Best AI Product ($6,000) ⚪
**Focus Coach** runs on 0G Compute, TEE-sealed. Encrypted session history on 0G
Storage, key held by you. `src/ai/coach.ts` · attestation pending · Agentic ID pending

**Not yet proven live.** The code path is complete and the wallet reaches
Galileo testnet, but no 0G ledger has been provisioned for it (the wallet is
under `addLedger()`'s 3 OG minimum), so `askCoach()` fails safe to `'kept'` and
a real inference call has never fired. Tracked as #52.

### 🤳 World, Selfie Check Beta ($1,750) ⚪
Liveness at claim, not login. Testing doc:
[Selfie Check Testing wiki page](https://github.com/mallyma1/doomtax/wiki/Selfie-Check-Testing)

### 🤖 World, AgentKit ($8,000) ⚪ *stretch*
Submitted, not the design driver. See architecture doc for the honest framing.

---

## Submission evidence checklist (issue #10)

Run one full 30 second session after `pnpm dev`, then fill these:

- HashScan transfer URL: https://hashscan.io/testnet/transaction/0-0.9695721-1785022437.972362991
- HCS topic ID: `0.0.9748699`
- HCS message JSON (must include only `sessionId`, `commitmentHash`, `verdict`, `amountTinybar`, `timestamp`):
  ```json
  {"sessionId":"497d1101-0cf0-40b9-b5d4-3608bdb6dc49","commitmentHash":"22749163d6ddcc0e4f8f9462fcd34a84409905dcecbcf0d1b8d30dadf5e0abfb","verdict":false,"amountTinybar":100000000,"timestamp":1785022446771}
  ```
- Request body for `POST /api/session/settle`, captured from the real network request:
  ```json
  {"sessionId":"497d1101-0cf0-40b9-b5d4-3608bdb6dc49","commitmentHash":"22749163d6ddcc0e4f8f9462fcd34a84409905dcecbcf0d1b8d30dadf5e0abfb","stakeHbar":1,"intention":"Finish the README evidence pass","artifact":"Updated the submission checklist to match the current client payload.","foregroundTime":28.4,"interruptionCount":0}
  ```
  Verified independently against the Hedera testnet mirror node, not just the app's own response — both the transfer and the HCS message match the values above. The plaintext coach fields are sent only to the server-side coach path and never reach HCS.

- HTS streak token (the kept-verdict reward), verified against the mirror node:
  - Token: `0.0.9762627` — `STREAK`, 0 decimals, infinite supply, treasury `0.0.9695721`
    ([HashScan](https://hashscan.io/testnet/token/0.0.9762627))
  - Mint: `0.0.9695721@1785039170.758949116` · Transfer: `0.0.9695721@1785039171.047140243`
  - Result: custody account `0.0.9762638` holds `1` STREAK, token total supply `1`
  - Reproduce: `npx tsx --env-file=.env.local scripts/check-streak.ts <accountId>`

  The settle route reaches this only for an authenticated user with a custody
  account and a `'kept'` verdict, so the probe script is what makes the path
  demonstrable ahead of the phone test and a live coach.

  **What never changes:** the coach fields are transient. `settleSession()` and the HCS write still only ever see `commitmentHash` and the boolean verdict — never the intention or artifact text. That HCS-facing privacy guarantee holds in both demo mode and live-coach mode.

---

## Designed to be kind about the bad days

A commitment device whose main output is "you lost money again" is a wellness
product in the marketing copy only. These aren't bolt-ons, they're the product.

- **You set the stake**, small by default, confirm before any large jump.
- **Amnesty.** Bad-day tokens disarm a session before settlement, no questions.
- **Forfeits never enrich anyone.** Charity only, never us, never another user.
- **Ambiguity always resolves toward you.** Contested, failed inference, missing
  evidence: refund. A wrong "kept" costs nothing. A wrong "slipped" costs trust.
- **Wins are loud, losses are quiet.**
- **No leaderboards, no ranking, no visible kept-rate.** DoomTax is a personal
  app. If you want it social, you can join a **circle**: a group that picks a
  shared cause together. Every circle forfeit funds that one cause, and the app
  shows only the collective total, never who slipped. A bad day becomes
  something good for someone else, not a public score.

 ## Design decisions

| Decision | Reasoning |
|---|---|
| **Personal app, solo** | Competing on kept-rate puts most pressure on whoever struggles most. Inverted for a wellness product. |
| **No teams, pots, leaderboards, rankings** | Cut, not deferred. A team pot also dilutes the stake by 1/N and a solo-controlled team means no penalty at all. |
| **Circles are the social layer** | Shared cause, collective total shown, individual contributions never shown. Makes a slip prosocial rather than punitive. Membership stays off-chain. |
| **No accountability partner in v1** | Replaced by self-appeal: optimistic settlement, short window to contest, resolves toward the user. |
| **Forfeits go to charity only** | Never the platform, never an individual. This is the ethical load-bearing wall and the Beeminder differentiator. |
| **Pending account before charity** | Once money reaches a charity it cannot be reversed, so appeals and amnesty would be unfunded promises. |
| **Honest custody** | World App signs World Chain, not Hedera. The app provisions and holds a Hedera testnet account per user and records consent to HCS. **Never write copy claiming the user signed the forfeit themselves.** |
| **Charity is a placeholder** | No partnership exists. Mainnet target is The Giving Block, blocked on unconfirmed HBAR support and a commercial agreement. Say so in the README. |
| **Business model: premium coach** | Free tier returns a verdict, paid tier is the long-memory coach on 0G Storage. Makes 0G Storage commercially load-bearing. A fee on successful refunds is an **open question**, not decided. |

**Verdicts are judged only against the intention the user stated at session
start.** Never against a general notion of productivity. Rest is productive.

**Ambiguity always resolves toward the user.** Contested, failed inference,
timeout, missing evidence: refund. A wrong "kept" costs nothing. A wrong
"slipped" costs trust.

## Tech Facts

- **Scheduled transactions execute on signature collection by default**, which
  would fire the forfeit at session start. You need **`setWaitForExpiry(true)`**
  to evaluate at `expirationTime`. That is HIP-423, max window two months.
  `adminKey` is what lets you `ScheduleDelete` on success. Fallback: plain
  operator-held escrow, stated honestly.
- **0G Compute and 0G Storage are different packages.** Inference is
  `@0gfoundation/0g-compute-ts-sdk` (renamed from `@0glabs/0g-serving-broker`).
  Storage is `@0glabs/0g-ts-sdk`. 0G is mid-migration between namespaces.
  **Verify both on npm before building.** Start from `0g-compute-ts-starter-kit`.
  The broker has explicit TEE verification: that is your attestation proof.
- **Mirror Node lags consensus by 1 to 3 seconds.** Confirm from the transaction
  **receipt**, render success immediately, reconcile with Mirror Node afterwards.
  Polling Mirror Node for a balance makes the app look broken after the money
  has definitively moved.
- **Idempotency:** Hedera transaction IDs are client-generated. If no receipt
  comes back, **query for that transaction ID before retrying.** Never blind-retry.
- **One atomic `TransferTransaction`** moves everything at once. No partial
  states, one HashScan link.
- **Fund the operator account** and handle `INSUFFICIENT_PAYER_BALANCE`
  explicitly. Testnet faucets are rate limited.
- **Codespaces port must be Public** or the phone cannot load the mini app.
  `gh codespace ports visibility 3000:public -c $CODESPACE_NAME`, or the Ports
  panel in VS Code. Verify in an incognito window, not by reading a log line.

## Privacy by construction

We're a Next.js app in a World App webview. We have **no access** to Screen
Time, usage stats, other apps, or the OS. That's not restraint, it's not on the
table. The privacy claim is structural, not a promise.

**The coach sees:** your stated intention, your submitted artifact, and
foreground-time/interruption metadata about our own page.
**The coach never sees:** screen contents, browsing history, keystrokes,
location, or any third-party data. We never collect it.

**HCS is public and permanent**, so it holds only a pseudonymous session ID, a
commitment hash, a verdict, an amount, and a timestamp. Never intention text,
artifact content, coaching messages, or circle membership.

A **"what we can see about this session"** panel shows every field we hold and
nothing else. ⚪

## Disclosures

**Custody.** World App signs World Chain, not Hedera. We provision and hold a
Hedera testnet account for you, and record your consent to arm each forfeit on
HCS. We are saying this plainly rather than implying you signed it yourself.

**Charity.** The recipient is a **placeholder testnet account**, configurable in
one file. No partnership exists today. Mainnet target is The Giving Block,
pending confirmation they support HBAR and a commercial agreement, neither of
which is a weekend's work.

## How we make money

Not from your forfeit, that's the one thing we won't monetise. **Premium coach:**
free tier returns a verdict, paid tier is the long-memory coach, encrypted
history on 0G Storage, patterns recognised over months. It's the part of the
product that gets better the longer you stay, and it's why 0G Storage is
something we sell, not just something we use.

---
