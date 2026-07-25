# DoomTax: handover

Everything a fresh session needs. Read top to bottom once, then build.

**Event:** ETHGlobal Lisbon 2026, Pavilhão Carlos Lopes. 24 to 26 July.
**Now:** Saturday 25 July. Submissions close Sunday. Roughly 24 hours minus sleep.
**Repo:** `mallyma1/doomtax` (public). Builder: Malcolm Kisubi, solo or small team.

---

## 0. DO THIS FIRST: establish ground truth

> **State verified 25 July at `1923d67`.** The branch, local `main` and both
> `origin` refs are level, the tree is clean, PR #1 is merged (that merge commit
> *is* `1923d67`), and there is no `.sol` anywhere. The 12 zero-byte files under
> `src/` and `docs/` are the intentional skeleton from `0e7a5bc`, not lost work:
> fill them, do not go looking for their contents. Run the checks below anyway to
> confirm nothing moved since, then go straight to section 8.

The repo state is currently ambiguous. Work has happened in two places, a
Codespace at `/workspaces/doomtax` and a local clone with a worktree branch, and
several files are 0 bytes. Before writing anything:

```bash
git fetch origin
git log --oneline origin/main | head -20
git branch -a
git status
find . -size 0 -name "*.md" -o -size 0 -name "*.ts" | grep -v node_modules
```

Decide which copy is canonical, get onto `main`, and reconcile. Do not write new
content onto a stale branch. There is an open PR #1.

**Then run the four de-risk checks in section 8 before building any feature.**

### Credentials: where they are and what is missing

Seven secrets exist as GitHub **Actions** repo secrets: `HEDERA_ACCOUNT_ID`,
`DER_ENCODED_PRIVATE_KEY`, `HEX_ENCODED_PRIVATE_KEY`, `DER_ENCODED_PUBLIC_KEY`,
`HEDERA_EVM_ADDRESS`, `HEDERA_PAT`, `WORLD_DEV_PORTAL_API_KEY`.

- **Actions secrets reach workflow runs only.** The one workflow here is
  `.github/workflows/label.yml`, which uses none of them. They do not reach
  `next dev`, a Codespace, a deploy, or an agent session. Copy them into
  `.env.local` locally, into **Codespaces** secrets (a separate tab from Actions)
  for the Codespace, and into the host's env settings for the live link 0G
  requires.
- **Name mismatch, settle it before writing `src/hedera/client.ts`.**
  `.env.example` declares `HEDERA_PRIVATE_KEY`; the portal issues
  `DER_ENCODED_PRIVATE_KEY` and `HEX_ENCODED_PRIVATE_KEY`. Pick one canonical
  name and use it in both the code and the template. DER parses with
  `PrivateKey.fromStringDER()`.
- `HEDERA_PAT` is portal auth. The SDK does not need it at runtime.
- **Still empty and blocking:** `CHARITY_ACCOUNT_ID` and `PENDING_ACCOUNT_ID`,
  both required by the settlement path in section 5; `ZG_PRIVATE_KEY` and
  `ZG_RPC_URL` for the coach; `WORLD_APP_ID` and `WORLD_ACTION_ID`.
- `.gitignore` already ignores `.env*` while allowing `.env.sample` and
  `.env.example`. Correct as-is, leave it.

---

## 1. What DoomTax is

> A personal commitment device for focus. Stake on a session, state an intention.
> A private AI coach decides if you kept it. Keep it and you are refunded. Slip,
> and an autonomous agent sends your forfeit to charity. Designed to be kind
> about the bad days.

**It is a personal app.** Solo is the default and the primary mode.

## 2. The pitch, with the actual argument

Mobile screen time averages roughly 4h37m/day globally. Blockers and dashboards
fail structurally: they depend on willpower at the moment willpower is lowest.

**Commitment devices are the part of the category with evidence behind them.**
StickK was founded 2007 by Yale economists Dean Karlan and Ian Ayres. Per
StickK's own published figures, a referee roughly doubles goal attainment and a
financial stake raises it up to threefold. (Their figures, not peer-reviewed.
Attribute them that way.)

**The category's unsolved problem is who gets paid when you fail.**

| | Money direction | Where it goes on failure | Verification | Data required |
|---|---|---|---|---|
| Beeminder | You stake | **To Beeminder.** Their stated business model. No beneficiary option. | Auto-tracked | Goal data on their servers |
| StickK | You stake | Charity, friend, or "anti-charity" | Human referee | Reports on their servers |
| Focus Tree (Starknet) | **Platform pays you** | n/a | In-app blocking | Session data, wallet |
| Focusmate | Neither | n/a | Live video with a stranger | Video with a stranger |
| Blockers (Opal, one sec) | Neither | n/a | OS blocking | Deep OS access |
| **DoomTax** | You stake | **Charity only. Structurally never us.** | Private AI, self-appeal | Intention, artifact, our own page's focus metadata |

**Focus Tree is the closest project and DoomTax is its inverse.** Focus Tree pays
you to focus. That means rewards must be funded by emissions, and a cashable
reward creates something to farm, which is why it needs distraction blocking.
DoomTax emits nothing and has no extractable reward, so cheating means fighting
yourself to win back your own money. That is also why World identity sits on the
**money**, not the door.

Note: Malcolm knows the Focus Tree team from Starknet Foundation. Keep the framing
respectful, "different design, same problem", not a critique. Also: ask them what
happened to retention when token price moved, and what users did after failing a
session. That is free primary research.

**Three genuine differentiators:**

1. Forfeits cannot reach the platform. Structural, and auditable on a public log.
2. Verification without surveillance. Every incumbent needs data about you.
   DoomTax runs judgement in a TEE and has no OS access, because it is a webview.
   True by construction, not by promise.
3. Built for the failure case: amnesty, ambiguity resolving toward the user, wins
   louder than losses.

## 3. Hard constraints, never violate

1. **No Solidity anywhere.** All Hedera via `@hashgraph/sdk` or Hedera Agent Kit.
   We submit to Hedera's No Solidity Allowed track, which disqualifies contracts.
2. **Never write to HCS anything identifying a person or their content.** HCS is
   public and permanent. Allowed: pseudonymous session ID, commitment hash,
   verdict boolean, payout amount, timestamp. Never: intention text, artifact
   content, coaching messages, circle membership, identity links.
3. **Never say bet, wager, odds, gamble.** Say stake, commitment, pledge, forfeit.
4. **Never use the em dash.** Commas, colons, periods, or "to" for ranges.
5. **Testnet only.** No mainnet keys, ever.
6. **ETHSKILLS routing does not apply.** Ignore its Scaffold-ETH 2 / Hardhat /
   Foundry recommendations. Its Security, Testing, Concepts, QA skills are fine.

## 4. Locked design decisions, do not re-litigate

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

## 5. Architecture

```
World Mini App (Next.js 15 + MiniKit)
  set intention → timer → submit artifact → claim → appeal window
        │
   Selfie Check at CLAIM (World)      liveness where the money is
        │
   Focus Coach on 0G Compute          TEE-sealed verdict + coaching message
   Encrypted history on 0G Storage    user holds the key; also the paid tier
        │
   Settlement Agent (Hedera Agent Kit)
     ScheduleCreate + setWaitForExpiry   forfeit pre-armed and dated
     kept  → ScheduleDelete, refund      finishing disarms it
     slip  → fires to PENDING account
     sweep pending → charity after appeal window
     HTS streak token · HCS: hash, verdict, amount, timestamp only
```

**Session lifecycle:** start (intention + scheduled transfer armed + consent hash
to HCS) → during (Page Visibility API counts foreground time and interruptions)
→ end (opt-in artifact: a paragraph, commit hash, photo of notes) → claim (Selfie
Check **in parallel with** inference) → verdict → settle → appeal window → sweep.

**The evidence position:** we do not need strong evidence because we deliberately
bias every ambiguous case toward the user. Say it out loud: *we do not need to
surveil you, because we are not trying to catch you.* We are a webview with no OS
access, so OS-level monitoring is not on the table at all.

## 6. Verified technical facts, these will bite you

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

## 7. Track targets

| Track | Value | Confidence | What it needs |
|---|---|---|---|
| **Hedera, No Solidity Allowed** | $3,000 (3 × $1k) | **Highest** | `@hashgraph/sdk` only, zero `.sol`, **two+** native services. We use three: HTS, HCS, Scheduled Transactions. Agent Kit counts as SDK usage. |
| **Hedera, AI & Agentic Payments** | $6,000 (2 × $3k) | Strong | Agent executes ≥1 payment on Hedera Testnet. README covering the payment flow. Video ≤5 min. Their own page lists "Autonomous Escrow" as an idea, which is literally DoomTax. Quote it. |
| **0G, Best AI Product** | $6,000 (3/2/1) | Strong | **Live link, not just a repo.** Proof of 0G **Compute** for inference; storage alone fails. Contract addresses (mint an Agentic ID to satisfy this without Solidity). Video **under 3 min**. Telegram AND X handles. |
| **World, Selfie Check Beta** | $1,750 (1k/750) | Strong | Selfie Check as a risk/abuse signal, **not login**. Testing doc with **both** dev and user feedback. See section 9. |
| **World, AgentKit** | $8,000 | **Stretch** | Without a partner agent there is no clean service/agent boundary, so our own backend verifying itself reads as circular. Submit anyway, do not reshape the product for it. |

**Uniswap gate ($7,000):** Uniswap v3 is deployed on World Chain, so the user
could stake on a chain Uniswap serves and sign it themselves. Do **not** start
unless both are true by 14:00 Sunday: (1) the spine is green, (2) the Uniswap
Trading API serves a testnet. If mainnet-only it is dead, we will not demo with
real funds. Cost if pursued: the Hedera Agentic Payments pitch weakens from "the
agent moved the forfeit" to "the agent minted the receipt".

**Do not add:** 1inch (requires Solidity, kills No Solidity), Sui (wrong chain,
Walrus conflicts with 0G Storage), The Graph (needs Graph data as load-bearing),
ENS (requires presenting at their booth Sunday morning).

## 8. Build order

**Hour 0 to 1, de-risk. Do not build features until all four are green:**

| Check | Green when |
|---|---|
| Hedera testnet funded, one HBAR transfer via `@hashgraph/sdk` | you have a HashScan link |
| 0G Compute returns text from one inference call | you have a response and know where the TEE attestation lives |
| Mini app loads on a real phone inside World App | you see the page |
| Selfie Check access confirmed live for this team today | you ran one verify |

Anything red goes to that sponsor's mentor desk. Do not debug alone.

**Then, in order:**

1. **The spine.** Session create → timer → claim → verdict (hardcoded) → **real**
   Hedera transfer → HCS log → HashScan link on screen. **When this works the
   project is submittable.** Everything after is upside.
2. HTS + HCS + Scheduled Transactions end to end. Banks the No Solidity prize.
3. 0G Compute: swap the hardcoded verdict for real inference.
4. Selfie Check at claim, plus the testing doc.
5. Agentic ID mint (cheap, satisfies 0G's contract-address field).
6. Circles (~90 min).

**Cut list in order:** circles → Agentic ID → scheduled-transaction mechanic
(fall back to operator escrow) → HTS streak token.

**Never cut:** the working Hedera payment, the 0G Compute inference, demo mode,
the videos.

## 9. Selfie Check testing doc

World published the six headings. Use them verbatim as section headers:

1. Integration experience: how it went, time-to-integrate, blockers
2. Ease of integration: where docs and SDK helped, where they got in the way
3. Value of Selfie Check: did it help you block, gate, or step up a user
4. Value of the Sybil score: how it would factor in once enabled
5. Orb-verified POH vs Selfie Check cohorts: differences observed
6. Overall sentiment: would you keep and expand it

Plus user feedback: comprehension, drop-off, camera flow, with real testers.

**Fill it as you integrate, never retrospectively.** Heading 5 cannot be answered
honestly in a weekend, so say that and describe what you would measure. Do not
invent observations. Almost nobody writes this doc, which is why it is winnable.

## 10. Demo hardening, do not skip

- **Demo mode: 30-second sessions.** Without this the video is unwatchable.
- Pre-seeded accounts: one mid-streak, one about to fail.
- Every screen shows a live explorer link.
- **Show the failure-case coaching message.** That is the moment that proves this
  is a wellness product.
- Add a **"what we can see about this session"** panel listing every field held
  and nothing else. Twenty minutes, converts the privacy story into a demo.
- Never a bare spinner. Render the optimistic state with the HashScan link in place.
- Run the flow three times on the demo phone, on venue wifi.
- Rehearse the two-minute pitch out loud, three times.

## 11. AI attribution, required

ETHGlobal requires documenting which files and which tools. Every AI-assisted
commit carries an `AI-Assisted:` trailer naming the tool and what it did.
`AI-USAGE.md` holds the summary table. `git log --grep="AI-Assisted"` is the
record. The scaffold is generator output, not AI, and is isolated in its own
commit so later diffs are attributable.

**Commit rules:** conventional and scoped, small and frequent, body explains why
not what, commit before every agent handoff, **never squash this weekend.** 1inch's
prize page explicitly grades commit history, so it is a judged artifact.

## 12. Open questions

1. Does The Giving Block support HBAR? Their site or support will answer. Changes
   the roadmap slide, blocks no code.
2. Fee on successful refunds: undecided. It inverts Beeminder neatly but quietly
   rewards us for making sessions easy to pass, and we already own the narrative
   inversion without it.
3. Uniswap Trading API testnet availability. See the gate in section 7.
4. Is a Hedera-native giving rail a better fit? Three-minute question at their
   mentor desk while you are there anyway.

## 13. Submission checklist

- [ ] README proof block filled, every `TBD` replaced, every ⚪ flipped to 🟢
- [ ] Live deployed link. A runnable repo is **explicitly not enough** for 0G
- [ ] Video ≤3 min (0G) and ≤5 min (Hedera). One ≤3 min can satisfy both
- [ ] Selfie Check testing doc, both dev and user feedback
- [ ] Account and contract addresses
- [ ] Team names, Telegram and X handles (0G requires both)
- [ ] `AI-USAGE.md` current
- [ ] `find . -name "*.sol" -not -path "./node_modules/*"` returns nothing
- [ ] Run `.claude/agents/submission-scorer.md` one last time

---

**The three things that decide this:** ship the spine by early afternoon, make 0G
do inference not storage, and keep every claim in the README true. A thin working
flow with real transactions beats a rich broken one by a mile, and the last six
hours always evaporate.
