# DoomTax handover

For the next Claude Code session. Written after the first verified end-to-end
run on Hedera testnet.

**Read `CLAUDE.md` first** for the hard constraints, then `docs/BUILD-ORDER.md`
for who owns what. This file is only the current state and the open decisions.

---

## 1. Where the project actually is

**The spine works and is proven on chain.** A session moves real testnet HBAR to
the pending escrow account and writes a hash to a public HCS topic, with the
HashScan link rendered on screen. That is a complete submission for the Hedera
track on its own.

Verified evidence, recorded in the README's submission checklist:

- Transfer: `https://hashscan.io/testnet/transaction/0-0.9695721-1785022437.972362991`
  — `SUCCESS`, 1 HBAR, operator `0.0.9695721` to pending `0.0.9755741`
- HCS topic `0.0.9748699`, message carrying only the five allowed fields
- Request body captured from the real network call, proving no intention text

Build is clean: `npx tsc --noEmit`, `pnpm build` and `pnpm lint` all pass.

### Live config

`.env.local` is populated and working. Do not print its values.

| Variable | Value |
|---|---|
| `HEDERA_ACCOUNT_ID` | `0.0.9695721` (operator, ~1096 HBAR) |
| `HEDERA_HCS_TOPIC_ID` | `0.0.9748699` |
| `HEDERA_STREAK_TOKEN_ID` | `0.0.9762627` |
| `PENDING_ACCOUNT_ID` | `0.0.9762855` |
| `CHARITY_ACCOUNT_ID` | `0.0.9762856` |

**The pending and charity accounts must stay distinct.** They were briefly set
to the same ID, which silently collapses the escrow-then-sweep design: a forfeit
landing straight at the charity is irreversible, so appeals and amnesty become
promises that cannot be kept.

**They must also be keyed to the operator, and originally they were not.** The
first pair (`0.0.9755741`, `0.0.9743301`) came from the Agent Kit's "Create
Account" tool, which mints a fresh keypair per account;
`scripts/create-accounts.ts` logged only the account ID, so those private keys
were thrown away the moment they were created. Nothing here could sign a
transfer *out* of pending, so the sweep to charity was not merely unimplemented,
it was **impossible** — and appeals and amnesty were rhetorical for any money
that had already settled. Replaced via `scripts/create-escrow-accounts.ts` and
proven with a real forfeit-and-sweep round trip
(`0.0.9695721@1785040706.898725235`). The old accounts are abandoned with ~57
and ~56 testnet HBAR locked in them forever.

Empty and unread by any code: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`.
Empty and genuinely needed for #31: `AUTH_URL` (needs an ngrok tunnel).

There is an orphaned HCS topic `0.0.9747844` from an early script failure. It
has no admin key so it cannot be deleted. Ignore it, use `0.0.9748699`.

---

## 2. Do this first

**Local `main` is 7 commits ahead of `origin/main` and unpushed.** Push it
before anything else, or the next round of Copilot PRs will branch off a stale
base and you will spend the time reconciling instead of building.

```bash
git push origin main
```

---

## 3. The one open decision, and it is blocking

A parallel session wired the 0G coach into the spine (`c801c21`). The code is
good. It creates two problems that need resolving together, and **the user has
already decided the second one but it is not implemented yet.**

### 3a. The `kept` path produces no on-chain proof

`settleSession()` short-circuits `'kept'` to a no-op because the stake settles
back where it came from. So a kept session produces **no transaction and no
HashScan link**. Fine while the verdict is hardcoded `'slipped'`. Not fine now
that the coach is live, because `src/ai/coach.ts` returns `'kept'` on *every*
failure path (no key, no provider, broker error, 15s timeout, unparseable
reply). A dead 0G endpoint is indistinguishable from a working one, and the only
signal is a `console.warn`.

Net effect: the two sponsor tracks currently pull in opposite directions.

- Demo mode **on** (current setting): verdict always `'slipped'`, Hedera proof
  works, coach never runs, no 0G evidence.
- Demo mode **off**: coach runs, but a `'kept'` result leaves nothing on chain.

**Research finding, and this is the important part:** the repo already contains
the answer and it is simply not wired up. `src/hedera/schedule.ts` has
`armForfeit()` and `disarmForfeit()`, both complete, and **nothing in `src/`
imports either**. Wiring them gives the kept path real transactions:

1. Session start, `armForfeit()`, `ScheduleCreate` (HIP-423, `waitForExpiry`,
   `adminKey` set) — HashScan link
2. Kept, `disarmForfeit()`, `ScheduleDelete` — HashScan link
3. Optionally `mintStreakToken()` from `src/hedera/token.ts`, also uncalled

That gives both verdicts on-chain proof and activates Scheduled Transactions,
a third native service for the No Solidity track.

**Status: the user asked for this to go to mentors before implementing.** It is
written up as a checklist on issue #39 (Hedera) and the 0G silent-failure half
on #41. Do not implement until those are answered.

### 3b. Intention text now reaches the settle endpoint

`/api/session/settle` accepts `intention` and `artifact` and forwards them to
the coach. `CLAUDE.md` permits this (the coach is specified to see exactly
those), and the HCS record still carries only the five allowed fields, so **no
hard constraint is broken.** But the README's submission evidence says the
request body carries only the hash, and that is no longer true in non-demo mode.

**The user decided: gate by demo mode, document both.** ✅ Done. The gating is in
the route (`isDemo` check) and the README evidence section now carries the real
non-demo request body and states the guarantee that actually holds in both
modes: `settleSession()` and the HCS write only ever see `commitmentHash` and
the boolean verdict, never the intention or artifact text.

---

## 4. What is left, by owner

**Claude**

- Prove a live 0G inference call actually returns. #11 is the whole 0G track and
  the code is written on **both** paths now — broker and Router — and neither
  has ever fired. It is not a code problem: the wallet holds 0.6 OG, and the
  broker's `addLedger()` and the testnet Router's deposit both enforce the same
  3 OG minimum. Funding is the only constraint, and the faucet needs a browser,
  so this is blocked on a human (#52), not on egress.
- ~~Write specs for #12 and #13.~~ Both done. #12 shipped in PR #54
  (`src/identity/agentkit.ts`). #13 is specified in `docs/SELFIE-CHECK-SPEC.md`
  and `src/identity/selfieCheck.ts` is still 0 bytes — specified, not
  implemented, and still won't-this-cycle.

**Mally (human only)**

- #37 physical phone test. Port 3000 is public and World creds are populated, so
  nothing blocks it, and it is the last item that can still produce a demo-day
  surprise.
- #39, #40, #41 mentor questions, including the two new ones above.
- #31 needs an ngrok tunnel for `AUTH_URL` and a real login round-trip.
- #35 demo video, #36 submission copy, #38 charity copy review.

**Copilot**

- Nothing safe to hand over right now. Everything left needs secrets, testnet
  egress, or a spec that does not exist. Do not hand it #12 or #13.

---

## 5. Things that will waste your time if you do not know them

- **gRPC works from the Codespace, not from agent containers.** A `RST_STREAM`
  from `scripts/check-hedera.ts` in a container is expected and is not a
  credentials problem. For read-only verification prefer the Mirror Node REST
  API, which always works.
- **`gh` GraphQL is blocked for the injected token**, which breaks anything
  touching Projects v2. Strip the env vars to fall back to the stored
  `project`-scoped credential:
  ```bash
  env -u GITHUB_TOKEN -u GH_TOKEN gh project item-list 4 --owner mallyma1
  ```
  REST works with either token.
- **Scripts that use `getHederaClient()` must call `closeHederaClient()`** or the
  gRPC pool keeps the process alive ~45s after `main()` resolves. This already
  caused a successful topic mint to look like a hang and lose its output. Long
  lived server code should never call it.
- **Other agents commit to this tree while you work.** Files have changed
  underneath this session more than once. Check `git status` before assuming
  your view is current, and do not commit other people's in-flight work.
- **`.github/workflows/unblock.yml` is now inert.** Its dependency graph
  (`{9:[5,6,7], 10:[5,6,7,9], 14:[5]}`) is entirely closed issues, so it can
  never fire again. Stage 4 has no entries, so nothing will auto-unblock
  #12/#13. Add entries there if you want that automation back.

---

## 6. Project management

`.claude/agents/project-manager.md` defines a reconciliation agent for the
recurring problem that four workers commit in parallel and the board drifts from
the repo. Run it after any burst of merges. It runs Kanban with an
evidence-based Definition of Done, a WIP limit of one item per worker, and a
theory-of-constraints framing so four workers stop optimizing four different
non-constraints.

Its one rule: **verify against the repo and the ledger, never against what an
issue claims.** Every drift incident so far traces to a missing piece of
evidence. A draft PR is not done. A 0-byte file is not done. "It worked locally"
is not done.

`.github/copilot-instructions.md` is the equivalent for Copilot, which does not
read `CLAUDE.md` automatically the way Claude Code does.
