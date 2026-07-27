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

**Extension popup mockup** — the live-session view as a compact browser popup,
showing the DoomTax header, the countdown ring with ambient glow, the stake
badge with USD equivalent, and the partner activity pills at the bottom:

![Extension popup mockup](../public/promo/extension-popup.svg)

**Doomscroll intercept mockup** — when `chrome.tabs` detects prolonged passive
scrolling, a centred overlay card appears over the dimmed feed. The copy is
direct but not judgemental ("You're 12 minutes into a scroll. Put something
behind the next 25?"), and the caption anchors the privacy promise:

![Extension intercept mockup](../public/promo/extension-intercept.svg)

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

## OCR attachment verification

**What shipped:** A local-only file picker in ArtifactForm. The user can
attach a photo; a SHA-256 hash is computed in the browser using
`crypto.subtle.digest`, truncated and shown on screen, and the image stays
on the device. Nothing is uploaded; the hash is never sent to the server.
The coach still judges the text artifact only.

**What was planned:** The full pipeline — image attached client-side → hash
committed alongside the intention's commitment hash (same salted SHA-256
pattern, never the image) → OCR/vision extraction on 0G Compute so the raw
image never reaches DoomTax servers → extracted text appended to the coach's
evidence → verdict references the attachment hash so anyone can later prove
the judged evidence matches the file the user still holds. Hash only on HCS,
never the image or the extracted text.

**Why deferred:** 0G vision-model availability and weekend scope. The honest
disclosure ("OCR reading on 0G is coming — today the coach judges your text
only") ships in the UI so the user knows exactly where they stand.

---

## What is working and demoable

- Hedera testnet: stake transfer → pending escrow → settlement on verdict →
  sweep to charity. Verified on chain with real HBAR.
- HCS: pseudonymous session record written on every settled session.
- 0G Compute: coach route with API-key auth and Router fallback.
- World App: MiniKit login, World ID Selfie Check on kept verdict.
- Session flow: idle → draft → running → claim → submit → verdict → appeal
  window, all client-side state with no dead ends.

---

## AI improvement reports (API-key integrations)

**What was planned:** Let a user attach their own model API key (e.g. an
OpenAI-compatible endpoint) so a personal agent can read their own session
history — kept-rate trend visible only to them, never ranked — and produce
a private "areas for improvement" report. The agent would identify patterns
in kept vs slipped sessions and surface concrete suggestions without any of
that analysis leaving the user's own account.

**Why it did not ship:** Weekend scope. More importantly, any analysis must
stay strictly per-user and private to honour the no-leaderboard,
no-visible-kept-rate product rules. The right architecture (user-held API
key, server-side proxy, no cross-user data) needs careful design and a
dedicated privacy review before shipping.

**What to build:** A settings screen where the user pastes their own
OpenAI-compatible API key (stored only in their session/local storage, never
on DoomTax servers); a lightweight server proxy that forwards only their own
session history; a "trends" view showing their personal streak cadence and a
text report from the model. Kept-rate aggregates shown only in absolute
numbers, never ranked against others.

