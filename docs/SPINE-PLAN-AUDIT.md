# Spine plan audit

Review of the first spine UI plan, the one covering session create through to
a rendered HashScan link.

The plan's bones were right: the stage breakdown, the state machine, and the
order of `settleSession()` then `submitSessionRecord()` all survive review
unchanged. What follows is what would have broken, why, and what replaced it.
Kept as a record of why the spine is shaped the way it is, so the same
questions do not get reopened at 3am.

Ten findings, ordered by severity.

---

## Critical

These would have stopped the build or produced a demo with no transaction in
it.

### 1. The server and client boundary was missing entirely

**What the plan said.** Build `src/components/SessionFlow/index.tsx`, call
`settleSession()` and `submitSessionRecord()` from it. No API route appeared
anywhere in the file list.

**Why it breaks.** Both functions reach `getHederaClient()`
(`src/hedera/client.ts`), which reads `HEDERA_PRIVATE_KEY` from
`process.env` and pulls in `@hiero-ledger/sdk` and `@hashgraph/hedera-agent-kit`.
That is Node-only code holding the operator's signing key. `SessionFlow` has
to be a client component because it owns timer and form state. Importing
server code into it either fails the Next.js build on Node built-ins in a
browser bundle, or, worse, succeeds in a way that drags the key path toward
the client.

**Extra risk.** This repo already contains a signing pattern in
`src/components/Transaction`, where the *user* signs via MiniKit. Copying
that by analogy would be the wrong model here. The operator key must never
leave the server, so the two flows cannot share a shape.

**Correction.** All Hedera work moves into
`src/app/api/session/settle/route.ts`, marked `export const runtime = 'nodejs'`
so it can never be silently promoted to an edge function. `SessionFlow`
reaches it with `fetch()` and handles only JSON.

### 2. Hardcoding `'kept'` would have produced no transaction at all

**What the plan said.** `const verdict: SettlementVerdict = 'kept';` with
`'slipped'` offered as an alternative.

**Why it breaks.** In `src/agent/settlement.ts`, `destinationFor()` returns
`sourceAccountId` unchanged for a `'kept'` verdict. `settleSession()` then
hits its own guard, returns `{ moved: false }`, and never touches the
network. No transfer, no transaction ID, no HashScan link. The single
artifact the spine exists to produce would not exist.

**Correction.** `'slipped'` is the firm choice, not an option.
`HARDCODED_VERDICT` is a named constant with the reasoning written above it,
because the natural instinct later will be to flip it to `'kept'` for a
happier demo, and that instinct silently removes the proof.

### 3. `sourceAccountId` had no defined origin

**What the plan said.** Listed `sourceAccountId` as an input to
`settleSession()`, with no statement of where the value comes from.

**Why it breaks.** Per-user custody does not exist yet;
`src/identity/agentkit.ts` is still an empty placeholder. The transfer built
in `settleSession()` is signed only by the key `getHederaClient()` loaded,
which is the operator's. Any `sourceAccountId` other than the operator
account fails signature validation at the network, with an error that reads
like a Hedera problem rather than a design gap.

**Correction.** The route reads `HEDERA_ACCOUNT_ID` and uses the operator
account as the source, with a comment naming this as a temporary state tied
to custody not existing yet.

### 4. `charity.ts` was called optional; it is on the critical path

**What the plan said.** "charity.ts: not required for the flow."

**Why it breaks.** For a `'slipped'` verdict, `destinationFor()` returns
`PENDING.accountId` from `src/lib/charity.ts`. That constant falls back to
the placeholder `"0.0.0"` when `PENDING_ACCOUNT_ID` is unset, which it
currently is. The demo transfer would target a non-account and fail at the
network with a confusing error rather than a clear "you have not created this
account yet".

**Correction.** Treated as a blocker to clear before the UI is worth
building. `PENDING_ACCOUNT_ID` needs a real testnet account in `.env.local`.

---

## Important

These would have shipped and then caused real bugs.

### 5. `commitmentHash()` had no design, and it carries a hard constraint

**What the plan said.** "Optional utility: `commitmentHash()` helper for the
HCS record."

**Why it matters.** This function is the entire mechanism enforcing hard
constraint 3 in `CLAUDE.md`: intention text must never reach HCS, because HCS
is public and permanent. A one-line to-do invites someone to free-hand it at
speed, and the failure mode is not a crash, it is plaintext on a public
ledger that cannot be deleted.

**Correction.** Specified in `src/lib/session.ts`: SHA-256 over
`` `${sessionId}:${intention}` `` via `crypto.subtle`, returned hex. The
session ID is mixed in so two users with the same intention do not produce
the same hash on a public topic.

Beyond the plan, the hash is computed **in the browser**, and the request
body carries only the digest. The intention plaintext never leaves the
device at all, which turns the privacy claim from a promise into a property
of the architecture. Worth demonstrating live rather than asserting.

### 6. Silent unit mismatch between HBAR and tinybar

**What the plan said.** Nothing. `settleSession()` takes `amountHbar`,
`SessionRecord` takes `amountTinybar`, and the plan passed the stake to both.

**Why it breaks.** 1 HBAR is 100,000,000 tinybar. Passing the stake straight
through writes every HCS record wrong by eight orders of magnitude. Nothing
throws. The demo looks fine. The public ledger is quietly wrong, and it is
append-only, so early records stay wrong forever.

**Correction.** `hbarToTinybar()` in `src/lib/session.ts`, applied at the one
point of conversion in the route.

### 7. A settlement retry button can double-spend

**What the plan said.** "If `settleSession()` fails, show failure text and
allow retry."

**Why it breaks.** `settleSession()` generates a fresh `TransactionId` on
every call. Its idempotency logic protects against a lost response *within* a
single call: it queries the receipt for that specific ID before concluding
anything. It cannot protect against the UI calling the function again, which
mints a new ID and submits a genuinely separate transfer. The dangerous case
is exactly the one the idempotency logic exists for: the network accepted the
transfer, the response was lost, the user sees "failed" and presses retry.
Money moves twice.

**Correction.** No retry button on settlement. Show the error, state plainly
that the transfer may still have gone through, and let a human check HashScan
before anything is resubmitted.

### 8. Partial failure was treated as total failure

**What the plan said.** "If `submitSessionRecord()` fails, show the HCS
error."

**Why it breaks.** Settlement runs first and moves real money. If the HCS
write then fails, presenting a blanket error tells the user nothing happened
when in fact their stake has moved and a valid HashScan link exists. That is
the app lying about money, and it is the same failure the product's own rule
about ambiguity resolving toward the user is meant to prevent, applied to the
UI rather than the verdict.

**Correction.** The route returns `{ settlement, hcs }` as two independent
outcomes. The result screen can report a successful transfer and a failed
ledger record at the same time, and still render the HashScan link.

---

## Minor

### 9. The timer contradicted demo mode

The plan proposed a 5-minute countdown. The standing requirement is 30-second
sessions in demo mode, on the grounds that a submission video is unwatchable
otherwise. Replaced with `SESSION_DURATION_SECONDS`, which reads 30 in demo
mode and 25 minutes outside it.

### 10. A generic spinner during submission

The plan put a plain "submitting" view up while settlement and the HCS write
run. The established preference is to render the optimistic state with the
HashScan link in place as soon as one exists, rather than a bare spinner.
Small, but it is the difference between a demo that feels instant and one
that feels like it is buffering in front of a judge.

---

## What survived unchanged

Worth stating, so the rewrite does not read as a rejection:

- The stage breakdown: create, timer, claim, verdict, settle, record, result.
- The state machine, including `error` as a first-class state.
- The `SessionFlow` client-state shape, near enough as written.
- `crypto.randomUUID()` for session IDs.
- Settlement before the HCS write. Correct ordering: the ledger record
  describes something that has already happened, so it cannot run first.
- The judgement that this specific slice, and not the coach or identity
  layers, is what makes the project submittable.
