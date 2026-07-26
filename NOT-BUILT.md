# What we didn't build

An honest account of scope that was cut, deferred, or never started. Written for
ETHGlobal Lisbon judges and future contributors. The things below either didn't
make the submission window or were deliberately out of scope for v1.

---

## Browser extension

The original product concept included a Chrome / Edge extension that would run
alongside the World App version: detect doomscrolling patterns, track active-tab
time, and surface a "start a session" prompt when you've been drifting. It would
have used the Page Visibility API and `chrome.tabs` to build the same integrity
signals (foreground time, interruption count) that the mobile flow collects via
the browser's own Visibility API.

**Why it didn't ship:** The World App track was the primary submission target,
and getting the mobile session flow, Hedera settlement, and 0G coach all working
end-to-end was already a full build. The extension would have needed its own
packaging, a separate manifest, and a cross-origin messaging layer between the
extension and the Next.js API. We scoped it out early and never started it.

---

## Desktop / open-web path

The app is built as a World Mini App. It works in the browser at the live URL,
but the World App connection — login via MiniKit, Selfie Check, World ID
verification — only fully activates inside World App. A proper desktop path
would have an alternative auth flow (e.g. wallet connect or email) and a UI that
doesn't assume a 390px mobile viewport.

---

## Long-memory coach (paid tier)

`CLAUDE.md` specifies a paid tier backed by 0G Storage: the coach builds a
persistent model of your focus history across sessions, spots patterns ("you
always slip after 3 pm on Wednesdays"), and gives richer feedback. The free tier
is implemented — it returns a verdict. The storage layer and per-user session
history are not.

---

## UI/UX — committed late

Most of the visual design landed in the final hours of the build. Earlier
commits focused on the Hedera settlement spine, 0G compute coach, and World ID
flows. The UI audit, animation layer (`animate-fade-up`, `animate-glow-pulse`,
verdict washes, bottom-sheet transitions), and the redesigned StakeForm and
Verdict screens were all merged close to the submission deadline. They work, but
they weren't iterated on — there was no design round-trip, no user testing, and
no mobile preview pass before commit.

---

## Accountability circles — UI only

The `CirclePanel` component renders a demo circle with hardcoded data from
`src/lib/circle.ts`. Actual circle creation, membership, and off-chain
coordination between users are not implemented. The collective forfeit total
shown is derived from demo fixture data.

---

## Real charity partnership — The Giving Block

The charity recipient is currently a testnet account (`0.0.9762856`) controlled
by the operator. No real money moves and there is no active partnership.

The planned integration is **The Giving Block** — a crypto-native donation
platform that accepts HBAR and routes funds to vetted nonprofits. It handles the
regulatory and operational side (charity vetting, tax receipts, fiat conversion
where needed), so the app just needs to send to a verified wallet address per
cause.

The design intention:
- Users pick a cause when they join a circle; that cause maps to a Giving Block
  wallet address
- Solo users can pick a default cause at onboarding
- Forfeits settle to the operator's pending account first, then sweep to the
  Giving Block address after the appeal window closes
- The app surfaces a link to the Giving Block campaign page so users can see
  the collective impact

No partnership with The Giving Block exists yet. The testnet accounts are
placeholders until mainnet and a real integration.

---

## Appeal UI

The appeal window logic and server route exist (`src/app/api/session/appeal/`),
and the countdown renders in the Verdict screen. But there is no polished appeal
form — submitting an appeal currently sends a blank reason. A proper UI would
let you write a short explanation, show the original intention and artifact side
by side, and confirm the appeal before sending.

---

## Streak token UI

The `STREAK` HTS token is minted on Hedera testnet (`0.0.9762627`) and the mint
call runs on a kept verdict. The token balance and streak history are not
surfaced in the UI. There is no streak counter, no animation for the mint event,
and no screen showing your token history.

---

## Evidence tiers — privacy levels as a product mechanic

The fully-designed concept (not yet implemented) is a tiered evidence model
analogous to AI model tiers: the more evidence you provide, the lower your
required stake and the lower the platform fee, because the system needs less
trust from you.

```
Tier 1 — Word only
  Evidence:  Just what you say happened. No artifact, no recording.
  Stake:     Highest. The system is extending you full trust.
  Fee:       A small maintenance fee applies — the platform is taking on
             the most risk and the coach is doing the most interpretive work.

Tier 2 — Artifact (current v1 behaviour)
  Evidence:  A text summary, note, or file you submit at claim time.
  Stake:     Standard. The coach has something to read against your intention.
  Fee:       None by default; the stake is the mechanism.

Tier 3 — Screen recording
  Evidence:  An opt-in recording of the session window (tab only, no system
             audio, no other apps). Maximum verifiability.
  Stake:     Lowest. Hard evidence means little trust is required.
  Fee:       None. The recording does the work the coach would otherwise do.
```

The privacy logic is intentionally inverted from what feels intuitive: sharing
more evidence *earns* a lower stake, because the user is reducing the system's
exposure, not increasing their own. Screen recording is not surveillance — it is
a voluntary trade of privacy for reduced financial commitment.

**Why screen recording wasn't ruled out entirely:** The earlier note in this file
was wrong to call it a privacy non-starter. The right design is: opt-in only,
tab-capture only (not `getDisplayMedia` on the full desktop), processed locally
or sent only to the 0G coach, never stored, and clearly disclosed. The Selfie
Check proves *presence* at claim time; a tab recording proves *what you actually
did*. They serve different tiers and are not substitutes.

**What the browser extension adds here:** The extension tier would be Tier 3.5 —
richer integrity signals than a tab recording (idle detection, tab switching,
active-window time) without capturing screen content, sitting between recording
and word-only on the trust spectrum.

**What needs building:**
- A tier selector at session start (before the stake screen)
- Stake-amount logic that adjusts the minimum and default by tier
- The maintenance fee calculation and settlement path for Tier 1
- The tab capture flow for Tier 3 (screen recording)
- Clear disclosure UI before any recording starts

---

## What is working and demoable

- Hedera testnet: stake transfer → pending escrow → settlement on verdict →
  sweep to charity. Verified on chain with real HBAR.
- HCS: pseudonymous session record written on every settled session.
- 0G Compute: coach route with API-key auth and Router fallback.
- World App: MiniKit login, World ID Selfie Check on kept verdict.
- Session flow: idle → draft → running → claim → submit → verdict → appeal
  window, all client-side state with no dead ends.
